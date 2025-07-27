// chat.js

// DirectLine initialization will be done dynamically after getting secret
let directLine;

// Global variables for agent management
let agents = {};
let currentAgentId = null;

// Initialize the application
async function initializeApp() {
    try {
        // Attach event listeners first
        attachEventListeners();

        // Initialize LLM panel state based on stored settings
        initializeLLMPanelState();

        // Load all agents first
        await AgentManager.loadAgents();

        // If we have a current agent, initialize with it
        if (currentAgentId && agents[currentAgentId]) {
            await initializeDirectLine(agents[currentAgentId].secret);
        } else {
            // Try legacy single-agent secret for backwards compatibility
            const savedSecret = await SecureStorage.retrieve('directLineSecret');
            if (savedSecret) {
                // Migrate to multi-agent system
                const agentId = await AgentManager.addOrUpdateAgent(null, 'Default Agent', savedSecret);
                await AgentManager.setCurrentAgent(agentId);
                // Remove old secret
                await SecureStorage.store('directLineSecret', '');
            } else {
                // No agents or secrets, show setup modal
                showSetupModal();
            }
        }
    } catch (error) {
        console.error('Error initializing app:', error);
        // If there's any error, show setup modal
        showSetupModal();
    }
}

// Initialize DirectLine connection
async function initializeDirectLine(secret) {
    try {
        // Show initialization indicator
        showInitializationIndicator('Initializing bot connection...');

        // Check if DirectLine library is available
        if (typeof DirectLine === 'undefined') {
            throw new Error('DirectLine library is not loaded. Please check your internet connection and refresh the page.');
        }

        // Close existing connection if any
        if (directLine) {
            directLine.end();
        }

        // Create DirectLine with optimized settings
        directLine = new DirectLine.DirectLine({
            secret: secret,
            webSocket: true,
            timeout: 20000, // 20 second timeout
            conversationId: undefined // Let DirectLine create new conversation
        });

        setupDirectLineSubscriptions();

        console.log('DirectLine initialized successfully');

        // Start a new session when DirectLine is initialized
        startNewSession();

        return true;
    } catch (error) {
        console.error('Error initializing DirectLine:', error);

        // Hide initialization indicator on error
        hideInitializationIndicator();

        // Show user-friendly error message
        if (error.message && error.message.includes('Invalid secret')) {
            showErrorMessage('Invalid DirectLine secret. Please check your bot configuration.');
        } else if (error.message && error.message.includes('network')) {
            showErrorMessage('Network error. Please check your internet connection.');
        } else {
            showErrorMessage('Failed to initialize bot connection. Please check your settings.');
        }

        return false;
    }
}

function setupDirectLineSubscriptions() {
    // Receive messages from bot
    directLine.activity$.subscribe(activity => {
        console.log('Received activity:', activity);

        // Handle typing indicator
        if (activity.type === 'typing') {
            // Use the same progress indicator system for consistency
            showProgressIndicator();

            // Clear any existing typing timeout
            if (window.typingTimeout) {
                clearTimeout(window.typingTimeout);
            }

            // Set a timeout to hide the typing indicator if no message follows
            window.typingTimeout = setTimeout(() => {
                console.log('Typing indicator timeout - hiding indicator');
                hideProgressIndicator();
                window.typingTimeout = null;
            }, 10000); // Hide after 10 seconds if no message received

            return;
        }

        // Clear typing timeout when any other activity is received
        if (window.typingTimeout) {
            clearTimeout(window.typingTimeout);
            window.typingTimeout = null;
        }

        // Handle messages and conversation updates
        if (activity.from && activity.from.id !== 'user') {
            if (activity.type === 'message') {
                // Check if this is a streaming message
                const isStreamingMessage = activity.channelData && activity.channelData.streaming;
                const isStreamingEnd = activity.channelData && activity.channelData.streamingEnd;

                // Also detect streaming based on message patterns
                const couldBeStreaming = activity.text && activity.text.length > 0 && activity.text.length < 100;
                const now = Date.now();

                // If we received a short message within 2 seconds of the last one, treat as streaming
                if (couldBeStreaming && lastMessageTime && (now - lastMessageTime) < 2000) {
                    handleStreamingActivity(activity);
                } else if (isStreamingMessage) {
                    // This is a streaming message chunk
                    handleStreamingActivity(activity);
                } else if (isStreamingEnd) {
                    // This marks the end of streaming
                    finalizeStreamingMessage(activity);
                } else {
                    // Regular complete message - but simulate streaming for demo
                    simulateStreamingIfEnabled(activity);
                }

                // Update last message time
                lastMessageTime = now;
            }
            // Handle conversation update type messages (may contain welcome messages)
            else if (activity.type === 'conversationUpdate') {
                // Some bots use conversationUpdate to send welcome messages
                console.log('Conversation updated:', activity);
                // If there's actual content, try to render it
                if (activity.text ||
                    (activity.attachments && activity.attachments.length > 0) ||
                    (activity.suggestedActions && activity.suggestedActions.actions.length > 0)) {
                    renderActivity(activity);
                }
            }
            // Handle event activities that might contain responses
            else if (activity.type === 'event') {
                console.log('Event activity received:', activity);
                // Some bots send responses as events
                if (activity.text ||
                    (activity.attachments && activity.attachments.length > 0) ||
                    (activity.suggestedActions && activity.suggestedActions.actions.length > 0)) {
                    renderActivity(activity);
                }
            }
        }
    });

    // Subscribe to connection status changes
    directLine.connectionStatus$.subscribe(status => {
        switch (status) {
            case 1: // ConnectionStatus.Connecting
                console.log('Connecting to the bot...');
                updateInitializationIndicator('Connecting to bot...');
                AgentManager.updateCurrentAgentDisplay();
                break;
            case 2: // ConnectionStatus.Online
                console.log('The bot is online!');
                updateInitializationIndicator('Bot connected! Waiting for response...');
                AgentManager.updateCurrentAgentDisplay();

                // Wait a moment for the connection to stabilize, then try multiple initialization approaches
                setTimeout(() => {
                    console.log('Attempting to trigger greeting message...');

                    // Method 1: Send conversationUpdate event (most common for greeting)
                    directLine.postActivity({
                        from: { id: 'user' },
                        type: 'conversationUpdate',
                        membersAdded: [{ id: 'user' }]
                    }).subscribe(
                        id => console.log('conversationUpdate event sent, id:', id),
                        error => console.error('Error sending conversationUpdate event:', error)
                    );

                    // Method 2: Send startConversation event (backup)
                    setTimeout(() => {
                        directLine.postActivity({
                            from: { id: 'user' },
                            type: 'event',
                            name: 'startConversation',
                            value: ''
                        }).subscribe(
                            id => console.log('startConversation event sent, id:', id),
                            error => console.error('Error sending startConversation event:', error)
                        );
                    }, 500);

                    // Method 3: Send webchat/join event (alternative approach)
                    setTimeout(() => {
                        directLine.postActivity({
                            from: { id: 'user' },
                            type: 'event',
                            name: 'webchat/join',
                            value: ''
                        }).subscribe(
                            id => console.log('webchat/join event sent, id:', id),
                            error => console.error('Error sending webchat/join event:', error)
                        );
                    }, 1000);

                    // Method 4: If no greeting after 3 seconds, send an empty message (last resort)
                    setTimeout(() => {
                        const chatHistory = JSON.parse(localStorage.getItem('chatHistory')) || [];
                        const currentSession = getCurrentSession();
                        const currentSessionMessages = chatHistory.filter(entry => entry.session === currentSession);

                        // Only send empty message if no bot messages received yet
                        if (currentSessionMessages.filter(msg => msg.sender === 'bot').length === 0) {
                            console.log('No greeting received, sending empty message...');
                            directLine.postActivity({
                                from: { id: 'user' },
                                type: 'message',
                                text: ''
                            }).subscribe(
                                id => console.log('Empty message sent to trigger greeting, id:', id),
                                error => console.error('Error sending empty message:', error)
                            );
                        }
                    }, 3000);
                }, 1000);

                break;
            case 3: // ConnectionStatus.ExpiredToken
                console.log('The token has expired.');
                hideInitializationIndicator();
                AgentManager.updateCurrentAgentDisplay();
                showErrorMessage('Authentication token has expired. Please check your DirectLine secret.');
                break;
            case 4: // ConnectionStatus.FailedToConnect
                console.log('Failed to connect to the bot.');
                hideInitializationIndicator();
                AgentManager.updateCurrentAgentDisplay();
                showErrorMessage('Failed to connect to the bot service. Please check your DirectLine secret and internet connection.');
                break;
            case 5: // ConnectionStatus.Ended
                console.log('The connection has ended.');
                hideInitializationIndicator();
                AgentManager.updateCurrentAgentDisplay();
                showErrorMessage('Connection to the bot has ended unexpectedly. Please try refreshing the page.');
                break;
            default:
                console.log('Unknown connection status:', status);
        }
    });
}

// Get DOM elements
const chatWindow = document.getElementById('chatWindow');
const userInput = document.getElementById('userInput');
const sendButton = document.getElementById('sendButton');
const clearButton = document.getElementById('clearButton'); // Get the clear button element
const sessionList = document.getElementById('sessionList'); // Get the session list element
const embeddedBrowser = document.getElementById('embeddedBrowser');
const rightPanel = document.getElementById('rightPanel');
const closeButton = document.getElementById('closeButton'); // Get the close button element
const dragBar = document.getElementById('dragBar'); // Get the drag bar element
const suggestedActionsContainer = document.getElementById('suggestedActionsContainer'); // Get the suggested actions container

// File upload elements
const fileInput = document.getElementById('fileInput');
const attachButton = document.getElementById('attachButton');
const filePreviewContainer = document.getElementById('filePreviewContainer');
const fileName = document.getElementById('fileName');
const fileSize = document.getElementById('fileSize');
const removeFileButton = document.getElementById('removeFileButton');

// Setup modal elements
const setupButton = document.getElementById('setupButton');
const clearAllHistoryButton = document.getElementById('clearAllHistoryButton');
const setupModal = document.getElementById('setupModal');
const closeSetupModal = document.getElementById('closeSetupModal');
const agentsList = document.getElementById('agentsList');
const addNewAgentBtn = document.getElementById('addNewAgentBtn');
const cancelConfigBtn = document.getElementById('cancelConfigBtn');
const agentConfigSection = document.getElementById('agentConfigSection');
const configTitle = document.getElementById('configTitle');
const agentNameInput = document.getElementById('agentNameInput');
const secretInput = document.getElementById('secretInput');
const toggleSecretVisibility = document.getElementById('toggleSecretVisibility');
const testAgentBtn = document.getElementById('testAgentBtn');
const saveAgentBtn = document.getElementById('saveAgentBtn');
const connectionStatus = document.getElementById('connectionStatus');
const statusIndicator = document.getElementById('statusIndicator');
const statusText = document.getElementById('statusText');
const currentAgentDisplay = document.getElementById('currentAgentDisplay');
const currentAgentName = document.getElementById('currentAgentName');
const currentAgentStatus = document.getElementById('currentAgentStatus');

// File upload state
let selectedFile = null;

// DirectLine connection state
let currentDirectLine = null;

// Streaming message state
let currentStreamingMessage = null;
let streamingMessageContent = '';
let streamingMessageId = null;
let lastMessageTime = null;

// Message timing and source tracking
let messageStartTime = null;
let messageSource = null;

// Encryption utilities for secure storage
const EncryptionUtils = {
    async generateKey() {
        return await window.crypto.subtle.generateKey(
            {
                name: 'AES-GCM',
                length: 256
            },
            true,
            ['encrypt', 'decrypt']
        );
    },

    async exportKey(key) {
        return await window.crypto.subtle.exportKey('raw', key);
    },

    async importKey(keyData) {
        return await window.crypto.subtle.importKey(
            'raw',
            keyData,
            {
                name: 'AES-GCM',
                length: 256
            },
            true,
            ['encrypt', 'decrypt']
        );
    },

    async encrypt(text, key) {
        const encoder = new TextEncoder();
        const data = encoder.encode(text);
        const iv = window.crypto.getRandomValues(new Uint8Array(12));

        const encrypted = await window.crypto.subtle.encrypt(
            {
                name: 'AES-GCM',
                iv: iv
            },
            key,
            data
        );

        return {
            encrypted: new Uint8Array(encrypted),
            iv: iv
        };
    },

    async decrypt(encryptedData, iv, key) {
        const decrypted = await window.crypto.subtle.decrypt(
            {
                name: 'AES-GCM',
                iv: iv
            },
            key,
            encryptedData
        );

        const decoder = new TextDecoder();
        return decoder.decode(decrypted);
    }
};

const SecureStorage = {
    async getOrCreateKey() {
        let keyData = localStorage.getItem('encryptionKey');
        if (!keyData) {
            const key = await EncryptionUtils.generateKey();
            keyData = Array.from(new Uint8Array(await EncryptionUtils.exportKey(key)));
            localStorage.setItem('encryptionKey', JSON.stringify(keyData));
            return key;
        }

        const keyArray = new Uint8Array(JSON.parse(keyData));
        return await EncryptionUtils.importKey(keyArray);
    },

    async store(key, value) {
        try {
            const encryptionKey = await this.getOrCreateKey();
            const encrypted = await EncryptionUtils.encrypt(value, encryptionKey);

            const storedData = {
                encrypted: Array.from(encrypted.encrypted),
                iv: Array.from(encrypted.iv)
            };

            localStorage.setItem(`secure_${key}`, JSON.stringify(storedData));
            return true;
        } catch (error) {
            console.error('Error storing encrypted data:', error);
            return false;
        }
    },

    async retrieve(key) {
        try {
            const storedData = localStorage.getItem(`secure_${key}`);
            if (!storedData) return null;

            const parsed = JSON.parse(storedData);
            const encryptedArray = new Uint8Array(parsed.encrypted);
            const ivArray = new Uint8Array(parsed.iv);

            const encryptionKey = await this.getOrCreateKey();
            return await EncryptionUtils.decrypt(encryptedArray, ivArray, encryptionKey);
        } catch (error) {
            console.error('Error retrieving encrypted data:', error);
            return null;
        }
    }
};

// Multi-Agent Management Functions
const AgentManager = {
    // Load all agents from encrypted storage
    async loadAgents() {
        try {
            const agentsData = await SecureStorage.retrieve('agents');
            if (agentsData) {
                agents = JSON.parse(agentsData);
                console.log('Loaded agents:', agents);
            }

            const currentId = await SecureStorage.retrieve('currentAgentId');
            if (currentId && agents[currentId]) {
                currentAgentId = currentId;
                console.log('Current agent ID:', currentAgentId);
            }

            this.updateAgentsList();
            this.updateCurrentAgentDisplay();
        } catch (error) {
            console.error('Error loading agents:', error);
        }
    },

    // Get current agent information
    getCurrentAgent() {
        return currentAgentId && agents[currentAgentId] ? agents[currentAgentId] : null;
    },

    // Save all agents to encrypted storage
    async saveAgents() {
        try {
            console.log('Saving agents:', agents);
            await SecureStorage.store('agents', JSON.stringify(agents));
            if (currentAgentId) {
                await SecureStorage.store('currentAgentId', currentAgentId);
            }
            console.log('Agents saved successfully');
        } catch (error) {
            console.error('Error saving agents:', error);
        }
    },

    // Generate unique ID for new agent
    generateAgentId() {
        return 'agent_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    },

    // Add or update an agent
    async addOrUpdateAgent(agentId, name, secret) {
        if (!agentId) {
            agentId = this.generateAgentId();
        }

        agents[agentId] = {
            id: agentId,
            name: name,
            secret: secret,
            createdAt: agents[agentId]?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        console.log('Agent added/updated:', agents[agentId]);
        await this.saveAgents();
        this.updateAgentsList();
        return agentId;
    },

    // Delete an agent
    async deleteAgent(agentId) {
        if (agents[agentId]) {
            delete agents[agentId];

            // If deleting current agent, clear current selection
            if (currentAgentId === agentId) {
                currentAgentId = null;
                await SecureStorage.store('currentAgentId', '');
            }

            await this.saveAgents();
            this.updateAgentsList();
            this.updateCurrentAgentDisplay();
            this.clearAgentForm();
        }
    },

    // Set current active agent
    async setCurrentAgent(agentId) {
        if (agents[agentId]) {
            currentAgentId = agentId;
            await SecureStorage.store('currentAgentId', agentId);
            this.updateCurrentAgentDisplay();
            this.updateAgentsList(); // Update list to show new active agent

            // Initialize DirectLine with new agent
            await initializeDirectLine(agents[agentId].secret);
        }
    },

    // Update agents list display
    updateAgentsList() {
        const agentIds = Object.keys(agents);

        if (agentIds.length === 0) {
            agentsList.innerHTML = '<div class="no-agents-message">No agents configured. Click "Add New" to create your first agent.</div>';
            return;
        }

        agentsList.innerHTML = '';

        agentIds.forEach(agentId => {
            const agent = agents[agentId];
            const isActive = currentAgentId === agentId;
            const isConnected = isActive && directLine;

            const agentItem = document.createElement('div');
            agentItem.className = `agent-item ${isActive ? 'active' : ''}`;
            agentItem.dataset.agentId = agentId;

            agentItem.innerHTML = `
                <div class="agent-status-indicator ${isConnected ? 'connected' : 'disconnected'}"></div>
                <div class="agent-info">
                    <div class="agent-name">${agent.name}</div>
                    <div class="agent-status-inline">${isActive ? (isConnected ? 'Connected' : 'Active (Disconnected)') : 'Inactive'}</div>
                </div>
                <div class="agent-actions">
                    ${!isActive ? `<button class="agent-btn agent-btn-switch" data-action="switch" data-agent-id="${agentId}" title="Switch to this agent">Switch</button>` : ''}
                    <button class="agent-btn agent-btn-test" data-action="test" data-agent-id="${agentId}" title="Test connection">Test</button>
                    <button class="agent-btn agent-btn-edit" data-action="edit" data-agent-id="${agentId}" title="Edit agent">Edit</button>
                    <button class="agent-btn agent-btn-delete" data-action="delete" data-agent-id="${agentId}" title="Delete agent">Delete</button>
                </div>
            `;

            agentsList.appendChild(agentItem);
        });

        // Add event listeners to agent buttons
        this.attachAgentButtonListeners();
    },

    // Attach event listeners to agent buttons
    attachAgentButtonListeners() {
        const agentButtons = agentsList.querySelectorAll('.agent-btn');
        agentButtons.forEach(button => {
            button.addEventListener('click', async (e) => {
                e.stopPropagation();
                const action = button.dataset.action;
                const agentId = button.dataset.agentId;

                switch (action) {
                    case 'switch':
                        await this.setCurrentAgent(agentId);
                        hideSetupModal();
                        startNewChat();
                        break;
                    case 'test':
                        await this.testAgent(agentId);
                        break;
                    case 'edit':
                        this.editAgent(agentId);
                        break;
                    case 'delete':
                        if (confirm(`Are you sure you want to delete "${agents[agentId].name}"?`)) {
                            await this.deleteAgent(agentId);
                        }
                        break;
                }
            });
        });
    },

    // Test an agent connection
    async testAgent(agentId) {
        if (!agents[agentId]) return;

        const agent = agents[agentId];
        const agentItem = agentsList.querySelector(`[data-agent-id="${agentId}"]`);
        const statusIndicator = agentItem.querySelector('.agent-status-indicator');
        const statusText = agentItem.querySelector('.agent-status-inline');

        try {
            statusIndicator.className = 'agent-status-indicator connecting';
            statusText.textContent = 'Testing...';

            const testDirectLine = new DirectLine.DirectLine({
                secret: agent.secret,
                webSocket: false, // Use polling for more reliable testing
                timeout: 15000
            });

            let testCompleted = false;

            const subscription = testDirectLine.connectionStatus$.subscribe(status => {
                console.log('Test connection status:', status, 'for agent:', agent.name);

                if (testCompleted) return;

                // Status values: 0=Uninitialized, 1=Connecting, 2=Online, 3=ExpiredToken, 4=FailedToConnect, 5=Ended
                if (status === 2) { // Online
                    testCompleted = true;
                    statusIndicator.className = 'agent-status-indicator connected';
                    statusText.textContent = 'Test successful!';
                    subscription.unsubscribe();
                    testDirectLine.end();

                    // Reset after 3 seconds
                    setTimeout(() => {
                        this.updateAgentsList();
                    }, 3000);
                } else if (status === 4 || status === 3) { // FailedToConnect or ExpiredToken
                    testCompleted = true;
                    statusIndicator.className = 'agent-status-indicator disconnected';
                    statusText.textContent = status === 3 ? 'Invalid secret!' : 'Test failed!';
                    subscription.unsubscribe();
                    testDirectLine.end();

                    // Reset after 3 seconds
                    setTimeout(() => {
                        this.updateAgentsList();
                    }, 3000);
                }
            });

            // Timeout after 15 seconds
            setTimeout(() => {
                if (!testCompleted && statusText.textContent === 'Testing...') {
                    testCompleted = true;
                    statusIndicator.className = 'agent-status-indicator disconnected';
                    statusText.textContent = 'Test timeout!';
                    subscription.unsubscribe();
                    testDirectLine.end();

                    // Reset after 3 seconds
                    setTimeout(() => {
                        this.updateAgentsList();
                    }, 3000);
                }
            }, 15000);

        } catch (error) {
            statusIndicator.className = 'agent-status-indicator disconnected';
            statusText.textContent = 'Test failed!';
            console.error('Test connection error:', error);

            // Reset after 3 seconds
            setTimeout(() => {
                this.updateAgentsList();
            }, 3000);
        }
    },

    // Edit an agent
    editAgent(agentId) {
        if (!agents[agentId]) return;

        const agent = agents[agentId];
        agentNameInput.value = agent.name;
        secretInput.value = agent.secret;
        configTitle.textContent = 'Edit Agent';
        agentConfigSection.style.display = 'block';

        // Store the editing agent ID
        agentConfigSection.dataset.editingAgentId = agentId;
        isEditingAgent = true;
    },

    // Update current agent display
    updateCurrentAgentDisplay() {
        if (currentAgentId && agents[currentAgentId]) {
            const agent = agents[currentAgentId];
            currentAgentName.textContent = agent.name;
            currentAgentStatus.textContent = directLine ? 'Connected' : 'Disconnected';
            currentAgentStatus.className = `agent-status ${directLine ? 'connected' : 'disconnected'}`;
        } else {
            currentAgentName.textContent = 'No agent selected';
            currentAgentStatus.textContent = 'Disconnected';
            currentAgentStatus.className = 'agent-status disconnected';
        }
    },

    // Clear agent form
    clearAgentForm() {
        agentNameInput.value = '';
        secretInput.value = '';
        agentConfigSection.style.display = 'none';
        configTitle.textContent = 'Add New Agent';
        delete agentConfigSection.dataset.editingAgentId;
        isEditingAgent = false;

        // Clear connection status
        statusIndicator.className = 'status-indicator';
        statusText.textContent = 'Not connected';
    }
};

// Function to attach all event listeners
function attachEventListeners() {
    console.log('Attaching event listeners...');

    // Check if all required elements exist
    const requiredElements = {
        addNewAgentBtn,
        cancelConfigBtn,
        agentConfigSection,
        testAgentBtn,
        saveAgentBtn,
        agentNameInput,
        secretInput,
        statusIndicator,
        statusText
    };

    console.log('Required elements check:', requiredElements);

    // Basic UI event listeners
    sendButton.addEventListener('click', sendMessage);
    userInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
    clearButton.addEventListener('click', startNewChat);
    closeButton.addEventListener('click', closeRightPanel);

    // Setup modal event listeners
    setupButton.addEventListener('click', showSetupModal);
    clearAllHistoryButton.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear ALL chat history? This action cannot be undone.')) {
            clearAllChatHistory();
        }
    });
    closeSetupModal.addEventListener('click', hideSetupModal);

    setupModal.addEventListener('click', (e) => {
        if (e.target === setupModal) {
            hideSetupModal();
        }
    });

    toggleSecretVisibility.addEventListener('click', () => {
        const isPassword = secretInput.type === 'password';
        secretInput.type = isPassword ? 'text' : 'password';
        toggleSecretVisibility.textContent = isPassword ? '🙈' : '👁️';
    });

    // Streaming mode checkbox event listener
    const enableStreamingCheckbox = document.getElementById('enableStreamingCheckbox');
    if (enableStreamingCheckbox) {
        console.log('Streaming checkbox found:', enableStreamingCheckbox);
        enableStreamingCheckbox.addEventListener('change', (e) => {
            const isEnabled = e.target.checked;
            localStorage.setItem('enableStreaming', isEnabled);
            console.log('Streaming mode', isEnabled ? 'enabled' : 'disabled');
        });
    } else {
        console.warn('enableStreamingCheckbox element not found');
    }

    // AI Companion connection checkbox event listener
    const enableLLMCheckbox = document.getElementById('enableLLMCheckbox');
    const apiKeySection = document.getElementById('apiKeySection');
    const apiProviderSelect = document.getElementById('apiProviderSelect');
    const apiKeyField = document.getElementById('apiKeyField');
    const ollamaConfig = document.getElementById('ollamaConfig');

    if (enableLLMCheckbox && apiKeySection) {
        console.log('AI Companion checkbox found:', enableLLMCheckbox);
        enableLLMCheckbox.addEventListener('change', (e) => {
            const isEnabled = e.target.checked;
            localStorage.setItem('enableLLM', isEnabled);
            apiKeySection.style.display = isEnabled ? 'block' : 'none';
            console.log('AI Companion connection', isEnabled ? 'enabled' : 'disabled');

            // Show/hide AI Companion panel based on checkbox state
            toggleLLMPanel(isEnabled);
        });
    } else {
        console.warn('enableLLMCheckbox or apiKeySection element not found');
    }

    // API Provider selection handler
    if (apiProviderSelect && apiKeyField && ollamaConfig) {
        apiProviderSelect.addEventListener('change', async (e) => {
            const provider = e.target.value;
            console.log('API provider changed to:', provider);

            if (provider === 'ollama') {
                apiKeyField.style.display = 'none';
                ollamaConfig.style.display = 'block';
                // Automatically load models when Ollama is selected
                await refreshOllamaModels();
            } else {
                apiKeyField.style.display = 'block';
                ollamaConfig.style.display = 'none';
            }

            localStorage.setItem('selectedApiProvider', provider);
        });
    }

    // Ollama test connection handler
    const testOllamaBtn = document.getElementById('testOllamaBtn');
    if (testOllamaBtn) {
        testOllamaBtn.addEventListener('click', async () => {
            await testOllamaConnection();
        });
    }

    // Refresh Ollama models handler
    const refreshModelsBtn = document.getElementById('refreshModelsBtn');
    if (refreshModelsBtn) {
        refreshModelsBtn.addEventListener('click', async () => {
            await refreshOllamaModels();
        });
    }

    // Ollama model selection handler
    const ollamaModelSelect = document.getElementById('ollamaModelSelect');
    if (ollamaModelSelect) {
        ollamaModelSelect.addEventListener('change', (e) => {
            const ollamaModelInput = document.getElementById('ollamaModelInput');
            if (ollamaModelInput && e.target.value) {
                ollamaModelInput.value = e.target.value;
                localStorage.setItem('ollamaSelectedModel', e.target.value);
            }
        });
    }

    // Save Ollama configuration when URL or model changes
    const ollamaUrlInput = document.getElementById('ollamaUrlInput');
    const ollamaModelInput = document.getElementById('ollamaModelInput');

    if (ollamaUrlInput) {
        ollamaUrlInput.addEventListener('blur', async () => {
            const newUrl = ollamaUrlInput.value.trim() || 'http://localhost:3001';
            localStorage.setItem('ollamaUrl', newUrl);
            // Auto-refresh models when URL changes (if Ollama is selected)
            const currentProvider = localStorage.getItem('selectedApiProvider');
            if (currentProvider === 'ollama') {
                await refreshOllamaModels();
            }
        });
    }

    if (ollamaModelInput) {
        ollamaModelInput.addEventListener('blur', () => {
            localStorage.setItem('ollamaSelectedModel', ollamaModelInput.value.trim());
        });
    }

    // Save API key when it changes
    const apiKeyInput = document.getElementById('apiKeyInput');
    if (apiKeyInput) {
        apiKeyInput.addEventListener('blur', async () => {
            const provider = localStorage.getItem('selectedApiProvider') || 'openai';
            const apiKey = apiKeyInput.value.trim();
            if (apiKey) {
                await SecureStorage.store(`${provider}ApiKey`, apiKey);
            }
        });
    }

    // Multi-Agent Event Listeners with error checking
    if (addNewAgentBtn) {
        console.log('Adding event listener to addNewAgentBtn');
        addNewAgentBtn.addEventListener('click', function () {
            console.log('Add New Agent button clicked!'); // Debug log
            try {
                AgentManager.clearAgentForm();
                if (agentConfigSection) {
                    agentConfigSection.style.display = 'block';
                    console.log('Agent config section shown');
                } else {
                    console.error('agentConfigSection element not found');
                }
            } catch (error) {
                console.error('Error in Add New Agent click handler:', error);
            }
        });
    } else {
        console.error('addNewAgentBtn element not found!');
    }

    if (cancelConfigBtn) {
        cancelConfigBtn.addEventListener('click', function () {
            console.log('Cancel button clicked');
            AgentManager.clearAgentForm();
        });
    } else {
        console.error('cancelConfigBtn element not found!');
    }

    if (testAgentBtn) {
        testAgentBtn.addEventListener('click', async function () {
            console.log('Test Agent button clicked');
            const secret = secretInput.value.trim();
            if (!secret) {
                alert('Please enter a DirectLine secret to test.');
                return;
            }

            try {
                statusIndicator.className = 'status-indicator connecting';
                statusText.textContent = 'Testing...';

                const testDirectLine = new DirectLine.DirectLine({
                    secret: secret,
                    webSocket: false, // Use polling for more reliable testing
                    timeout: 15000
                });

                let testCompleted = false;

                const subscription = testDirectLine.connectionStatus$.subscribe(status => {
                    console.log('Test connection status:', status, 'for secret:', secret.substring(0, 10) + '...');

                    if (testCompleted) return;

                    // Status values: 0=Uninitialized, 1=Connecting, 2=Online, 3=ExpiredToken, 4=FailedToConnect, 5=Ended
                    if (status === 2) { // Online
                        testCompleted = true;
                        statusIndicator.className = 'status-indicator connected';
                        statusText.textContent = 'Connection successful!';
                        subscription.unsubscribe();
                        testDirectLine.end();
                    } else if (status === 4 || status === 3) { // FailedToConnect or ExpiredToken
                        testCompleted = true;
                        statusIndicator.className = 'status-indicator error';
                        statusText.textContent = status === 3 ? 'Invalid secret!' : 'Connection failed!';
                        subscription.unsubscribe();
                        testDirectLine.end();
                    }
                });

                // Timeout after 15 seconds
                setTimeout(() => {
                    if (!testCompleted && statusText.textContent === 'Testing...') {
                        testCompleted = true;
                        statusIndicator.className = 'status-indicator error';
                        statusText.textContent = 'Connection timeout!';
                        subscription.unsubscribe();
                        testDirectLine.end();
                    }
                }, 15000);

            } catch (error) {
                statusIndicator.className = 'status-indicator error';
                statusText.textContent = 'Connection failed!';
                console.error('Test connection error:', error);
            }
        });
    } else {
        console.error('testAgentBtn element not found!');
    }

    if (saveAgentBtn) {
        saveAgentBtn.addEventListener('click', async function () {
            console.log('Save Agent button clicked');
            const name = agentNameInput.value.trim();
            const secret = secretInput.value.trim();

            if (!name || !secret) {
                alert('Please fill in both agent name and DirectLine secret.');
                return;
            }

            try {
                const editingAgentId = agentConfigSection.dataset.editingAgentId;
                const agentId = await AgentManager.addOrUpdateAgent(editingAgentId, name, secret);

                alert(editingAgentId ? 'Agent updated successfully!' : 'Agent added successfully!');

                // If this is the first agent, set it as current
                if (Object.keys(agents).length === 1) {
                    await AgentManager.setCurrentAgent(agentId);
                }

                // Clear form and update display
                AgentManager.clearAgentForm();

            } catch (error) {
                alert('Error saving agent. Please try again.');
                console.error('Save agent error:', error);
            }
        });
    } else {
        console.error('saveAgentBtn element not found!');
    }

    // File upload event listeners
    attachButton.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', handleFileSelection);
    removeFileButton.addEventListener('click', removeSelectedFile);

    // Drag and drop event listeners
    chatWindow.addEventListener('dragover', handleDragOver);
    chatWindow.addEventListener('dragleave', handleDragLeave);
    chatWindow.addEventListener('drop', handleFileDrop);

    // AI Companion Panel toggle button
    const toggleLLMPanelBtn = document.getElementById('toggleLLMPanelBtn');
    if (toggleLLMPanelBtn) {
        toggleLLMPanelBtn.addEventListener('click', () => {
            const llmPanel = document.getElementById('llmAnalysisPanel');
            if (llmPanel) {
                console.log('Toggle clicked - Current classes:', llmPanel.className);

                // Check current panel visibility using the collapsed class
                const isCurrentlyCollapsed = llmPanel.classList.contains('collapsed');

                console.log('Panel currently collapsed:', isCurrentlyCollapsed);

                // Toggle the collapsed state
                if (isCurrentlyCollapsed) {
                    llmPanel.classList.remove('collapsed');
                    console.log('Panel expanded');
                } else {
                    llmPanel.classList.add('collapsed');
                    console.log('Panel collapsed');
                }

                // Update LLM status when showing panel
                if (isCurrentlyCollapsed) {
                    updateLLMStatus();
                }

                // Initialize LLM panel if showing for first time
                if (isCurrentlyCollapsed && !llmPanel.hasAttribute('data-initialized')) {
                    initializeLLMPanel();
                    llmPanel.setAttribute('data-initialized', 'true');
                }
            }
        });
    }

    console.log('Event listeners attached successfully');
}

// Load chat history from localStorage
loadChatHistory();
updateNewChatButtonState(); // Update button state after loading history

// Setup modal functions
async function showSetupModal() {
    // Load agents and update list
    await AgentManager.loadAgents();

    // Load existing secret if available (for backwards compatibility)
    const savedSecret = await SecureStorage.retrieve('directLineSecret');
    if (savedSecret && !currentAgentId) {
        secretInput.value = savedSecret;
    }

    // Initialize streaming checkboxes
    const enableStreamingCheckbox = document.getElementById('enableStreamingCheckbox');
    if (enableStreamingCheckbox) {
        const streamingEnabled = localStorage.getItem('enableStreaming') === 'true';
        enableStreamingCheckbox.checked = streamingEnabled;
        console.log('Initialized streaming checkbox:', streamingEnabled);
    } else {
        console.warn('enableStreamingCheckbox not found during initialization');
    }

    const enableLLMCheckbox = document.getElementById('enableLLMCheckbox');
    const apiKeySection = document.getElementById('apiKeySection');
    const apiProviderSelect = document.getElementById('apiProviderSelect');
    const apiKeyField = document.getElementById('apiKeyField');
    const ollamaConfig = document.getElementById('ollamaConfig');

    if (enableLLMCheckbox && apiKeySection) {
        const llmEnabled = localStorage.getItem('enableLLM') === 'true';
        enableLLMCheckbox.checked = llmEnabled;
        apiKeySection.style.display = llmEnabled ? 'block' : 'none';
        console.log('Initialized LLM checkbox:', llmEnabled);

        // Show/hide LLM panel based on stored state
        toggleLLMPanel(llmEnabled);

        // Initialize API provider selection
        if (apiProviderSelect && apiKeyField && ollamaConfig) {
            const selectedProvider = localStorage.getItem('selectedApiProvider') || 'openai';
            apiProviderSelect.value = selectedProvider;

            if (selectedProvider === 'ollama') {
                apiKeyField.style.display = 'none';
                ollamaConfig.style.display = 'block';

                // Initialize Ollama configuration
                const ollamaUrlInput = document.getElementById('ollamaUrlInput');
                const ollamaModelInput = document.getElementById('ollamaModelInput');
                const ollamaModelSelect = document.getElementById('ollamaModelSelect');

                if (ollamaUrlInput) {
                    ollamaUrlInput.value = localStorage.getItem('ollamaUrl') || 'http://localhost:3001';
                }
                if (ollamaModelInput) {
                    ollamaModelInput.value = localStorage.getItem('ollamaSelectedModel') || '';
                }
                if (ollamaModelSelect) {
                    const savedModel = localStorage.getItem('ollamaSelectedModel');
                    if (savedModel) {
                        ollamaModelSelect.value = savedModel;
                    }
                }

                // Automatically load models when Ollama is selected
                setTimeout(async () => {
                    console.log('Auto-loading Ollama models...');
                    try {
                        await refreshOllamaModels();
                    } catch (error) {
                        console.log('Auto-load models failed:', error);
                    }
                }, 500);
            } else {
                apiKeyField.style.display = 'block';
                ollamaConfig.style.display = 'none';

                // Initialize API key
                const apiKeyInput = document.getElementById('apiKeyInput');
                if (apiKeyInput) {
                    const savedApiKey = await SecureStorage.retrieve(`${selectedProvider}ApiKey`);
                    if (savedApiKey) {
                        apiKeyInput.value = savedApiKey;
                    }
                }
            }
        }
    } else {
        console.warn('enableLLMCheckbox or apiKeySection not found during initialization');
    }

    setupModal.style.display = 'flex';
    setupModal.offsetHeight; // Force reflow
    setupModal.classList.add('show');
}

function hideSetupModal() {
    setupModal.classList.remove('show');
    setTimeout(() => {
        setupModal.style.display = 'none';
    }, 300);
}

async function testDirectLineConnection() {
    const secret = secretInput.value.trim();
    if (!secret) {
        showConnectionStatus('error', 'Please enter a DirectLine secret');
        return;
    }

    // Basic secret format validation
    if (!secret.includes('.') || secret.length < 50) {
        showConnectionStatus('error', 'Invalid DirectLine secret format');
        return;
    }

    showConnectionStatus('testing', 'Testing connection...');

    let testDirectLine = null;

    try {
        // Create a test DirectLine connection with optimized settings
        testDirectLine = new DirectLine.DirectLine({
            secret: secret,
            webSocket: false, // Use polling for test to be more reliable
            timeout: 8000 // 8 second timeout
        });

        // Set up a timeout for the test
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Connection timeout (8s)')), 8000);
        });

        // Test the connection by monitoring connection status
        const connectionPromise = new Promise((resolve, reject) => {
            let resolved = false;

            const statusSubscription = testDirectLine.connectionStatus$.subscribe({
                next: (connectionStatus) => {
                    console.log('Test connection status:', connectionStatus);

                    if (resolved) return;

                    if (connectionStatus === 2) { // Online/Connected
                        resolved = true;
                        statusSubscription.unsubscribe();

                        // For a more thorough test, try to get the conversation info
                        try {
                            // The fact that we got to "Online" status means the secret is valid
                            // and we can connect to the DirectLine service
                            resolve('Connected successfully');
                        } catch (err) {
                            reject(new Error('Connection established but service validation failed'));
                        }
                    } else if (connectionStatus === 4) { // FailedToConnect
                        resolved = true;
                        statusSubscription.unsubscribe();
                        reject(new Error('Failed to connect - Invalid secret or service unavailable'));
                    } else if (connectionStatus === 3) { // ExpiredToken
                        resolved = true;
                        statusSubscription.unsubscribe();
                        reject(new Error('Connection failed - Token expired or invalid'));
                    }
                },
                error: (error) => {
                    if (resolved) return;
                    resolved = true;
                    console.error('Connection status error:', error);
                    statusSubscription.unsubscribe();

                    // Check for specific error types
                    if (error.status === 401 || error.status === 403) {
                        reject(new Error('Invalid DirectLine secret'));
                    } else if (error.status >= 500) {
                        reject(new Error('Microsoft DirectLine service error'));
                    } else {
                        reject(new Error(`Connection error: ${error.message || 'Unknown error'}`));
                    }
                }
            });

            // Also listen for any immediate errors
            setTimeout(() => {
                if (!resolved && testDirectLine) {
                    // If no status update after 1 second, there might be an immediate issue
                    console.log('No status update received within 1 second');
                }
            }, 1000);
        });

        await Promise.race([connectionPromise, timeoutPromise]);

        // Connection successful
        showConnectionStatus('success', 'Connection successful! Secret is valid.');
        saveConfigBtn.disabled = false;

    } catch (error) {
        console.error('Connection test failed:', error);
        let errorMessage = error.message;

        // Provide more specific error messages
        if (errorMessage.includes('timeout')) {
            errorMessage = 'Connection timeout - Please check your network connection';
        } else if (errorMessage.includes('Invalid secret') || errorMessage.includes('401') || errorMessage.includes('403')) {
            errorMessage = 'Invalid DirectLine secret - Please verify your secret is correct';
        } else if (errorMessage.includes('500') || errorMessage.includes('service error')) {
            errorMessage = 'Microsoft DirectLine service temporarily unavailable';
        } else if (errorMessage.includes('Failed to connect')) {
            errorMessage = 'Unable to connect to DirectLine service - Check your secret and network';
        }

        showConnectionStatus('error', errorMessage);
        saveConfigBtn.disabled = true;
    } finally {
        // Always clean up the test connection
        if (testDirectLine) {
            try {
                testDirectLine.end();
            } catch (e) {
                console.log('Error closing test connection:', e);
            }
        }
    }
}

async function saveConfiguration() {
    const secret = secretInput.value.trim();
    if (!secret) {
        showConnectionStatus('error', 'Please enter a DirectLine secret');
        return;
    }

    saveConfigBtn.disabled = true;
    saveConfigBtn.textContent = 'Saving...';

    try {
        // Save the secret securely
        const success = await SecureStorage.store('directLineSecret', secret);
        if (success) {
            showConnectionStatus('success', 'Configuration saved successfully!');

            // Reinitialize DirectLine with new secret
            await initializeDirectLine(secret);

            setTimeout(() => {
                hideSetupModal();
                saveConfigBtn.disabled = false;
                saveConfigBtn.textContent = 'Save Configuration';
            }, 1500);
        } else {
            throw new Error('Failed to save configuration');
        }
    } catch (error) {
        console.error('Error saving configuration:', error);
        showConnectionStatus('error', 'Failed to save configuration');
        saveConfigBtn.disabled = false;
        saveConfigBtn.textContent = 'Save Configuration';
    }
}

function showConnectionStatus(type, message) {
    connectionStatus.style.display = 'flex';
    statusIndicator.className = `status-indicator ${type}`;
    statusText.textContent = message;

    // Auto-hide success/error messages after 3 seconds
    if (type !== 'testing') {
        setTimeout(() => {
            connectionStatus.style.display = 'none';
        }, 3000);
    }
}

// Ollama integration functions
async function testOllamaConnection() {
    const urlInput = document.getElementById('ollamaUrlInput');
    const testBtn = document.getElementById('testOllamaBtn');

    if (!urlInput || !testBtn) {
        console.error('Ollama UI elements not found');
        return;
    }

    const ollamaUrl = urlInput.value.trim() || 'http://localhost:3001';

    testBtn.disabled = true;
    testBtn.textContent = 'Testing...';

    try {
        console.log('Testing Ollama connection to:', ollamaUrl);

        // First, try a simple fetch to test basic connectivity
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

        const response = await fetch(`${ollamaUrl}/api/tags`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            mode: 'cors', // Explicitly set CORS mode
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        console.log('Response status:', response.status);
        console.log('Response headers:', [...response.headers.entries()]);

        if (response.ok) {
            const data = await response.json();
            console.log('Ollama connection successful, models:', data.models);

            testBtn.textContent = 'Connected ✓';
            testBtn.style.backgroundColor = '#28a745';

            // Save the working state
            localStorage.setItem('ollamaLastWorking', 'true');
            localStorage.setItem('ollamaUrl', ollamaUrl);

            // Auto-refresh models after successful connection
            setTimeout(async () => {
                await refreshOllamaModels();
            }, 500);

        } else {
            const errorText = await response.text();
            console.error('HTTP Error Response:', errorText);
            throw new Error(`HTTP ${response.status}: ${response.statusText}\nResponse: ${errorText}`);
        }
    } catch (error) {
        console.error('Ollama connection failed:', error);
        testBtn.textContent = 'Failed ✗';
        testBtn.style.backgroundColor = '#dc3545';

        // Mark as not working
        localStorage.setItem('ollamaLastWorking', 'false');

        let errorMessage = error.message;

        // Provide more specific error messages
        if (error.name === 'AbortError') {
            errorMessage = 'Connection timeout - Ollama server not responding';
        } else if (error.message.includes('CORS')) {
            errorMessage = 'CORS error - Ollama server needs to allow browser connections.\nStart Ollama with: OLLAMA_ORIGINS=* ollama serve';
        } else if (error.message.includes('fetch')) {
            errorMessage = 'Network error - Cannot reach Ollama server.\nMake sure Ollama is running and accessible.';
        } else if (error.message.includes('Failed to fetch')) {
            errorMessage = 'Connection refused - Ollama server is not running or not accessible.\n\nTroubleshooting:\n1. Make sure Ollama is installed and running\n2. Start Ollama with: ollama serve\n3. For browser access, use: OLLAMA_ORIGINS=* ollama serve\n4. Check if Ollama is running on the correct port';
        }

        alert(`Failed to connect to Ollama server:\n${errorMessage}\n\nURL tested: ${ollamaUrl}`);
    } finally {
        setTimeout(() => {
            testBtn.disabled = false;
            testBtn.textContent = 'Test Connection';
            testBtn.style.backgroundColor = '#0073e6';
        }, 2000);
    }
}

async function refreshOllamaModels() {
    const urlInput = document.getElementById('ollamaUrlInput');
    const modelSelect = document.getElementById('ollamaModelSelect');
    const refreshBtn = document.getElementById('refreshModelsBtn');

    if (!urlInput || !modelSelect || !refreshBtn) return;

    const ollamaUrl = urlInput.value.trim() || 'http://localhost:3001';

    refreshBtn.disabled = true;
    refreshBtn.textContent = 'Refreshing...';

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    try {
        console.log('Fetching Ollama models from:', ollamaUrl);

        const response = await fetch(`${ollamaUrl}/api/tags`, {
            method: 'GET',
            mode: 'cors',
            headers: {
                'Content-Type': 'application/json',
            },
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        console.log('Fetch response status:', response.status);
        console.log('Fetch response headers:', [...response.headers.entries()]);

        if (response.ok) {
            const data = await response.json();
            const models = data.models || [];

            console.log('Available Ollama models:', models);

            // Clear existing options
            modelSelect.innerHTML = '<option value="">Select a model...</option>';

            // Add models to dropdown
            models.forEach(model => {
                const option = document.createElement('option');
                option.value = model.name;
                option.textContent = `${model.name} (${formatBytes(model.size)})`;
                modelSelect.appendChild(option);
            });

            refreshBtn.textContent = 'Refreshed ✓';
            refreshBtn.style.backgroundColor = '#28a745';

            // If we have a previously selected model, try to select it
            const savedModel = localStorage.getItem('ollamaSelectedModel');
            if (savedModel && models.find(m => m.name === savedModel)) {
                modelSelect.value = savedModel;
                // Update the hidden input for backward compatibility
                const hiddenInput = document.getElementById('ollamaModelInput');
                if (hiddenInput) {
                    hiddenInput.value = savedModel;
                }
            }

        } else {
            const errorText = await response.text().catch(() => 'No response body');
            throw new Error(`HTTP ${response.status}: ${response.statusText}\nResponse: ${errorText}`);
        }
    } catch (error) {
        clearTimeout(timeoutId);
        console.error('Failed to fetch Ollama models:', error);

        refreshBtn.textContent = 'Failed ✗';
        refreshBtn.style.backgroundColor = '#dc3545';

        let errorMessage = 'Failed to fetch models from Ollama:\n';

        if (error.name === 'AbortError') {
            errorMessage += 'Connection timeout (10 seconds). Please check if Ollama is running and accessible.';
        } else if (error.message.includes('CORS') || error.message.includes('cross-origin')) {
            errorMessage += 'CORS error: Browser blocked the request.\n\n' +
                'To fix this, start Ollama with browser support:\n' +
                'OLLAMA_ORIGINS=* ollama serve\n\n' +
                'Or set environment variable: OLLAMA_ORIGINS=*';
        } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            errorMessage += 'Network error: Cannot reach Ollama server.\n' +
                'Please verify:\n' +
                '1. Ollama is running (ollama serve)\n' +
                '2. URL is correct: ' + ollamaUrl + '\n' +
                '3. No firewall blocking the connection';
        } else {
            errorMessage += error.message;
        }

        alert(errorMessage);
    } finally {
        setTimeout(() => {
            refreshBtn.disabled = false;
            refreshBtn.textContent = 'Refresh Models';
            refreshBtn.style.backgroundColor = '#0073e6';
        }, 2000);
    }
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function sendToOllama(message) {
    const urlInput = document.getElementById('ollamaUrlInput');
    const modelInput = document.getElementById('ollamaModelInput');

    if (!urlInput || !modelInput) {
        throw new Error('Ollama configuration elements not found');
    }

    const ollamaUrl = urlInput.value.trim() || 'http://localhost:3001';

    // Check for model from dropdown selection first, then fallback to manual input
    const selectedModel = localStorage.getItem('ollamaSelectedModel');
    const manualModel = modelInput.value.trim();
    const model = selectedModel || manualModel;

    if (!model) {
        throw new Error('Please select or enter an Ollama model name');
    }

    console.log('Sending message to Ollama:', { url: ollamaUrl, model, message });

    const response = await fetch(`${ollamaUrl}/api/generate`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: model,
            prompt: message,
            stream: true
        })
    });

    if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }

    return response;
}

// File upload event listeners
attachButton.addEventListener('click', () => {
    fileInput.click();
});

fileInput.addEventListener('change', handleFileSelection);
removeFileButton.addEventListener('click', removeSelectedFile);

// Drag and drop functionality
chatWindow.addEventListener('dragover', handleDragOver);
chatWindow.addEventListener('dragleave', handleDragLeave);
chatWindow.addEventListener('drop', handleFileDrop);

// Function to send message
function sendMessage(messageContent) {
    const message = messageContent ? messageContent.trim() : userInput.value.trim();
    clearSuggestedActions(); // Clear suggested actions

    // Check if we have a file or message
    if (message || selectedFile) {
        console.log('Sending message:', message);

        // Track message start time for response metadata
        messageStartTime = Date.now();
        messageSource = getResponseSource();

        // Render user's message (with file if present)
        if (selectedFile) {
            renderUserMessageWithFile(message, selectedFile);
        } else {
            renderUserMessage(message);
        }

        // Show progress indicator
        showProgressIndicator();

        // Always use DirectLine/Agent for user messages
        // Prepare activity for Direct Line
        let activity = {
            from: { id: 'user' },
            type: 'message',
            text: message || ''
        };

        // Add file attachment if present
        if (selectedFile) {
            activity.attachments = [{
                contentType: selectedFile.type,
                contentUrl: '', // Will be set after upload
                name: selectedFile.name,
                content: selectedFile // For processing
            }];
        }

        // Check if DirectLine is connected before sending
        if (!directLine) {
            console.error('DirectLine not initialized');
            hideProgressIndicator();
            showErrorMessage('Connection not established. Please configure your bot settings.');
            return;
        }

        // Post activity to Direct Line
        if (selectedFile) {
            uploadFileAndSendMessage(activity, selectedFile);
        } else {
            directLine.postActivity(activity).subscribe(
                id => console.log('Message sent, id:', id),
                error => {
                    console.error('Error sending message:', error);
                    hideProgressIndicator();
                    handleConnectionError(error);
                }
            );
        }

        // Save message to localStorage
        saveMessageToLocalStorage('user', message);

        // Clear input and file
        if (!messageContent) {
            userInput.value = '';
        }
        removeSelectedFile();

        // Update button state
        updateNewChatButtonState();
    }
}

// Handle Ollama streaming response
async function handleOllamaStreaming(message) {
    try {
        const response = await sendToOllama(message);
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        // Create a streaming message container
        const messageId = 'ollama_' + Date.now();
        const activity = {
            id: messageId,
            text: '',
            from: { id: 'bot' }
        };

        // Start the streaming message
        startStreamingMessage(activity);

        let fullResponse = '';

        while (true) {
            const { done, value } = await reader.read();

            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n').filter(line => line.trim());

            for (const line of lines) {
                try {
                    const data = JSON.parse(line);

                    if (data.response) {
                        fullResponse += data.response;

                        // Update streaming content
                        streamingMessageContent = fullResponse;
                        updateStreamingContent();

                        // Scroll to keep up with new content
                        chatWindow.scrollTop = chatWindow.scrollHeight;
                    }

                    if (data.done) {
                        // Finalize the streaming message
                        const finalActivity = {
                            id: messageId,
                            text: fullResponse,
                            from: { id: 'bot' }
                        };
                        finalizeStreamingMessage(finalActivity);
                        return;
                    }
                } catch (parseError) {
                    console.warn('Failed to parse Ollama response line:', line, parseError);
                }
            }
        }

    } catch (error) {
        console.error('Ollama streaming error:', error);
        hideProgressIndicator();

        // Show error message to user
        const errorActivity = {
            id: 'error_' + Date.now(),
            text: `Error connecting to Ollama: ${error.message}`,
            from: { id: 'bot' }
        };
        renderCompleteMessage(errorActivity);

        showErrorMessage(`Failed to get response from Ollama: ${error.message}`);
    }
}

// Handle other API streaming (placeholder for future implementation)
async function handleGenericAPIStreaming(message, provider) {
    console.log('Generic API streaming not yet implemented for:', provider);
    hideProgressIndicator();

    const errorActivity = {
        id: 'error_' + Date.now(),
        text: `${provider} API integration is not yet implemented. Please use DirectLine or Ollama.`,
        from: { id: 'bot' }
    };
    renderCompleteMessage(errorActivity);
}

// Function to render user's message
function renderUserMessage(message) {
    const messageContainer = document.createElement('div');
    messageContainer.className = 'messageContainer userMessage';

    const messageDiv = document.createElement('div');
    messageDiv.className = 'messageContent';

    // Sanitize and render the message
    const sanitizedContent = DOMPurify.sanitize(message);
    messageDiv.innerHTML = sanitizedContent;

    // Ensure images fit within the chat window
    const images = messageDiv.querySelectorAll('img');
    images.forEach(img => {
        img.style.maxWidth = '100%';
        img.style.cursor = 'pointer';
        img.addEventListener('click', function () {
            showEnlargedImage(this.src);
        });
    });

    const messageIcon = document.createElement('div');
    messageIcon.className = 'messageIcon';
    messageIcon.style.backgroundImage = 'url("images/carter_30k.png")'; // Replace with the path to your user icon

    messageContainer.appendChild(messageDiv);
    messageContainer.appendChild(messageIcon);

    chatWindow.appendChild(messageContainer);
    chatWindow.scrollTop = chatWindow.scrollHeight;

    // Update LLM context indicator if panel is visible
    updateLLMContextIndicator();
}

// Render activity (bot's messages) with streaming support
function renderActivity(activity) {
    console.log('Received activity:', activity);

    // Check if this is a streaming message update
    const isStreamingUpdate = activity.id && activity.id === streamingMessageId && activity.text;

    if (isStreamingUpdate) {
        // This is an update to an existing streaming message
        updateStreamingMessage(activity);
        return;
    }

    // Hide progress indicator for new messages (not streaming updates)
    if (!isStreamingUpdate) {
        hideProgressIndicator();
        // Also hide initialization indicator when first bot message arrives
        hideInitializationIndicator();
    }

    // Check if there's content to display
    if (
        !activity.text &&
        (!activity.attachments || activity.attachments.length === 0) &&
        (!activity.suggestedActions || activity.suggestedActions.actions.length === 0)
    ) {
        // No content to display, return without rendering
        return;
    }

    // Check if this might be the start of a streaming message
    // Only treat as streaming if it has text content but no attachments or suggested actions
    const isStreamingStart = activity.text &&
        activity.text.length > 0 &&
        !activity.attachments &&
        (!activity.suggestedActions || activity.suggestedActions.actions.length === 0);

    if (isStreamingStart && !currentStreamingMessage) {
        // Start a new streaming message
        startStreamingMessage(activity);
        return;
    }

    // Handle non-streaming messages normally
    renderCompleteMessage(activity);
}

// Simulate streaming for demo purposes (can be enabled via localStorage)
function simulateStreamingIfEnabled(activity) {
    const streamingEnabled = localStorage.getItem('enableStreaming') === 'true';

    if (streamingEnabled && activity.text && activity.text.length > 50) {
        // Simulate streaming by breaking the message into chunks
        simulateStreaming(activity);
    } else {
        // Render normally
        renderActivity(activity);
    }
}

// Simulate streaming by chunking a complete message
function simulateStreaming(activity) {
    console.log('Simulating streaming for activity:', activity);

    const text = activity.text;
    const words = text.split(' ');
    const chunkSize = Math.max(1, Math.floor(words.length / 10)); // Break into ~10 chunks

    let currentIndex = 0;
    const chunks = [];

    // Create chunks
    while (currentIndex < words.length) {
        const chunk = words.slice(currentIndex, currentIndex + chunkSize).join(' ');
        chunks.push(chunk);
        currentIndex += chunkSize;
    }

    // Start streaming simulation
    let chunkIndex = 0;
    let accumulatedText = '';

    const streamChunk = () => {
        if (chunkIndex < chunks.length) {
            accumulatedText += (chunkIndex > 0 ? ' ' : '') + chunks[chunkIndex];

            const streamingActivity = {
                ...activity,
                text: accumulatedText,
                id: activity.id || generateGUID()
            };

            if (chunkIndex === 0) {
                // Start streaming
                startStreamingMessage(streamingActivity);
            } else {
                // Update streaming
                streamingMessageContent = accumulatedText;
                updateStreamingContent();
            }

            chunkIndex++;

            // Schedule next chunk
            setTimeout(streamChunk, 100 + Math.random() * 200); // 100-300ms delay
        } else {
            // Finalize streaming
            setTimeout(() => {
                finalizeStreamingMessage(activity);
            }, 500);
        }
    };

    // Start the simulation
    streamChunk();
}

// Handle streaming activity from DirectLine
function handleStreamingActivity(activity) {
    console.log('Handling streaming activity:', activity);

    // Check if this is the first chunk of a new streaming message
    if (!currentStreamingMessage || streamingMessageId !== activity.id) {
        // Start new streaming message
        startStreamingMessage(activity);
    } else {
        // Update existing streaming message
        updateStreamingMessage(activity);
    }

    // Set a timeout to finalize the message if no more chunks arrive
    if (window.streamingTimeout) {
        clearTimeout(window.streamingTimeout);
    }

    window.streamingTimeout = setTimeout(() => {
        if (currentStreamingMessage) {
            console.log('Streaming timeout - finalizing message');
            finalizeStreamingMessage();
        }
    }, 3000); // 3 seconds timeout
}

// Start a new streaming message
function startStreamingMessage(activity) {
    console.log('Starting streaming message:', activity);

    // Hide progress indicator when starting streaming message
    hideProgressIndicator();

    // Store streaming state
    streamingMessageId = activity.id;
    streamingMessageContent = activity.text || '';

    // Create message container
    const messageContainer = document.createElement('div');
    messageContainer.className = 'messageContainer botMessage';
    messageContainer.id = `streaming-${activity.id}`;

    const messageIcon = document.createElement('div');
    messageIcon.className = 'messageIcon';
    messageIcon.style.backgroundImage = 'url("images/Microsoft-Copilot-Logo-30.png")';

    const messageDiv = document.createElement('div');
    messageDiv.className = 'messageContent streaming';
    messageDiv.id = `streaming-content-${activity.id}`;

    // Add streaming indicator
    const streamingIndicator = document.createElement('div');
    streamingIndicator.className = 'streaming-indicator';
    streamingIndicator.innerHTML = '<span class="cursor">|</span>';

    messageContainer.appendChild(messageIcon);
    messageContainer.appendChild(messageDiv);
    messageContainer.appendChild(streamingIndicator);

    chatWindow.appendChild(messageContainer);
    chatWindow.scrollTop = chatWindow.scrollHeight;

    // Store reference for updates
    currentStreamingMessage = {
        container: messageContainer,
        contentDiv: messageDiv,
        indicator: streamingIndicator,
        id: activity.id
    };

    // Render initial content
    updateStreamingContent();
}

// Update streaming message content
function updateStreamingMessage(activity) {
    if (!currentStreamingMessage || activity.id !== streamingMessageId) {
        console.warn('Received streaming update for unknown message:', activity.id);
        return;
    }

    console.log('Updating streaming message:', activity);

    // Update stored content
    streamingMessageContent = activity.text || '';

    // Update the display
    updateStreamingContent();

    // Scroll to keep up with new content
    chatWindow.scrollTop = chatWindow.scrollHeight;
}

// Update the streaming content display
function updateStreamingContent() {
    if (!currentStreamingMessage) return;

    const contentDiv = currentStreamingMessage.contentDiv;

    // Parse markdown but handle incomplete content gracefully
    let htmlContent;
    try {
        htmlContent = marked.parse(streamingMessageContent);
    } catch (error) {
        // If markdown parsing fails on incomplete content, show as plain text
        htmlContent = streamingMessageContent.replace(/\n/g, '<br>');
    }

    // Sanitize the HTML
    const sanitizedContent = DOMPurify.sanitize(htmlContent);
    contentDiv.innerHTML = sanitizedContent;

    // Add click handlers to images
    const images = contentDiv.querySelectorAll('img');
    images.forEach(img => {
        img.style.maxWidth = '100%';
        img.style.cursor = 'pointer';
        img.addEventListener('click', function () {
            showEnlargedImage(this.src);
        });
    });
}

// Finalize streaming message
function finalizeStreamingMessage(activity) {
    if (!currentStreamingMessage) return;

    console.log('Finalizing streaming message');

    // Hide progress indicator when finalizing streaming message
    hideProgressIndicator();

    // Clear any pending timeout
    if (window.streamingTimeout) {
        clearTimeout(window.streamingTimeout);
        window.streamingTimeout = null;
    }

    // Remove streaming indicator
    if (currentStreamingMessage.indicator) {
        currentStreamingMessage.indicator.remove();
    }

    // Remove streaming class
    currentStreamingMessage.contentDiv.classList.remove('streaming');

    // Handle final content, attachments, and suggested actions
    if (activity) {
        // Update with final content
        streamingMessageContent = activity.text || streamingMessageContent;
        updateStreamingContent();

        // Handle attachments
        if (activity.attachments && activity.attachments.length > 0) {
            activity.attachments.forEach(attachment => {
                if (attachment.contentType === 'application/vnd.microsoft.card.adaptive') {
                    renderAdaptiveCard(attachment, currentStreamingMessage.contentDiv);
                } else if (attachment.contentType.startsWith('image/')) {
                    const img = document.createElement('img');
                    img.src = attachment.contentUrl;
                    img.style.maxWidth = '100%';
                    img.style.cursor = 'pointer';
                    img.addEventListener('click', function () {
                        showEnlargedImage(this.src);
                    });
                    currentStreamingMessage.contentDiv.appendChild(img);
                }
            });
        }

        // Handle suggested actions
        if (activity.suggestedActions && activity.suggestedActions.actions.length > 0) {
            renderSuggestedActions(activity.suggestedActions.actions);
        }
    }

    // Add response metadata if we have timing information
    if (messageStartTime && messageSource && currentStreamingMessage) {
        const responseTime = Date.now() - messageStartTime;
        const metadataElement = createResponseMetadata(messageSource, responseTime);
        currentStreamingMessage.contentDiv.appendChild(metadataElement);

        // Reset timing variables
        messageStartTime = null;
        messageSource = null;
    }

    // Save final message to localStorage
    if (streamingMessageContent) {
        saveMessageToLocalStorage('bot', streamingMessageContent);
    }

    // Clear streaming state
    currentStreamingMessage = null;
    streamingMessageContent = '';
    streamingMessageId = null;

    // Mark recent messages for always-visible metadata
    markRecentMessages();

    // Update LLM context indicator if panel is visible
    updateLLMContextIndicator();

    // Update conversation title if AI companion is enabled and we have enough messages
    scheduleConversationTitleUpdate();
}

// Render complete (non-streaming) message
function renderCompleteMessage(activity) {
    // Hide progress indicator
    hideProgressIndicator();

    const messageContainer = document.createElement('div');
    messageContainer.className = 'messageContainer botMessage';

    const messageIcon = document.createElement('div');
    messageIcon.className = 'messageIcon';
    messageIcon.style.backgroundImage = 'url("images/Microsoft-Copilot-Logo-30.png")';

    const messageDiv = document.createElement('div');
    messageDiv.className = 'messageContent';

    let hasContent = false;

    if (activity.text) {
        // Parse Markdown to HTML
        const markdownContent = marked.parse(activity.text);
        // Sanitize the HTML
        const sanitizedContent = DOMPurify.sanitize(markdownContent);
        // Set the HTML content
        messageDiv.innerHTML = sanitizedContent;

        // Add click handlers to images
        const images = messageDiv.querySelectorAll('img');
        images.forEach(img => {
            img.style.maxWidth = '100%';
            img.style.cursor = 'pointer';
            img.addEventListener('click', function () {
                showEnlargedImage(this.src);
            });
        });

        hasContent = true;
    }

    // Handle attachments (images, adaptive cards, etc.)
    if (activity.attachments && activity.attachments.length > 0) {
        activity.attachments.forEach(attachment => {
            if (attachment.contentType === 'application/vnd.microsoft.card.adaptive') {
                renderAdaptiveCard(attachment, messageDiv);
                hasContent = true;
            } else if (attachment.contentType.startsWith('image/')) {
                const img = document.createElement('img');
                img.src = attachment.contentUrl;
                img.style.maxWidth = '100%';
                img.style.cursor = 'pointer';
                img.addEventListener('click', function () {
                    showEnlargedImage(this.src);
                });
                messageDiv.appendChild(img);
                hasContent = true;
            }
        });
    }

    // Handle suggested actions (choices)
    if (activity.suggestedActions && activity.suggestedActions.actions.length > 0) {
        renderSuggestedActions(activity.suggestedActions.actions);
        hasContent = true; // Suggested actions count as content
    }

    // Append the message only if there is content
    if (hasContent) {
        messageContainer.appendChild(messageIcon);
        messageContainer.appendChild(messageDiv);

        // Add response metadata if we have timing information
        if (messageStartTime && messageSource) {
            const responseTime = Date.now() - messageStartTime;
            const metadataElement = createResponseMetadata(messageSource, responseTime);
            messageDiv.appendChild(metadataElement);

            // Reset timing variables
            messageStartTime = null;
            messageSource = null;
        }

        chatWindow.appendChild(messageContainer);
        chatWindow.scrollTop = chatWindow.scrollHeight;

        // Mark recent messages for always-visible metadata
        markRecentMessages();

        // Update LLM context indicator if panel is visible
        updateLLMContextIndicator();

        // Update conversation title if AI companion is enabled and we have enough messages
        scheduleConversationTitleUpdate();
    }

    // Save bot message to localStorage only if it has text or attachments
    if (activity.text || (activity.attachments && activity.attachments.length > 0)) {
        saveMessageToLocalStorage('bot', activity.text || '');
    }

    // Add event listener for links
    const links = messageDiv.getElementsByTagName('a');
    for (let link of links) {
        link.addEventListener('click', function (event) {
            event.preventDefault();
            const url = event.target.href;
            openInRightPanel(url);
        });
    }
}

// Function to render suggested actions in the new container
function renderSuggestedActions(actions) {
    suggestedActionsContainer.innerHTML = ''; // Clear previous actions

    actions.forEach(action => {
        const button = document.createElement('button');
        button.className = 'suggestedAction';
        button.textContent = action.title;
        button.addEventListener('click', () => {
            // Send the action's value as a message
            sendMessage(action.value);
        });
        suggestedActionsContainer.appendChild(button);
    });
}

function clearSuggestedActions() {
    suggestedActionsContainer.innerHTML = ''; // Clear previous actions
}

// Function to render adaptive cards
function renderAdaptiveCard(attachment, messageDiv) {
    try {
        if (typeof AdaptiveCards !== 'undefined' && attachment.content) {
            // Create an adaptive card
            const adaptiveCard = new AdaptiveCards.AdaptiveCard();

            // Parse the card content
            adaptiveCard.parse(attachment.content);

            // Render the card
            const renderedCard = adaptiveCard.render();

            if (renderedCard) {
                // Style the rendered card
                renderedCard.style.maxWidth = '100%';
                renderedCard.style.borderRadius = '8px';
                renderedCard.style.overflow = 'hidden';

                // Append to message div
                messageDiv.appendChild(renderedCard);

                // Handle action events
                adaptiveCard.onExecuteAction = (action) => {
                    if (action instanceof AdaptiveCards.SubmitAction) {
                        console.log('Adaptive Card action executed:', action.data);
                        // You can send the action data back to the bot
                        if (action.data) {
                            sendMessage(JSON.stringify(action.data));
                        }
                    }
                };
            }
        } else {
            // Fallback: display as JSON if AdaptiveCards is not available
            console.warn('AdaptiveCards library not available, displaying as text');
            const pre = document.createElement('pre');
            pre.style.backgroundColor = '#f5f5f5';
            pre.style.padding = '12px';
            pre.style.borderRadius = '8px';
            pre.style.fontSize = '12px';
            pre.style.overflow = 'auto';
            pre.textContent = JSON.stringify(attachment.content, null, 2);
            messageDiv.appendChild(pre);
        }
    } catch (error) {
        console.error('Error rendering adaptive card:', error);
        // Fallback: display error message
        const errorDiv = document.createElement('div');
        errorDiv.style.color = '#d13438';
        errorDiv.style.fontStyle = 'italic';
        errorDiv.textContent = 'Error rendering adaptive card';
        messageDiv.appendChild(errorDiv);
    }
}

// Function to show progress indicator
function showProgressIndicator() {
    // Check if an indicator already exists to prevent duplicates
    const existingIndicator = document.getElementById('progressIndicator');
    if (existingIndicator) {
        console.log('Progress indicator already exists, skipping creation');
        return; // Don't create duplicate indicators
    }

    const messageContainer = document.createElement('div');
    messageContainer.className = 'messageContainer botMessage';
    messageContainer.id = 'progressIndicator'; // Set ID on container for easy removal

    const messageIcon = document.createElement('div');
    messageIcon.className = 'messageIcon';
    messageIcon.style.backgroundImage = 'url("images/Microsoft-Copilot-Logo-30.png")';

    const typingIndicator = document.createElement('div');
    typingIndicator.className = 'typingIndicator';

    // Create the three dots for typing animation
    for (let i = 0; i < 3; i++) {
        const dot = document.createElement('span');
        typingIndicator.appendChild(dot);
    }

    messageContainer.appendChild(messageIcon);
    messageContainer.appendChild(typingIndicator);
    chatWindow.appendChild(messageContainer);
    chatWindow.scrollTop = chatWindow.scrollHeight;

    console.log('Typing indicator created');

    // Safety timeout to remove indicator if it gets stuck (30 seconds)
    setTimeout(() => {
        const stuckIndicator = document.getElementById('progressIndicator');
        if (stuckIndicator) {
            console.log('Removing stuck progress indicator after 30 seconds');
            stuckIndicator.remove();
        }
    }, 30000);
}

// Function to hide progress indicator
function hideProgressIndicator() {
    // Remove progress indicator (the container now has the ID)
    const progressIndicator = document.getElementById('progressIndicator');
    if (progressIndicator) {
        progressIndicator.remove();
        console.log('Typing indicator removed');
    } else {
        console.log('No typing indicator found to remove');
    }
}

// Function to show initialization indicator with custom message
function showInitializationIndicator(message = 'Initializing...') {
    // Remove any existing indicator first
    hideInitializationIndicator();

    const messageContainer = document.createElement('div');
    messageContainer.className = 'messageContainer botMessage';
    messageContainer.id = 'initializationIndicator';

    const messageIcon = document.createElement('div');
    messageIcon.className = 'messageIcon';
    messageIcon.style.backgroundImage = 'url("images/Microsoft-Copilot-Logo-30.png")';

    const messageContent = document.createElement('div');
    messageContent.className = 'messageContent initialization-status';

    const statusContainer = document.createElement('div');
    statusContainer.className = 'initialization-container';

    const spinner = document.createElement('div');
    spinner.className = 'initialization-spinner';

    const statusText = document.createElement('span');
    statusText.className = 'initialization-text';
    statusText.textContent = message;
    statusText.id = 'initializationText';

    statusContainer.appendChild(spinner);
    statusContainer.appendChild(statusText);
    messageContent.appendChild(statusContainer);

    messageContainer.appendChild(messageIcon);
    messageContainer.appendChild(messageContent);
    chatWindow.appendChild(messageContainer);
    chatWindow.scrollTop = chatWindow.scrollHeight;

    console.log('Initialization indicator shown:', message);

    // Safety timeout to remove indicator if it gets stuck (60 seconds)
    if (window.initializationTimeout) {
        clearTimeout(window.initializationTimeout);
    }
    window.initializationTimeout = setTimeout(() => {
        const stuckIndicator = document.getElementById('initializationIndicator');
        if (stuckIndicator) {
            console.log('Removing stuck initialization indicator after 60 seconds');
            hideInitializationIndicator();
            showErrorMessage('Connection timeout. Please try again or check your bot configuration.');
        }
    }, 60000);
}

// Function to update initialization indicator message
function updateInitializationIndicator(message) {
    const textElement = document.getElementById('initializationText');
    if (textElement) {
        textElement.textContent = message;
        console.log('Initialization indicator updated:', message);
    } else {
        // If indicator doesn't exist, create it
        showInitializationIndicator(message);
    }
}

// Function to hide initialization indicator
function hideInitializationIndicator() {
    // Clear timeout if it exists
    if (window.initializationTimeout) {
        clearTimeout(window.initializationTimeout);
        window.initializationTimeout = null;
    }

    const indicator = document.getElementById('initializationIndicator');
    if (indicator) {
        indicator.remove();
        console.log('Initialization indicator removed');
    }
}

// Utility function to get source information for response metadata
function getResponseSource() {
    // Always using DirectLine/Bot Framework for agent responses
    const currentAgent = AgentManager.getCurrentAgent();
    if (currentAgent) {
        return currentAgent.name;
    } else {
        return 'Knowledge Agent';
    }
}

// Utility function to create response metadata element
function createResponseMetadata(source, durationMs) {
    const metadataDiv = document.createElement('div');
    metadataDiv.className = 'response-metadata';

    const durationSeconds = (durationMs / 1000).toFixed(1);

    metadataDiv.innerHTML = `
        <span class="source-info">Generated by ${source}</span>
        <span class="metadata-separator"> | </span>
        <span class="timing-info">took ${durationSeconds}s</span>
    `;

    return metadataDiv;
}

// Utility function to mark recent messages for always-visible metadata
function markRecentMessages() {
    const messageContainers = chatWindow.querySelectorAll('.messageContainer.botMessage');

    // Remove 'recent-message' class from all messages
    messageContainers.forEach(container => {
        container.classList.remove('recent-message');
    });

    // Add 'recent-message' class to last 2 bot messages
    const recentMessages = Array.from(messageContainers).slice(-2);
    recentMessages.forEach(container => {
        container.classList.add('recent-message');
    });
}

// Function to save message to localStorage
function saveMessageToLocalStorage(sender, message) {
    const chatHistory = JSON.parse(localStorage.getItem('chatHistory')) || [];
    const currentSession = getCurrentSession();
    const entry = { session: currentSession, sender, message, timestamp: new Date().toISOString() };
    chatHistory.push(entry);
    localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
    console.log('Message saved to localStorage:', entry);
    console.log('Current session ID:', currentSession);
}

// Function to save session title
function saveSessionTitle(sessionId, title) {
    const sessionTitles = JSON.parse(localStorage.getItem('sessionTitles')) || {};
    sessionTitles[sessionId] = title;
    localStorage.setItem('sessionTitles', JSON.stringify(sessionTitles));
    console.log('Session title saved:', { sessionId, title });
}

// Function to get session title
function getSessionTitle(sessionId) {
    const sessionTitles = JSON.parse(localStorage.getItem('sessionTitles')) || {};
    return sessionTitles[sessionId] || 'Agent Conversation';
}

// Function to update current session title
function updateCurrentSessionTitle(title) {
    const currentSession = getCurrentSession();
    if (currentSession && title && title !== 'Agent Conversation') {
        saveSessionTitle(currentSession, title);
        // Update the session list display
        loadChatHistory();
    }
}

// Function to load chat history from localStorage
function loadChatHistory() {
    const chatHistory = JSON.parse(localStorage.getItem('chatHistory')) || [];
    const sessions = groupBySession(chatHistory);
    renderSessionList(sessions);
}

// Function to group messages by session
function groupBySession(chatHistory) {
    console.log('Grouping chat history:', chatHistory.length, 'total messages');
    const sessions = chatHistory.reduce((sessions, entry) => {
        if (!sessions[entry.session]) {
            sessions[entry.session] = [];
            console.log('Created new session group:', entry.session);
        }
        sessions[entry.session].push(entry);
        return sessions;
    }, {});

    console.log('Sessions grouped:', Object.keys(sessions).length, 'sessions');
    Object.keys(sessions).forEach(sessionId => {
        console.log(`Session ${sessionId}: ${sessions[sessionId].length} messages`);
    });

    return sessions;
}

// Function to render session list
function renderSessionList(sessions) {
    sessionList.innerHTML = '';
    const currentSession = getCurrentSession();

    // Sort sessions by date (newest first)
    const sortedSessions = Object.keys(sessions).sort((a, b) => new Date(b) - new Date(a));

    sortedSessions.forEach((session, index) => {
        const sessionItem = document.createElement('div');
        sessionItem.className = 'sessionItem';

        // Highlight current session
        if (session === currentSession) {
            sessionItem.classList.add('active');
        }

        const sessionText = document.createElement('span');
        // Create user-friendly session name
        const sessionName = getSessionDisplayName(sessions[session], session, index);
        sessionText.textContent = sessionName;
        sessionText.addEventListener('click', () => {
            // Update current session FIRST before loading messages
            localStorage.setItem('currentSession', session);
            // Clear the chat window
            chatWindow.innerHTML = '';
            // Load the selected session messages
            loadSessionMessages(sessions[session]);
            // Refresh the session list to update highlighting (but don't reload chat history)
            renderSessionList(sessions);
        });

        const deleteIcon = document.createElement('span');
        deleteIcon.className = 'deleteIcon';
        deleteIcon.innerHTML = '&#215;'; // Use an appropriate icon (trash can)
        deleteIcon.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteSession(session);
        });

        sessionItem.appendChild(sessionText);
        sessionItem.appendChild(deleteIcon);
        sessionList.appendChild(sessionItem);
    });
}

// Function to generate user-friendly session names
function getSessionDisplayName(sessionMessages, sessionId, index) {
    // First check if we have a saved title for this session
    const savedTitle = getSessionTitle(sessionId);
    if (savedTitle && savedTitle !== 'Agent Conversation') {
        return savedTitle;
    }

    // Try to use the first user message as the session name
    const firstUserMessage = sessionMessages.find(msg => msg.sender === 'user');
    if (firstUserMessage && firstUserMessage.message) {
        // Truncate long messages and clean up
        let title = firstUserMessage.message.replace(/\n/g, ' ').trim();
        if (title.length > 40) {
            title = title.substring(0, 40) + '...';
        }
        return title;
    }

    // Fallback to date-based naming
    const sessionDate = new Date(sessionMessages[0].session);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (sessionDate.toDateString() === today.toDateString()) {
        return `Today's Chat ${index > 0 ? index + 1 : ''}`.trim();
    } else if (sessionDate.toDateString() === yesterday.toDateString()) {
        return `Yesterday's Chat ${index > 0 ? index + 1 : ''}`.trim();
    } else {
        return sessionDate.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}

// Function to delete a session
function deleteSession(session) {
    let chatHistory = JSON.parse(localStorage.getItem('chatHistory')) || [];
    chatHistory = chatHistory.filter(entry => entry.session !== session);
    localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
    loadChatHistory();
}

// Function to load messages of a session
function loadSessionMessages(messages) {
    console.log('Loading session messages:', messages.length, 'messages');
    console.log('First message session:', messages[0]?.session);
    console.log('Current session:', getCurrentSession());

    // Get the session ID from the first message
    const sessionId = messages[0]?.session;

    // Restore conversation title for this session
    if (sessionId) {
        const savedTitle = getSessionTitle(sessionId);
        currentConversationTitle = savedTitle;
        updateConversationTitleDisplay(savedTitle);
    }

    // Clear the chat window completely
    chatWindow.innerHTML = '';

    // Load messages in chronological order
    messages.forEach((entry, index) => {
        console.log(`Loading message ${index + 1}:`, entry);
        if (entry.sender === 'user') {
            renderUserMessage(entry.message);
        } else if (entry.sender === 'bot') {
            // Create a proper activity object for historical bot messages
            const activity = {
                text: entry.message,
                from: { id: 'bot' },
                type: 'message',
                timestamp: entry.timestamp || new Date().toISOString()
            };
            renderActivity(activity);
        }
    });

    // Clear any selected file when switching sessions
    removeSelectedFile();

    // Mark recent messages for always-visible metadata after loading
    setTimeout(() => {
        markRecentMessages();

        // Update LLM context if panel is visible
        updateLLMContextIndicator();
    }, 100); // Small delay to ensure DOM is fully updated

    // Update new chat button state
    updateNewChatButtonState();

    // Add click events to all loaded images
    const allImages = chatWindow.querySelectorAll('img');
    allImages.forEach(img => {
        img.style.cursor = 'pointer';
        img.addEventListener('click', function () {
            showEnlargedImage(this.src);
        });
    });

    console.log('Session messages loaded successfully');
}

// Function to get current session
function getCurrentSession() {
    let currentSession = localStorage.getItem('currentSession');
    if (!currentSession) {
        currentSession = new Date().toISOString();
        localStorage.setItem('currentSession', currentSession);
        console.log('Created new session:', currentSession);
    }
    return currentSession;
}

// Function to start a new session
function startNewSession() {
    const currentSession = new Date().toISOString();
    localStorage.setItem('currentSession', currentSession);
    console.log('New session started:', currentSession);

    // Reset conversation title for new session
    resetConversationTitle();

    // If DirectLine is connected, try to trigger greeting for new session
    if (directLine && directLine.connectionStatus$ && directLine.connectionStatus$.value === 2) {
        console.log('Triggering greeting for new session...');
        setTimeout(() => {
            // Send conversationUpdate to trigger greeting
            directLine.postActivity({
                from: { id: 'user' },
                type: 'conversationUpdate',
                membersAdded: [{ id: 'user' }]
            }).subscribe(
                id => console.log('New session conversationUpdate sent, id:', id),
                error => console.error('Error sending new session conversationUpdate:', error)
            );
        }, 500);
    }
}

// Function to start a new chat (without clearing history)
async function startNewChat() {
    // Only start new chat if current conversation has messages
    if (!isCurrentConversationEmpty()) {
        // Start a new session (this will save current conversation automatically)
        startNewSession();

        // Clear the chat window for new conversation
        chatWindow.innerHTML = '';

        // Clear any selected file
        removeSelectedFile();

        // Update session list to show the new conversation
        loadChatHistory();

        // Update button state
        updateNewChatButtonState();

        // Reinitialize DirectLine connection to trigger greeting (like page refresh)
        try {
            const savedSecret = await SecureStorage.retrieve('directLineSecret');
            if (savedSecret) {
                console.log('Reinitializing DirectLine for new chat...');
                await initializeDirectLine(savedSecret);
            }
        } catch (error) {
            console.error('Error reinitializing DirectLine for new chat:', error);
        }

        console.log('New chat started');
    }
}

// Function to clear ALL chat history (for debugging/admin purposes)
function clearAllChatHistory() {
    // Clear chat history from localStorage
    localStorage.removeItem('chatHistory');

    // Clear chat history from the UI
    chatWindow.innerHTML = '';

    // Clear any selected file
    removeSelectedFile();

    // Start a new session
    startNewSession();

    // Update session list
    loadChatHistory();
}

// Function to check if the current conversation is empty
function isCurrentConversationEmpty() {
    const currentSession = getCurrentSession();
    const chatHistory = JSON.parse(localStorage.getItem('chatHistory')) || [];

    // Filter messages for the current session
    const currentSessionMessages = chatHistory.filter(entry => entry.session === currentSession);

    // Return true if no messages in current session
    return currentSessionMessages.length === 0;
}

// Function to update the state of the new chat button
function updateNewChatButtonState() {
    if (isCurrentConversationEmpty()) {
        clearButton.disabled = true; // Disable the button
    } else {
        clearButton.disabled = false; // Enable the button
    }
}

// Function to open URL in right panel
function openInRightPanel(url) {
    rightPanel.style.display = 'block';
    embeddedBrowser.src = url;
}

// Function to close the right panel
function closeRightPanel() {
    rightPanel.style.display = 'none';
    embeddedBrowser.src = '';
}

// Add event listener to close button
closeButton.addEventListener('click', closeRightPanel);

// Drag functionality
let isDragging = false;

dragBar.addEventListener('mousedown', function (e) {
    if (e.button !== 0) return; // Only activate on left mouse button
    isDragging = true;
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
});

function onMouseMove(e) {
    if (!isDragging) return;
    const containerWidth = document.getElementById('container').offsetWidth;
    const newRightPanelWidth = containerWidth - e.clientX;
    if (newRightPanelWidth >= 460) {
        rightPanel.style.width = newRightPanelWidth + 'px';
    }
}

function onMouseUp() {
    isDragging = false;
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
}

// Legacy typing indicator function - now redirects to unified progress indicator
function showTypingIndicator() {
    console.log('showTypingIndicator called - redirecting to unified progress indicator');
    showProgressIndicator();
}

// Function to show enlarged image
function showEnlargedImage(src) {
    const modal = document.getElementById('imageModal');
    const enlargedImg = document.getElementById('enlargedImage');

    if (!modal || !enlargedImg) {
        console.error('Image modal elements not found');
        return;
    }

    enlargedImg.src = src;
    modal.style.display = 'flex';
    modal.classList.add('show');

    // Function to close modal
    function closeModal() {
        modal.classList.remove('show');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300); // Match the CSS transition duration
    }

    // 关闭按钮事件
    const closeBtn = modal.querySelector('.closeModal');
    if (closeBtn) {
        closeBtn.onclick = closeModal;
    }

    // 点击模态框背景也可以关闭
    modal.onclick = function (event) {
        if (event.target === modal) {
            closeModal();
        }
    };

    // ESC 键关闭模态框
    const escHandler = function (event) {
        if (event.key === 'Escape') {
            closeModal();
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);
}

// CSS styles for enlarged image (to be added in your CSS file)
/*
.imageOverlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.8);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
}

.enlargedImage {
    max-width: 90%;
    max-height: 90%;
    border: 5px solid white;
    border-radius: 10px;
}
*/

// File upload handling functions

// Handle file selection
function handleFileSelection(event) {
    const file = event.target.files[0];
    if (file) {
        selectFile(file);
    }
}

// Select a file and show preview
function selectFile(file) {
    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
        alert('File size must be less than 10MB');
        return;
    }

    // Validate file type
    const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'image/png',
        'image/jpeg',
        'image/jpg'
    ];

    if (!allowedTypes.includes(file.type)) {
        alert('File type not supported. Please upload PDF, DOC, DOCX, TXT, XLSX, PPTX, PNG, or JPG files.');
        return;
    }

    selectedFile = file;
    showFilePreview(file);
}

// Show file preview
function showFilePreview(file) {
    fileName.textContent = file.name;
    fileSize.textContent = formatFileSize(file.size);
    filePreviewContainer.style.display = 'block';
}

// Remove selected file
function removeSelectedFile() {
    selectedFile = null;
    fileInput.value = '';
    filePreviewContainer.style.display = 'none';
}

// Format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Drag and drop handlers
function handleDragOver(event) {
    event.preventDefault();
    event.stopPropagation();
    chatWindow.classList.add('dragover');
}

function handleDragLeave(event) {
    event.preventDefault();
    event.stopPropagation();
    chatWindow.classList.remove('dragover');
}

function handleFileDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    chatWindow.classList.remove('dragover');

    const files = event.dataTransfer.files;
    if (files.length > 0) {
        selectFile(files[0]);
    }
}

// Render user message with file
function renderUserMessageWithFile(message, file) {
    const messageContainer = document.createElement('div');
    messageContainer.className = 'messageContainer userMessage';

    const messageDiv = document.createElement('div');
    messageDiv.className = 'messageContent';

    // Create file display
    const fileDiv = document.createElement('div');
    fileDiv.className = 'fileMessage';

    const fileIcon = document.createElement('div');
    fileIcon.className = 'fileIcon';
    fileIcon.textContent = getFileExtension(file.name).toUpperCase();

    const fileInfo = document.createElement('div');
    fileInfo.className = 'fileInfo';

    const fileNameSpan = document.createElement('div');
    fileNameSpan.className = 'fileName';
    fileNameSpan.textContent = file.name;

    const fileSizeSpan = document.createElement('div');
    fileSizeSpan.className = 'fileSize';
    fileSizeSpan.textContent = formatFileSize(file.size);

    fileInfo.appendChild(fileNameSpan);
    fileInfo.appendChild(fileSizeSpan);
    fileDiv.appendChild(fileIcon);
    fileDiv.appendChild(fileInfo);

    messageDiv.appendChild(fileDiv);

    // Add text message if present
    if (message) {
        const textDiv = document.createElement('div');
        textDiv.style.marginTop = '8px';
        const sanitizedContent = DOMPurify.sanitize(message);
        textDiv.innerHTML = sanitizedContent;
        messageDiv.appendChild(textDiv);
    }

    const messageIcon = document.createElement('div');
    messageIcon.className = 'messageIcon';
    messageIcon.style.backgroundImage = 'url(images/Microsoft-Copilot-Logo-30.png)';

    messageContainer.appendChild(messageDiv);
    messageContainer.appendChild(messageIcon);
    chatWindow.appendChild(messageContainer);
    chatWindow.scrollTop = chatWindow.scrollHeight;
}

// Get file extension
function getFileExtension(filename) {
    return filename.split('.').pop() || '';
}

// Upload file and send message to DirectLine
function uploadFileAndSendMessage(activity, file) {
    // Convert file to base64
    const reader = new FileReader();
    reader.onload = function (e) {
        const base64Data = e.target.result;

        // Update activity with base64 data
        activity.attachments[0].contentUrl = base64Data;

        // Send to DirectLine
        directLine.postActivity(activity).subscribe(
            id => {
                console.log('Message with file sent, id:', id);
                hideProgressIndicator();
            },
            error => {
                console.error('Error sending message with file:', error);
                hideProgressIndicator();
                handleConnectionError(error);
            }
        );
    };

    reader.onerror = function () {
        console.error('Error reading file');
        hideProgressIndicator();
    };

    reader.readAsDataURL(file);
}

// Error handling functions
function handleConnectionError(error) {
    console.error('Connection error:', error);

    // Check if it's a connection failure
    if (error.message && error.message.includes('failed to connect')) {
        showErrorMessage('Unable to connect to the bot service. Please check your DirectLine secret and network connection.');

        // Try to reconnect after a delay
        setTimeout(async () => {
            if (currentAgentId && agents[currentAgentId]) {
                console.log('Attempting to reconnect...');
                await initializeDirectLine(agents[currentAgentId].secret);
            }
        }, 3000);
    } else if (error.status === 401 || error.status === 403) {
        showErrorMessage('Authentication failed. Please check your DirectLine secret.');
    } else if (error.status >= 500) {
        showErrorMessage('Bot service is temporarily unavailable. Please try again later.');
    } else {
        showErrorMessage('An error occurred while sending the message. Please try again.');
    }
}

function showErrorMessage(message) {
    // Create error message element
    const errorContainer = document.createElement('div');
    errorContainer.className = 'messageContainer botMessage error-message';

    const errorIcon = document.createElement('div');
    errorIcon.className = 'messageIcon error-icon';
    errorIcon.innerHTML = '⚠️';

    const errorDiv = document.createElement('div');
    errorDiv.className = 'messageContent error-content';
    errorDiv.textContent = message;

    errorContainer.appendChild(errorIcon);
    errorContainer.appendChild(errorDiv);

    chatWindow.appendChild(errorContainer);
    chatWindow.scrollTop = chatWindow.scrollHeight;

    // Auto-remove error message after 10 seconds
    setTimeout(() => {
        if (errorContainer.parentNode) {
            errorContainer.parentNode.removeChild(errorContainer);
        }
    }, 10000);
}

// LLM Analysis Panel Functions
// Initialize LLM panel state on page load
function initializeLLMPanelState() {
    const llmEnabled = localStorage.getItem('enableLLM') === 'true';
    console.log('Initializing LLM panel state:', llmEnabled);

    // Show/hide LLM panel and toggle button based on stored state
    toggleLLMPanel(llmEnabled);

    // Update status indicator
    if (llmEnabled) {
        updateLLMStatus();
    }
}

function toggleLLMPanel(show) {
    const llmPanel = document.getElementById('llmAnalysisPanel');
    const toggleBtn = document.getElementById('toggleLLMPanelBtn');

    if (llmPanel) {
        // Clear any inline display style that might override CSS
        llmPanel.style.display = '';

        // Use the collapsed class instead of display style to match CSS
        if (show) {
            llmPanel.classList.remove('collapsed');
        } else {
            llmPanel.classList.add('collapsed');
        }

        // The toggle button visibility should only depend on whether LLM is enabled,
        // not whether the panel is currently shown/hidden
        if (toggleBtn) {
            const llmEnabled = localStorage.getItem('enableLLM') === 'true';
            toggleBtn.style.display = llmEnabled ? 'inline-flex' : 'none';
        }

        // Update LLM status when showing panel
        if (show) {
            updateLLMStatus();
        }

        // Initialize LLM panel if showing for first time
        if (show && !llmPanel.hasAttribute('data-initialized')) {
            initializeLLMPanel();
            llmPanel.setAttribute('data-initialized', 'true');
        }
    }
}

function updateLLMStatus() {
    const llmStatus = document.getElementById('llmStatus');
    const llmEnabled = localStorage.getItem('enableLLM') === 'true';
    const selectedProvider = localStorage.getItem('selectedApiProvider') || 'openai';

    if (!llmEnabled) {
        llmStatus.textContent = 'Disabled';
        llmStatus.className = 'status-indicator';
        return;
    }

    if (selectedProvider === 'ollama') {
        const ollamaLastWorking = localStorage.getItem('ollamaLastWorking') === 'true';
        if (ollamaLastWorking) {
            llmStatus.textContent = 'Connected';
            llmStatus.className = 'status-indicator connected';
        } else {
            llmStatus.textContent = 'Disconnected';
            llmStatus.className = 'status-indicator';
        }
    } else {
        // For other providers, check if API key exists
        SecureStorage.retrieve(`${selectedProvider}ApiKey`).then(apiKey => {
            if (apiKey) {
                llmStatus.textContent = 'Ready';
                llmStatus.className = 'status-indicator connected';
            } else {
                llmStatus.textContent = 'No API Key';
                llmStatus.className = 'status-indicator';
            }
        });
    }
} function initializeLLMPanel() {
    const llmSendButton = document.getElementById('llmSendButton');
    const llmUserInput = document.getElementById('llmUserInput');
    const quickActionButtons = document.querySelectorAll('.quick-action-btn');
    const toggleBtn = document.getElementById('toggleLLMPanelBtn');

    // LLM send button event listener
    if (llmSendButton && llmUserInput) {
        llmSendButton.addEventListener('click', sendLLMMessage);

        llmUserInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendLLMMessage();
            }
        });

        // Auto-resize textarea
        llmUserInput.addEventListener('input', function () {
            this.style.height = 'auto';
            this.style.height = Math.min(this.scrollHeight, 120) + 'px';
        });
    }

    // Quick action buttons
    quickActionButtons.forEach(btn => {
        btn.addEventListener('click', handleQuickAction);
    });

    // Toggle panel button
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            const llmPanel = document.getElementById('llmAnalysisPanel');
            const isVisible = llmPanel.style.display !== 'none';
            llmPanel.style.display = isVisible ? 'none' : 'flex';
        });
    }
}

async function sendQuickActionRequest(messageWithContext) {
    try {
        // Check if LLM is enabled and configured
        const llmEnabled = localStorage.getItem('enableLLM') === 'true';
        if (!llmEnabled) {
            throw new Error('AI Companion not enabled. Please enable it in settings.');
        }

        const selectedProvider = localStorage.getItem('selectedApiProvider') || 'openai';

        if (selectedProvider === 'ollama') {
            await handleLLMOllamaStreaming(messageWithContext);
        } else {
            await handleLLMAPIStreaming(messageWithContext);
        }
    } catch (error) {
        console.error('Error sending quick action request:', error);
        hideLLMTypingIndicator();
        renderLLMMessage('error', `Error: ${error.message}`);
    }
}

async function sendLLMMessage() {
    const llmUserInput = document.getElementById('llmUserInput');
    const userMessage = llmUserInput.value.trim();

    if (!userMessage) return;

    // Clear input
    llmUserInput.value = '';
    llmUserInput.style.height = 'auto';

    // For manual user input, show the message and add context automatically
    renderLLMMessage('user', userMessage);

    // Add conversation context for user messages
    const conversationContext = getConversationContext();
    const messageWithContext = `${conversationContext}\n\nUser Question: ${userMessage}`;

    // Show typing indicator in LLM panel
    showLLMTypingIndicator();

    try {
        // Check if LLM is enabled and configured
        const llmEnabled = localStorage.getItem('enableLLM') === 'true';
        if (!llmEnabled) {
            throw new Error('AI Companion not enabled. Please enable it in settings.');
        }

        const selectedProvider = localStorage.getItem('selectedApiProvider') || 'openai';

        if (selectedProvider === 'ollama') {
            await handleLLMOllamaStreaming(messageWithContext);
        } else {
            await handleLLMGenericAPI(messageWithContext, selectedProvider);
        }
    } catch (error) {
        console.error('LLM message error:', error);
        hideLLMTypingIndicator();
        renderLLMMessage('error', `Error: ${error.message}`);
    }
} function handleQuickAction(event) {
    const action = event.target.getAttribute('data-action');

    // Get current conversation context
    const conversationContext = getConversationContext();

    let prompt = '';
    let actionLabel = '';

    switch (action) {
        case 'analyze':
            actionLabel = 'Analyzing latest response...';
            prompt = `${conversationContext}\n\nPlease analyze the latest agent response for accuracy, helpfulness, and completeness. Consider:\n- Did the agent address all parts of the user's question?\n- Is the information provided accurate and up-to-date?\n- Are there any gaps or areas for improvement?\n- How would you rate the response quality (1-10)?\n\nFocus your analysis on the most recent agent response in the conversation above.`;
            break;
        case 'summarize':
            actionLabel = 'Summarizing conversation...';
            prompt = `${conversationContext}\n\nPlease provide a concise summary of this conversation, highlighting:\n- The main user requests and questions\n- Key information provided by the agent\n- Any unresolved issues or follow-up needed\n- Overall conversation outcome`;
            break;
        case 'suggest':
            actionLabel = 'Suggesting title...';
            prompt = `${conversationContext}\n\nBased on this conversation, suggest a short, descriptive title (max 40 characters) that captures the main topic or question discussed. Respond with only the title, no additional text.`;
            break;
    }

    if (prompt) {
        // Show action label instead of the full prompt in chat
        renderLLMMessage('user', actionLabel);

        // Show typing indicator
        showLLMTypingIndicator();

        // Send the request directly without showing in input field
        sendQuickActionRequest(prompt);
    }
} function renderLLMMessage(sender, message) {
    const llmChatWindow = document.getElementById('llmChatWindow');

    const messageContainer = document.createElement('div');
    messageContainer.className = `messageContainer ${sender}Message ${sender === 'error' ? 'errorMessage' : ''}`;

    if (sender === 'user') {
        messageContainer.classList.add('userMessage');
    } else if (sender === 'bot') {
        messageContainer.classList.add('llmMessage');
    }

    const messageDiv = document.createElement('div');
    messageDiv.className = 'messageContent';

    if (sender === 'bot') {
        // Parse markdown for LLM responses
        const markdownContent = marked.parse(message);
        const sanitizedContent = DOMPurify.sanitize(markdownContent);
        messageDiv.innerHTML = sanitizedContent;
    } else {
        messageDiv.textContent = message;
    }

    const messageIcon = document.createElement('div');
    messageIcon.className = 'messageIcon';

    if (sender === 'user') {
        messageIcon.style.backgroundImage = 'url("images/carter_30k.png")';
    } else {
        messageIcon.style.backgroundImage = 'url("images/Microsoft-Copilot-Logo-30.png")';
    }

    messageContainer.appendChild(messageIcon);
    messageContainer.appendChild(messageDiv);
    llmChatWindow.appendChild(messageContainer);
    llmChatWindow.scrollTop = llmChatWindow.scrollHeight;
}

function showLLMTypingIndicator() {
    const llmChatWindow = document.getElementById('llmChatWindow');

    // Remove existing indicator
    const existingIndicator = llmChatWindow.querySelector('#llmTypingIndicator');
    if (existingIndicator) {
        existingIndicator.remove();
    }

    const indicatorContainer = document.createElement('div');
    indicatorContainer.className = 'messageContainer botMessage';
    indicatorContainer.id = 'llmTypingIndicator';

    const messageIcon = document.createElement('div');
    messageIcon.className = 'messageIcon';
    messageIcon.style.backgroundImage = 'url("images/Microsoft-Copilot-Logo-30.png")';

    const typingIndicator = document.createElement('div');
    typingIndicator.className = 'typingIndicator';

    for (let i = 0; i < 3; i++) {
        const dot = document.createElement('span');
        typingIndicator.appendChild(dot);
    }

    indicatorContainer.appendChild(messageIcon);
    indicatorContainer.appendChild(typingIndicator);
    llmChatWindow.appendChild(indicatorContainer);
    llmChatWindow.scrollTop = llmChatWindow.scrollHeight;
}

function hideLLMTypingIndicator() {
    const indicator = document.getElementById('llmTypingIndicator');
    if (indicator) {
        indicator.remove();
    }
}

async function handleLLMOllamaStreaming(message) {
    try {
        const response = await sendToOllama(message);
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        hideLLMTypingIndicator();

        let fullResponse = '';
        let messageContainer = null;
        let messageDiv = null;

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n').filter(line => line.trim());

            for (const line of lines) {
                try {
                    const data = JSON.parse(line);
                    if (data.response) {
                        fullResponse += data.response;

                        if (!messageContainer) {
                            // Create initial message container
                            messageContainer = document.createElement('div');
                            messageContainer.className = 'messageContainer llmMessage';

                            const messageIcon = document.createElement('div');
                            messageIcon.className = 'messageIcon';
                            messageIcon.style.backgroundImage = 'url("images/Microsoft-Copilot-Logo-30.png")';

                            messageDiv = document.createElement('div');
                            messageDiv.className = 'messageContent';

                            messageContainer.appendChild(messageIcon);
                            messageContainer.appendChild(messageDiv);

                            const llmChatWindow = document.getElementById('llmChatWindow');
                            llmChatWindow.appendChild(messageContainer);
                        }

                        // Update content with streaming response
                        const markdownContent = marked.parse(fullResponse);
                        const sanitizedContent = DOMPurify.sanitize(markdownContent);
                        messageDiv.innerHTML = sanitizedContent;

                        const llmChatWindow = document.getElementById('llmChatWindow');
                        llmChatWindow.scrollTop = llmChatWindow.scrollHeight;
                    }
                } catch (parseError) {
                    console.warn('Failed to parse LLM response chunk:', parseError);
                }
            }
        }
    } catch (error) {
        console.error('LLM Ollama streaming error:', error);
        hideLLMTypingIndicator();
        throw error;
    }
}

async function handleLLMGenericAPI(message, provider) {
    // Placeholder for other LLM APIs (OpenAI, Anthropic, etc.)
    hideLLMTypingIndicator();
    renderLLMMessage('error', `${provider} API integration is not yet implemented for LLM analysis. Please use Ollama.`);
}

function updateLLMContextIndicator() {
    const llmPanel = document.getElementById('llmAnalysisPanel');
    const contextIndicator = llmPanel?.querySelector('.context-indicator span');

    if (!contextIndicator || llmPanel.style.display === 'none') return;

    // Count messages in current conversation
    const chatWindow = document.getElementById('chatWindow');
    const messageContainers = chatWindow.querySelectorAll('.messageContainer');
    const messageCount = messageContainers.length;

    if (messageCount === 0) {
        contextIndicator.textContent = 'No conversation to analyze yet';
    } else {
        contextIndicator.textContent = `Auto-including ${messageCount} messages from current conversation`;
    }
}

// Function to get conversation context for LLM analysis
function getConversationContext() {
    // Get messages from current chat window (more up-to-date than localStorage)
    const chatWindow = document.getElementById('chatWindow');
    const messageContainers = chatWindow.querySelectorAll('.messageContainer');

    let context = '=== CURRENT CONVERSATION CONTEXT ===\n\n';

    if (messageContainers.length === 0) {
        context += 'No conversation yet.\n\n';
        return context;
    }

    // Extract messages from DOM (more reliable for current session)
    messageContainers.forEach((container, index) => {
        const isUser = container.classList.contains('userMessage');
        const messageContent = container.querySelector('.messageContent');

        if (messageContent) {
            const role = isUser ? 'User' : 'Agent';
            let text = messageContent.textContent || messageContent.innerText || '';

            // Clean up the text and limit length
            text = text.trim();
            if (text.length > 1000) {
                text = text.substring(0, 1000) + '...[truncated]';
            }

            if (text) {
                context += `${role}: ${text}\n\n`;
            }
        }
    });

    context += '=== END CONVERSATION CONTEXT ===\n\n';
    return context;
}

// Global variable to store current conversation title
let currentConversationTitle = 'Agent Conversation';
let titleUpdateTimeout = null;

// Function to schedule conversation title update with debouncing
function scheduleConversationTitleUpdate() {
    const llmEnabled = localStorage.getItem('enableLLM') === 'true';
    if (!llmEnabled) {
        return;
    }

    // Clear any existing timeout
    if (titleUpdateTimeout) {
        clearTimeout(titleUpdateTimeout);
    }

    // Schedule title update after a delay to avoid frequent API calls
    titleUpdateTimeout = setTimeout(() => {
        updateConversationTitle();
        titleUpdateTimeout = null;
    }, 3000); // Wait 3 seconds after the last message
}

// Function to update conversation title using LLM
async function updateConversationTitle() {
    const llmEnabled = localStorage.getItem('enableLLM') === 'true';
    if (!llmEnabled) {
        console.log('AI Companion not enabled, skipping title update');
        return;
    }

    try {
        const context = getConversationContext();

        // Only generate title if we have enough conversation content
        if (!context || context.length < 100) {
            console.log('Not enough conversation content for title generation');
            return;
        }

        const titlePrompt = `${context}\n\nBased on this conversation, suggest a short, descriptive title (max 40 characters) that captures the main topic. Respond with only the title, no additional text.`;

        console.log('Generating conversation title...');

        // Use the same LLM infrastructure as the companion
        const selectedProvider = localStorage.getItem('selectedApiProvider') || 'openai';

        let generatedTitle = '';

        if (selectedProvider === 'ollama') {
            generatedTitle = await generateTitleWithOllama(titlePrompt);
        } else {
            generatedTitle = await generateTitleWithAPI(titlePrompt, selectedProvider);
        }

        if (generatedTitle && generatedTitle.length > 0) {
            // Clean up the title (remove quotes, trim, limit length)
            generatedTitle = generatedTitle.replace(/['"]/g, '').trim();
            if (generatedTitle.length > 40) {
                generatedTitle = generatedTitle.substring(0, 37) + '...';
            }

            // Update the current conversation title
            currentConversationTitle = generatedTitle;
            updateConversationTitleDisplay(generatedTitle);

            // Save the title for the current session
            updateCurrentSessionTitle(generatedTitle);

            console.log('Conversation title updated:', generatedTitle);
        }

    } catch (error) {
        console.error('Error updating conversation title:', error);
    }
}

// Function to generate title using Ollama
async function generateTitleWithOllama(prompt) {
    try {
        const ollamaUrl = localStorage.getItem('ollamaUrl') || 'http://localhost:11434';
        const selectedModel = localStorage.getItem('ollamaSelectedModel');

        if (!selectedModel) {
            throw new Error('No Ollama model selected');
        }

        const response = await fetch(`${ollamaUrl}/api/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: selectedModel,
                prompt: prompt,
                stream: false, // We want the complete response for title generation
                options: {
                    temperature: 0.3, // Lower temperature for more focused responses
                    max_tokens: 50
                }
            })
        });

        if (!response.ok) {
            throw new Error(`Ollama API error: ${response.status}`);
        }

        const data = await response.json();
        return data.response || '';

    } catch (error) {
        console.error('Error generating title with Ollama:', error);
        return '';
    }
}

// Function to generate title using OpenAI/Anthropic/Azure APIs
async function generateTitleWithAPI(prompt, provider) {
    try {
        const apiKey = await SecureStorage.retrieve(`${provider}ApiKey`);
        if (!apiKey) {
            throw new Error(`No API key found for ${provider}`);
        }

        let apiUrl, headers, body;

        switch (provider) {
            case 'openai':
                apiUrl = 'https://api.openai.com/v1/chat/completions';
                headers = {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                };
                body = {
                    model: 'gpt-3.5-turbo',
                    messages: [{ role: 'user', content: prompt }],
                    max_tokens: 50,
                    temperature: 0.3
                };
                break;

            case 'anthropic':
                apiUrl = 'https://api.anthropic.com/v1/messages';
                headers = {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01'
                };
                body = {
                    model: 'claude-3-haiku-20240307',
                    max_tokens: 50,
                    messages: [{ role: 'user', content: prompt }]
                };
                break;

            case 'azure':
                // Azure implementation would depend on specific endpoint
                throw new Error('Azure title generation not implemented yet');

            default:
                throw new Error(`Unsupported provider: ${provider}`);
        }

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            throw new Error(`${provider} API error: ${response.status}`);
        }

        const data = await response.json();

        if (provider === 'openai') {
            return data.choices?.[0]?.message?.content || '';
        } else if (provider === 'anthropic') {
            return data.content?.[0]?.text || '';
        }

        return '';

    } catch (error) {
        console.error(`Error generating title with ${provider}:`, error);
        return '';
    }
}

// Function to update the conversation title display
function updateConversationTitleDisplay(title) {
    const titleElement = document.getElementById('agentConversationTitle');
    if (titleElement) {
        titleElement.textContent = title;
        titleElement.title = title; // Add tooltip for full title
    }
}

// Function to reset conversation title to default
function resetConversationTitle() {
    currentConversationTitle = 'Agent Conversation';
    updateConversationTitleDisplay(currentConversationTitle);
}

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', initializeApp);
// chat.js

// DirectLine initialization will be done dynamically after getting secret
let directLine;

// Initialize the application
async function initializeApp() {
    try {
        // Try to get saved DirectLine secret
        const savedSecret = await SecureStorage.retrieve('directLineSecret');
        
        if (savedSecret) {
            await initializeDirectLine(savedSecret);
        } else {
            // No saved secret, show setup modal
            showSetupModal();
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
        return true;
    } catch (error) {
        console.error('Error initializing DirectLine:', error);
        return false;
    }
}

function setupDirectLineSubscriptions() {
    // Receive messages from bot
    directLine.activity$.subscribe(activity => {
        console.log('Received activity:', activity);

        // 处理打字指示器
        if (activity.type === 'typing') {
            // 可选：显示打字指示器
            showTypingIndicator();
            return;
        }

        // 处理消息和对话更新
        if (activity.from && activity.from.id !== 'user') {
            if (activity.type === 'message') {
                renderActivity(activity);
            }
            // 处理对话更新类型的消息（可能包含欢迎消息）
            else if (activity.type === 'conversationUpdate') {
                // 一些 bot 使用 conversationUpdate 发送欢迎消息
                console.log('Conversation updated:', activity);
                // 如果有实际内容，可以尝试渲染
                if (activity.text) {
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
            break;
        case 2: // ConnectionStatus.Online
            console.log('The bot is online!');

            // 发送 startConversation 事件
            directLine.postActivity({
                from: { id: 'user' },
                type: 'event',
                name: 'startConversation',
                value: ''
            }).subscribe(
                id => console.log('startConversation event sent, id:', id),
                error => console.error('Error sending startConversation event:', error)
            );

            // // 先发送 join 事件
            // directLine.postActivity({
            //     from: { id: 'user' },
            //     type: 'event',
            //     name: 'webchat/join',
            //     value: ''
            // }).subscribe(
            //     id => {
            //         console.log('Initialization event sent, id:', id);

            //         // 再发送空消息，进一步确保触发欢迎消息
            //         setTimeout(() => {
            //             directLine.postActivity({
            //                 from: { id: 'user' },
            //                 type: 'message',
            //                 text: ''
            //             }).subscribe(
            //                 id => console.log('Empty message sent, id:', id),
            //                 error => console.error('Error sending empty message:', error)
            //             );
            //         }, 1000);
            //     },
            //     error => console.error('Error sending initialization event:', error)
            // );
            break;
        case 3: // ConnectionStatus.ExpiredToken
            console.log('The token has expired.');
            break;
        case 4: // ConnectionStatus.FailedToConnect
            console.log('Failed to connect to the bot.');
            break;
        case 5: // ConnectionStatus.Ended
            console.log('The connection has ended.');
            break;
        default:
            console.log('Unknown connection status:', status);
    }
});

    startNewSession();
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

// File upload elements
const fileInput = document.getElementById('fileInput');
const attachButton = document.getElementById('attachButton');
const filePreviewContainer = document.getElementById('filePreviewContainer');
const fileName = document.getElementById('fileName');
const fileSize = document.getElementById('fileSize');
const removeFileButton = document.getElementById('removeFileButton');

// Setup modal elements
const setupButton = document.getElementById('setupButton');
const setupModal = document.getElementById('setupModal');
const closeSetupModal = document.getElementById('closeSetupModal');
const secretInput = document.getElementById('secretInput');
const toggleSecretVisibility = document.getElementById('toggleSecretVisibility');
const testConnectionBtn = document.getElementById('testConnectionBtn');
const saveConfigBtn = document.getElementById('saveConfigBtn');
const connectionStatus = document.getElementById('connectionStatus');
const statusIndicator = document.getElementById('statusIndicator');
const statusText = document.getElementById('statusText');

// File upload state
let selectedFile = null;

// DirectLine connection state
let currentDirectLine = null;

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

// Load chat history from localStorage
loadChatHistory();
updateNewChatButtonState(); // Update button state after loading history

// Event Listeners
sendButton.addEventListener('click', sendMessage);
userInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
        sendMessage();
    }
});
clearButton.addEventListener('click', startNewChat); // Add event listener to new chat button
closeButton.addEventListener('click', closeRightPanel); // Add event listener to close button

// Setup modal event listeners
setupButton.addEventListener('click', showSetupModal);
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

testConnectionBtn.addEventListener('click', testDirectLineConnection);
saveConfigBtn.addEventListener('click', saveConfiguration);

// Setup modal functions
async function showSetupModal() {
    // Load existing secret if available
    const savedSecret = await SecureStorage.retrieve('directLineSecret');
    if (savedSecret) {
        secretInput.value = savedSecret;
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

    testConnectionBtn.disabled = true;
    testConnectionBtn.textContent = 'Testing...';
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
        
        testConnectionBtn.disabled = false;
        testConnectionBtn.textContent = 'Test Connection';
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

        // Render user's message (with file if present)
        if (selectedFile) {
            renderUserMessageWithFile(message, selectedFile);
        } else {
            renderUserMessage(message);
        }

        // Show progress indicator
        showProgressIndicator();

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

        // Post activity to Direct Line
        if (selectedFile) {
            uploadFileAndSendMessage(activity, selectedFile);
        } else {
            directLine.postActivity(activity).subscribe(
                id => console.log('Message sent, id:', id),
                error => console.error('Error sending message:', error)
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
}

// Render activity (bot's messages)
function renderActivity(activity) {
    // Hide progress indicator
    hideProgressIndicator();

    // Check if there's content to display
    if (
        !activity.text &&
        (!activity.attachments || activity.attachments.length === 0) &&
        (!activity.suggestedActions || activity.suggestedActions.actions.length === 0)
    ) {
        // No content to display, return without rendering
        return;
    }
    console.log('Received activity:', activity);

    const messageContainer = document.createElement('div');
    messageContainer.className = 'messageContainer botMessage';

    const messageIcon = document.createElement('div');
    messageIcon.className = 'messageIcon';
    messageIcon.style.backgroundImage = 'url("images/Microsoft-Copilot-Logo-30.png")'; // Replace with the path to your bot icon

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

        // 为所有图片添加点击放大功能
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
    }

    // Append the message only if there is content
    if (hasContent) {
        messageContainer.appendChild(messageIcon);
        messageContainer.appendChild(messageDiv);
        chatWindow.appendChild(messageContainer);
        chatWindow.scrollTop = chatWindow.scrollHeight;
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

// Function to show progress indicator
function showProgressIndicator() {
    const messageContainer = document.createElement('div');
    messageContainer.className = 'messageContainer botMessage';

    const progressIndicator = document.createElement('div');
    progressIndicator.id = 'progressIndicator'; // Ensure the ID is set
    progressIndicator.className = 'progressIndicator';

    messageContainer.appendChild(progressIndicator);

    chatWindow.appendChild(messageContainer);
    chatWindow.scrollTop = chatWindow.scrollHeight;
}

// Function to hide progress indicator
function hideProgressIndicator() {
    const progressIndicator = document.getElementById('progressIndicator');
    console.log('progressIndicator:', progressIndicator);
    if (progressIndicator) {
        progressIndicator.parentElement.remove();
    } else {
        console.warn('Progress indicator not found.');
    }
}

// Function to save message to localStorage
function saveMessageToLocalStorage(sender, message) {
    const chatHistory = JSON.parse(localStorage.getItem('chatHistory')) || [];
    const currentSession = getCurrentSession();
    chatHistory.push({ session: currentSession, sender, message });
    localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
    console.log('Message saved to localStorage:', { session: currentSession, sender, message });
}

// Function to load chat history from localStorage
function loadChatHistory() {
    const chatHistory = JSON.parse(localStorage.getItem('chatHistory')) || [];
    const sessions = groupBySession(chatHistory);
    renderSessionList(sessions);
}

// Function to group messages by session
function groupBySession(chatHistory) {
    return chatHistory.reduce((sessions, entry) => {
        if (!sessions[entry.session]) {
            sessions[entry.session] = [];
        }
        sessions[entry.session].push(entry);
        return sessions;
    }, {});
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
        const sessionName = getSessionDisplayName(sessions[session], index);
        sessionText.textContent = sessionName;
        sessionText.addEventListener('click', () => {
            loadSessionMessages(sessions[session]);
            // Update current session when clicking on a different session
            localStorage.setItem('currentSession', session);
            // Refresh the session list to update highlighting
            loadChatHistory();
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
function getSessionDisplayName(sessionMessages, index) {
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
    chatWindow.innerHTML = '';
    messages.forEach(entry => {
        if (entry.sender === 'user') {
            renderUserMessage(entry.message);
        } else if (entry.sender === 'bot') {
            renderActivity({ from: { id: 'bot' }, type: 'message', text: entry.message });
        }
    });

    // Clear any selected file when switching sessions
    removeSelectedFile();

    // Update new chat button state
    updateNewChatButtonState();

    // 为所有已加载的图片添加点击事件
    const allImages = chatWindow.querySelectorAll('img');
    allImages.forEach(img => {
        img.style.cursor = 'pointer';
        img.addEventListener('click', function () {
            showEnlargedImage(this.src);
        });
    });
}

// Function to get current session
function getCurrentSession() {
    let currentSession = localStorage.getItem('currentSession');
    if (!currentSession) {
        currentSession = new Date().toISOString();
        localStorage.setItem('currentSession', currentSession);
    }
    return currentSession;
}

// Function to start a new session
function startNewSession() {
    const currentSession = new Date().toISOString();
    localStorage.setItem('currentSession', currentSession);
    console.log('New session started:', currentSession);
}

// Function to start a new chat (without clearing history)
function startNewChat() {
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
    if (newRightPanelWidth <= 640) {
        rightPanel.style.width = newRightPanelWidth + 'px';
    }
}

function onMouseUp() {
    isDragging = false;
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
}

// 添加打字指示器函数
function showTypingIndicator() {
    // 实现类似进度指示器的打字状态
    const existingIndicator = document.getElementById('typingIndicator');
    if (existingIndicator) return; // 已存在则不重复创建

    const messageContainer = document.createElement('div');
    messageContainer.className = 'messageContainer botMessage';

    const typingIndicator = document.createElement('div');
    typingIndicator.id = 'typingIndicator';
    typingIndicator.className = 'typingIndicator';
    typingIndicator.innerHTML = '<span>.</span><span>.</span><span>.</span>';

    messageContainer.appendChild(typingIndicator);
    chatWindow.appendChild(messageContainer);
    chatWindow.scrollTop = chatWindow.scrollHeight;

    // 10秒后自动移除（如果仍存在）
    setTimeout(() => {
        const indicator = document.getElementById('typingIndicator');
        if (indicator) {
            indicator.parentElement.remove();
        }
    }, 10000);
}

// Function to show enlarged image
function showEnlargedImage(src) {
    const modal = document.getElementById('imageModal');
    const enlargedImg = document.getElementById('enlargedImage');

    enlargedImg.src = src;
    modal.style.display = 'block';

    // 关闭按钮事件
    const closeBtn = document.getElementsByClassName('closeModal')[0];
    closeBtn.onclick = function () {
        modal.style.display = 'none';
    };

    // 点击模态框背景也可以关闭
    modal.onclick = function (event) {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    };

    // ESC 键关闭模态框
    document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') {
            modal.style.display = 'none';
        }
    });
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
    reader.onload = function(e) {
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
            }
        );
    };
    
    reader.onerror = function() {
        console.error('Error reading file');
        hideProgressIndicator();
    };
    
    reader.readAsDataURL(file);
}

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', initializeApp);
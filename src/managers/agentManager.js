/**
 * Agent Management Module
 * Handles multi-agent configuration, storage, and lifecycle management
 * 
 * Version: 1.0.0
 */
import { SecureStorage } from '../utils/secureStorage.js';
import { Utils } from '../utils/helpers.js';
import { DOMUtils } from '../utils/domUtils.js';

const AGENT_MANAGER_VERSION = '1.0.0';
console.log(`👥 [AgentManager] Version ${AGENT_MANAGER_VERSION} loaded`);

export class AgentManager {
    constructor() {
        this.agents = {};
        this.currentAgentId = null;
        this.isEditingAgent = false;
        this.currentEditingAgentId = null;
        this.initializeElements();
    }

    /**
     * Initialize DOM elements
     * @private
     */
    initializeElements() {
        this.elements = {
            agentsList: DOMUtils.getElementById('agentsList'),
            addNewAgentBtn: DOMUtils.getElementById('addNewAgentBtn'),
            cancelConfigBtn: DOMUtils.getElementById('cancelConfigBtn'),
            agentConfigSection: DOMUtils.getElementById('agentConfigSection'),
            configTitle: DOMUtils.getElementById('configTitle'),
            agentNameInput: DOMUtils.getElementById('agentNameInput'),
            secretInput: DOMUtils.getElementById('secretInput'),
            statusIndicator: DOMUtils.getElementById('statusIndicator'),
            statusText: DOMUtils.getElementById('statusText'),
            currentAgentDisplay: DOMUtils.getElementById('currentAgentDisplay'),
            currentAgentName: DOMUtils.getElementById('currentAgentName'),
            currentAgentStatus: DOMUtils.getElementById('currentAgentStatus'),
            testAgentBtn: DOMUtils.getElementById('testAgentBtn'),
            saveAgentBtn: DOMUtils.getElementById('saveAgentBtn')
        };
    }

    /**
     * Initialize the agent manager and set up event listeners
     * @returns {Promise<void>}
     */
    async initialize() {
        this.attachEventListeners();
        await this.loadAgents();
    }

    /**
     * Attach event listeners for agent management UI
     * @private
     */
    attachEventListeners() {
        // Add new agent button
        if (this.elements.addNewAgentBtn) {
            DOMUtils.addEventListener(this.elements.addNewAgentBtn, 'click', () => {
                this.showAgentConfigSection();
            });
        }

        // Cancel configuration button
        if (this.elements.cancelConfigBtn) {
            DOMUtils.addEventListener(this.elements.cancelConfigBtn, 'click', () => {
                this.hideAgentConfigSection();
            });
        }

        // Test agent connection button
        if (this.elements.testAgentBtn) {
            DOMUtils.addEventListener(this.elements.testAgentBtn, 'click', () => {
                // Test using the current form values
                const secret = this.elements.secretInput?.value?.trim();
                if (secret) {
                    this.testAgentConnectivity(null, secret, (status, message) => {
                        this.updateConnectionStatus(status, message);
                    });
                } else {
                    this.updateConnectionStatus('error', 'Please enter a DirectLine secret');
                }
            });
        }

        // Save agent button
        if (this.elements.saveAgentBtn) {
            DOMUtils.addEventListener(this.elements.saveAgentBtn, 'click', () => {
                this.saveCurrentAgent();
            });
        }

        // Toggle secret visibility
        const toggleSecretBtn = DOMUtils.getElementById('toggleSecretVisibility');
        if (toggleSecretBtn) {
            DOMUtils.addEventListener(toggleSecretBtn, 'click', () => {
                this.toggleSecretVisibility();
            });
        }

        console.log('AgentManager event listeners attached');
    }

    /**
     * Load agents from storage
     * @returns {Promise<void>}
     */
    async loadAgents() {
        try {
            const agentsData = await SecureStorage.retrieve('agents');
            if (agentsData) {
                // Check if agentsData is already an object or needs parsing
                if (typeof agentsData === 'string') {
                    this.agents = JSON.parse(agentsData);
                } else {
                    this.agents = agentsData;
                }
                console.log('Loaded agents:', this.agents);
            }

            const currentId = await SecureStorage.retrieve('currentAgentId');
            if (currentId && this.agents[currentId]) {
                this.currentAgentId = currentId;
                console.log('Current agent ID:', this.currentAgentId);
            }

            this.updateAgentsList();
            this.updateCurrentAgentDisplay();
        } catch (error) {
            console.error('Error loading agents:', error);
        }
    }

    /**
     * Get current agent information
     * @returns {Object|null} Current agent or null
     */
    getCurrentAgent() {
        return this.currentAgentId && this.agents[this.currentAgentId]
            ? this.agents[this.currentAgentId]
            : null;
    }

    /**
     * Save all agents to encrypted storage
     * @returns {Promise<void>}
     */
    async saveAgents() {
        try {
            console.log('Saving agents:', this.agents);
            await SecureStorage.store('agents', JSON.stringify(this.agents));
            if (this.currentAgentId) {
                await SecureStorage.store('currentAgentId', this.currentAgentId);
            }
            console.log('Agents saved successfully');
        } catch (error) {
            console.error('Error saving agents:', error);
        }
    }

    /**
     * Generate unique ID for new agent
     * @returns {string} Unique agent ID
     */
    generateAgentId() {
        return Utils.generateId('agent');
    }

    /**
     * Add or update an agent
     * @param {string|null} agentId - Agent ID (null for new agent)
     * @param {string} name - Agent name
     * @param {string} secret - DirectLine secret
     * @returns {Promise<string>} Agent ID
     */
    async addOrUpdateAgent(agentId, name, secret) {
        if (!agentId) {
            agentId = this.generateAgentId();
        }

        this.agents[agentId] = {
            id: agentId,
            name: name,
            secret: secret,
            initParams: this.agents[agentId]?.initParams || [],
            createdAt: this.agents[agentId]?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        console.log('Agent added/updated:', this.agents[agentId]);
        await this.saveAgents();
        this.updateAgentsList();
        return agentId;
    }

    /**
     * Delete an agent
     * @param {string} agentId - Agent ID to delete
     * @returns {Promise<void>}
     */
    async deleteAgent(agentId) {
        if (this.agents[agentId]) {
            delete this.agents[agentId];

            // If deleting current agent, clear current selection
            if (this.currentAgentId === agentId) {
                this.currentAgentId = null;
                await SecureStorage.store('currentAgentId', '');
            }

            await this.saveAgents();
            this.updateAgentsList();
            this.updateCurrentAgentDisplay();
            this.clearAgentForm();
        }
    }

    /**
     * Set current active agent
     * @param {string} agentId - Agent ID to set as current
     * @returns {Promise<void>}
     */
    async setCurrentAgent(agentId) {
        if (this.agents[agentId]) {
            this.currentAgentId = agentId;
            await SecureStorage.store('currentAgentId', agentId);
            this.updateCurrentAgentDisplay();
            this.updateAgentsList(); // Update list to show new active agent

            // Dispatch event for other modules to react
            window.dispatchEvent(new CustomEvent('agentChanged', {
                detail: { agentId, agent: this.agents[agentId] }
            }));
        }
    }

    /**
     * Update agents list display
     */
    updateAgentsList() {
        if (!this.elements.agentsList) return;

        const agentIds = Object.keys(this.agents);

        if (agentIds.length === 0) {
            this.elements.agentsList.innerHTML = `
                <div class="no-agents-message">
                    No agents configured. Click "Add New" to create your first agent.
                </div>
            `;
            return;
        }

        this.elements.agentsList.innerHTML = '';

        agentIds.forEach(agentId => {
            const agent = this.agents[agentId];
            const isActive = agentId === this.currentAgentId;
            const isConnected = window.directLine !== null && window.directLine !== undefined;

            const agentItem = DOMUtils.createElement('div', {
                className: `agent-item ${isActive ? 'active' : ''}`,
                dataset: { agentId }
            }, `
                <div class="agent-info">
                    <div class="agent-name">${Utils.escapeHtml(agent.name)}</div>
                    <div class="agent-status-inline">
                        ${isActive ? (isConnected ? 'Connected' : 'Active (Disconnected)') : 'Inactive'}
                    </div>
                </div>
                <div class="agent-actions">
                    ${!isActive ? `<button class="agent-btn agent-btn-switch" data-action="switch" data-agent-id="${agentId}" title="Switch to this agent">Switch</button>` : ''}
                    <button class="agent-btn agent-btn-test" data-action="test" data-agent-id="${agentId}" title="Test connection">Test</button>
                    <button class="agent-btn agent-btn-edit" data-action="edit" data-agent-id="${agentId}" title="Edit agent">Edit</button>
                    <button class="agent-btn agent-btn-params" data-action="params" data-agent-id="${agentId}" title="Init parameters">${agent.initParams?.length ? `Params (${agent.initParams.length})` : 'Params'}</button>
                    <button class="agent-btn agent-btn-delete" data-action="delete" data-agent-id="${agentId}" title="Delete agent">Delete</button>
                </div>
            `);

            this.elements.agentsList.appendChild(agentItem);
        });

        // Add event listeners to agent buttons
        this.attachAgentButtonListeners();
    }

    /**
     * Attach event listeners to agent buttons
     * @private
     */
    attachAgentButtonListeners() {
        const agentButtons = this.elements.agentsList.querySelectorAll('.agent-btn');
        agentButtons.forEach(button => {
            DOMUtils.addEventListener(button, 'click', async (e) => {
                e.stopPropagation();
                const action = button.dataset.action;
                const agentId = button.dataset.agentId;

                switch (action) {
                    case 'switch':
                        await this.setCurrentAgent(agentId);
                        // Dispatch event to close setup modal and start new chat
                        window.dispatchEvent(new CustomEvent('agentSwitched', { detail: { agentId } }));
                        break;
                    case 'test':
                        await this.testAgentConnectivity(agentId);
                        break;
                    case 'edit':
                        this.editAgent(agentId);
                        break;
                    case 'params':
                        this.toggleParamsPanel(agentId);
                        break;
                    case 'delete':
                        if (confirm(`Are you sure you want to delete "${this.agents[agentId].name}"?`)) {
                            await this.deleteAgent(agentId);
                        }
                        break;
                }
            });
        });
    }

    /**
     * Unified method to test agent connectivity
     * @param {string|null} agentId - Agent ID to test (null for form-based testing)
     * @param {string|null} secret - DirectLine secret (used when agentId is null)
     * @param {Function|null} statusCallback - Callback for status updates (used when agentId is null)
     * @returns {Promise<void>}
     */
    async testAgentConnectivity(agentId = null, secret = null, statusCallback = null) {
        let agent, testButton, testSecret;

        if (agentId) {
            // Testing existing agent from the list
            if (!this.agents[agentId]) return;

            agent = this.agents[agentId];
            testSecret = agent.secret;
            testButton = document.querySelector(`[data-action="test"][data-agent-id="${agentId}"]`);

            if (testButton) {
                testButton.textContent = 'Testing...';
                testButton.disabled = true;
            }

            console.log(`Testing agent ${agentId} with secret: ${testSecret.substring(0, 10)}...`);
        } else {
            // Testing from configuration form
            testSecret = secret;
            if (!testSecret) {
                if (statusCallback) statusCallback('error', 'Please enter a DirectLine secret');
                return;
            }

            if (statusCallback) statusCallback('testing', 'Testing connection...');
            console.log('Testing connection with secret:', testSecret.substring(0, 10) + '...');
        }

        try {
            // Check if DirectLine is available
            if (typeof window.DirectLine === 'undefined' || !window.DirectLine.DirectLine) {
                throw new Error('DirectLine library not loaded');
            }

            // Use DirectLine to test connection
            const testDirectLine = new window.DirectLine.DirectLine({
                secret: testSecret,
                webSocket: false,
                timeout: 30000
            });

            let testCompleted = false;

            const subscription = testDirectLine.connectionStatus$.subscribe({
                next: (status) => {
                    if (testCompleted) return;

                    console.log(`Connection status: ${status}${agentId ? ` (Agent: ${agentId})` : ''}`);

                    // Status values: 0=Uninitialized, 1=Connecting, 2=Online, 3=ExpiredToken, 4=FailedToConnect, 5=Ended
                    if (status === 2) { // Online
                        testCompleted = true;

                        if (agentId && testButton) {
                            testButton.textContent = 'Connected ✓';
                            testButton.style.backgroundColor = '#28a745';
                        } else if (statusCallback) {
                            statusCallback('success', 'Connection successful!');
                        }

                        subscription.unsubscribe();
                        testDirectLine.end();

                        // Reset button after 3 seconds for agent list tests
                        if (agentId) {
                            setTimeout(() => {
                                this.updateAgentsList();
                            }, 3000);
                        }
                    } else if (status === 4 || status === 3) { // FailedToConnect or ExpiredToken
                        testCompleted = true;
                        const errorMsg = status === 3 ?
                            'Invalid or expired DirectLine secret' :
                            'Failed to connect to DirectLine service';

                        if (agentId && testButton) {
                            testButton.textContent = status === 3 ? 'Invalid Secret!' : 'Failed!';
                            testButton.style.backgroundColor = '#dc3545';
                        } else if (statusCallback) {
                            statusCallback('error', errorMsg);
                        }

                        subscription.unsubscribe();
                        testDirectLine.end();

                        // Reset button after 3 seconds for agent list tests
                        if (agentId) {
                            setTimeout(() => {
                                this.updateAgentsList();
                            }, 3000);
                        }
                    }
                },
                error: (error) => {
                    console.error(`Connection error${agentId ? ` (Agent: ${agentId})` : ''}:`, error);
                    testCompleted = true;

                    if (agentId && testButton) {
                        testButton.textContent = 'Error!';
                        testButton.style.backgroundColor = '#dc3545';
                    } else if (statusCallback) {
                        statusCallback('error', `Connection error: ${error.message}`);
                    }

                    subscription.unsubscribe();
                    testDirectLine.end();

                    // Reset button after 3 seconds for agent list tests
                    if (agentId) {
                        setTimeout(() => {
                            this.updateAgentsList();
                        }, 3000);
                    }
                }
            });

            // Try to trigger connection by posting a test activity
            setTimeout(() => {
                if (!testCompleted) {
                    try {
                        testDirectLine.postActivity({
                            type: 'message',
                            text: 'connection_test',
                            from: { id: 'test_user', name: 'Test User' }
                        }).subscribe({
                            next: (id) => console.log(`Test activity posted${agentId ? ` (Agent: ${agentId})` : ''}:`, id),
                            error: (error) => console.warn(`Test activity error${agentId ? ` (Agent: ${agentId})` : ''}:`, error)
                        });
                    } catch (postError) {
                        console.warn(`Could not post test activity${agentId ? ` (Agent: ${agentId})` : ''}:`, postError);
                    }
                }
            }, 1000);

            // Timeout after 30 seconds
            setTimeout(() => {
                if (!testCompleted) {
                    testCompleted = true;
                    console.warn(`Test timed out after 30 seconds${agentId ? ` (Agent: ${agentId})` : ''}`);

                    if (agentId && testButton) {
                        testButton.textContent = 'Timeout!';
                        testButton.style.backgroundColor = '#dc3545';
                    } else if (statusCallback) {
                        statusCallback('error', 'Connection timeout (30 seconds) - Please check your DirectLine secret and bot status');
                    }

                    subscription.unsubscribe();
                    testDirectLine.end();

                    // Reset button after 3 seconds for agent list tests
                    if (agentId) {
                        setTimeout(() => {
                            this.updateAgentsList();
                        }, 3000);
                    }
                }
            }, 30000);

        } catch (error) {
            console.error(`Connection test failed${agentId ? ` (Agent: ${agentId})` : ''}:`, error);

            if (agentId && testButton) {
                testButton.textContent = 'Error!';
                testButton.style.backgroundColor = '#dc3545';
                testButton.disabled = false;
            } else if (statusCallback) {
                statusCallback('error', `Connection failed: ${error.message}`);
            }

            // Reset button after 3 seconds for agent list tests
            if (agentId) {
                setTimeout(() => {
                    this.updateAgentsList();
                }, 3000);
            }
        }
    }

    /**
     * Edit an agent
     * @param {string} agentId - Agent ID to edit
     */
    editAgent(agentId) {
        if (!this.agents[agentId]) return;

        const agent = this.agents[agentId];
        if (this.elements.agentNameInput) this.elements.agentNameInput.value = agent.name;
        if (this.elements.secretInput) this.elements.secretInput.value = agent.secret;
        if (this.elements.configTitle) this.elements.configTitle.textContent = 'Edit Agent';
        if (this.elements.agentConfigSection) {
            this.elements.agentConfigSection.style.display = 'block';
            this.elements.agentConfigSection.dataset.editingAgentId = agentId;
        }

        this.isEditingAgent = true;
        this.currentEditingAgentId = agentId; // Fix: Set the agent ID being edited
    }

    /**
     * Update current agent display
     */
    updateCurrentAgentDisplay() {
        if (this.currentAgentId && this.agents[this.currentAgentId]) {
            const agent = this.agents[this.currentAgentId];
            if (this.elements.currentAgentName) {
                this.elements.currentAgentName.textContent = agent.name;
            }
            if (this.elements.currentAgentStatus) {
                const isConnected = window.directLine !== null && window.directLine !== undefined;
                this.elements.currentAgentStatus.textContent = isConnected ? 'Connected' : 'Disconnected';
                this.elements.currentAgentStatus.className = `agent-status ${isConnected ? 'connected' : 'disconnected'}`;
            }
        } else {
            if (this.elements.currentAgentName) {
                this.elements.currentAgentName.textContent = 'No agent selected';
            }
            if (this.elements.currentAgentStatus) {
                this.elements.currentAgentStatus.textContent = 'Disconnected';
                this.elements.currentAgentStatus.className = 'agent-status disconnected';
            }
        }
    }

    /**
     * Clear agent form
     */
    clearAgentForm() {
        if (this.elements.agentNameInput) this.elements.agentNameInput.value = '';
        if (this.elements.secretInput) this.elements.secretInput.value = '';
        if (this.elements.agentConfigSection) {
            this.elements.agentConfigSection.style.display = 'none';
            delete this.elements.agentConfigSection.dataset.editingAgentId;
        }
        if (this.elements.configTitle) this.elements.configTitle.textContent = 'Add New Agent';

        this.isEditingAgent = false;

        // Clear connection status
        if (this.elements.statusIndicator) {
            this.elements.statusIndicator.className = 'status-indicator';
        }
        if (this.elements.statusText) {
            this.elements.statusText.textContent = 'Not connected';
        }
    }

    /**
     * Get agent count
     * @returns {number} Number of configured agents
     */
    getAgentCount() {
        return Object.keys(this.agents).length;
    }

    /**
     * Show the agent configuration section
     * @private
     */
    showAgentConfigSection(agentId = null) {
        this.isEditingAgent = agentId !== null;
        this.currentEditingAgentId = agentId;

        if (this.elements.agentConfigSection) {
            DOMUtils.show(this.elements.agentConfigSection);
        }

        if (this.elements.configTitle) {
            this.elements.configTitle.textContent = this.isEditingAgent ? 'Edit Agent' : 'Add New Agent';
        }

        // Clear or populate form
        if (this.isEditingAgent && this.agents[agentId]) {
            const agent = this.agents[agentId];
            if (this.elements.agentNameInput) this.elements.agentNameInput.value = agent.name;
            if (this.elements.secretInput) this.elements.secretInput.value = agent.secret;
        } else {
            if (this.elements.agentNameInput) this.elements.agentNameInput.value = '';
            if (this.elements.secretInput) this.elements.secretInput.value = '';
        }

        // Clear status
        this.updateConnectionStatus('', '');
    }

    /**
     * Hide the agent configuration section
     * @private
     */
    hideAgentConfigSection() {
        if (this.elements.agentConfigSection) {
            DOMUtils.hide(this.elements.agentConfigSection);
        }
        this.isEditingAgent = false;
        this.currentEditingAgentId = null;
        this.updateConnectionStatus('', '');
    }

    /**
     * Provide troubleshooting guidance for connection issues
     * @private
     */
    showTroubleshootingGuidance() {
        console.group('DirectLine Connection Troubleshooting');
        console.log('1. Verify your DirectLine secret is correct');
        console.log('2. Check if your bot is deployed and running');
        console.log('3. Ensure your bot has DirectLine channel enabled');
        console.log('4. Check browser network tab for failed requests');
        console.log('5. Try testing with a simple echo bot first');
        console.log('6. Verify you have internet connectivity');
        console.groupEnd();
    }

    /**
     * Save current agent configuration
     * @private
     */
    async saveCurrentAgent() {
        const name = this.elements.agentNameInput?.value?.trim();
        const secret = this.elements.secretInput?.value?.trim();

        if (!name || !secret) {
            this.updateConnectionStatus('error', 'Please provide both agent name and DirectLine secret');
            return;
        }

        try {
            const agentId = this.isEditingAgent ? this.currentEditingAgentId : null;
            const newAgentId = await this.addOrUpdateAgent(agentId, name, secret);

            // Set as current agent if this is the first agent or if editing current agent
            if (Object.keys(this.agents).length === 1 || agentId === this.currentAgentId) {
                await this.setCurrentAgent(newAgentId);
            }

            await this.saveAgents();
            this.updateAgentsList();
            this.updateCurrentAgentDisplay();
            this.hideAgentConfigSection();

            this.updateConnectionStatus('success', 'Agent saved successfully!');
        } catch (error) {
            console.error('Error saving agent:', error);
            this.updateConnectionStatus('error', `Failed to save agent: ${error.message}`);
        }
    }

    /**
     * Toggle secret visibility
     * @private
     */
    toggleSecretVisibility() {
        const secretInput = this.elements.secretInput;
        const eyeIcon = DOMUtils.getElementById('eyeIcon');

        if (secretInput && eyeIcon) {
            const isPassword = secretInput.type === 'password';
            secretInput.type = isPassword ? 'text' : 'password';

            // Update icon (you can customize this based on your icon library)
            if (isPassword) {
                eyeIcon.innerHTML = `<path d="M2,5.27L3.28,4L20,20.72L18.73,22L15.65,18.92C14.5,19.3 13.28,19.5 12,19.5C7,19.5 2.73,16.39 1,12C1.69,10.24 2.79,8.69 4.19,7.46L2,5.27M12,9A3,3 0 0,1 15,12C15,12.35 14.94,12.69 14.83,13L11,9.17C11.31,9.06 11.65,9 12,9M12,4.5C17,4.5 21.27,7.61 23,12C22.18,14.08 20.79,15.88 19,17.19L17.58,15.76C18.94,14.82 20.06,13.54 20.82,12C19.17,8.64 15.76,6.5 12,6.5C10.91,6.5 9.84,6.68 8.84,7L7.3,5.47C8.74,4.85 10.34,4.5 12,4.5M3.18,12C4.83,15.36 8.24,17.5 12,17.5C12.69,17.5 13.37,17.43 14,17.29L11.72,15C10.29,14.85 9.15,13.71 9,12.28L5.6,8.87C4.61,9.72 3.78,10.78 3.18,12Z"/>`;
            } else {
                eyeIcon.innerHTML = `<path d="M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17M12,4.5C7,4.5 2.73,7.61 1,12C2.73,16.39 7,19.5 12,19.5C17,19.5 21.27,16.39 23,12C21.27,7.61 17,4.5 12,4.5Z"/>`;
            }
        }
    }

    /**
     * Update connection status display
     * @param {string} status - Status type ('testing', 'success', 'error', '')
     * @param {string} message - Status message
     * @private
     */
    updateConnectionStatus(status, message) {
        if (this.elements.statusIndicator && this.elements.statusText) {
            this.elements.statusIndicator.className = `status-indicator ${status}`;
            this.elements.statusText.textContent = message;
        }
    }

    /**
     * Toggle the init parameters config panel for an agent
     * @param {string} agentId
     */
    toggleParamsPanel(agentId) {
        const existing = this.elements.agentsList.querySelector(`.agent-params-panel[data-agent-id="${agentId}"]`);
        if (existing) {
            existing.remove();
            return;
        }

        // Close any other open panels
        this.elements.agentsList.querySelectorAll('.agent-params-panel').forEach(p => p.remove());

        const agent = this.agents[agentId];
        if (!agent) return;

        const agentItem = this.elements.agentsList.querySelector(`.agent-item[data-agent-id="${agentId}"]`);
        if (!agentItem) return;

        const panel = DOMUtils.createElement('div', {
            className: 'agent-params-panel',
            dataset: { agentId }
        });
        this._renderParamsPanelContent(panel, agentId);
        agentItem.insertAdjacentElement('afterend', panel);
    }

    /**
     * Render the params panel inner content
     * @private
     */
    _renderParamsPanelContent(panel, agentId) {
        const agent = this.agents[agentId];
        // Normalize: support legacy string[] and new { name, displayName }[]
        const params = (agent.initParams || []).map(p =>
            typeof p === 'string' ? { name: p, displayName: p } : p
        );

        panel.innerHTML = `
            <div class="params-panel-header">
                <span class="params-panel-title">Initialization Parameters</span>
                <small class="help-text">Define parameters sent to the bot when starting a new conversation. "Name" is the key sent to the bot; "Display Name" is what the user sees on the form.</small>
            </div>
            <div class="params-list">
                ${params.map((p, i) => `
                    <div class="param-row" data-index="${i}">
                        <input type="text" class="param-key-input" value="${Utils.escapeHtml(p.name)}" placeholder="Parameter key" title="Key sent to bot" />
                        <input type="text" class="param-display-input" value="${Utils.escapeHtml(p.displayName)}" placeholder="Display name" title="Label shown on form" />
                        <button class="agent-btn agent-btn-delete param-remove-btn" data-index="${i}" title="Remove">×</button>
                    </div>
                `).join('')}
            </div>
            <div class="params-actions">
                <button class="btn btn-secondary btn-small param-add-btn">+ Add Parameter</button>
                <button class="btn btn-primary btn-small param-save-btn">Save</button>
            </div>
        `;

        // Add parameter
        panel.querySelector('.param-add-btn').addEventListener('click', () => {
            const list = panel.querySelector('.params-list');
            const index = list.querySelectorAll('.param-row').length;
            const row = document.createElement('div');
            row.className = 'param-row';
            row.dataset.index = index;
            row.innerHTML = `
                <input type="text" class="param-key-input" value="" placeholder="Parameter key" title="Key sent to bot" />
                <input type="text" class="param-display-input" value="" placeholder="Display name" title="Label shown on form" />
                <button class="agent-btn agent-btn-delete param-remove-btn" data-index="${index}" title="Remove">×</button>
            `;
            row.querySelector('.param-remove-btn').addEventListener('click', () => row.remove());
            list.appendChild(row);
        });

        // Remove buttons
        panel.querySelectorAll('.param-remove-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                btn.closest('.param-row').remove();
            });
        });

        // Save
        panel.querySelector('.param-save-btn').addEventListener('click', async () => {
            const rows = panel.querySelectorAll('.param-row');
            const entries = [];
            rows.forEach(row => {
                const key = row.querySelector('.param-key-input')?.value.trim();
                const display = row.querySelector('.param-display-input')?.value.trim();
                if (key) {
                    entries.push({ name: key, displayName: display || key });
                }
            });
            this.agents[agentId].initParams = entries;
            this.agents[agentId].updatedAt = new Date().toISOString();
            await this.saveAgents();
            this.updateAgentsList();
            console.log(`[AgentManager] Init params saved for ${agentId}:`, entries);
        });
    }

    /**
     * Check if an agent requires initialization parameters
     * @param {string} agentId
     * @returns {boolean}
     */
    agentHasInitParams(agentId) {
        const agent = this.agents[agentId];
        return agent && Array.isArray(agent.initParams) && agent.initParams.length > 0;
    }

    /**
     * Get init parameters for an agent (normalized to { name, displayName }[])
     * @param {string} agentId
     * @returns {{ name: string, displayName: string }[]}
     */
    getInitParams(agentId) {
        const raw = this.agents[agentId]?.initParams || [];
        return raw.map(p => typeof p === 'string' ? { name: p, displayName: p } : p);
    }

    /**
     * Check if agent exists
     * @param {string} agentId - Agent ID to check
     * @returns {boolean} True if agent exists
     */
    hasAgent(agentId) {
        return this.agents.hasOwnProperty(agentId);
    }

    /**
     * Get all agents
     * @returns {Object} All agents
     */
    getAllAgents() {
        return { ...this.agents };
    }
}

// Create and export singleton instance
export const agentManager = new AgentManager();

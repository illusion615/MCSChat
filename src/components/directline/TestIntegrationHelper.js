/**
 * Enhanced DirectLine Test Integration Helper
 * 
 * This utility helps integrate the enhanced DirectLine test page with
 * existing agent configuration system, allowing seamless testing without
 * manual secret entry.
 * 
 * Usage: Include this script in the test page to automatically load
 * DirectLine secrets from the existing agent management system.
 */

export class TestIntegrationHelper {
    static async loadAgentSecrets() {
        try {
            // Method 1: Try to load from encrypted secure storage (NEW)
            const encryptedSecret = await this.loadFromEncryptedStorage();
            if (encryptedSecret) {
                return encryptedSecret;
            }

            // Method 2: Try to load from AgentManager
            if (typeof window !== 'undefined' && window.agentManager) {
                const currentAgent = window.agentManager.getCurrentAgent();
                if (currentAgent && currentAgent.directlineSecret) {
                    console.log('Loaded DirectLine secret from current agent');
                    return {
                        secret: currentAgent.directlineSecret,
                        source: 'AgentManager'
                    };
                }
            }

            // Method 2: Try to load from localStorage agentSecrets
            const agentSecretsData = localStorage.getItem('agentSecrets');
            if (agentSecretsData) {
                try {
                    const agentSecrets = JSON.parse(agentSecretsData);
                    if (agentSecrets.directline) {
                        console.log('Loaded DirectLine secret from agentSecrets storage');
                        return {
                            secret: agentSecrets.directline,
                            source: 'agentSecrets'
                        };
                    }
                } catch (e) {
                    console.warn('Failed to parse agentSecrets:', e);
                }
            }

            // Method 3: Try to load from SecureStorage
            const secureStorageData = localStorage.getItem('secureStorage');
            if (secureStorageData) {
                try {
                    const secureStorage = JSON.parse(secureStorageData);
                    if (secureStorage.directlineSecret) {
                        console.log('Loaded DirectLine secret from secure storage');
                        return {
                            secret: secureStorage.directlineSecret,
                            source: 'SecureStorage'
                        };
                    }
                } catch (e) {
                    console.warn('Failed to parse secureStorage:', e);
                }
            }

            // Method 4: Try to load from chat configuration
            const chatConfigData = localStorage.getItem('chatConfig');
            if (chatConfigData) {
                try {
                    const chatConfig = JSON.parse(chatConfigData);
                    if (chatConfig.bot && chatConfig.bot.directlineSecret) {
                        console.log('Loaded DirectLine secret from chat configuration');
                        return {
                            secret: chatConfig.bot.directlineSecret,
                            source: 'chatConfig'
                        };
                    }
                } catch (e) {
                    console.warn('Failed to parse chatConfig:', e);
                }
            }

            // Method 5: Check for environment-specific keys
            const possibleKeys = [
                'DIRECTLINE_SECRET',
                'BOT_DIRECTLINE_SECRET',
                'AZURE_BOT_SECRET',
                'CHATBOT_SECRET'
            ];

            for (const key of possibleKeys) {
                const secret = localStorage.getItem(key);
                if (secret && secret.length > 10) {
                    console.log(`Loaded DirectLine secret from ${key}`);
                    return {
                        secret: secret,
                        source: key
                    };
                }
            }

            console.warn('No DirectLine secret found in any storage location');
            return null;

        } catch (error) {
            console.error('Error loading agent secrets:', error);
            return null;
        }
    }

    /**
     * Load DirectLine secret from encrypted storage
     * @returns {Promise<Object|null>} Secret data with source
     * @private
     */
    static async loadFromEncryptedStorage() {
        try {
            // Check if we're in the main application context with AgentManager
            if (typeof window !== 'undefined' && window.agentManager && window.agentManager.getAllAgents) {
                console.log('Attempting to access encrypted agent data...');
                
                // Try to get all agents (this should decrypt automatically)
                const agents = await window.agentManager.getAllAgents();
                if (agents && Array.isArray(agents) && agents.length > 0) {
                    // Look for DirectLine secret in any agent
                    for (const agent of agents) {
                        if (agent.directlineSecret) {
                            console.log(`Found DirectLine secret in agent: ${agent.name || 'Unnamed'}`);
                            return {
                                secret: agent.directlineSecret,
                                source: `Encrypted Agent: ${agent.name || 'Unnamed'}`,
                                agentName: agent.name
                            };
                        }
                    }
                }
                
                // Try to get current agent specifically
                const currentAgent = await window.agentManager.getCurrentAgent();
                if (currentAgent && currentAgent.directlineSecret) {
                    console.log('Found DirectLine secret in current agent');
                    return {
                        secret: currentAgent.directlineSecret,
                        source: 'Current Encrypted Agent',
                        agentName: currentAgent.name
                    };
                }
            }

            // Alternative: Try to access SecureStorage utility directly
            if (typeof window !== 'undefined' && window.SecureStorage) {
                try {
                    // Try common DirectLine secret keys
                    const secretKeys = ['directlineSecret', 'directLineSecret', 'botSecret', 'azureBotSecret'];
                    
                    for (const key of secretKeys) {
                        const secret = await window.SecureStorage.retrieve(key);
                        if (secret) {
                            console.log(`Found DirectLine secret in SecureStorage: ${key}`);
                            return {
                                secret: secret,
                                source: `SecureStorage (${key})`
                            };
                        }
                    }
                } catch (e) {
                    console.warn('SecureStorage access failed:', e);
                }
            }

            console.log('No encrypted DirectLine secrets found');
            return null;

        } catch (error) {
            console.error('Error accessing encrypted storage:', error);
            return null;
        }
    }

    static async saveTestSecret(secret, source = 'manual') {
        try {
            // Save to a test-specific location for future use
            const testSecrets = {
                directlineSecret: secret,
                source: source,
                timestamp: Date.now(),
                testMode: true
            };

            localStorage.setItem('enhancedDirectLineTestSecrets', JSON.stringify(testSecrets));
            console.log('Test secret saved for future sessions');

        } catch (error) {
            console.error('Failed to save test secret:', error);
        }
    }

    static getTestInstructions() {
        return {
            title: "🧪 Enhanced DirectLine Manager Testing",
            steps: [
                {
                    step: 1,
                    title: "Load Existing Secrets",
                    description: "The test page will automatically try to load DirectLine secrets from your existing agent configuration.",
                    action: "Click 'Load from Agent Settings' if available"
                },
                {
                    step: 2,
                    title: "Manual Secret Entry",
                    description: "If no existing secret is found, enter your DirectLine secret manually.",
                    action: "Get secret from Azure Bot Service > Channels > DirectLine"
                },
                {
                    step: 3,
                    title: "Configure Features",
                    description: "Enable/disable enhanced features to test different capabilities.",
                    action: "Toggle checkboxes for features you want to test"
                },
                {
                    step: 4,
                    title: "Connect and Test",
                    description: "Click Connect to establish the enhanced DirectLine connection.",
                    action: "Click 'Connect' button and monitor status panel"
                },
                {
                    step: 5,
                    title: "Validate Features",
                    description: "Test various features like adaptive typing, message streaming, etc.",
                    action: "Send messages and observe enhanced behaviors"
                },
                {
                    step: 6,
                    title: "Monitor Metrics",
                    description: "Watch the health monitoring and network quality metrics.",
                    action: "Check the status panel for real-time metrics"
                }
            ],
            tips: [
                "Enable Debug Mode for detailed logging",
                "Use 'Send Test Messages' for automated testing",
                "Check browser console for additional debugging info",
                "Test with different network conditions if possible",
                "Compare behavior with existing DirectLine implementation"
            ],
            troubleshooting: [
                {
                    issue: "Connection fails immediately",
                    solution: "Check DirectLine secret validity and network connectivity"
                },
                {
                    issue: "Features not working",
                    solution: "Verify DirectLine library version and browser compatibility"
                },
                {
                    issue: "No messages received",
                    solution: "Check bot configuration and greeting message setup"
                },
                {
                    issue: "Token refresh errors",
                    solution: "Ensure using token (not secret) or disable auto-refresh"
                }
            ]
        };
    }

    static createQuickStartGuide() {
        const guide = document.createElement('div');
        guide.className = 'quick-start-guide';
        guide.innerHTML = `
            <div class="guide-header">
                <h3>🚀 Quick Start Guide</h3>
                <button class="guide-toggle" onclick="this.parentElement.parentElement.classList.toggle('collapsed')">−</button>
            </div>
            <div class="guide-content">
                <div class="guide-step">
                    <span class="step-number">1</span>
                    <span class="step-text">Secrets are automatically loaded from your existing agent settings</span>
                </div>
                <div class="guide-step">
                    <span class="step-number">2</span>
                    <span class="step-text">Configure enhanced features using the checkboxes</span>
                </div>
                <div class="guide-step">
                    <span class="step-number">3</span>
                    <span class="step-text">Click "Connect" to test the enhanced DirectLine manager</span>
                </div>
                <div class="guide-step">
                    <span class="step-number">4</span>
                    <span class="step-text">Monitor the status panel and debug logs for insights</span>
                </div>
                <div class="guide-step">
                    <span class="step-number">5</span>
                    <span class="step-text">Test messaging and observe enhanced behaviors</span>
                </div>
            </div>
        `;

        // Add CSS for the guide
        const guideStyles = document.createElement('style');
        guideStyles.textContent = `
            .quick-start-guide {
                background: #f0f9ff;
                border: 1px solid #0ea5e9;
                border-radius: 8px;
                margin: 15px 0;
                overflow: hidden;
                transition: all 0.3s ease;
            }
            
            .quick-start-guide.collapsed .guide-content {
                display: none;
            }
            
            .guide-header {
                background: #0ea5e9;
                color: white;
                padding: 10px 15px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .guide-header h3 {
                margin: 0;
                font-size: 16px;
            }
            
            .guide-toggle {
                background: none;
                border: none;
                color: white;
                font-size: 20px;
                cursor: pointer;
                padding: 0;
                width: 24px;
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .guide-content {
                padding: 15px;
            }
            
            .guide-step {
                display: flex;
                align-items: center;
                margin: 8px 0;
                padding: 5px 0;
            }
            
            .step-number {
                background: #0ea5e9;
                color: white;
                border-radius: 50%;
                width: 24px;
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 12px;
                font-weight: bold;
                margin-right: 12px;
                flex-shrink: 0;
            }
            
            .step-text {
                font-size: 14px;
                line-height: 1.4;
            }
        `;
        
        document.head.appendChild(guideStyles);
        return guide;
    }

    static async initializeTestPage() {
        console.log('Initializing Enhanced DirectLine Test Integration...');

        // Load existing secrets
        const secretData = await this.loadAgentSecrets();
        
        // Auto-populate secret field if found
        const secretInput = document.getElementById('directlineSecret');
        if (secretInput && secretData) {
            secretInput.value = secretData.secret;
            
            // Add visual indicator of where secret came from
            const sourceIndicator = document.createElement('div');
            sourceIndicator.className = 'secret-source-indicator';
            sourceIndicator.innerHTML = `
                <small style="color: #059669; font-weight: 500;">
                    ✅ DirectLine secret loaded from ${secretData.source}
                </small>
            `;
            secretInput.parentNode.insertBefore(sourceIndicator, secretInput.nextSibling);
        }

        // Add quick start guide to the configuration panel
        const configPanel = document.querySelector('.test-panel-content');
        if (configPanel) {
            const guide = this.createQuickStartGuide();
            configPanel.insertBefore(guide, configPanel.firstChild);
        }

        // Add load button for manual secret loading
        this.addLoadSecretsButton();

        console.log('Test integration helper initialized');
        return secretData;
    }

    static addLoadSecretsButton() {
        const connectBtn = document.getElementById('connectBtn');
        if (connectBtn) {
            const loadBtn = document.createElement('button');
            loadBtn.type = 'button';
            loadBtn.className = 'btn btn-success';
            loadBtn.textContent = 'Load from Agent Settings';
            loadBtn.style.marginRight = '10px';
            
            loadBtn.addEventListener('click', async () => {
                const secretData = await this.loadAgentSecrets();
                if (secretData) {
                    const secretInput = document.getElementById('directlineSecret');
                    if (secretInput) {
                        secretInput.value = secretData.secret;
                        
                        // Show success message
                        const existingIndicator = document.querySelector('.secret-source-indicator');
                        if (existingIndicator) {
                            existingIndicator.remove();
                        }
                        
                        const sourceIndicator = document.createElement('div');
                        sourceIndicator.className = 'secret-source-indicator';
                        sourceIndicator.innerHTML = `
                            <small style="color: #059669; font-weight: 500;">
                                ✅ DirectLine secret loaded from ${secretData.source}
                            </small>
                        `;
                        secretInput.parentNode.insertBefore(sourceIndicator, secretInput.nextSibling);
                        
                        // Log success
                        if (window.enhancedDirectLineTest && window.enhancedDirectLineTest.log) {
                            window.enhancedDirectLineTest.log(`Secret loaded from ${secretData.source}`, 'success');
                        }
                    }
                } else {
                    alert('No DirectLine secret found in agent settings. Please enter manually.');
                }
            });
            
            connectBtn.parentNode.insertBefore(loadBtn, connectBtn);
        }
    }

    static createTestReport() {
        return {
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            tests: []
        };
    }

    static addTestResult(report, testName, result, details) {
        report.tests.push({
            name: testName,
            result: result, // 'pass', 'fail', 'warning'
            details: details,
            timestamp: new Date().toISOString()
        });
    }

    static downloadTestReport(report) {
        const reportJson = JSON.stringify(report, null, 2);
        const blob = new Blob([reportJson], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `enhanced-directline-test-report-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

// Auto-initialize when DOM is ready
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        TestIntegrationHelper.initializeTestPage();
    });
}

export default TestIntegrationHelper;

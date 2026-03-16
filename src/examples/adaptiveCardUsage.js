/**
 * Example usage of the AdaptiveCardModal component in MCSChat
 * This file demonstrates how to use the common AdaptiveCardModal throughout the application
 */

// Example: Using the global adaptive card modal instance
import { globalAdaptiveCardModal } from '../components/AdaptiveCardModal.js';

// Example 1: Simple card display
function showSimpleCard() {
    const cardContent = {
        "type": "AdaptiveCard",
        "version": "1.4",
        "body": [
            {
                "type": "TextBlock",
                "text": "Hello from MCSChat!",
                "size": "Medium",
                "weight": "Bolder"
            },
            {
                "type": "TextBlock",
                "text": "This is a simple adaptive card example.",
                "wrap": true
            }
        ]
    };

    globalAdaptiveCardModal.open(cardContent, {
        title: "Simple Greeting Card"
    });
}

// Example 2: Form with custom action handler
function showFormCard() {
    const cardContent = {
        "type": "AdaptiveCard",
        "version": "1.4",
        "body": [
            {
                "type": "TextBlock",
                "text": "User Feedback",
                "size": "Medium",
                "weight": "Bolder"
            },
            {
                "type": "Input.Text",
                "id": "name",
                "placeholder": "Your name",
                "label": "Name"
            },
            {
                "type": "Input.Text",
                "id": "feedback",
                "placeholder": "Your feedback",
                "label": "Feedback",
                "isMultiline": true
            },
            {
                "type": "Input.ChoiceSet",
                "id": "rating",
                "label": "Rating",
                "choices": [
                    { "title": "Excellent", "value": "5" },
                    { "title": "Good", "value": "4" },
                    { "title": "Average", "value": "3" },
                    { "title": "Poor", "value": "2" },
                    { "title": "Very Poor", "value": "1" }
                ],
                "style": "compact"
            }
        ],
        "actions": [
            {
                "type": "Action.Submit",
                "title": "Submit Feedback",
                "data": {
                    "action": "submitFeedback"
                }
            }
        ]
    };

    globalAdaptiveCardModal.updateOptions({
        onAction: async (action, modal) => {
            if (action instanceof AdaptiveCards.SubmitAction) {
                const data = action.data;
                
                // Custom handling for feedback
                if (data.action === 'submitFeedback') {
                    console.log('Feedback received:', data);
                    
                    // You can add custom processing here
                    // For example, save to local storage, send to analytics, etc.
                    
                    // Note: Modal will automatically close immediately after submit
                    // No need to manually close since default behavior handles it
                    
                    return true; // Continue with default handling (immediate close)
                }
            }
            return true; // Continue with default handling
        }
    });

    globalAdaptiveCardModal.open(cardContent, {
        title: "Feedback Form"
    });
}

// Example 3: Creating a custom instance for specific use cases
import { AdaptiveCardModal } from '../components/AdaptiveCardModal.js';

function createCustomModal() {
    const customModal = new AdaptiveCardModal({
        modalId: 'customAdaptiveModal',
        title: 'Custom Modal',
        maxWidth: '800px',
        autoClose: false, // Don't auto-close
        onAction: async (action, modal) => {
            // Custom action handling for this specific modal
            console.log('Custom modal action:', action);
            return true;
        },
        onClose: () => {
            console.log('Custom modal closed');
        }
    });

    customModal.init();
    return customModal;
}

// Example 4: Integration with MCSChat application state
function showAgentSpecificCard(agentId) {
    const cardContent = {
        "type": "AdaptiveCard",
        "version": "1.4",
        "body": [
            {
                "type": "TextBlock",
                "text": `Agent Configuration: ${agentId}`,
                "size": "Medium",
                "weight": "Bolder"
            },
            {
                "type": "Input.Toggle",
                "id": "enableFeature",
                "title": "Enable Advanced Features",
                "value": "false"
            },
            {
                "type": "Input.ChoiceSet",
                "id": "voiceModel",
                "label": "Voice Model",
                "choices": [
                    { "title": "Natural", "value": "natural" },
                    { "title": "Professional", "value": "professional" },
                    { "title": "Casual", "value": "casual" }
                ]
            }
        ],
        "actions": [
            {
                "type": "Action.Submit",
                "title": "Save Configuration",
                "data": {
                    "action": "saveAgentConfig",
                    "agentId": agentId
                }
            }
        ]
    };

    globalAdaptiveCardModal.updateOptions({
        directLineManager: window.MCSChatApp?.directLineManager,
        onAction: async (action, modal) => {
            if (action instanceof AdaptiveCards.SubmitAction) {
                const data = action.data;
                
                if (data.action === 'saveAgentConfig') {
                    // Save to agent configuration
                    if (window.MCSChatApp?.agentManager) {
                        // Update agent configuration
                        console.log('Saving agent config:', data);
                    }
                    
                    // Modal will automatically close immediately after submit
                    // Custom processing can happen here
                    return true; // Continue with default handling (immediate close)
                }
            }
            return true;
        }
    });

    globalAdaptiveCardModal.open(cardContent, {
        title: `Configure Agent: ${agentId}`
    });
}

// Export functions for use in the application
export {
    showSimpleCard,
    showFormCard,
    createCustomModal,
    showAgentSpecificCard
};

// Example of how to add to global scope for testing
if (typeof window !== 'undefined') {
    window.adaptiveCardExamples = {
        showSimpleCard,
        showFormCard,
        createCustomModal,
        showAgentSpecificCard
    };
}

// chat.js

// Initialize DirectLine
const directLine = new DirectLine.DirectLine({
    secret: 'Your secret' // Replace with your Direct Line secret
});

// --- Initialize the connection and handle the welcome message ---

// Subscribe to connection status changes
directLine.connectionStatus$.subscribe(status => {
    if (status === 2) { // 2 = ConnectionStatus.Online
        // Option 1: Rely on the bot to send a welcome message automatically
        // Ensure your bot's backend is configured to send the welcome message upon connection
        console.log('The bot is online!');

        // Ideally, use Option 1 for a cleaner separation of concerns
    }
});

// Receive messages from bot
directLine.activity$.subscribe(activity => {
    if (activity.from.id !== 'user' && activity.type === 'message') {
        renderActivity(activity);
        // Save bot message to localStorage
        saveMessageToLocalStorage('bot', activity.text);
    }
});

// Get DOM elements
const chatWindow = document.getElementById('chatWindow');
const userInput = document.getElementById('userInput');
const sendButton = document.getElementById('sendButton');
const clearButton = document.getElementById('clearButton'); // Get the clear button element
const sessionList = document.getElementById('sessionList'); // Get the session list element

// Load chat history from localStorage
loadChatHistory();

// Event Listeners
sendButton.addEventListener('click', sendMessage);
userInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
        sendMessage();
    }
});
clearButton.addEventListener('click', clearChatHistory); // Add event listener to clear button

// Function to send message
function sendMessage(messageContent) {
    const message = messageContent ? messageContent.trim() : userInput.value.trim();
    if (message) {
        console.log('Sending message:', message);
        
        // Render user's message
        renderUserMessage(message);
        
        // Show progress indicator
        showProgressIndicator();
        
        // Post activity to Direct Line
        directLine.postActivity({
            from: { id: 'user' },
            type: 'message',
            text: message
        }).subscribe(
            response => console.log('Message sent successfully:', response),
            error => console.error('Error sending message:', error)
        );

        // Clear input if message was sent from input field
        if (!messageContent) {
            userInput.value = '';
        }

        // Save message to localStorage
        saveMessageToLocalStorage('user', message);

        // Remove suggested actions
        removeSuggestedActions();
    }
}

// Function to remove suggested actions
function removeSuggestedActions() {
    const actionsContainer = document.getElementById('suggestedActionsContainer');
    if (actionsContainer) {
        actionsContainer.remove();
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
    messageDiv.innerText = sanitizedContent;

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
        hasContent = true;
    }

    // Handle attachments (images, adaptive cards, etc.)
    if (activity.attachments && activity.attachments.length > 0) {
        activity.attachments.forEach(attachment => {
            if (attachment.contentType === 'application/vnd.microsoft.card.adaptive') {
                const adaptiveCard = new AdaptiveCards.AdaptiveCard();
                adaptiveCard.parse(attachment.content);
                const renderedCard = adaptiveCard.render();

                // Handle adaptive card actions
                adaptiveCard.onExecuteAction = function(action) {
                    if (action.type === 'Action.Submit') {
                        const data = action.data;
                        sendMessage(data);
                    }
                };

                messageDiv.appendChild(renderedCard);
                hasContent = true;
            } else if (attachment.contentType.startsWith('image/')) {
                const img = document.createElement('img');
                img.src = attachment.contentUrl;
                img.style.maxWidth = '100%';
                messageDiv.appendChild(img);
                hasContent = true;
            }
        });
    }

    // Handle suggested actions (choices)
    if (activity.suggestedActions && activity.suggestedActions.actions.length > 0) {
        const actionsContainer = document.createElement('div');
        actionsContainer.className = 'actionsContainer';
        actionsContainer.id = 'suggestedActionsContainer'; // Add ID for easy removal

        activity.suggestedActions.actions.forEach(action => {
            const actionButton = document.createElement('button');
            actionButton.className = 'actionButton';
            actionButton.textContent = action.title;

            // When the action button is clicked, send the action message
            actionButton.addEventListener('click', () => {
                sendMessage(action.value);
            });

            actionsContainer.appendChild(actionButton);
        });

        messageDiv.appendChild(actionsContainer);
        hasContent = true;
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
}

// Function to show progress indicator
function showProgressIndicator() {
    const progressIndicator = document.createElement('div');
    progressIndicator.className = 'progressIndicator';
    progressIndicator.id = 'progressIndicator';
    
    const messageContainer = document.createElement('div');
    messageContainer.className = 'messageContainer botMessage';
    messageContainer.appendChild(progressIndicator);
    
    chatWindow.appendChild(messageContainer);
    chatWindow.scrollTop = chatWindow.scrollHeight;
}

// Function to hide progress indicator
function hideProgressIndicator() {
    const progressIndicator = document.getElementById('progressIndicator');
    if (progressIndicator) {
        progressIndicator.parentElement.remove();
    }
}

// Function to save message to localStorage
function saveMessageToLocalStorage(sender, message) {
    const chatHistory = JSON.parse(localStorage.getItem('chatHistory')) || [];
    const currentSession = getCurrentSession();
    chatHistory.push({ session: currentSession, sender, message });
    localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
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
    Object.keys(sessions).forEach(session => {
        const sessionItem = document.createElement('div');
        sessionItem.className = 'sessionItem';

        const sessionText = document.createElement('span');
        sessionText.textContent = `Session ${session}`;
        sessionText.addEventListener('click', () => loadSessionMessages(sessions[session]));

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
}

// Function to clear chat history
function clearChatHistory() {
    // Clear chat history from localStorage
    localStorage.removeItem('chatHistory');
    
    // Clear chat history from the UI
    chatWindow.innerHTML = '';

    // Start a new session
    startNewSession();

    // Update session list
    loadChatHistory();
}
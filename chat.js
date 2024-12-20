// chat.js

// Initialize DirectLine
const secret = 'lRxHNQ9niAY.3G-umHBCHS7accXFKfzpj0ab2qEkB0COle8y4P83OxM' // Replace with your Direct Line secret
const directLine = new DirectLine.DirectLine({ token: secret });

// Receive messages from bot
directLine.activity$.subscribe(activity => {
    console.log('Received activity:', activity);
    if (activity.from.id !== 'user' && activity.type === 'message') {
        renderActivity(activity);
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

// Ensure marked library is available
if (typeof marked === 'undefined') {
    var script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/marked/marked.min.js';
    document.head.appendChild(script);
}

// Get DOM elements
const chatWindow = document.getElementById('chatWindow');
const userInput = document.getElementById('userInput');
const sendButton = document.getElementById('sendButton');
const clearButton = document.getElementById('clearButton'); // Get the clear button element
const sessionList = document.getElementById('sessionList'); // Get the session list element
const suggestedActionsContainer = document.getElementById('suggestedActionsContainer');

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
clearButton.addEventListener('click', clearChatHistory); // Add event listener to clear button

// Function to send message
function sendMessage(messageContent) {
    const message = messageContent ? messageContent.trim() : userInput.value.trim();
    clearSuggestedActions(); // Clear suggested actions
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

        // Update the 'New Chat' button state
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

        // Ensure images fit within the chat window
        const images = messageDiv.querySelectorAll('img');
        images.forEach(img => {
            img.style.maxWidth = '100%';
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
    console.log('New session started:', currentSession);
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
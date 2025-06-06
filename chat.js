// chat.js

// Initialize DirectLine
const secret = 'FuFzkuOirvNwORa0A0NDHctbAGgn7Wq3OL3Q3foMxVFYyWdQ58IKJQQJ99ALACGhslBAArohAAABAZBS47Ih.3VgLmSJfry0QUt0pox1oQefxGFghzx6BNZzIHiGLmg4QM5OgvkMPJQQJ99ALACGhslBAArohAAABAZBS19Cj' // Replace with your Direct Line secret
const directLine = new DirectLine.DirectLine({ secret: secret });

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
            
            // 先发送 join 事件
            directLine.postActivity({
                from: { id: 'user' },
                type: 'event',
                name: 'webchat/join',
                value: ''
            }).subscribe(
                id => {
                    console.log('Initialization event sent, id:', id);
                    
                    // 再发送空消息，进一步确保触发欢迎消息
                    setTimeout(() => {
                        directLine.postActivity({
                            from: { id: 'user' },
                            type: 'message',
                            text: ''
                        }).subscribe(
                            id => console.log('Empty message sent, id:', id),
                            error => console.error('Error sending empty message:', error)
                        );
                    }, 1000);
                },
                error => console.error('Error sending initialization event:', error)
            );
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
closeButton.addEventListener('click', closeRightPanel); // Add event listener to close button

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
        img.style.cursor = 'pointer';
        img.addEventListener('click', function() {
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
            img.addEventListener('click', function() {
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
                img.addEventListener('click', function() {
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
    
    // 为所有已加载的图片添加点击事件
    const allImages = chatWindow.querySelectorAll('img');
    allImages.forEach(img => {
        img.style.cursor = 'pointer';
        img.addEventListener('click', function() {
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
    closeBtn.onclick = function() {
        modal.style.display = 'none';
    };
    
    // 点击模态框背景也可以关闭
    modal.onclick = function(event) {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    };
    
    // ESC 键关闭模态框
    document.addEventListener('keydown', function(event) {
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
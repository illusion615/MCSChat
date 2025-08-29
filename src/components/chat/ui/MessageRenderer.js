// Minimal renderer from message objects to semantic DOM fragments
export class MessageRenderer {
  /**
   * Render a message bubble into semantic DOM
   * @param {Document|ShadowRoot} doc - document or shadow root to create elements
   * @param {{role:'user'|'assistant', text:string, timestamp?:string}} message
   * @param {{
   *   showAvatars?: boolean,
   *   userAvatarNode?: HTMLElement | null,
   *   assistantAvatarNode?: HTMLElement | null,
   *   showTimestamp?: boolean,
   *   audioIconNode?: HTMLElement | null
   * }} [options]
   */
  static renderMessage(doc, message, options = {}) {
    // Use a creation context that works with ShadowRoot or Document
    const d = (doc && typeof doc.createElement === 'function') ? doc : (doc?.ownerDocument || document);
    const {
      showAvatars = true,
      userAvatarNode = null,
      assistantAvatarNode = null,
      showTimestamp = true,
      audioIconNode = null,
      suggestions = undefined,
      domains = undefined,
      userLayout = 'bubble',
      assistantLayout = 'default',
      duration = undefined,
      enableCopy = true,
      enableSpeak = true,
    } = options;

    const isUser = message.role === 'user';
    const isAssistant = message.role === 'assistant';
    const isSystem = message.role === 'system';

    // Message Container (outer wrapper)
    const messageContainer = d.createElement('message-container');
    messageContainer.setAttribute('type', isUser ? 'user' : (isAssistant ? 'assistant' : 'system'));

    // Avatar positioning: user=right, assistant/bot=left
    if (showAvatars && ((isUser && userAvatarNode) || (isAssistant && assistantAvatarNode && assistantLayout !== 'no-avatar'))) {
      const avatarWrap = d.createElement('avatar-container');
      const host = d.createElement(isUser ? 'user-avatar' : 'assistant-avatar');
      host.appendChild(isUser ? userAvatarNode : assistantAvatarNode);
      avatarWrap.appendChild(host);
      messageContainer.appendChild(avatarWrap);
    }

    // Message Bubble (vertical alignment container)
    const messageBubble = d.createElement('message-bubble');
    messageBubble.setAttribute('alignment', 'vertical');
    
    // Message Content
    const content = d.createElement('message-content');
    const text = d.createElement('message-text');
    
    // Minimal markdown support: bold (**text**) and bullet lines (- item)
    const mdToHtml = (src) => {
      if (!src) return '';
      const safe = String(src)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      const lines = safe.split('\n');
      let html = '';
      lines.forEach((line) => {
        const bolded = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        if (bolded.trim().startsWith('- ')) {
          html += `<li>${bolded.trim().slice(2)}</li>`;
        } else if (bolded.trim().length === 0) {
          html += '<br />';
        } else {
          html += `<p>${bolded}</p>`;
        }
      });
      // Wrap bullet items with a list
      html = html.replace(/(<li>.*?<\/li>)/gs, '<ul class="md-list">$1</ul>');
      return html;
    };
    
    text.innerHTML = mdToHtml(message.text || '');
    content.appendChild(text);
    messageBubble.appendChild(content);

    // System message early return (simpler structure)
    if (isSystem) {
      if (showTimestamp) {
        const metadata = d.createElement('message-metadata');
        const ts = d.createElement('timestamp');
        ts.textContent = message.timestamp || new Date().toLocaleTimeString();
        metadata.appendChild(ts);
        messageBubble.appendChild(metadata);
      }
      messageContainer.appendChild(messageBubble);
      return messageContainer;
    }

    // Suggested Actions within message bubble (for assistant messages only)
    if (isAssistant && Array.isArray(suggestions) && suggestions.length) {
      const sa = d.createElement('suggested-actions');
      suggestions.forEach(label => {
        const btn = d.createElement('suggestion-button');
        btn.setAttribute('role', 'button');
        btn.textContent = label;
        sa.appendChild(btn);
      });
      messageBubble.appendChild(sa);
    }

    // Domain grid (mass suggestions within bubble)
    if (isAssistant && Array.isArray(domains) && domains.length) {
      const sa = d.createElement('suggested-actions');
      sa.classList.add('domain-grid');
      domains.forEach(label => {
        const btn = d.createElement('domain-button');
        btn.setAttribute('role', 'button');
        btn.textContent = label;
        sa.appendChild(btn);
      });
      messageBubble.appendChild(sa);
    }

    // Message Metadata (timestamp, duration, copy, speaker controls)
    const metadata = d.createElement('message-metadata');
    
    // Timestamp
    if (showTimestamp) {
      const ts = d.createElement('timestamp');
      ts.textContent = message.timestamp || new Date().toLocaleTimeString();
      metadata.appendChild(ts);
    }
    
    // Duration badge
    if (typeof duration === 'number') {
      const badge = d.createElement('duration-badge');
      badge.textContent = `${duration}s`;
      metadata.appendChild(badge);
    }

    // Copy button (for all messages)
    if (enableCopy) {
      const copyBtn = d.createElement('copy-button');
      copyBtn.setAttribute('role', 'button');
      copyBtn.title = 'Copy';
      copyBtn.textContent = '⧉';
      metadata.appendChild(copyBtn);
    }

    // Speaker button and progress (for assistant messages)
    if (isAssistant && enableSpeak) {
      const speakBtn = d.createElement('speaker-button');
      speakBtn.setAttribute('role', 'button');
      speakBtn.title = 'Speak';
      speakBtn.setAttribute('data-state', 'stopped'); // stopped|playing
      
      // Use SVG icon instead of emoji - will be populated by the component
      metadata.appendChild(speakBtn);
      
      // Speaker progress indicator (only visible when playing)
      const progress = d.createElement('speaker-progress');
      progress.style.setProperty('--value', '0%');
      progress.style.display = 'none'; // Hidden by default, shown when playing
      metadata.appendChild(progress);
    }

    // Audio button (if provided)
    if (isAssistant && audioIconNode) {
      const audioBtn = d.createElement('audio-button');
      audioBtn.appendChild(audioIconNode);
      metadata.appendChild(audioBtn);
    }

    messageBubble.appendChild(metadata);
    messageContainer.appendChild(messageBubble);
    
    return messageContainer;
  }
}

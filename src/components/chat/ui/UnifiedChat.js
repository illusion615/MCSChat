// <unified-chat> Web Component per design doc structure
import { MessageRenderer } from './MessageRenderer.js';
// Use unified icon manager (advanced API) if available, fall back to simple one
import { createSVGIcon, Icons as IconManagerSingleton } from '../../svg-icon-manager/unified-index.js';

const template = document.createElement('template');
template.innerHTML = `
  <style>@import url('./styles/component.css');</style>
  <chat-container>
    <chat-header>
      <conversation-title id="title"></conversation-title>
      <header-actions>
        <search-container id="searchC">
          <search-toggle id="searchToggle" aria-label="Search" title="Search"></search-toggle>
          <search-box id="searchBox">
            <input type="text" id="searchInput" placeholder="Search messages..." />
            <search-close id="searchClose" aria-label="Close" title="Close"></search-close>
          </search-box>
        </search-container>
        <agent-status>
          <status-indicator id="status"></status-indicator>
          <model-info id="model"></model-info>
        </agent-status>
      </header-actions>
    </chat-header>
    <messages-area id="messages"></messages-area>
    <input-area>
      <input-container>
        <attachment-button id="attach"></attachment-button>
        <text-input id="input"><textarea id="inputInner" rows="1" placeholder="Type your message..."></textarea></text-input>
        <voice-button id="voice"></voice-button>
        <settings-button id="settings"></settings-button>
        <send-button id="send"></send-button>
      </input-container>
    </input-area>
  </chat-container>
`;

export class UnifiedChat extends HTMLElement {
  static get observedAttributes() { return [
    'title', 'status', 'model',
    'icon-send', 'icon-attach', 'icon-voice', 'icon-settings', 'icon-user', 'icon-assistant', 'icons-theme',
    // UX prefs
  'show-avatars', 'show-timestamps', 'hide-on-click', 'hide-header', 'show-attach', 'show-voice', 'show-settings', 'enable-copy', 'enable-speak',
  // Intro + suggestions
  'intro', 'suggestions', 'domains',
  // Layout controls
  'user-layout', 'assistant-layout',
    // Style tokens as attributes (configuration parameters)
  'accent', 'assistant-bg', 'user-bg', 'bubble-radius', 'gap', 'bg', 'text', 'muted', 'border', 'system-bg', 'system-text',
  // UI convenience
  'placeholder', 'theme', 'show-search', 'search-placeholder'
  ]; }
  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.appendChild(template.content.cloneNode(true));
    this.$ = {
      title: shadow.getElementById('title'),
      status: shadow.getElementById('status'),
      model: shadow.getElementById('model'),
      messages: shadow.getElementById('messages'),
      input: shadow.getElementById('input'),
      inputInner: shadow.getElementById('inputInner'),
      send: shadow.getElementById('send'),
      attach: shadow.getElementById('attach'),
      voice: shadow.getElementById('voice'),
      settings: shadow.getElementById('settings'),
    };
    // Defaults
    this._iconNames = {
      send: 'send',
      attach: 'attach',
      voice: 'microphone',
      settings: 'settings',
      user: 'user',
      assistant: 'aiCompanion'
    };
    this._prefs = {
      showAvatars: true,
      showTimestamps: true,
      hideOnClick: true,
  userLayout: 'bubble',
  assistantLayout: 'default',
      enableCopy: true,
      enableSpeak: true,
    };
    // Active streaming state (single concurrent stream supported)
    this._activeStream = null;
    // Speech state
    this._speech = { activeNode: null, interval: null };
  }
  connectedCallback() {
    this._upgradeProps();
    this._renderAllIcons();
    // Send actions
    this.$.send.addEventListener('click', () => this._send());
    const inputEl = this.$.inputInner || this.$.input;
    inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this._send(); }
    });
    inputEl.addEventListener('input', () => this._autoResize());
    this._autoResize();

    // Delegated handler for suggestions inside shadow DOM
    this.shadowRoot.addEventListener('click', (e) => {
      const target = e.target;
      if (!target) return;
      const isSuggestion = target.tagName && (target.tagName.toLowerCase() === 'suggestion-button' || target.tagName.toLowerCase() === 'domain-button');
      if (isSuggestion) {
        const text = (target.textContent || '').trim();
        const container = target.closest('suggested-actions');
        this.dispatchEvent(new CustomEvent('ui:suggestionClicked', { detail: { text } }));
        if (this._prefs.hideOnClick && container) {
          container.classList.add('fade-out');
          setTimeout(() => container.classList.add('hidden'), 250);
        }
        this._sendFromSuggestion(text);
      }
      // Copy button inside messages
      if (target.tagName && target.tagName.toLowerCase() === 'copy-button') {
        const container = target.closest('message-container');
        const textEl = container?.querySelector('message-text');
        const txt = textEl?.textContent || '';
        if (txt && navigator.clipboard?.writeText) {
          navigator.clipboard.writeText(txt).catch(() => {});
        }
      }
      // Speaker button toggle
      if (target.tagName && target.tagName.toLowerCase() === 'speaker-button') {
        const container = target.closest('message-container');
        this._toggleSpeak(container);
      }
    });

    // If no messages yet and intro/suggestions present, render an initial assistant bubble
    this._renderIntroIfEmpty();
  // Wire header search
  this._wireSearch();
  }
  attributeChangedCallback(name, _old, val) {
    if (name === 'title') this.$.title.textContent = val || '';
    if (name === 'status') this.$.status.textContent = val || '';
    if (name === 'model') this.$.model.textContent = val || '';
    if (name === 'icons-theme' && val) {
      try { IconManagerSingleton.setTheme?.(val); } catch {}
    }
    if (name.startsWith('icon-')) {
      const key = name.replace('icon-', '');
      if (val) this._iconNames[key] = val;
      this._renderAllIcons();
    }
    if (name === 'show-avatars') this._prefs.showAvatars = this.hasAttribute('show-avatars') ? (val !== 'false') : true;
    if (name === 'show-timestamps') this._prefs.showTimestamps = this.hasAttribute('show-timestamps') ? (val !== 'false') : true;
    if (name === 'hide-on-click') this._prefs.hideOnClick = this.hasAttribute('hide-on-click') ? (val !== 'false') : true;
  if (name === 'enable-copy') this._prefs.enableCopy = this.hasAttribute('enable-copy') ? (val !== 'false') : true;
  if (name === 'enable-speak') this._prefs.enableSpeak = this.hasAttribute('enable-speak') ? (val !== 'false') : true;

    if (name === 'hide-header') {
      // CSS handles visibility via host attribute. No extra logic needed.
    }
    if (name === 'show-attach' || name === 'show-voice' || name === 'show-settings') {
      // Visibility handled via CSS host attributes.
    }

    if (name === 'intro' || name === 'suggestions' || name === 'domains') {
      // Only auto-render when empty, to avoid duplicating during live edits
      this._renderIntroIfEmpty();
    }
  if (name === 'user-layout' && val) this._prefs.userLayout = val;
  if (name === 'assistant-layout' && val) this._prefs.assistantLayout = val;

    if (name === 'placeholder') {
      const input = this.$.inputInner || this.$.input;
      if (input && typeof val === 'string') input.setAttribute('placeholder', val);
    }
    if (name === 'search-placeholder') {
      const si = this.shadowRoot.getElementById('searchInput');
      if (si && typeof val === 'string') si.setAttribute('placeholder', val);
    }

    // Map style attributes -> CSS variables inside the component
  const cssVars = new Set(['accent','assistant-bg','user-bg','bubble-radius','gap','bg','text','muted','border','system-bg','system-text']);
    if (cssVars.has(name) && typeof val === 'string') {
      const varName = `--${name}`;
      this.style.setProperty(varName, val);
    }
  }
  _upgradeProps() { ['title','status','model'].forEach(p => { if (this.hasOwnProperty(p)) { const v = this[p]; delete this[p]; this[p] = v; } }); }
  _send() {
    const text = (this.$.inputInner?.value || this.$.input?.textContent || '').trim();
    if (!text) return;
    this.dispatchEvent(new CustomEvent('user:send', { detail: { text } }));
    if (this.$.inputInner) { this.$.inputInner.value = ''; this._autoResize(); }
    else this.$.input.textContent = '';
    this.addUserMessage(text);
  }

  _sendFromSuggestion(text) {
    if (!text) return;
    this.dispatchEvent(new CustomEvent('user:send', { detail: { text, source: 'suggestion' } }));
    this.addUserMessage(text);
  }

  _autoResize() {
    const el = this.$.inputInner;
    if (!el || el.tagName.toLowerCase() !== 'textarea') return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  }

  // Public API: allow host page to add messages
  addUserMessage(text) {
    const msg = { role: 'user', text, timestamp: new Date().toLocaleTimeString() };
    const userAvatar = this._makeIcon(this._iconNames.user, { size: '20px' });
    const node = MessageRenderer.renderMessage(this.shadowRoot, msg, {
      userAvatarNode: this._prefs.showAvatars ? userAvatar : null,
      assistantAvatarNode: null,
      audioIconNode: null,
      showAvatars: this._prefs.showAvatars,
      showTimestamp: this._prefs.showTimestamps,
      userLayout: this._prefs.userLayout
    });
    this.$.messages.appendChild(node);
    this._scrollToBottom();
  }

  addAssistantMessage(text, opts = {}) {
    const msg = { role: 'assistant', text, timestamp: new Date().toLocaleTimeString() };
    const assistantAvatar = this._makeIcon(this._iconNames.assistant, { size: '20px' });
    const audio = this._makeIcon(this._iconNames.voice || 'microphone', { size: '16px' });
    const node = MessageRenderer.renderMessage(this.shadowRoot, msg, {
      userAvatarNode: null,
      assistantAvatarNode: (this._prefs.assistantLayout === 'no-avatar' ? null : (this._prefs.showAvatars ? assistantAvatar : null)),
      audioIconNode: audio,
      showAvatars: this._prefs.showAvatars,
      showTimestamp: this._prefs.showTimestamps,
      suggestions: Array.isArray(opts.suggestions) ? opts.suggestions : undefined,
      domains: Array.isArray(opts.domains) ? opts.domains : undefined,
  assistantLayout: this._prefs.assistantLayout,
  duration: typeof opts.duration === 'number' ? opts.duration : undefined,
  enableCopy: this._prefs.enableCopy,
  enableSpeak: this._prefs.enableSpeak,
    });
    
    // Populate speaker button with SVG icon after rendering
    if (this._prefs.enableSpeak && node) {
      const speakerBtn = node.querySelector('speaker-button');
      if (speakerBtn) {
        speakerBtn.textContent = ''; // Clear any existing content
        const speakerIcon = this._makeIcon('volume2', { size: '14px' }); // Use volume2 for speaker icon
        if (speakerIcon) speakerBtn.appendChild(speakerIcon);
      }
    }
    
    this.$.messages.appendChild(node);
    this._scrollToBottom();
    return node;
  }

  /**
   * Begin a streaming assistant message. Returns a small controller with append/end/abort helpers.
   * Only one active stream is supported at a time; starting a new one will end the previous.
   */
  beginAssistantStream(initialText = '', opts = {}) {
    // If an existing stream is active, finalize it first
    if (this._activeStream) {
      try { this.endAssistantStream(); } catch {}
    }
    const node = this.addAssistantMessage(initialText, opts);
    if (!node) return null;
    node.setAttribute('data-streaming', 'true');
    const textEl = node.querySelector('message-text');
    this._activeStream = { node, textEl };
    return {
      node,
      append: (chunk) => this.appendAssistantStream(chunk),
      end: (extra = '') => this.endAssistantStream(extra),
      abort: () => this.abortAssistantStream(),
    };
  }

  /** Append text to the active assistant stream. If none exists, one will be started. */
  appendAssistantStream(chunk) {
    const text = (chunk ?? '').toString();
    if (!text) return;
    if (!this._activeStream) {
      this.beginAssistantStream(text);
      return;
    }
    const { textEl } = this._activeStream;
    if (textEl) {
      textEl.textContent = (textEl.textContent || '') + text;
      this._scrollToBottom();
    }
  }

  /** Finalize the active assistant stream, optionally appending a last bit of text. */
  endAssistantStream(extra = '') {
    if (!this._activeStream) return;
    if (extra) this.appendAssistantStream(extra);
    const { node } = this._activeStream;
    if (node) node.removeAttribute('data-streaming');
    this._activeStream = null;
    this._scrollToBottom();
  }

  /** Abort the active assistant stream without removing the message. */
  abortAssistantStream() {
    if (!this._activeStream) return;
    const { node } = this._activeStream;
    if (node) node.removeAttribute('data-streaming');
    this._activeStream = null;
  }

  /** Convenience: stream from an async iterable of string chunks. */
  async streamAssistantFromAsyncIterable(iterable, opts = {}) {
    const controller = this.beginAssistantStream('', opts);
    for await (const chunk of iterable) {
      this.appendAssistantStream(typeof chunk === 'string' ? chunk : String(chunk ?? ''));
    }
    this.endAssistantStream();
    return controller?.node ?? null;
  }

  addSystemMessage(text) {
    const msg = { role: 'system', text, timestamp: new Date().toLocaleTimeString() };
    const node = MessageRenderer.renderMessage(this.shadowRoot, msg, {
      showAvatars: false,
      showTimestamp: this._prefs.showTimestamps
    });
    this.$.messages.appendChild(node);
    this._scrollToBottom();
    return node;
  }

  _scrollToBottom() {
    this.$.messages.scrollTop = this.$.messages.scrollHeight;
  }

  _renderIntroIfEmpty() {
    if (this.$.messages.childElementCount > 0) return;
    const intro = this.getAttribute('intro');
    const suggestions = this._parseListAttr('suggestions');
    const domains = this._parseListAttr('domains');
    if (intro || suggestions.length || domains.length) {
      this.addAssistantMessage(intro || 'How can I help you today?', { suggestions, domains });
    }
  }

  _parseListAttr(attr) {
    const val = this.getAttribute(attr);
    if (!val) return [];
    try {
      // Support JSON array or CSV
      const v = JSON.parse(val);
      return Array.isArray(v) ? v : [];
    } catch {
      return val.split(',').map(s => s.trim()).filter(Boolean);
    }
  }

  _makeIcon(name, opts = {}) {
    try { return createSVGIcon(name, { size: opts.size || '18px' }); } catch { /* no-op */ }
    try { return IconManagerSingleton.create?.(name, { size: opts.size || '18px' }); } catch { /* no-op */ }
    const span = document.createElement('span');
    span.textContent = '•';
    return span;
  }

  _renderAllIcons() {
    // Clear and insert icons into control buttons
    const buttons = [
      ['attach', this._iconNames.attach],
      ['voice', this._iconNames.voice],
      ['settings', this._iconNames.settings],
      ['send', this._iconNames.send],
    ];
    buttons.forEach(([id, icon]) => {
      const host = this.$[id];
      if (!host) return;
      host.textContent = '';
      const node = this._makeIcon(icon, { size: id === 'send' ? '18px' : '18px' });
      host.appendChild(node);
    });
  }

  _wireSearch() {
    const c = this.shadowRoot.getElementById('searchC');
    const toggle = this.shadowRoot.getElementById('searchToggle');
    const box = this.shadowRoot.getElementById('searchBox');
    const input = this.shadowRoot.getElementById('searchInput');
    const close = this.shadowRoot.getElementById('searchClose');
    // Visible by attribute
    if (this.getAttribute('show-search') === 'true') c?.setAttribute('data-visible', 'true');
    const show = () => { c?.setAttribute('data-open', 'true'); input?.focus(); };
    const hide = () => { c?.removeAttribute('data-open'); if (input) input.value = ''; };
    toggle?.addEventListener('click', () => { c?.hasAttribute('data-open') ? hide() : show(); });
    close?.addEventListener('click', () => hide());
    input?.addEventListener('keydown', (e) => { if (e.key === 'Escape') hide(); });
    input?.addEventListener('keydown', (e) => { if (e.key === 'Enter') { this.dispatchEvent(new CustomEvent('ui:search', { detail: { query: input.value } })); hide(); }});
  }

  _toggleSpeak(container) {
    if (!container) return;
    if (this._speech.activeNode === container) { this._stopSpeak(); return; }
    this._stopSpeak();
    const textEl = container.querySelector('message-text');
    const progress = container.querySelector('speaker-progress');
    const speakerBtn = container.querySelector('speaker-button');
    const content = textEl?.textContent || '';
    
    container.setAttribute('data-speaking', 'true');
    speakerBtn?.setAttribute('data-state', 'playing');
    progress.style.display = 'block'; // Show progress when playing
    
    // Change icon to stop/square when playing
    if (speakerBtn) {
      speakerBtn.textContent = '';
      const stopIcon = this._makeIcon('square', { size: '14px' }); // Use square for stop icon
      if (stopIcon) speakerBtn.appendChild(stopIcon);
    }
    
    this._speech.activeNode = container;
    const words = content.split(/\s+/).filter(Boolean).length;
    const estMs = Math.max(1000, Math.min(120000, (words / 150) * 60 * 1000));
    const start = Date.now();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        const u = new window.SpeechSynthesisUtterance(content);
        u.onend = () => this._stopSpeak();
        u.onerror = () => this._stopSpeak();
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(u);
      } catch {}
    }
    this._speech.interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min(100, (elapsed / estMs) * 100);
      progress?.style?.setProperty('--value', pct + '%');
      if (pct >= 100) this._stopSpeak();
    }, 100);
  }

  _stopSpeak() {
    if (this._speech.interval) { clearInterval(this._speech.interval); this._speech.interval = null; }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try { window.speechSynthesis.cancel(); } catch {}
    }
    if (this._speech.activeNode) {
      this._speech.activeNode.removeAttribute('data-speaking');
      const speakerBtn = this._speech.activeNode.querySelector('speaker-button');
      const progress = this._speech.activeNode.querySelector('speaker-progress');
      speakerBtn?.setAttribute('data-state', 'stopped');
      
      // Change icon back to speaker when stopped
      if (speakerBtn) {
        speakerBtn.textContent = '';
        const speakerIcon = this._makeIcon('volume2', { size: '14px' }); // Use volume2 for speaker icon
        if (speakerIcon) speakerBtn.appendChild(speakerIcon);
      }
      
      if (progress) {
        progress.style.setProperty('--value', '0%');
        progress.style.display = 'none'; // Hide progress when stopped
      }
    }
    this._speech.activeNode = null;
  }
}

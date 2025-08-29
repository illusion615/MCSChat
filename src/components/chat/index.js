// Public entry for Unified Chat Component
// Registers <unified-chat> and re-exports core utilities

export { UnifiedChat } from './ui/UnifiedChat.js';
export { EventBus } from './core/EventBus.js';
export { MessageQueue } from './core/MessageQueue.js';
export { StateManager } from './core/StateManager.js';
export { BaseAdapter } from './adapters/BaseAdapter.js';

if (!customElements.get('unified-chat')) {
  customElements.define('unified-chat', (await import('./ui/UnifiedChat.js')).UnifiedChat);
}

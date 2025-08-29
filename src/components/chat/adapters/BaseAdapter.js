// BaseAdapter contract for chat backends
export class BaseAdapter {
  async connect() { throw new Error('Not implemented'); }
  async disconnect() { throw new Error('Not implemented'); }
  async send(/* userMessage */) { throw new Error('Not implemented'); }
  onMessage(/* handler: (message) => void */) { this._onMessage = (...args) => handler?.(...args); }
  _emitMessage(message) { this._onMessage?.(message); }
}

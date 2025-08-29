// Async message queue (minimal)
export class MessageQueue {
  constructor(bus) {
    this.queue = [];
    this.processing = false;
    this.bus = bus;
  }
  enqueue(item) {
    this.queue.push(item);
    this.bus?.emit('message:queued', item);
    void this._drain();
  }
  size() { return this.queue.length; }
  clear() { this.queue = []; }
  async _drain() {
    if (this.processing) return;
    this.processing = true;
    while (this.queue.length) {
      const item = this.queue.shift();
      try {
        this.bus?.emit('message:processing', item);
        await item?.run?.();
        this.bus?.emit('message:done', item);
      } catch (err) {
        this.bus?.emit('message:error', { item, err });
      }
    }
    this.processing = false;
  }
}

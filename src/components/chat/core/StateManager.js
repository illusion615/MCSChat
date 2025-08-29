// Centralized state store
export class StateManager {
  constructor(initial = {}) {
    this.state = { messages: [], prefs: {}, ...initial };
    this.listeners = new Set();
  }
  getState() { return this.state; }
  setState(patch) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach(l => { try { l(this.state); } catch (e) { console.error(e); } });
  }
  subscribe(listener) { this.listeners.add(listener); return () => this.listeners.delete(listener); }
}

export class SseWriter {
    constructor(response, { heartbeatMs = 20_000 } = {}) {
        this.response = response;
        this.heartbeatMs = heartbeatMs;
        this.sequence = 0;
        this.opened = false;
        this.heartbeat = null;
        this.terminal = false;
    }

    open(correlationId) {
        if (this.opened) return;
        this.opened = true;
        this.response.status(200);
        this.response.set({
            'Content-Type': 'text/event-stream; charset=utf-8',
            'Cache-Control': 'no-cache, no-transform',
            Connection: 'keep-alive',
            'X-Accel-Buffering': 'no',
            'X-Correlation-ID': correlationId,
        });
        this.response.socket?.setNoDelay(true);
        this.response.flushHeaders();
        this.heartbeat = setInterval(() => {
            if (!this.terminal && !this.response.writableEnded) this.response.write(': keep-alive\n\n');
        }, this.heartbeatMs);
        this.heartbeat.unref?.();
    }

    write(event) {
        if (!this.opened || this.terminal || this.response.writableEnded) return;
        const eventName = event.type;
        const data = { ...event };
        delete data.type;
        this.sequence += 1;
        this.response.write(`event: ${eventName}\n`);
        this.response.write(`id: ${this.sequence}\n`);
        this.response.write(`data: ${JSON.stringify(data)}\n\n`);
        if (eventName === 'final' || eventName === 'error') this.end();
    }

    writeError(code, correlationId, retryable = false) {
        this.write({ type: 'error', code, correlationId, retryable });
    }

    end() {
        if (this.terminal) return;
        this.terminal = true;
        if (this.heartbeat) clearInterval(this.heartbeat);
        if (!this.response.writableEnded) this.response.end();
    }
}

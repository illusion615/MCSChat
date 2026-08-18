export class SseFrameParser {
    constructor() {
        this.buffer = '';
        this.event = '';
        this.id = '';
        this.dataLines = [];
    }

    push(chunk) {
        this.buffer += typeof chunk === 'string' ? chunk : new TextDecoder().decode(chunk, { stream: true });
        const frames = [];
        let newlineIndex;
        while ((newlineIndex = this.buffer.indexOf('\n')) >= 0) {
            let line = this.buffer.slice(0, newlineIndex);
            this.buffer = this.buffer.slice(newlineIndex + 1);
            if (line.endsWith('\r')) line = line.slice(0, -1);
            const frame = this.#consumeLine(line);
            if (frame) frames.push(frame);
        }
        return frames;
    }

    end() {
        const frames = [];
        if (this.buffer) {
            const frame = this.#consumeLine(this.buffer.replace(/\r$/, ''));
            if (frame) frames.push(frame);
            this.buffer = '';
        }
        const finalFrame = this.#dispatch();
        if (finalFrame) frames.push(finalFrame);
        return frames;
    }

    #consumeLine(line) {
        if (line === '') return this.#dispatch();
        if (line.startsWith(':')) return null;
        const colonIndex = line.indexOf(':');
        const field = colonIndex < 0 ? line : line.slice(0, colonIndex);
        let value = colonIndex < 0 ? '' : line.slice(colonIndex + 1);
        if (value.startsWith(' ')) value = value.slice(1);
        if (field === 'event') this.event = value;
        else if (field === 'id') this.id = value;
        else if (field === 'data') this.dataLines.push(value);
        return null;
    }

    #dispatch() {
        if (!this.dataLines.length) {
            this.event = '';
            return null;
        }
        const frame = {
            event: this.event || 'message',
            id: this.id || undefined,
            data: this.dataLines.join('\n'),
        };
        this.event = '';
        this.dataLines = [];
        return frame;
    }
}

export async function* parseSseStream(readableStream) {
    const parser = new SseFrameParser();
    const reader = readableStream.getReader();
    const decoder = new TextDecoder();
    let completed = false;
    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) {
                completed = true;
                break;
            }
            for (const frame of parser.push(decoder.decode(value, { stream: true }))) {
                yield frame;
            }
        }
        for (const frame of parser.end()) yield frame;
    } finally {
        if (!completed) await reader.cancel().catch(() => undefined);
        reader.releaseLock();
    }
}

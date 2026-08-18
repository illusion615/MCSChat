import {
    getStreamInfo,
    getThoughtTexts,
    getToolCallEvents,
    mergeAgenticSnapshot,
} from '../shared/streamingActivity.js';

function normalizedStatus(status) {
    const value = String(status || '').toLowerCase();
    if (['completed', 'complete', 'succeeded', 'success', 'done'].includes(value)) return 'completed';
    if (['failed', 'error', 'cancelled', 'canceled'].includes(value)) return 'failed';
    return 'started';
}

export class D2ETurnReducer {
    constructor(turnId) {
        this.turnId = turnId;
        this.answerText = '';
        this.lastSequence = undefined;
        this.concluded = false;
        this.stageStates = new Map();
    }

    reduce(activity) {
        if (!activity || typeof activity !== 'object' || this.concluded) return [];
        const events = [];
        const streamInfo = getStreamInfo(activity);
        const text = typeof activity.text === 'string' ? activity.text : '';

        if (getThoughtTexts(activity).length) {
            this.#stage(events, 'reasoning', 'started');
        }
        for (const toolCall of getToolCallEvents(activity)) {
            const stageId = `tool:${toolCall.id || toolCall.name || 'unknown'}`;
            this.#stage(events, stageId, normalizedStatus(toolCall.status), {
                stage: 'tool',
                durationMs: toolCall.durationMs,
            });
        }

        if (streamInfo.streamType === 'informative') {
            if (!getToolCallEvents(activity).length) this.#stage(events, 'working', 'started');
            return events;
        }

        if (streamInfo.streamType === 'final') {
            return events.concat(this.#finalize(text));
        }

        const isAnswerChunk = streamInfo.streamType === 'streaming'
            || streamInfo.streamSequence !== undefined
            || (activity.type === 'typing' && Boolean(text));
        if (isAnswerChunk) {
            if (!text || this.#isObsolete(streamInfo.streamSequence)) return events;
            const nextText = mergeAgenticSnapshot(this.answerText, text, streamInfo.chunkType);
            if (nextText !== this.answerText) {
                this.answerText = nextText;
                events.push({
                    type: 'answer',
                    turnId: this.turnId,
                    text: this.answerText,
                    mode: 'snapshot',
                });
            }
            return events;
        }

        if (activity.type === 'message' && text) {
            return events.concat(this.#finalize(text));
        }
        return events;
    }

    #isObsolete(sequence) {
        if (sequence === undefined || sequence === null) return false;
        const numeric = Number(sequence);
        if (!Number.isFinite(numeric)) return false;
        if (this.lastSequence !== undefined && numeric <= this.lastSequence) return true;
        this.lastSequence = numeric;
        return false;
    }

    #stage(events, stageId, status, extra = {}) {
        const previous = this.stageStates.get(stageId);
        if (previous?.status === status) return;
        const publicStage = extra.stage || previous?.stage || stageId;
        this.stageStates.set(stageId, { status, stage: publicStage });
        const event = {
            type: 'stage',
            turnId: this.turnId,
            stageId,
            stage: publicStage,
            status,
        };
        if (Number.isFinite(extra.durationMs)) event.durationMs = Number(extra.durationMs);
        events.push(event);
    }

    #finalize(finalText) {
        if (this.concluded) return [];
        const events = [];
        for (const [stageId, state] of this.stageStates.entries()) {
            if (state.status === 'started') {
                this.#stage(events, stageId, 'completed', { stage: state.stage });
            }
        }
        const authoritativeText = finalText || this.answerText;
        this.answerText = authoritativeText;
        this.concluded = true;
        if (!authoritativeText) {
            return [{
                type: 'error',
                turnId: this.turnId,
                code: 'UPSTREAM_EMPTY_FINAL',
                retryable: false,
            }];
        }
        events.push({
            type: 'final',
            turnId: this.turnId,
            text: authoritativeText,
            finishReason: 'completed',
        });
        return events;
    }
}

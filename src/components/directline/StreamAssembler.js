import {
    getStreamInfo,
    isDivergentFallbackFinal,
    mergeStreamingText,
} from '../../utils/streamingActivity.js';

/**
 * StreamAssembler — state machine for Copilot Studio DirectLine streaming.
 *
 * DirectLine streaming is not a simple streamId -> append model:
 * - the first streaming chunk may not carry a streamId;
 * - later chunks and the final may introduce the streamId;
 * - chunks may be cumulative text even when chunkType is "delta";
 * - chunks may arrive after final;
 * - final may be a short divergent fallback on the same streamId.
 *
 * This class normalizes those transport quirks into deterministic actions.
 * It owns only stream lifecycle state; it does not create MessageEntry objects,
 * emit events, or touch DOM.
 */
export class StreamAssembler {
    constructor() {
        this.reset();
    }

    reset() {
        this._states = new Map();       // ref -> state
        this._streamRefs = new Map();   // streamId -> ref
        this._closedStreamIds = new Set(); // streamIds whose final/cancel already arrived
        this._pendingRef = null;        // id-less first chunk for the active answer
        this._nextRef = 1;
    }

    ingest(activity, stream = getStreamInfo(activity)) {
        if (!activity || !activity.type) return { type: 'ignore', reason: 'empty' };

        if (stream.streamType === 'informative') {
            return { type: 'informative', activity, stream };
        }

        const isChunk = stream.streamType === 'streaming'
            || stream.streamSequence !== undefined
            || (activity.type === 'typing' && activity.text);
        if (isChunk) return this._ingestChunk(activity, stream);

        const isFinal = stream.streamType === 'final'
            || (stream.streamId && activity.type === 'message');
        if (isFinal) return this._ingestFinal(activity, stream);

        return { type: 'passthrough', activity, stream };
    }

    _ingestChunk(activity, stream) {
        if (stream.streamId && this._closedStreamIds.has(stream.streamId)) {
            return { type: 'ignore', reason: 'lateChunkAfterFinal', activity, stream };
        }
        const state = this._stateForChunk(stream);
        if (state.finalReceived) return { type: 'ignore', reason: 'lateChunkAfterFinal', activity, stream, state };

        const seq = stream.streamSequence;
        if (seq !== undefined && state.lastSequence !== undefined && seq <= state.lastSequence) {
            return { type: 'ignore', reason: 'outOfOrder', activity, stream, state };
        }
        if (seq !== undefined) state.lastSequence = seq;

        const previousText = state.text;
        const incoming = activity.text || '';
        state.text = mergeStreamingText(state.text, incoming, stream.chunkType);
        state.lastActivity = activity;
        state.chunks++;

        const first = state.chunks === 1;
        return {
            type: first ? 'streamStart' : 'streamUpdate',
            ref: state.ref,
            state,
            activity,
            stream,
            text: state.text,
            changed: state.text !== previousText,
        };
    }

    _ingestFinal(activity, stream) {
        if (stream.streamId && this._closedStreamIds.has(stream.streamId)) {
            return { type: 'ignore', reason: 'lateFinalAfterFinal', activity, stream };
        }
        const state = this._stateForFinal(stream);
        if (!state) return { type: 'passthrough', activity, stream };

        const finalText = activity.text || '';
        const hasContent = finalText.trim().length > 0
            || (activity.attachments && activity.attachments.length > 0);

        state.finalReceived = true;
        if (this._pendingRef === state.ref) this._pendingRef = null;

        if (!hasContent) {
            this._deleteState(state);
            return { type: 'streamCancelled', ref: state.ref, state, activity, stream };
        }

        if (isDivergentFallbackFinal(state.text, finalText)) {
            this._deleteState(state);
            return {
                type: 'fallbackSplit',
                ref: state.ref,
                state,
                fallbackActivity: activity,
                stream,
                text: state.text,
                fallbackText: finalText,
            };
        }

        if (finalText) state.text = finalText;
        this._deleteState(state);
        return { type: 'streamFinal', ref: state.ref, state, activity, stream, text: state.text };
    }

    _stateForChunk(stream) {
        if (stream.streamId) {
            const existingRef = this._streamRefs.get(stream.streamId);
            if (existingRef) return this._states.get(existingRef);

            const pending = this._pendingRef ? this._states.get(this._pendingRef) : null;
            if (pending && !pending.streamId && !pending.finalReceived) {
                pending.streamId = stream.streamId;
                this._streamRefs.set(stream.streamId, pending.ref);
                this._pendingRef = null;
                return pending;
            }

            return this._createState(stream.streamId);
        }

        const pending = this._pendingRef ? this._states.get(this._pendingRef) : null;
        if (pending && !pending.finalReceived) return pending;

        const state = this._createState(undefined);
        this._pendingRef = state.ref;
        return state;
    }

    _stateForFinal(stream) {
        if (stream.streamId) {
            const existingRef = this._streamRefs.get(stream.streamId);
            if (existingRef) return this._states.get(existingRef);

            const pending = this._pendingRef ? this._states.get(this._pendingRef) : null;
            if (pending && !pending.streamId && !pending.finalReceived) {
                pending.streamId = stream.streamId;
                this._streamRefs.set(stream.streamId, pending.ref);
                this._pendingRef = null;
                return pending;
            }
            return null;
        }
        return this._pendingRef ? this._states.get(this._pendingRef) : null;
    }

    _createState(streamId) {
        const ref = `stream-${this._nextRef++}`;
        const state = {
            ref,
            streamId,
            text: '',
            chunks: 0,
            lastSequence: undefined,
            finalReceived: false,
            lastActivity: null,
        };
        this._states.set(ref, state);
        if (streamId) this._streamRefs.set(streamId, ref);
        return state;
    }

    _deleteState(state) {
        this._states.delete(state.ref);
        if (state.streamId) this._streamRefs.delete(state.streamId);
        if (state.streamId) this._closedStreamIds.add(state.streamId);
        if (this._pendingRef === state.ref) this._pendingRef = null;
    }
}

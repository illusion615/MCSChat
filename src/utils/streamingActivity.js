/**
 * streamingActivity.js — shared Copilot Studio / Bot Framework streaming helpers
 * ---------------------------------------------------------------------------
 * Single source of truth for parsing and merging livestreaming activities.
 * Shared by every transport so the logic never drifts between copies:
 *   • DirectLineService      (DirectLine secret transport, WebSocket)
 *   • DirectEngineConnector  (Direct-to-Engine SSE transport)
 *   • examples/directline-streaming-test.html (standalone verification page)
 *
 * All functions are PURE — no state, no DOM — so each transport reuses them
 * without coupling. Behaviour was verified against real Copilot Studio captures
 * (DirectLine: id-less first chunk, cumulative payloads mislabeled "delta",
 * divergent fallback finals on the same streamId).
 */

/**
 * Extract livestreaming metadata from an activity.
 * Per BotFramework WebChat LIVESTREAMING.md, metadata may live in either
 * `channelData` or `entities[type="streaminfo"]` — both are equivalent.
 * `chunkType` ("delta" | "full") declares whether a streaming chunk's text is an
 * incremental fragment or the full text so far.
 * @param {Object} activity
 * @returns {{streamType: string|undefined, streamId: string|undefined, streamSequence: number|undefined, chunkType: string|undefined}}
 */
export function getStreamInfo(activity) {
    const cd = (activity && activity.channelData) || {};
    if (cd.streamType !== undefined || cd.streamId !== undefined || cd.streamSequence !== undefined) {
        return {
            streamType: cd.streamType,
            streamId: cd.streamId,
            streamSequence: cd.streamSequence,
            chunkType: cd.chunkType,
        };
    }
    const e = Array.isArray(activity && activity.entities)
        ? activity.entities.find(x => x && x.type === 'streaminfo')
        : null;
    if (e) {
        return {
            streamType: e.streamType,
            streamId: e.streamId,
            streamSequence: e.streamSequence,
            chunkType: e.chunkType,
        };
    }
    return { streamType: undefined, streamId: undefined, streamSequence: undefined, chunkType: undefined };
}

/**
 * Extract reasoning text carried by New Agent `/3p` activities.
 * Reasoning is independent from livestream metadata and may accompany any
 * activity type, so callers must inspect it before branching on streamType.
 * @param {Object} activity
 * @returns {string[]}
 */
export function getThoughtTexts(activity) {
    if (!Array.isArray(activity && activity.entities)) return [];
    return activity.entities
        .filter(entity => entity && entity.type === 'thought' && typeof entity.text === 'string')
        .map(entity => entity.text.trim())
        .filter(Boolean);
}

/**
 * Extract structured tool-call lifecycle events from New Agent activities.
 * @param {Object} activity
 * @returns {Array<{id:string|undefined, name:string, status:string, durationMs:number|undefined}>}
 */
export function getToolCallEvents(activity) {
    if (!Array.isArray(activity && activity.entities)) return [];
    return activity.entities
        .filter(entity => entity && (entity.type === 'toolCall' || entity.type === 'https://schema.org/toolCall'))
        .map(entity => ({
            id: entity.tool_call_id || entity.toolCallId,
            name: entity.tool_display_name || entity.toolDisplayName || entity.tool_name || entity.toolName || 'Tool',
            status: entity.status || '',
            durationMs: entity.duration_ms || entity.durationMs,
        }));
}

/**
 * Length of the common leading prefix shared by two strings.
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
export function commonPrefixLength(a, b) {
    const max = Math.min(a.length, b.length);
    let i = 0;
    while (i < max && a.charCodeAt(i) === b.charCodeAt(i)) i++;
    return i;
}

/**
 * Merge an incoming streaming chunk's text into the accumulated answer text.
 *
 * Two real-world encodings must both be supported:
 *   • DELTA      — the chunk carries only the NEW fragment (short).
 *   • CUMULATIVE — the chunk carries the full (often revised) text so far.
 *
 * DirectLine Copilot Studio frequently marks chunks `chunkType:"delta"` while
 * actually sending a revised cumulative payload, so the encoding cannot be
 * trusted blindly. A long incoming chunk that shares a substantial prefix with
 * the current text is treated as the new authoritative full text; otherwise the
 * fragment is appended.
 * @param {string} current  Accumulated text so far.
 * @param {string} incoming New chunk text.
 * @param {string} [chunkType]
 * @returns {string}
 */
export function mergeStreamingText(current, incoming, chunkType) {
    if (!incoming) return current;
    if (!current || incoming === current) return incoming;
    if (incoming.startsWith(current)) return incoming;        // pure cumulative growth
    const overlap = commonPrefixLength(current, incoming);
    if (incoming.length > 80 && current.length > 80 && overlap > 20) return incoming; // revised cumulative
    return current + incoming;                                // true delta / unknown → append
}

/**
 * Reduce a New Agent `/agenticruntime/3p` answer activity.
 * The runtime emits cumulative snapshots that may revise an earlier prefix.
 * Only an explicit delta is appended; every other payload replaces the prior
 * snapshot as the authoritative answer-so-far.
 * @param {string} current
 * @param {string} incoming
 * @param {string} [chunkType]
 * @returns {string}
 */
export function mergeAgenticSnapshot(current, incoming, chunkType) {
    if (!incoming) return current;
    if (chunkType === 'delta') return current + incoming;
    return incoming;
}

/**
 * Merge New Agent thought text into one turn-level reasoning transcript.
 * Thought entities have no stable identifier or sequence and may arrive as a
 * cumulative snapshot, a revised snapshot, an overlapping fragment, or a new
 * fragment. This reducer preserves one readable transcript rather than exposing
 * transport chunks as independent checklist items.
 * @param {string} current
 * @param {string} incoming
 * @returns {string}
 */
export function mergeReasoningText(current, incoming) {
    const previous = String(current || '').trim();
    const next = String(incoming || '').trim();
    if (!next) return previous;
    if (!previous || previous === next) return next;
    if (previous.includes(next)) return previous;
    if (next.includes(previous)) return next;

    const prefix = commonPrefixLength(previous, next);
    const revisionThreshold = Math.min(24, Math.floor(Math.min(previous.length, next.length) * 0.35));
    if (prefix >= Math.max(8, revisionThreshold)) return next;

    const overlapLimit = Math.min(previous.length, next.length);
    for (let overlap = overlapLimit; overlap >= 3; overlap--) {
        if (previous.endsWith(next.slice(0, overlap))) {
            return previous + next.slice(overlap);
        }
    }

    const separator = /\s$/.test(previous) || /^[\s,.;:!?)]/.test(next) ? '' : ' ';
    return previous + separator + next;
}

/**
 * Detect whether a stream's `final` text is a DIVERGENT fallback that would mask
 * an already-streamed answer.
 *
 * Verified scenario: the server streams a substantial answer (e.g. 165 chunks →
 * 949 chars), then concludes the SAME streamId with a short, unrelated fallback
 * message (e.g. "I'm sorry…" / "Escalating…", ~70 chars). Overwriting the bubble
 * with that final would erase the real answer. When this returns true, callers
 * should keep the streamed answer and render the fallback separately.
 * @param {string} streamedText The text accumulated from streaming chunks.
 * @param {string} finalText    The concluding `final` activity text.
 * @returns {boolean}
 */
export function isDivergentFallbackFinal(streamedText, finalText) {
    if (!streamedText || !finalText) return false;
    const overlap = commonPrefixLength(streamedText, finalText);
    return (finalText.length + 100 < streamedText.length) && overlap < 40;
}

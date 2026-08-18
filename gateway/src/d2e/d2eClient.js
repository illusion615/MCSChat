import { GatewayError } from '../errors.js';
import { parseSseStream } from './sseParser.js';

export class D2EClient {
    constructor({ config, identity, fetchImpl = fetch }) {
        this.config = config;
        this.identity = identity;
        this.fetchImpl = fetchImpl;
        this.responseSignals = new WeakMap();
    }

    async openConversation({ signal } = {}) {
        return this.#post(this.#conversationsUrl(), { emitStartConversationEvent: true }, signal);
    }

    async createConversation({ signal } = {}) {
        const response = await this.openConversation({ signal });
        let conversationId = response.headers.get('x-ms-conversationid');
        await this.consumeActivities(response, activity => {
            conversationId ||= activity?.conversation?.id;
        });
        if (!conversationId) {
            throw new GatewayError(
                'UPSTREAM_CONVERSATION_ID_MISSING',
                'D2E did not return a conversation ID',
                { status: 502 }
            );
        }
        return conversationId;
    }

    async openTurn({ upstreamConversationId, text, signal }) {
        return this.#post(
            this.#conversationsUrl(upstreamConversationId),
            {
                activity: {
                    type: 'message',
                    text,
                    conversation: { id: upstreamConversationId },
                },
            },
            signal
        );
    }

    /**
     * Forwards a caller-supplied activity verbatim. The conversation binding is
     * forced server-side so a caller cannot target another conversation.
     */
    async openRawTurn({ upstreamConversationId, activity, signal }) {
        return this.#post(
            this.#conversationsUrl(upstreamConversationId),
            {
                activity: {
                    ...activity,
                    conversation: { ...(activity?.conversation || {}), id: upstreamConversationId },
                },
            },
            signal
        );
    }

    /**
     * Single SSE read path for the whole client. `onFrame` receives the raw
     * `{ event, id, data }` frame so the verification passthrough can forward
     * upstream bytes without a JSON round-trip.
     */
    async consumeFrames(response, onFrame) {
        if (!response.body) {
            throw new GatewayError('UPSTREAM_STREAM_MISSING', 'D2E response has no stream body', {
                status: 502,
            });
        }
        let frameCount = 0;
        try {
            for await (const frame of parseSseStream(response.body)) {
                if (frame.event === 'end' || frame.data === '[DONE]') break;
                frameCount += 1;
                if (await onFrame(frame) === false) break;
            }
        } catch (error) {
            const signals = this.responseSignals.get(response);
            if (signals?.timeoutSignal.aborted && !signals.clientSignal?.aborted) {
                throw new GatewayError('UPSTREAM_TIMEOUT', 'D2E stream timed out', {
                    status: 504,
                    retryable: false,
                    cause: error,
                });
            }
            throw error;
        } finally {
            this.responseSignals.delete(response);
        }
        return frameCount;
    }

    async consumeActivities(response, onActivity) {
        let activityCount = 0;
        await this.consumeFrames(response, async frame => {
            let activity;
            try {
                activity = JSON.parse(frame.data);
            } catch {
                return true;
            }
            if (!activity || typeof activity !== 'object') return true;
            activityCount += 1;
            return await onActivity(activity) !== false;
        });
        return activityCount;
    }

    async #post(url, body, signal) {
        const accessToken = await this.identity.acquireToken();
        const timeoutSignal = AbortSignal.timeout(this.config.upstreamTimeoutMs || 180_000);
        const requestSignal = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;
        let response;
        try {
            response = await this.fetchImpl(url, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                    Accept: 'text/event-stream',
                },
                body: JSON.stringify(body),
                signal: requestSignal,
            });
        } catch (error) {
            if (signal?.aborted || error?.name === 'AbortError') throw error;
            if (timeoutSignal.aborted || error?.name === 'TimeoutError') {
                throw new GatewayError('UPSTREAM_TIMEOUT', 'D2E request timed out', {
                    status: 504,
                    retryable: false,
                    cause: error,
                });
            }
            throw new GatewayError('UPSTREAM_OUTCOME_UNKNOWN', 'D2E request outcome is unknown', {
                status: 502,
                retryable: false,
                cause: error,
            });
        }
        if (!response.ok) {
            throw new GatewayError('UPSTREAM_D2E_ERROR', `D2E returned HTTP ${response.status}`, {
                status: 502,
                retryable: false,
            });
        }
        this.responseSignals.set(response, { timeoutSignal, clientSignal: signal });
        return response;
    }

    #conversationsUrl(conversationId) {
        const base = `${this.config.environmentHost}/copilotstudio/agenticruntime/3p/`
            + `dataverse-backed/authenticated/bots/${encodeURIComponent(this.config.schemaName)}`
            + '/conversations';
        const path = conversationId ? `${base}/${encodeURIComponent(conversationId)}` : base;
        return `${path}?api-version=${encodeURIComponent(this.config.apiVersion)}`;
    }
}

/**
 * DirectLineService — UI-independent DirectLine communication component
 * 
 * Single-file implementation with unified MessageEntry model.
 * Replaces all previous DirectLine implementations.
 * 
 * @version 1.0.0
 */

// ============================================================
// MessageEntry — unified message data model
// ============================================================

export class MessageEntry {
    constructor(activity) {
        // Identity
        this.id = activity.id || null;
        this.from = activity.from || {};
        this.type = activity.type || 'message';
        this.timestamp = activity.timestamp || new Date().toISOString();

        // Content (can be incrementally updated for streaming)
        this.text = activity.text || '';
        this.attachments = activity.attachments || [];
        this.suggestedActions = activity.suggestedActions || null;
        this.inputHint = activity.inputHint || null;
        this.isComplete = true; // set false for streaming chunks
        this.isGreeting = false;

        // Render state (UI layer reads/writes)
        this.render = {
            status: 'pending',     // 'pending' → 'streaming' → 'done'
            renderedLength: 0,
            element: null,
        };

        // TTS state (speech layer reads/writes)
        this.tts = {
            status: 'idle',        // 'idle' → 'queued' → 'speaking' → 'done' | 'skipped'
            spokenLength: 0,
            utteranceId: null,
        };

        // Performance metrics
        this.metrics = {
            sendTime: null,
            firstTokenTime: null,
            lastTokenTime: null,
            renderCompleteTime: null,
            ttsStartTime: null,
            ttsEndTime: null,
        };

        // Extension slot — any consumer can attach extra data
        this.meta = {};
    }

    /** Append text chunk (streaming scenario) */
    appendText(chunk) {
        this.text += chunk;
        this.metrics.lastTokenTime = Date.now();
        if (!this.metrics.firstTokenTime) {
            this.metrics.firstTokenTime = Date.now();
        }
    }

    /** Mark content as fully received */
    markComplete() {
        this.isComplete = true;
        this.metrics.lastTokenTime = Date.now();
    }
}

// ============================================================
// EventEmitter — lightweight internal pub/sub
// ============================================================

class EventEmitter {
    constructor() {
        this._handlers = {};
    }

    on(event, handler) {
        if (!this._handlers[event]) {
            this._handlers[event] = [];
        }
        this._handlers[event].push(handler);
    }

    off(event, handler) {
        if (!this._handlers[event]) return;
        this._handlers[event] = this._handlers[event].filter(h => h !== handler);
    }

    emit(event, data) {
        if (!this._handlers[event]) return;
        for (const handler of this._handlers[event]) {
            try {
                handler(data);
            } catch (err) {
                console.error(`[DirectLineService] Error in '${event}' handler:`, err);
            }
        }
    }
}

// ============================================================
// DirectLineService — main component
// ============================================================

const SERVICE_VERSION = '1.1.0';

// Connection status constants (mirrors DirectLine SDK)
const ConnectionStatus = {
    UNINITIALIZED: 0,
    CONNECTING: 1,
    ONLINE: 2,
    EXPIRED_TOKEN: 3,
    FAILED: 4,
    ENDED: 5,
};

export class DirectLineService extends EventEmitter {
    constructor() {
        super();
        this._directLine = null;
        this._status = 'disconnected'; // 'disconnected' | 'connecting' | 'connected' | 'error'
        this._entries = [];            // MessageEntry[]
        this._seenIds = new Set();     // deduplication
        this._greetingReceived = false;
        this._activitySub = null;
        this._statusSub = null;
        this._activeStreams = new Map(); // streamId → { entry, lastText, chunks }
        this._nativeStreamingSupported = null; // null = unknown, true/false after detection

        console.log(`⚙️ [DirectLineService] v${SERVICE_VERSION} loaded`);
    }

    // ── Public API ──────────────────────────────────────────

    /**
     * Connect to a bot via DirectLine secret.
     * @param {string} secret — DirectLine secret key
     * @returns {Promise<boolean>} — true if connection succeeded
     */
    async connect(secret) {
        if (!secret || typeof secret !== 'string') {
            this.emit('error', new Error('DirectLine secret is required'));
            return false;
        }

        // Clean up any existing connection
        this.disconnect();

        if (typeof DirectLine === 'undefined') {
            this.emit('error', new Error('DirectLine SDK not loaded. Check CDN script in index.html.'));
            return false;
        }

        try {
            this._setStatus('connecting');

            this._directLine = new DirectLine.DirectLine({
                secret,
                webSocket: true,
                timeout: 20000,
                pollingInterval: 1000,
                domain: 'https://directline.botframework.com/v3/directline',
            });

            this._subscribe();
            return true;
        } catch (err) {
            console.error('[DirectLineService] Connection error:', err);
            this._setStatus('error');
            this.emit('error', this._friendlyError(err));
            return false;
        }
    }

    /** Disconnect and clean up. */
    disconnect() {
        this._unsubscribe();
        if (this._directLine) {
            try { this._directLine.end(); } catch (_) { /* ignore */ }
            this._directLine = null;
        }
        this._greetingReceived = false;
        this._setStatus('disconnected');
    }

    /** Disconnect then reconnect with same or new secret. */
    async reconnect(secret) {
        this.disconnect();
        return this.connect(secret);
    }

    /**
     * Send a text message (optionally with attachments).
     * @param {string} text
     * @param {Array} [attachments] - Attachment objects with { contentType, contentUrl, name }
     * @returns {Promise}
     */
    sendMessage(text, attachments = []) {
        if (!this._directLine) {
            return Promise.reject(new Error('Not connected'));
        }

        const activity = {
            type: 'message',
            text,
            from: { id: 'user' },
            attachments: attachments || [],
        };

        return new Promise((resolve, reject) => {
            this._directLine.postActivity(activity).subscribe(
                id => resolve(id),
                err => {
                    console.error('[DirectLineService] Send error:', err);
                    reject(err);
                }
            );
        });
    }

    /**
     * Send an Adaptive Card submit response back to the bot.
     * Posts a message activity carrying the card form data in `value`
     * (with a JSON `text` fallback), matching Bot Framework card submits.
     * @param {Object} value - The Adaptive Card submit data (action.data)
     * @returns {Promise<string>} Activity ID
     */
    sendCardResponse(value) {
        if (!this._directLine) {
            return Promise.reject(new Error('Not connected'));
        }
        const activity = {
            type: 'message',
            from: { id: 'user' },
            value: value || {},
            text: '',
        };
        return new Promise((resolve, reject) => {
            this._directLine.postActivity(activity).subscribe(
                id => resolve(id),
                err => {
                    console.error('[DirectLineService] Card response send error:', err);
                    reject(err);
                }
            );
        });
    }

    /**
     * Send a message with file attachments via DirectLine REST upload endpoint.
     * Uses XHR with direct File object (proven to work with Copilot Studio).
     * For multiple files, each is sent as a separate upload request.
     *
     * @param {string} text - Message text (can be empty)
     * @param {File[]} files - Array of File objects to send
     * @param {Function} [onProgress] - Progress callback (0.0 - 1.0)
     * @returns {Promise<string>} Activity ID of the last upload
     */
    sendMessageWithFiles(text, files, onProgress) {
        if (!this._directLine) {
            return Promise.reject(new Error('Not connected'));
        }

        const conversationId = this._directLine.conversationId;
        if (!conversationId) {
            return Promise.reject(new Error('No active conversation. Connect first.'));
        }

        const secret = this._directLine.secret || this._directLine.token;
        if (!secret) {
            return Promise.reject(new Error('No authentication credentials available.'));
        }

        const domain = this._directLine.domain || 'https://directline.botframework.com/v3/directline';
        const uploadUrl = `${domain}/conversations/${encodeURIComponent(conversationId)}/upload?userId=user`;

        // ═══ DIAGNOSTIC LOG ═══
        console.group('📤 [FILE UPLOAD DIAGNOSTIC]');
        console.log('Upload URL:', uploadUrl);
        console.log('ConversationId:', conversationId);
        console.log('Auth token (first 20 chars):', secret?.substring(0, 20) + '...');
        console.log('Domain:', domain);
        console.log('Files:', files.map(f => ({ name: f.name, size: f.size, type: f.type })));
        console.log('Text:', text);
        console.groupEnd();
        // ═══════════════════════

        // Upload files sequentially; text attached to the first file only
        const uploadSingleFile = (file, fileText, fileIndex) => {
            return new Promise((resolve, reject) => {
                const formData = new FormData();

                // Append file directly as File object (not Blob — this is critical)
                formData.append('file', file, file.name);

                // Only include activity part when there's actual text
                // Activity must NOT contain an attachments array (Copilot Studio requirement)
                if (fileText && fileText.trim()) {
                    const activityJson = JSON.stringify({
                        type: 'message',
                        from: { id: 'user' },
                        text: fileText
                    });
                    const activityBlob = new Blob([activityJson], { type: 'application/vnd.microsoft.activity' });
                    formData.append('activity', activityBlob);
                    console.log(`[UPLOAD] File #${fileIndex + 1}: "${file.name}" (${file.size} bytes, ${file.type}) WITH text="${fileText}"`);
                } else {
                    console.log(`[UPLOAD] File #${fileIndex + 1}: "${file.name}" (${file.size} bytes, ${file.type}) WITHOUT text (file-only)`);
                }

                const xhr = new XMLHttpRequest();
                xhr.open('POST', uploadUrl, true);
                xhr.setRequestHeader('Authorization', `Bearer ${secret}`);

                if (onProgress && xhr.upload) {
                    xhr.upload.addEventListener('progress', (e) => {
                        if (e.lengthComputable) {
                            const fileProgress = (fileIndex + e.loaded / e.total) / files.length;
                            onProgress(fileProgress);
                        }
                    });
                }

                xhr.addEventListener('load', () => {
                    // ═══ RESPONSE DIAGNOSTIC ═══
                    console.group(`📥 [UPLOAD RESPONSE] File #${fileIndex + 1}: ${file.name}`);
                    console.log('HTTP Status:', xhr.status, xhr.statusText);
                    console.log('Response Body:', xhr.responseText);
                    console.log('Response Headers:', xhr.getAllResponseHeaders());
                    console.groupEnd();
                    // ════════════════════════════

                    if (xhr.status >= 200 && xhr.status < 300) {
                        try {
                            const response = JSON.parse(xhr.responseText);
                            console.log(`✅ [UPLOAD SUCCESS] File ${fileIndex + 1}/${files.length}: ${file.name} → activityId: ${response.id}`);
                            resolve(response.id);
                        } catch (e) {
                            console.warn('⚠️ [UPLOAD] 200 OK but response not JSON:', xhr.responseText);
                            resolve(null);
                        }
                    } else {
                        console.error(`❌ [UPLOAD FAILED] ${xhr.status}: ${xhr.statusText}`, xhr.responseText);
                        reject(new Error(`Upload failed (${xhr.status}): ${xhr.statusText}`));
                    }
                });

                xhr.addEventListener('error', () => reject(new Error('Network error during file upload')));
                xhr.addEventListener('abort', () => reject(new Error('File upload cancelled')));
                xhr.send(formData);
            });
        };

        // Sequential upload: text only on first file
        return (async () => {
            let lastId = null;
            for (let i = 0; i < files.length; i++) {
                const fileText = (i === 0) ? text : '';
                lastId = await uploadSingleFile(files[i], fileText, i);
            }
            return lastId;
        })();
    }

    /**
     * Set initialization context to be sent with the next greeting.
     * @param {Object|null} context — key/value pairs for the bot
     */
    setInitContext(context) {
        this._initContext = context && typeof context === 'object' && Object.keys(context).length > 0
            ? context
            : null;
        console.log('[DirectLineService] Init context set:', this._initContext);
    }

    /**
     * Trigger bot greeting via conversationUpdate.
     * Called automatically when connection goes online.
     */
    sendGreeting() {
        if (!this._directLine) return;

        const initContext = this._initContext || null;

        // Method 1: conversationUpdate (standard)
        this._postQuietly({
            type: 'conversationUpdate',
            from: { id: 'user' },
            membersAdded: [{ id: 'user' }],
        });

        // Method 2: startConversation event (backup, 500ms delay)
        // Includes init context if available
        setTimeout(() => {
            this._postQuietly({
                type: 'event',
                name: 'startConversation',
                from: { id: 'user' },
                value: initContext || '',
                channelData: initContext ? { initParams: initContext } : undefined,
            });
            // Clear after sending
            this._initContext = null;
        }, 500);

        // Greeting timeout — if no bot message after 5s
        setTimeout(() => {
            if (!this._greetingReceived) {
                this.emit('greetingTimeout');
            }
        }, 5000);
    }

    /** Get all message entries (bot messages). */
    getHistory() {
        return this._entries.slice();
    }

    /** Get a specific entry by id. */
    getEntry(id) {
        return this._entries.find(e => e.id === id) || null;
    }

    /** Current connection status string. */
    getStatus() {
        return this._status;
    }

    // ── Private: Subscriptions ──────────────────────────────

    _subscribe() {
        if (!this._directLine) return;

        // Activity stream
        this._activitySub = this._directLine.activity$.subscribe(
            activity => this._handleActivity(activity),
            err => {
                console.error('[DirectLineService] Activity stream error:', err);
                this.emit('error', err);
            }
        );

        // Connection status stream
        this._statusSub = this._directLine.connectionStatus$.subscribe(
            status => this._handleConnectionStatus(status),
            err => {
                console.error('[DirectLineService] Status stream error:', err);
                this.emit('error', err);
            }
        );
    }

    _unsubscribe() {
        if (this._activitySub) {
            try { this._activitySub.unsubscribe(); } catch (_) {}
            this._activitySub = null;
        }
        if (this._statusSub) {
            try { this._statusSub.unsubscribe(); } catch (_) {}
            this._statusSub = null;
        }
    }

    // ── Private: Activity handling ──────────────────────────

    _handleActivity(activity) {
        // Skip user echo
        if (activity.from && activity.from.id === 'user') return;

        // Parse livestreaming metadata (channelData OR entities[type="streaminfo"])
        const stream = this._getStreamInfo(activity);

        // Diagnostic: log ALL bot activities with streaming-relevant fields.
        // Includes RAW channelData + entities so we can verify whether the bot
        // sends any livestreaming metadata our parser might not yet recognize.
        console.log(`📨 [DirectLine Activity] type=${activity.type} id=${activity.id}`, {
            text: activity.text?.substring(0, 80),
            textLength: activity.text?.length,
            inputHint: activity.inputHint,
            replyToId: activity.replyToId,
            parsedStreamId: stream.streamId,
            parsedStreamType: stream.streamType,
            parsedStreamSequence: stream.streamSequence,
            rawChannelData: activity.channelData,
            rawEntities: activity.entities,
            timestamp: activity.timestamp,
            from: activity.from?.id
        });

        // Detect informative activities (thinking/status updates from Copilot Studio)
        const isInformative = stream.streamType === 'informative';
        if (isInformative) {
            console.log(`💭 [DirectLineService] Informative activity: "${activity.text?.substring(0, 80)}"`);
            this.emit('informative', {
                text: activity.text || '',
                streamId: stream.streamId,
                timestamp: activity.timestamp
            });
            return;
        }

        // Detect streaming activity patterns
        const isStreamingChunk = stream.streamType === 'streaming'
            || stream.streamSequence !== undefined
            || (activity.type === 'typing' && activity.text);

        if (isStreamingChunk) {
            this._handleStreamingChunk(activity, stream);
            return;
        }

        // Check if this is the final message of a stream
        const isStreamFinal = stream.streamType === 'final'
            || (stream.streamId && activity.type === 'message');

        if (isStreamFinal && this._activeStreams.has(stream.streamId)) {
            this._finalizeStream(activity, stream);
            return;
        }

        // Typing (non-streaming)
        if (activity.type === 'typing') {
            this.emit('typing');
            return;
        }

        // Deduplicate
        if (activity.id && this._seenIds.has(activity.id)) return;
        if (activity.id) this._seenIds.add(activity.id);

        // Message
        if (activity.type === 'message') {
            const entry = new MessageEntry(activity);

            // Greeting detection
            if (!this._greetingReceived && entry.text && entry.text.trim().length > 0) {
                this._greetingReceived = true;
                entry.isGreeting = true;
                this.emit('greeting', entry);
            }

            this._entries.push(entry);
            entry.markComplete();
            this.emit('message', entry);
            return;
        }

        // Conversation update
        if (activity.type === 'conversationUpdate') {
            this.emit('conversationUpdate', activity);
            return;
        }

        // Event activity
        if (activity.type === 'event') {
            this.emit('event', activity);
            return;
        }
    }

    // ── Private: Streaming chunk handling ────────────────────

    /**
     * Extract livestreaming metadata from an activity.
     * Per BotFramework WebChat LIVESTREAMING.md, metadata may live in either
     * `channelData` or `entities[type="streaminfo"]` — both are equivalent.
     * `chunkType` ("delta" | "full") is an authoritative signal (sent by
     * Copilot Studio in `channelData`) declaring whether a streaming chunk's
     * text is an incremental fragment or the full text so far.
     * @param {Object} activity
     * @returns {{streamType: string|undefined, streamId: string|undefined, streamSequence: number|undefined, chunkType: string|undefined}}
     */
    _getStreamInfo(activity) {
        const cd = activity.channelData || {};
        if (cd.streamType !== undefined || cd.streamId !== undefined || cd.streamSequence !== undefined) {
            return {
                streamType: cd.streamType,
                streamId: cd.streamId,
                streamSequence: cd.streamSequence,
                chunkType: cd.chunkType
            };
        }

        const entity = Array.isArray(activity.entities)
            ? activity.entities.find(e => e && e.type === 'streaminfo')
            : null;
        if (entity) {
            return {
                streamType: entity.streamType,
                streamId: entity.streamId,
                streamSequence: entity.streamSequence,
                chunkType: entity.chunkType
            };
        }

        return { streamType: undefined, streamId: undefined, streamSequence: undefined, chunkType: undefined };
    }

    /**
     * Handle a streaming chunk activity (incremental text from bot).
     * Emits 'messageChunk' for real-time UI updates.
     * @param {Object} activity
     * @param {Object} [stream] - Pre-parsed stream metadata from _getStreamInfo
     */
    _handleStreamingChunk(activity, stream) {
        stream = stream || this._getStreamInfo(activity);

        if (this._nativeStreamingSupported === null) {
            this._nativeStreamingSupported = true;
            console.log('🔥 [DirectLineService] Native streaming DETECTED — Copilot Studio is sending incremental activities');
        }

        const streamId = stream.streamId || activity.replyToId || `stream-${Date.now()}`;
        const text = activity.text || '';
        const seq = stream.streamSequence;

        if (!this._activeStreams.has(streamId)) {
            // First chunk: create entry with a STABLE id (= streamId when activity.id missing)
            const entry = new MessageEntry(activity);
            entry.id = activity.id || streamId;
            entry.isComplete = false;
            entry.text = text;
            entry.metrics.firstTokenTime = Date.now();
            entry.meta.wasStreamed = true;
            this._activeStreams.set(streamId, {
                entry,
                lastText: text,
                chunks: 1,
                lastSequence: seq
            });
            this._entries.push(entry);

            // Greeting detection on first chunk
            if (!this._greetingReceived && text.trim().length > 0) {
                this._greetingReceived = true;
                entry.isGreeting = true;
                this.emit('greeting', entry);
            }

            this.emit('messageChunk', entry);
        } else {
            const streamState = this._activeStreams.get(streamId);

            // Out-of-order / obsolete chunk protection: drop chunks whose sequence
            // is not newer than the last applied one (per LIVESTREAMING.md design).
            if (seq !== undefined && streamState.lastSequence !== undefined && seq <= streamState.lastSequence) {
                console.log(`⏭️ [DirectLineService] Dropping obsolete chunk seq=${seq} (last=${streamState.lastSequence}) for stream ${streamId}`);
                return;
            }

            streamState.chunks++;
            if (seq !== undefined) streamState.lastSequence = seq;

            // Two real-world chunk encodings exist and must both be supported:
            //   • DELTA      — each activity carries only the NEW fragment.
            //                  Copilot Studio declares this explicitly via
            //                  channelData.chunkType === 'delta' (verified:
            //                  682 chunks, each ≤10 chars, that concatenate
            //                  into the final answer).
            //   • CUMULATIVE — each activity carries the full text so far.
            // Prefer the authoritative `chunkType` signal; fall back to a
            // prefix heuristic only when the bot omits it.
            const acc = streamState.entry.text;
            if (!text) {
                // Contentless chunk (e.g. first streaming activity) — nothing to add.
            } else if (stream.chunkType === 'delta') {
                // Authoritative delta: the chunk itself is the new fragment.
                streamState.entry.appendText(text);
            } else if (text === acc) {
                // Cumulative resend of identical text — ignore to avoid duplication.
            } else if (text.startsWith(acc)) {
                // Cumulative: append only the newly added tail.
                streamState.entry.appendText(text.substring(acc.length));
            } else {
                // Unknown/heuristic fallback: treat as a delta fragment.
                streamState.entry.appendText(text);
            }
            streamState.lastText = text;

            this.emit('messageChunk', streamState.entry);
        }
    }

    /**
     * Finalize a streaming message when the final activity arrives.
     * @param {Object} activity
     * @param {Object} [stream] - Pre-parsed stream metadata from _getStreamInfo
     */
    _finalizeStream(activity, stream) {
        stream = stream || this._getStreamInfo(activity);
        const streamId = stream.streamId;
        const streamState = this._activeStreams.get(streamId);

        if (!streamState) return;

        // Empty final = "regretted livestream" — bot erased the response before
        // concluding. Remove the bubble entirely (per LIVESTREAMING.md scenario 3).
        const finalText = activity.text || '';
        const hasContent = finalText.trim().length > 0
            || (activity.attachments && activity.attachments.length > 0);

        if (!hasContent) {
            this._activeStreams.delete(streamId);
            const idx = this._entries.indexOf(streamState.entry);
            if (idx >= 0) this._entries.splice(idx, 1);
            if (activity.id) this._seenIds.add(activity.id);
            console.log(`🗑️ [DirectLineService] Stream ${streamId} regretted (empty final) — removing bubble`);
            this.emit('streamCancelled', streamState.entry);
            return;
        }

        // Normal finalize — keep entry.id STABLE so the renderer can match the
        // streaming bubble; record the real final activity id for dedup only.
        if (activity.text) {
            streamState.entry.text = activity.text;
        }
        if (activity.attachments && activity.attachments.length > 0) {
            streamState.entry.attachments = activity.attachments;
        }
        if (activity.suggestedActions) {
            streamState.entry.suggestedActions = activity.suggestedActions;
        }
        streamState.entry.markComplete();
        streamState.entry.meta.finalId = activity.id || null;

        // Dedup the real final activity id (entry.id stays as the stream key)
        if (activity.id) this._seenIds.add(activity.id);

        console.log(`✅ [DirectLineService] Stream ${streamId} finalized: ${streamState.chunks} chunks, ${streamState.entry.text.length} chars`);
        this._activeStreams.delete(streamId);

        this.emit('message', streamState.entry);
    }

    // ── Private: Connection status ──────────────────────────

    _handleConnectionStatus(status) {
        switch (status) {
            case ConnectionStatus.ONLINE:
                this._setStatus('connected');
                // Auto-send greeting when connection goes online
                setTimeout(() => this.sendGreeting(), 1000);
                break;
            case ConnectionStatus.CONNECTING:
                this._setStatus('connecting');
                break;
            case ConnectionStatus.EXPIRED_TOKEN:
            case ConnectionStatus.FAILED:
            case ConnectionStatus.ENDED:
                this._setStatus('disconnected');
                break;
        }
        this.emit('statusChange', status);
    }

    _setStatus(status) {
        if (this._status !== status) {
            this._status = status;
            if (status === 'connected') this.emit('connected');
            if (status === 'disconnected') this.emit('disconnected');
        }
    }

    // ── Private: Helpers ────────────────────────────────────

    _postQuietly(activity) {
        if (!this._directLine) return;
        this._directLine.postActivity(activity).subscribe(
            () => {},
            err => console.warn('[DirectLineService] Greeting activity error (non-fatal):', err)
        );
    }

    _friendlyError(err) {
        const msg = err.message || '';
        if (msg.includes('401') || msg.includes('Unauthorized'))
            return new Error('Invalid DirectLine secret. Check configuration.');
        if (msg.includes('403') || msg.includes('Forbidden'))
            return new Error('DirectLine secret lacks permission. Check Azure Bot config.');
        if (msg.includes('network') || msg.includes('fetch'))
            return new Error('Network error. Check your internet connection.');
        return err;
    }
}

// Singleton export
export const directLineService = new DirectLineService();

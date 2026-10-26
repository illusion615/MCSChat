/**
 * In-memory traffic metrics for the Router admin console.
 * Everything resets on restart — no persistence, no external exporter.
 */

const SAMPLE_CAPACITY = 1_024;

class Sampler {
    constructor(capacity = SAMPLE_CAPACITY) {
        this.capacity = capacity;
        this.samples = [];
        this.seen = 0;
        this.total = 0;
    }

    add(value) {
        const numeric = Number(value);
        if (!Number.isFinite(numeric) || numeric < 0) return;
        this.seen += 1;
        this.total += numeric;
        if (this.samples.length < this.capacity) {
            this.samples.push(numeric);
            return;
        }
        // Reservoir sampling keeps the distribution unbiased at fixed memory cost.
        const index = Math.floor(Math.random() * this.seen);
        if (index < this.capacity) this.samples[index] = numeric;
    }

    quantile(fraction) {
        if (!this.samples.length) return null;
        const sorted = [...this.samples].sort((a, b) => a - b);
        const position = Math.min(sorted.length - 1, Math.max(0, Math.ceil(fraction * sorted.length) - 1));
        return Math.round(sorted[position]);
    }

    snapshot() {
        return {
            count: this.seen,
            avg: this.seen ? Math.round(this.total / this.seen) : null,
            p50: this.quantile(0.5),
            p95: this.quantile(0.95),
            max: this.samples.length ? Math.round(Math.max(...this.samples)) : null,
        };
    }
}

class TimeSeries {
    constructor(bucketMs, bucketCount, now) {
        this.bucketMs = bucketMs;
        this.bucketCount = bucketCount;
        this.now = now;
        this.buckets = new Map();
    }

    add(name, amount = 1) {
        const bucket = Math.floor(this.now() / this.bucketMs);
        let counts = this.buckets.get(bucket);
        if (!counts) {
            counts = {};
            this.buckets.set(bucket, counts);
            this.#prune(bucket);
        }
        counts[name] = (counts[name] || 0) + amount;
    }

    #prune(currentBucket) {
        const oldest = currentBucket - this.bucketCount + 1;
        for (const bucket of this.buckets.keys()) {
            if (bucket < oldest) this.buckets.delete(bucket);
        }
    }

    snapshot() {
        const currentBucket = Math.floor(this.now() / this.bucketMs);
        const points = [];
        for (let offset = this.bucketCount - 1; offset >= 0; offset -= 1) {
            const bucket = currentBucket - offset;
            points.push({
                at: new Date(bucket * this.bucketMs).toISOString(),
                ...(this.buckets.get(bucket) || {}),
            });
        }
        return { bucketMs: this.bucketMs, points };
    }
}

function increment(target, key, amount = 1) {
    target[key] = (target[key] || 0) + amount;
}

function decrementToZero(target, key, amount = 1) {
    target[key] = Math.max(0, (target[key] || 0) - amount);
}

function incrementNested(target, category, key, amount = 1) {
    if (!target[category]) target[category] = {};
    increment(target[category], key, amount);
}

function cloneNested(source) {
    const result = {};
    for (const [category, values] of Object.entries(source)) {
        result[category] = { ...values };
    }
    return result;
}

function normalizeSurface(surface) {
    return ['business', 'console', 'support'].includes(surface) ? surface : 'other';
}

export class RouterMetrics {
    constructor({ now = () => Date.now() } = {}) {
        this.now = now;
        this.startedAt = now();
        this.requests = {
            total: 0,
            inFlight: 0,
            bySurface: {},
            inFlightBySurface: {},
            byRoute: {},
            byRouteBySurface: {},
            byStatusClass: {},
            byStatusClassBySurface: {},
        };
        this.auth = { unauthorized: 0, adminEvents: {} };
        this.rateLimit = { hits: 0 };
        this.conversations = { created: 0, closed: 0, forceClosed: 0 };
        this.turns = { started: 0, outcomes: {}, answerSnapshots: 0, stages: 0 };
        this.upstream = { calls: {}, errors: {} };
        this.latency = {
            request: new Sampler(),
            requestBusiness: new Sampler(),
            ttft: new Sampler(),
            turnTotal: new Sampler(),
            upstream: new Sampler(),
        };
        this.recentTurns = [];
        this.fiveMinutes = new TimeSeries(5_000, 60, now);
        this.oneHour = new TimeSeries(60_000, 60, now);
    }

    startRequest(surface = 'other') {
        const normalizedSurface = normalizeSurface(surface);
        this.requests.inFlight += 1;
        increment(this.requests.inFlightBySurface, normalizedSurface);
        const startedAt = this.now();
        let settled = false;
        return (route, statusCode) => {
            if (settled) return 0;
            settled = true;
            const durationMs = this.now() - startedAt;
            this.requests.inFlight = Math.max(0, this.requests.inFlight - 1);
            decrementToZero(this.requests.inFlightBySurface, normalizedSurface);
            this.requests.total += 1;
            increment(this.requests.bySurface, normalizedSurface);
            increment(this.requests.byRoute, route || 'unknown');
            incrementNested(this.requests.byRouteBySurface, normalizedSurface, route || 'unknown');
            const statusClass = `${Math.floor(Number(statusCode || 0) / 100) || 0}xx`;
            increment(this.requests.byStatusClass, statusClass);
            incrementNested(this.requests.byStatusClassBySurface, normalizedSurface, statusClass);
            this.latency.request.add(durationMs);
            if (normalizedSurface === 'business') this.latency.requestBusiness.add(durationMs);
            this.fiveMinutes.add('requests');
            this.oneHour.add('requests');
            this.fiveMinutes.add(`${normalizedSurface}Requests`);
            this.oneHour.add(`${normalizedSurface}Requests`);
            if (statusClass === '4xx' || statusClass === '5xx') {
                this.fiveMinutes.add('errors');
                this.oneHour.add('errors');
                this.fiveMinutes.add(`${normalizedSurface}Errors`);
                this.oneHour.add(`${normalizedSurface}Errors`);
            }
            return durationMs;
        };
    }

    recordUnauthorized() {
        this.auth.unauthorized += 1;
    }

    recordAdminEvent(name) {
        increment(this.auth.adminEvents, name);
    }

    recordRateLimit() {
        this.rateLimit.hits += 1;
    }

    recordConversation(event) {
        if (event in this.conversations) this.conversations[event] += 1;
    }

    recordUpstream({ operation, ok, durationMs, code }) {
        increment(this.upstream.calls, operation);
        if (!ok) increment(this.upstream.errors, code || 'UNKNOWN');
        this.latency.upstream.add(durationMs);
    }

    turnStarted() {
        this.turns.started += 1;
        this.fiveMinutes.add('turns');
        this.oneHour.add('turns');
    }

    recordTurn({ outcome, ttftMs, totalMs, answerSnapshots = 0, stages = 0, conversationRef, code }) {
        increment(this.turns.outcomes, outcome || 'unknown');
        this.turns.answerSnapshots += answerSnapshots;
        this.turns.stages += stages;
        if (Number.isFinite(ttftMs)) this.latency.ttft.add(ttftMs);
        if (Number.isFinite(totalMs)) this.latency.turnTotal.add(totalMs);
        this.recentTurns.unshift({
            at: new Date(this.now()).toISOString(),
            outcome: outcome || 'unknown',
            code,
            ttftMs: Number.isFinite(ttftMs) ? Math.round(ttftMs) : null,
            totalMs: Number.isFinite(totalMs) ? Math.round(totalMs) : null,
            answerSnapshots,
            stages,
            conversationRef,
        });
        if (this.recentTurns.length > 20) this.recentTurns.length = 20;
    }

    snapshot() {
        return {
            capturedAt: new Date(this.now()).toISOString(),
            uptimeMs: this.now() - this.startedAt,
            requests: {
                total: this.requests.total,
                inFlight: this.requests.inFlight,
                bySurface: { ...this.requests.bySurface },
                inFlightBySurface: { ...this.requests.inFlightBySurface },
                byRoute: { ...this.requests.byRoute },
                byRouteBySurface: cloneNested(this.requests.byRouteBySurface),
                byStatusClass: { ...this.requests.byStatusClass },
                byStatusClassBySurface: cloneNested(this.requests.byStatusClassBySurface),
            },
            auth: { unauthorized: this.auth.unauthorized, adminEvents: { ...this.auth.adminEvents } },
            rateLimit: { ...this.rateLimit },
            conversations: { ...this.conversations },
            turns: {
                started: this.turns.started,
                outcomes: { ...this.turns.outcomes },
                answerSnapshots: this.turns.answerSnapshots,
                stages: this.turns.stages,
            },
            upstream: { calls: { ...this.upstream.calls }, errors: { ...this.upstream.errors } },
            latency: {
                request: this.latency.request.snapshot(),
                requestBusiness: this.latency.requestBusiness.snapshot(),
                ttft: this.latency.ttft.snapshot(),
                turnTotal: this.latency.turnTotal.snapshot(),
                upstream: this.latency.upstream.snapshot(),
            },
            recentTurns: [...this.recentTurns],
            series: {
                fiveMinutes: this.fiveMinutes.snapshot(),
                oneHour: this.oneHour.snapshot(),
            },
        };
    }
}

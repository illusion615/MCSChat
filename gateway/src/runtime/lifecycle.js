/**
 * Process lifecycle coordination for the Router.
 *
 * The admin console can only *request* a restart; the actual `process.exit`
 * lives here so HTTP handlers never terminate the process directly.
 * Exit code 75 (EX_TEMPFAIL) is the agreed signal for
 * `scripts/routerSupervisor.js` to respawn the server.
 */

export const RESTART_EXIT_CODE = 75;

export class RouterLifecycle {
    constructor({
        logger = console,
        drainMs = 10_000,
        now = () => Date.now(),
        exit = code => process.exit(code),
        pollIntervalMs = 100,
    } = {}) {
        this.logger = logger;
        this.drainMs = drainMs;
        this.now = now;
        this.exit = exit;
        this.pollIntervalMs = pollIntervalMs;
        this.server = null;
        this.draining = false;
        this.drainReason = null;
        this.inFlight = 0;
        this.drainHandlers = new Set();
        this.startedAt = now();
    }

    attach(server) {
        this.server = server;
        return this;
    }

    trackRequest() {
        this.inFlight += 1;
        let released = false;
        return () => {
            if (released) return;
            released = true;
            this.inFlight = Math.max(0, this.inFlight - 1);
        };
    }

    onDrain(handler) {
        this.drainHandlers.add(handler);
        return () => this.drainHandlers.delete(handler);
    }

    status() {
        return {
            draining: this.draining,
            drainReason: this.drainReason,
            inFlight: this.inFlight,
            startedAt: new Date(this.startedAt).toISOString(),
            uptimeMs: this.now() - this.startedAt,
        };
    }

    requestRestart({ reason = 'admin-console', sessionRef } = {}) {
        if (this.draining) return { accepted: false, drainMs: this.drainMs };
        this.logger.warn?.('Router restart requested', { reason, sessionRef, drainMs: this.drainMs });
        queueMicrotask(() => {
            this.shutdown({ exitCode: RESTART_EXIT_CODE, reason }).catch(error => {
                this.logger.error?.('Router restart failed', { code: error?.code || 'RESTART_FAILED' });
            });
        });
        return { accepted: true, drainMs: this.drainMs };
    }

    installSignalHandlers() {
        for (const signal of ['SIGINT', 'SIGTERM']) {
            process.once(signal, () => {
                this.shutdown({ exitCode: 0, reason: signal }).catch(() => this.exit(1));
            });
        }
        return this;
    }

    async shutdown({ exitCode = 0, reason = 'shutdown' } = {}) {
        if (this.draining) return false;
        this.draining = true;
        this.drainReason = reason;

        for (const handler of this.drainHandlers) {
            try {
                handler({ reason, exitCode });
            } catch {
                // A failing drain handler must never block process shutdown.
            }
        }

        this.server?.close?.();
        this.server?.closeIdleConnections?.();

        const deadline = this.now() + this.drainMs;
        while (this.inFlight > 0 && this.now() < deadline) {
            await new Promise(resolve => { setTimeout(resolve, this.pollIntervalMs); });
        }
        if (this.inFlight > 0) {
            this.logger.warn?.('Router drain window expired with active requests', {
                reason,
                inFlight: this.inFlight,
            });
        }

        this.server?.closeAllConnections?.();
        this.logger.warn?.('Router stopping', { reason, exitCode });
        this.exit(exitCode);
        return true;
    }
}

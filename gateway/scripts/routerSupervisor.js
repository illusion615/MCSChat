#!/usr/bin/env node

/**
 * Supervisor for the D2E Local Router.
 *
 * Runs `src/server.js` as a child process and respawns it when the child exits
 * with code 75 (EX_TEMPFAIL), which is how the admin console requests a restart.
 * Any other exit code is passed through so `npm run start:local` still reports
 * genuine failures.
 */

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const RESTART_EXIT_CODE = 75;
const CRASH_WINDOW_MS = 3_000;
const MAX_CONSECUTIVE_CRASHES = 5;

const serverEntry = fileURLToPath(new URL('../src/server.js', import.meta.url));
// `--env-file` already populated process.env here, and spawn inherits it.
const nodeArgs = process.execArgv.filter(arg => !arg.startsWith('--env-file'));

let child = null;
let consecutiveCrashes = 0;
let stopping = false;

function start() {
    const startedAt = Date.now();
    child = spawn(
        process.execPath,
        [...nodeArgs, serverEntry, ...process.argv.slice(2)],
        { stdio: 'inherit', env: { ...process.env, ROUTER_SUPERVISED: '1' } }
    );

    child.on('exit', (code, signal) => {
        child = null;
        if (stopping) return;

        if (code === RESTART_EXIT_CODE) {
            const lifetimeMs = Date.now() - startedAt;
            consecutiveCrashes = lifetimeMs < CRASH_WINDOW_MS ? consecutiveCrashes + 1 : 0;
            if (consecutiveCrashes >= MAX_CONSECUTIVE_CRASHES) {
                console.error(
                    `[supervisor] Router restarted ${consecutiveCrashes} times within ${CRASH_WINDOW_MS}ms. Stopping.`
                );
                process.exit(1);
            }
            console.log('[supervisor] Router requested a restart. Respawning…');
            start();
            return;
        }

        if (signal) {
            console.error(`[supervisor] Router terminated by ${signal}.`);
            process.exit(1);
        }
        process.exit(code ?? 0);
    });

    child.on('error', error => {
        console.error('[supervisor] Failed to spawn Router', { code: error.code });
        process.exit(1);
    });
}

for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => {
        stopping = true;
        child?.kill(signal);
        // Give the child its drain window before the supervisor gives up.
        setTimeout(() => process.exit(0), 15_000).unref();
        child?.once('exit', () => process.exit(0));
    });
}

console.log('[supervisor] Starting D2E Local Router (restart-capable).');
start();

import { randomUUID } from 'node:crypto';
import { appendFile, mkdir, readdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

const DAY_MS = 86_400_000;

function dayKey(timestamp) {
    return new Date(timestamp).toISOString().slice(0, 10);
}

/**
 * Append-only NDJSON evidence store. Logs and turn traces share one set of file
 * primitives so rotation and retention are implemented once.
 */
export class EvidenceArchive {
    constructor(rootDirectory, { now = () => Date.now(), onError = () => {} } = {}) {
        this.rootDirectory = path.resolve(rootDirectory);
        this.now = now;
        this.onError = onError;
    }

    async initialize() {
        await mkdir(this.rootDirectory, { recursive: true, mode: 0o700 });
    }

    dailyPath(prefix, timestamp = this.now()) {
        return path.join(prefix, `${dayKey(timestamp)}.ndjson`);
    }

    /** Never throws: losing evidence must not fail the request that produced it. */
    async appendLine(relativePath, value) {
        try {
            const filePath = this.#resolve(relativePath);
            await mkdir(path.dirname(filePath), { recursive: true, mode: 0o700 });
            await appendFile(filePath, `${JSON.stringify(value)}\n`, { mode: 0o600 });
            return true;
        } catch (error) {
            this.onError(error, relativePath);
            return false;
        }
    }

    async readLines(relativePath) {
        try {
            const raw = await readFile(this.#resolve(relativePath), 'utf8');
            return raw.split('\n').filter(Boolean).map(line => {
                try { return JSON.parse(line); } catch { return null; }
            }).filter(Boolean);
        } catch (error) {
            if (error.code === 'ENOENT') return [];
            throw error;
        }
    }

    /** Reads newest-first across daily files, stopping once `limit` is reached. */
    async readRange(prefix, { from, to, limit = 500, match } = {}) {
        const files = await this.#dailyFiles(prefix);
        const results = [];
        for (const file of files.slice().reverse()) {
            if (from && file.day < dayKey(from)) break;
            if (to && file.day > dayKey(to)) continue;
            const entries = await this.readLines(path.join(prefix, file.name));
            for (let index = entries.length - 1; index >= 0; index -= 1) {
                const entry = entries[index];
                const at = Date.parse(entry.at);
                if (from && Number.isFinite(at) && at < from) continue;
                if (to && Number.isFinite(at) && at > to) continue;
                if (match && !match(entry)) continue;
                results.push(entry);
                if (results.length >= limit) return results.reverse();
            }
        }
        return results.reverse();
    }

    /** Removes entries older than the exact cutoff, deleting or rewriting daily files. */
    async purgeBefore(prefix, cutoffMs) {
        const cutoffDay = dayKey(cutoffMs);
        const files = await this.#dailyFiles(prefix);
        let removedFiles = 0;
        let removedBytes = 0;
        let removedEntries = 0;
        for (const file of files) {
            if (file.day > cutoffDay) continue;
            const relativePath = path.join(prefix, file.name);
            const filePath = this.#resolve(relativePath);
            if (file.day < cutoffDay) {
                removedBytes += file.bytes;
                removedEntries += (await this.readLines(relativePath)).length;
                removedFiles += 1;
                await rm(filePath).catch(() => undefined);
                continue;
            }
            const entries = await this.readLines(relativePath);
            const retained = entries.filter(entry => {
                const at = Date.parse(entry.at);
                return !Number.isFinite(at) || at >= cutoffMs;
            });
            removedEntries += entries.length - retained.length;
            if (retained.length === entries.length) continue;
            if (!retained.length) {
                removedBytes += file.bytes;
                removedFiles += 1;
                await rm(filePath).catch(() => undefined);
                continue;
            }
            const next = `${retained.map(entry => JSON.stringify(entry)).join('\n')}\n`;
            const temporary = `${filePath}.${randomUUID()}.tmp`;
            await writeFile(temporary, next, { mode: 0o600 });
            await rename(temporary, filePath);
            removedBytes += Math.max(0, file.bytes - Buffer.byteLength(next));
        }
        return { removedFiles, removedBytes, removedEntries };
    }

    /** Removes an entire sub-tree, used when a conversation's evidence is dropped. */
    async removeTree(relativePath) {
        await rm(this.#resolve(relativePath), { recursive: true, force: true }).catch(() => undefined);
    }

    async stats(prefix) {
        const files = await this.#dailyFiles(prefix);
        const bytes = files.reduce((total, file) => total + file.bytes, 0);
        return {
            files: files.length,
            bytes,
            oldestDay: files[0]?.day ?? null,
            newestDay: files[files.length - 1]?.day ?? null,
        };
    }

    /** Recursive byte/entry count for nested trees such as debug/<conversation>/. */
    async treeStats(prefix) {
        const root = this.#resolve(prefix);
        let files = 0;
        let bytes = 0;
        const walk = async directory => {
            let items;
            try {
                items = await readdir(directory, { withFileTypes: true });
            } catch (error) {
                if (error.code === 'ENOENT') return;
                throw error;
            }
            for (const item of items) {
                const full = path.join(directory, item.name);
                if (item.isDirectory()) await walk(full);
                else {
                    files += 1;
                    bytes += (await stat(full).catch(() => ({ size: 0 }))).size;
                }
            }
        };
        await walk(root);
        return { files, bytes };
    }

    /** Lists immediate sub-directory names, used to find orphaned trace trees. */
    async listSubdirectories(prefix) {
        try {
            const items = await readdir(this.#resolve(prefix), { withFileTypes: true });
            return items.filter(item => item.isDirectory()).map(item => item.name);
        } catch (error) {
            if (error.code === 'ENOENT') return [];
            throw error;
        }
    }

    /** Lists NDJSON files in a flat directory, used for a conversation's turn traces. */
    async listTurnFiles(prefix) {
        const directory = this.#resolve(prefix);
        let names;
        try {
            names = await readdir(directory);
        } catch (error) {
            if (error.code === 'ENOENT') return [];
            throw error;
        }
        const files = [];
        for (const name of names) {
            if (!name.endsWith('.ndjson')) continue;
            const info = await stat(path.join(directory, name)).catch(() => null);
            files.push({
                turnId: name.slice(0, -'.ndjson'.length),
                bytes: info?.size ?? 0,
                modifiedAt: info ? new Date(info.mtimeMs).toISOString() : null,
            });
        }
        return files.sort((left, right) => String(right.modifiedAt).localeCompare(String(left.modifiedAt)));
    }

    async #dailyFiles(prefix) {
        const directory = this.#resolve(prefix);
        let names;
        try {
            names = await readdir(directory);
        } catch (error) {
            if (error.code === 'ENOENT') return [];
            throw error;
        }
        const files = [];
        for (const name of names) {
            const match = /^(\d{4}-\d{2}-\d{2})\.ndjson$/.exec(name);
            if (!match) continue;
            const info = await stat(path.join(directory, name)).catch(() => null);
            files.push({ name, day: match[1], bytes: info?.size ?? 0 });
        }
        return files.sort((left, right) => left.day.localeCompare(right.day));
    }

    #resolve(relativePath) {
        const resolved = path.resolve(this.rootDirectory, relativePath);
        if (resolved !== this.rootDirectory && !resolved.startsWith(`${this.rootDirectory}${path.sep}`)) {
            throw new Error('Evidence path escapes the archive root');
        }
        return resolved;
    }
}

export const RETENTION_DAY_MS = DAY_MS;

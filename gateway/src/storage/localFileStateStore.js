import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { StateConflictError } from '../errors.js';

function etagFor(data) {
    return createHash('sha256').update(data).digest('hex');
}

export class LocalFileStateStore {
    constructor(rootDirectory) {
        this.rootDirectory = path.resolve(rootDirectory);
    }

    async initialize() {
        await mkdir(this.rootDirectory, { recursive: true, mode: 0o700 });
    }

    async read(statePath) {
        const filePath = this.#resolve(statePath);
        try {
            const data = await readFile(filePath);
            return {
                data,
                etag: etagFor(data),
                contentType: statePath.endsWith('.json') ? 'application/json' : 'application/octet-stream',
            };
        } catch (error) {
            if (error.code === 'ENOENT') return null;
            throw error;
        }
    }

    async write(statePath, data, { etag } = {}) {
        const filePath = this.#resolve(statePath);
        const source = Buffer.from(data);
        const current = await this.read(statePath);
        if ((current && current.etag !== etag) || (!current && etag)) {
            throw new StateConflictError();
        }
        await mkdir(path.dirname(filePath), { recursive: true, mode: 0o700 });
        const temporaryPath = `${filePath}.${randomUUID()}.tmp`;
        await writeFile(temporaryPath, source, { mode: 0o600 });
        await rename(temporaryPath, filePath);
        return { etag: etagFor(source) };
    }

    async remove(statePath, { etag } = {}) {
        const filePath = this.#resolve(statePath);
        const current = await this.read(statePath);
        if (!current) return;
        if (etag && current.etag !== etag) throw new StateConflictError();
        await rm(filePath);
    }

    async readJson(statePath) {
        const entry = await this.read(statePath);
        return entry
            ? { value: JSON.parse(entry.data.toString('utf8')), etag: entry.etag }
            : null;
    }

    async writeJson(statePath, value, options = {}) {
        return this.write(statePath, Buffer.from(JSON.stringify(value), 'utf8'), options);
    }

    /** Relative state paths directly under `prefix`, sorted for stable output. */
    async list(prefix) {
        const normalized = String(prefix || '').replace(/\/$/, '');
        const directory = normalized ? this.#resolve(normalized) : this.rootDirectory;
        try {
            const names = await readdir(directory, { withFileTypes: true });
            return names
                .filter(entry => entry.isFile())
                .map(entry => (normalized ? `${normalized}/${entry.name}` : entry.name))
                .sort();
        } catch (error) {
            if (error.code === 'ENOENT') return [];
            throw error;
        }
    }

    async permissions(statePath) {
        const fileStat = await stat(this.#resolve(statePath));
        return fileStat.mode & 0o777;
    }

    #resolve(statePath) {
        const normalized = String(statePath || '').replaceAll('\\', '/');
        if (!normalized || normalized.startsWith('/') || normalized.split('/').includes('..')) {
            throw new Error('Invalid local state path');
        }
        const resolved = path.resolve(this.rootDirectory, normalized);
        if (!resolved.startsWith(`${this.rootDirectory}${path.sep}`)) {
            throw new Error('Invalid local state path');
        }
        return resolved;
    }
}
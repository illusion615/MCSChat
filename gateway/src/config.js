const GUID_PATTERN = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

const DEFAULTS = Object.freeze({
    port: 8080,
    scope: 'https://api.powerplatform.com/.default',
    environmentId: '448464af-64af-ec92-a521-6d203cf6811d',
    schemaName: 'Default_KnowledgeAgentNewCopilot_sodjEw',
    apiVersion: '1',
    conversationTtlMinutes: 60,
    upstreamTimeoutMs: 180_000,
    allowedOrigins: [
        'https://illusion615.github.io',
        'http://localhost:8000',
        'http://127.0.0.1:8000',
    ],
});

function required(env, name) {
    const value = String(env[name] || '').trim();
    if (!value) throw new Error(`Missing required configuration: ${name}`);
    return value;
}

function positiveInteger(value, name, fallback) {
    const parsed = value === undefined || value === '' ? fallback : Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) {
        throw new Error(`${name} must be a positive integer`);
    }
    return parsed;
}

function absoluteUrl(value, name) {
    let parsed;
    try {
        parsed = new URL(value);
    } catch {
        throw new Error(`${name} must be an absolute URL`);
    }
    if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new Error(`${name} must use http or https`);
    }
    return parsed.toString().replace(/\/$/, '');
}

function uuid(value, name) {
    if (!GUID_PATTERN.test(value)) throw new Error(`${name} must be a GUID`);
    return value.toLowerCase();
}

export function environmentHost(environmentId) {
    const compact = uuid(environmentId, 'POWER_PLATFORM_ENVIRONMENT_ID').replaceAll('-', '');
    return `https://${compact.slice(0, -2)}.${compact.slice(-2)}.environment.api.powerplatform.com`;
}

export function loadConfig(env = process.env) {
    const tenantId = uuid(required(env, 'TENANT_ID'), 'TENANT_ID');
    const clientId = uuid(required(env, 'ENTRA_CLIENT_ID'), 'ENTRA_CLIENT_ID');
    const environmentId = uuid(
        env.POWER_PLATFORM_ENVIRONMENT_ID || DEFAULTS.environmentId,
        'POWER_PLATFORM_ENVIRONMENT_ID'
    );
    const publicBaseUrl = absoluteUrl(required(env, 'PUBLIC_BASE_URL'), 'PUBLIC_BASE_URL');
    const allowedOrigins = String(env.ALLOWED_ORIGINS || DEFAULTS.allowedOrigins.join(','))
        .split(',')
        .map(origin => origin.trim())
        .filter(Boolean)
        .map(origin => absoluteUrl(origin, 'ALLOWED_ORIGINS entry'));

    return Object.freeze({
        port: positiveInteger(env.PORT, 'PORT', DEFAULTS.port),
        localDevelopment: true,
        localStateDirectory: String(env.LOCAL_STATE_DIRECTORY || './.local-state').trim(),
        tenantId,
        clientId,
        allowedUpstreamUserOid: uuid(required(env, 'ALLOWED_UPSTREAM_USER_OID'), 'ALLOWED_UPSTREAM_USER_OID'),
        publicBaseUrl,
        redirectUri: `${publicBaseUrl}/admin/auth/callback`,
        allowedOrigins,
        scope: DEFAULTS.scope,
        environmentId,
        environmentHost: environmentHost(environmentId),
        schemaName: String(env.POWER_PLATFORM_SCHEMA_NAME || DEFAULTS.schemaName).trim(),
        apiVersion: String(env.POWER_PLATFORM_API_VERSION || DEFAULTS.apiVersion).trim(),
        upstreamTimeoutMs: positiveInteger(
            env.UPSTREAM_TIMEOUT_MS,
            'UPSTREAM_TIMEOUT_MS',
            DEFAULTS.upstreamTimeoutMs
        ),
        conversationTtlMinutes: positiveInteger(
            env.CONVERSATION_TTL_MINUTES,
            'CONVERSATION_TTL_MINUTES',
            DEFAULTS.conversationTtlMinutes
        ),
        prototypePagePath: String(env.PROTOTYPE_PAGE_PATH || '').trim() || undefined,
    });
}

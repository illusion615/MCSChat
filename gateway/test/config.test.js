import assert from 'node:assert/strict';
import test from 'node:test';

import { environmentHost, loadConfig } from '../src/config.js';

test('Power Platform environment GUID with non-RFC version nibble is accepted', () => {
    const environmentId = '448464af-64af-ec92-a521-6d203cf6811d';
    assert.equal(
        environmentHost(environmentId),
        'https://448464af64afec92a5216d203cf681.1d.environment.api.powerplatform.com'
    );
});

test('local configuration does not require a mode switch or Azure service URLs', () => {
    const config = loadConfig({
        TENANT_ID: '899aca58-7bdc-45e9-bec6-1cc9d3f12894',
        ENTRA_CLIENT_ID: 'ca4e363e-f51e-4b4e-985b-a8badf72f60f',
        ALLOWED_UPSTREAM_USER_OID: 'ccc69730-51cf-4703-94c4-5c49bf31082f',
        PUBLIC_BASE_URL: 'http://localhost:8090',
        POWER_PLATFORM_ENVIRONMENT_ID: '448464af-64af-ec92-a521-6d203cf6811d',
    });
    assert.equal(config.localDevelopment, true);
    assert.equal(config.localStateDirectory, './.local-state');
    assert.equal('keyVaultUrl' in config, false);
    assert.equal('storageAccountUrl' in config, false);
});
# DirectLine Test Page Troubleshooting Guide

## Issue Resolution: Function Not Found Error

### ❌ **Error Encountered**
```
[ERROR] Failed to load existing secrets: TestIntegrationHelper.loadDirectLineSecret is not a function
```

### ✅ **Root Cause**
Incorrect function name reference. The actual function in `TestIntegrationHelper.js` is:
- ✅ **Correct**: `TestIntegrationHelper.loadAgentSecrets()`
- ❌ **Incorrect**: `TestIntegrationHelper.loadDirectLineSecret()`

### 🔧 **Fix Applied**
Updated the test page to use the correct function names and methods available in TestIntegrationHelper.

## Available TestIntegrationHelper Functions

### 🔍 **Primary Functions**
| Function | Purpose | Returns |
|----------|---------|---------|
| `loadAgentSecrets()` | Load DirectLine secrets from multiple sources | `{secret, source}` or `null` |
| `saveTestSecret(secret, source)` | Save test secret for future sessions | void |
| `getTestInstructions()` | Get setup instructions | HTML string |
| `initializeTestPage()` | Auto-initialize test page | void |

### 📊 **Secret Loading Sources**
The `loadAgentSecrets()` function checks these sources in order:
1. **AgentManager**: `window.agentManager.getCurrentAgent()`
2. **agentSecrets**: `localStorage.getItem('agentSecrets')`
3. **SecureStorage**: `localStorage.getItem('secureStorage')`
4. **ChatConfig**: `localStorage.getItem('chatConfig')`
5. **Environment Variables**: Various `DIRECTLINE_SECRET` keys

### 🆔 **User ID Loading**
The enhanced loading now includes user ID detection from:
1. **AgentManager**: Current agent's user ID
2. **Direct Storage**: `localStorage.getItem('userId')`
3. **Current User**: `localStorage.getItem('currentUserId')`
4. **Test User**: `localStorage.getItem('testUserId')`
5. **User Data**: Parsed user data objects

## Enhanced Error Handling

### 🔍 **Debug Information**
The updated loading provides:
- **Source identification**: Shows where the secret was loaded from
- **Storage inspection**: Lists all available localStorage keys
- **Fallback behavior**: Tries multiple sources automatically
- **Detailed logging**: Clear success/failure messages

### 🚨 **Common Issues & Solutions**

#### **Issue**: No secrets found
**Solution**: Check that you have:
1. Set up agents in the main application
2. Connected to DirectLine at least once
3. Saved your configuration

#### **Issue**: Function not found errors
**Solution**: Ensure you're using correct function names:
```javascript
// ✅ Correct
const secrets = await TestIntegrationHelper.loadAgentSecrets();

// ❌ Incorrect
const secrets = await TestIntegrationHelper.loadDirectLineSecret();
```

#### **Issue**: Secrets load but connection fails
**Solution**: Check:
1. Secret is valid and not expired
2. Bot is properly configured in Azure
3. DirectLine channel is enabled
4. Network connectivity

### 🔄 **Testing Workflow**

#### **Automatic Loading**
1. Open test page
2. Check debug logs for loading status
3. Verify secret appears in input field

#### **Manual Loading**
1. Click "📥 Load from Agent Settings"
2. Watch for loading spinner and success indicator
3. Check debug logs for detailed information

#### **Troubleshooting Steps**
1. Open browser developer console
2. Check for JavaScript errors
3. Verify localStorage contents
4. Test manual secret entry

## Example Usage

### ✅ **Correct Implementation**
```javascript
async function loadExistingSecrets() {
    try {
        const secretData = await TestIntegrationHelper.loadAgentSecrets();
        if (secretData && secretData.secret) {
            // Use the secret
            elements.directlineSecret.value = secretData.secret;
            log(`Loaded from ${secretData.source}`, 'success');
            return true;
        }
        return false;
    } catch (error) {
        logError('Loading failed', error);
        return false;
    }
}
```

### 🔍 **Debug Helper**
```javascript
function debugStorage() {
    console.log('Available functions:', Object.getOwnPropertyNames(TestIntegrationHelper));
    console.log('localStorage keys:', Object.keys(localStorage));
}
```

## Future Maintenance

### 📝 **Adding New Sources**
To add new secret sources, update the `loadAgentSecrets()` function in `TestIntegrationHelper.js`:

```javascript
// Add new source in the function
const newSourceData = localStorage.getItem('newSourceKey');
if (newSourceData) {
    // Parse and return secret
}
```

### 🔄 **Function Changes**
If TestIntegrationHelper functions change:
1. Update function calls in test page
2. Update this troubleshooting guide
3. Test all loading scenarios

This guide helps ensure smooth operation and quick resolution of similar issues in the future.

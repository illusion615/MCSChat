# DirectLine Error Capture Enhancement - Deep Diagnostics

## 🎯 **Problem Identified**

Your logs showed generic error messages:
```
❌ DirectLine Error [connection]: failed to connect
❌ Full error details: {}
```

This indicates that the DirectLine.js library errors weren't being captured at the source level.

## 🔧 **Comprehensive Solution Implemented**

### **1. HTTP Request Interception** ✅

#### **Fetch API Wrapping**
```javascript
// Intercepts ALL DirectLine API calls
window.fetch = async function(...args) {
    // Captures HTTP status codes: 401, 403, 404, 429, 500, etc.
    // Extracts response body with error details
    // Parses JSON error responses from Azure
}
```

#### **Real HTTP Error Capture**
- **401 Unauthorized**: "DirectLine secret is invalid, expired, or malformed"
- **403 Forbidden**: "DirectLine channel is disabled or not properly configured"
- **404 Not Found**: "Bot not found or DirectLine endpoint incorrect"
- **429 Too Many Requests**: "Rate limit exceeded"
- **500+ Server Errors**: "Bot service error"

### **2. WebSocket Error Interception** ✅

#### **WebSocket Wrapping**
```javascript
// Intercepts DirectLine WebSocket connections
window.WebSocket = function(url, protocols) {
    // Captures connection failures
    // Monitors close events with error codes
    // Tracks abnormal disconnections
}
```

#### **WebSocket Error Details**
- **Connection Failed**: Network or firewall issues
- **Close Codes**: 1006 (abnormal), 1011 (server error), etc.
- **Streaming Issues**: Real-time connection problems

### **3. DirectLine Internal Monitoring** ✅

#### **Observable Stream Interception**
```javascript
// Monitors DirectLine internal observables
connectionStatus$.subscribe(status => {
    // Logs all status transitions with details
});

activity$.subscribe = (...args) => {
    // Wraps error handlers to capture stream errors
};
```

### **4. Detailed Error Analysis** ✅

#### **API Response Parsing**
```javascript
handleDirectLineApiError(errorData) {
    // Extracts HTTP status, headers, response body
    // Parses Azure API error JSON responses
    // Provides specific suggestions for each error type
}
```

#### **Error Data Structure**
```javascript
{
    url: "https://directline.botframework.com/v3/directline/conversations",
    status: 401,
    statusText: "Unauthorized",
    headers: {...},
    responseBody: "{'error': {'code': 'Unauthorized', 'message': 'Invalid secret'}}",
    responseJson: {error: {code: "Unauthorized", message: "Invalid secret"}}
}
```

## 🎯 **Expected New Error Output**

### **Instead of Generic Errors**
```
❌ DirectLine Error [connection]: failed to connect
❌ Full error details: {}
```

### **You'll Now See Specific Details**

#### **Authentication Error (401)**
```
[ERROR] DirectLine API call: https://directline.botframework.com/v3/directline/conversations - Status: 401
[ERROR] DirectLine API Error Details: {
  "url": "https://directline.botframework.com/v3/directline/conversations",
  "status": 401,
  "statusText": "Unauthorized",
  "responseBody": "{\"error\":{\"code\":\"Unauthorized\",\"message\":\"Invalid DirectLine secret\"}}",
  "responseJson": {"error":{"code":"Unauthorized","message":"Invalid DirectLine secret"}}
}
[ERROR] DirectLine API Error: Authentication failed - Invalid DirectLine secret - Invalid DirectLine secret (Code: Unauthorized)
[ERROR] Category: authentication
[WARNING] Suggestion: DirectLine secret is invalid, expired, or malformed. Please verify your secret in Azure Portal → Bot → Channels → DirectLine.
```

#### **Channel Disabled (403)**
```
[ERROR] DirectLine API Error: Access forbidden - DirectLine channel may be disabled - DirectLine channel not enabled
[ERROR] Category: permissions
[WARNING] Suggestion: DirectLine channel is disabled or not properly configured. Check Azure Portal bot settings.
```

#### **Bot Not Found (404)**
```
[ERROR] DirectLine API Error: Bot or endpoint not found - Bot service not found
[ERROR] Category: configuration
[WARNING] Suggestion: Bot not found or DirectLine endpoint incorrect. Verify bot deployment and DirectLine configuration.
```

#### **Network/WebSocket Errors**
```
[INFO] DirectLine WebSocket connecting to: wss://directline.botframework.com/v3/directline/conversations/.../stream
[ERROR] DirectLine WebSocket Error: {"type":"error","message":"Connection failed"}
[ERROR] DirectLine WebSocket Closed: Code 1006, Reason: 
[ERROR] DirectLine API Network Error: Failed to fetch
```

## 🔧 **How It Works**

### **1. Comprehensive Interception**
- **Wraps `window.fetch`**: Captures all HTTP requests to DirectLine endpoints
- **Wraps `window.WebSocket`**: Monitors streaming connections
- **Monitors DirectLine Observables**: Intercepts internal error streams

### **2. Smart Error Analysis**
- **HTTP Status Code Analysis**: Maps status codes to specific problems
- **Response Body Parsing**: Extracts detailed error messages from Azure API
- **Network vs. Configuration**: Distinguishes between different error types

### **3. Clean Restoration**
- **Stores Original Functions**: Preserves browser functionality
- **Automatic Cleanup**: Restores originals on disconnect
- **No Side Effects**: Only intercepts DirectLine-related calls

## 🎯 **Immediate Benefits**

### **For Your Current Issue**
1. **Specific Error Identification**: You'll see exactly what HTTP error is occurring
2. **Azure API Error Details**: Get the actual error message from the DirectLine service
3. **Actionable Guidance**: Know exactly what to fix (secret, configuration, etc.)

### **Common Error Scenarios You'll Now See**

#### **Invalid Secret**
```
❌ HTTP 401 Unauthorized - Invalid DirectLine secret
💡 DirectLine secret is invalid, expired, or malformed. Please verify your secret in Azure Portal.
```

#### **Channel Disabled**
```
❌ HTTP 403 Forbidden - DirectLine channel not enabled
💡 DirectLine channel is disabled or not properly configured. Check Azure Portal bot settings.
```

#### **Network Issues**
```
❌ Network Error: Failed to fetch
💡 This could indicate network connectivity issues or CORS restrictions.
```

## 🚀 **Test the Enhanced System**

1. **Refresh the test page** - All enhanced error capture is now active
2. **Try connecting** - You'll immediately see specific HTTP status codes and error details
3. **Check the debug logs** - Look for detailed API call logs and error analysis

The system now captures errors at the lowest level - directly from the HTTP requests and WebSocket connections that DirectLine.js makes to Azure. You should see exactly what's failing and why! 🎯

**Try connecting again and you'll get the real error details instead of generic messages!**

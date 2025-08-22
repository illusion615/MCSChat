# AI Companion Guide

Comprehensive guide to MCS Chat's AI Companion features for enhanced productivity and intelligent assistance.

## Overview

The AI Companion is an intelligent system that works alongside your conversations to provide:
- **Automatic title generation** for conversations
- **Suggested follow-up actions** based on context
- **Smart response recommendations** 
- **Proactive assistance** and productivity tips
- **Context-aware** conversation management

## Getting Started

### Enabling AI Companion

1. **Open Settings** (⚙️ icon)
2. **Navigate to AI Companion** tab
3. **Enable desired features**:
   - ✅ Auto Title Generation
   - ✅ Suggested Actions
   - ✅ Smart Responses
   - ✅ Context Awareness

### Basic Configuration
```javascript
{
  "aiCompanion": {
    "enabled": true,
    "autoTitleGeneration": true,
    "suggestedActions": true,
    "contextAware": true,
    "proactiveMode": true
  }
}
```

## Auto Title Generation

### How It Works

The AI Companion automatically generates meaningful titles for your conversations based on the content and context.

#### Trigger Conditions
- **After 3+ messages** in a conversation
- **5-second delay** after last message (configurable)
- **Content analysis** determines if title update needed
- **Smart detection** avoids unnecessary updates

#### Title Generation Process
1. **Context Analysis**: Reviews conversation flow
2. **Key Topic Extraction**: Identifies main themes
3. **Concise Summarization**: Creates brief, descriptive title
4. **Length Optimization**: Ensures readability (max 50 characters)

### Configuration Options

#### Basic Settings
```javascript
{
  "autoTitleGeneration": true,
  "titleUpdateDelay": 5000,        // 5 seconds after last message
  "minMessagesForTitle": 3,        // Minimum messages before title generation
  "maxTitleLength": 50,            // Maximum title character length
  "titleStyle": "descriptive"      // "descriptive", "concise", or "creative"
}
```

#### Advanced Settings
```javascript
{
  "titlePromptTemplate": "Generate a brief, descriptive title for this conversation about: {context}",
  "titleGenerationModel": "gpt-3.5-turbo",  // Dedicated model for titles
  "titleCaching": true,            // Cache titles to avoid regeneration
  "titleFallback": "New Conversation",      // Fallback when generation fails
  "intelligentTiming": true        // Smart timing based on conversation flow
}
```

### Title Styles

#### Descriptive (Default)
- **Focus**: Clear description of conversation topic
- **Example**: "Python Data Analysis with Pandas"
- **Best For**: Professional and work contexts

#### Concise
- **Focus**: Brief, keyword-focused titles
- **Example**: "Pandas Analysis"
- **Best For**: Quick reference and organization

#### Creative
- **Focus**: Engaging, memorable titles
- **Example**: "Mastering Data with Python Magic"
- **Best For**: Personal use and creative projects

### Manual Title Override

Users can always manually edit generated titles:
1. **Right-click** conversation in sidebar
2. **Select "Rename"** from context menu
3. **Edit title** directly
4. **Press Enter** to save
5. Manual titles are **protected** from auto-generation

## Suggested Actions

### Context-Aware Suggestions

The AI Companion analyzes conversation context to suggest relevant follow-up actions.

#### Types of Suggestions

##### Code-Related
- **"Run this code"** - For executable snippets
- **"Explain further"** - For complex concepts
- **"Add error handling"** - For code improvements
- **"Create tests"** - For testing suggestions

##### Content Creation
- **"Expand this idea"** - For brainstorming
- **"Create outline"** - For structured content
- **"Find examples"** - For practical demonstrations
- **"Summarize key points"** - For long discussions

##### Problem Solving
- **"Break down steps"** - For complex problems
- **"Consider alternatives"** - For solution exploration
- **"Identify risks"** - For risk assessment
- **"Plan implementation"** - For project planning

### Configuration

#### Basic Suggestions
```javascript
{
  "suggestedActions": true,
  "maxSuggestions": 3,             // Number of suggestions shown
  "suggestionDelay": 2000,         // Delay after message (ms)
  "suggestionStyle": "buttons",    // "buttons", "links", or "dropdown"
  "contextWindow": 5               // Messages to analyze for context
}
```

#### Advanced Suggestions
```javascript
{
  "intelligentSuggestions": true,
  "userBehaviorLearning": true,    // Learn from user preferences
  "contextualRelevance": 0.8,      // Relevance threshold (0.0-1.0)
  "suggestionCategories": [
    "code", "analysis", "creative", "planning", "research"
  ],
  "personalizedSuggestions": true  // Adapt to user patterns
}
```

### Suggestion Interaction

#### Using Suggestions
1. **Click suggestion button** to apply action
2. **Text automatically inserted** into message input
3. **Edit if needed** before sending
4. **Send message** to execute suggestion

#### Managing Suggestions
- **Dismiss**: Hide specific suggestions
- **Rate**: Thumbs up/down for learning
- **Customize**: Edit suggestion text before use
- **Disable**: Turn off specific suggestion types

## Smart Response Recommendations

### Intelligent Response Generation

The AI Companion can suggest complete responses based on conversation context.

#### Response Types

##### Quick Replies
- **"Thank you"** - Gratitude expressions
- **"Please continue"** - Encouraging continuation
- **"Can you clarify?"** - Seeking clarification
- **"That's helpful"** - Acknowledgment

##### Contextual Responses
- **Technical Questions** - Based on current topic
- **Follow-up Inquiries** - Natural conversation flow
- **Clarification Requests** - For better understanding
- **Summary Requests** - For information consolidation

### Configuration

```javascript
{
  "smartResponses": true,
  "responseTypes": {
    "quickReplies": true,
    "contextualQuestions": true,
    "clarificationRequests": true,
    "summaryRequests": true
  },
  "responsePersonality": "professional", // "casual", "professional", "friendly"
  "adaptToUserStyle": true               // Match user's communication style
}
```

## Context Awareness

### Conversation Memory

The AI Companion maintains awareness of:
- **Previous conversations** with the same agent
- **User preferences** and patterns
- **Topic evolution** throughout discussions
- **Common workflows** and processes

#### Memory Configuration
```javascript
{
  "contextAware": true,
  "memoryDepth": 10,               // Conversations to remember
  "crossConversationMemory": true, // Remember across sessions
  "topicTracking": true,           // Track topic evolution
  "userModelLearning": true        // Build user preference model
}
```

### Proactive Assistance

#### When AI Companion Intervenes
- **Long pauses** in conversation (suggests next steps)
- **Repetitive patterns** (offers automation)
- **Complex problems** (suggests breaking down)
- **Missing information** (prompts for details)

#### Proactive Features
```javascript
{
  "proactiveMode": true,
  "interventionTiming": {
    "pauseThreshold": 30000,       // 30 seconds of inactivity
    "complexityThreshold": 0.7,    // Complexity score trigger
    "repetitionDetection": true,   // Detect repetitive patterns
    "missingInfoDetection": true   // Detect incomplete information
  }
}
```

## Performance Optimization

### Efficient Processing

#### Background Processing
- **Asynchronous analysis** doesn't block UI
- **Intelligent caching** reduces API calls
- **Batch processing** for multiple features
- **Graceful degradation** when resources limited

#### Configuration
```javascript
{
  "backgroundProcessing": true,
  "cacheAIAnalysis": true,
  "batchSize": 5,                  // Messages processed together
  "processingTimeout": 10000,      // Maximum processing time (ms)
  "fallbackMode": "basic"          // Fallback when AI unavailable
}
```

### Resource Management

#### Memory Usage
```javascript
{
  "maxCachedAnalyses": 100,        // Cached analysis results
  "cacheExpiration": "1h",         // Cache validity period
  "memoryOptimization": true,      // Optimize memory usage
  "backgroundCleanup": true        // Clean expired data
}
```

## Privacy and Security

### Data Handling

#### Local Processing
- **Analysis data** stored locally only
- **No conversation content** sent to external services
- **API calls** only for title generation and suggestions
- **User control** over all data sharing

#### Privacy Configuration
```javascript
{
  "localProcessingOnly": false,    // Process everything locally
  "encryptAnalysisData": true,     // Encrypt stored analysis
  "anonymizeApiCalls": true,       // Remove identifying information
  "dataRetention": "30d"           // How long to keep analysis data
}
```

### Security Settings

```javascript
{
  "validateApiResponses": true,    // Validate AI-generated content
  "contentFiltering": true,        // Filter inappropriate suggestions
  "rateLimitProtection": true,     // Protect against rate limits
  "errorHandling": "graceful"      // Handle errors without breaking UX
}
```

## Troubleshooting

### Common Issues

#### Title Generation Not Working
1. **Check API configuration** in settings
2. **Verify AI provider** is properly configured
3. **Ensure minimum messages** threshold is met
4. **Check browser console** for error messages

#### Suggestions Not Appearing
1. **Enable suggested actions** in AI Companion settings
2. **Verify context window** size is appropriate
3. **Check suggestion delay** settings
4. **Clear cache** and reload application

#### Performance Issues
1. **Reduce context window** size
2. **Disable unused features**
3. **Enable memory optimization**
4. **Clear analysis cache**

### Debug Mode

Enable debug mode for detailed logging:
```javascript
{
  "debugMode": true,
  "verboseLogging": true,
  "logAIInteractions": true,
  "performanceMetrics": true
}
```

## Advanced Features

### Custom Prompts

#### Title Generation Prompts
```javascript
{
  "titlePrompts": {
    "code": "Generate a technical title for this coding discussion: {context}",
    "creative": "Create an engaging title for this creative conversation: {context}",
    "business": "Generate a professional title for this business discussion: {context}"
  }
}
```

#### Suggestion Prompts
```javascript
{
  "suggestionPrompts": {
    "followUp": "Suggest 3 helpful follow-up questions for: {context}",
    "actions": "Recommend practical next steps for: {context}",
    "analysis": "Suggest ways to analyze or explore: {context}"
  }
}
```

### Integration with External Services

#### Webhook Integration
```javascript
{
  "webhooks": {
    "onTitleGenerated": "https://your-server.com/webhooks/title",
    "onSuggestionAccepted": "https://your-server.com/webhooks/suggestion"
  }
}
```

#### API Extensions
```javascript
{
  "apiExtensions": {
    "customSuggestionAPI": "https://your-api.com/suggestions",
    "externalAnalysisAPI": "https://your-api.com/analysis"
  }
}
```

## Best Practices

### Optimal Configuration

1. **Start with defaults** and adjust based on usage
2. **Enable features gradually** to understand impact
3. **Monitor performance** and adjust settings accordingly
4. **Customize prompts** for your specific use cases

### User Experience

1. **Balance automation** with user control
2. **Provide clear feedback** on AI actions
3. **Allow easy override** of AI suggestions
4. **Maintain conversation flow** without interruption

### Privacy Considerations

1. **Review data sharing settings** regularly
2. **Use local processing** when possible
3. **Understand API implications** of each feature
4. **Keep sensitive conversations** private

## Future Enhancements

### Planned Features
- **Voice command integration**
- **Advanced context understanding**
- **Multi-language support**
- **Team collaboration features**
- **Custom AI model integration**

### Community Contributions
- **Suggestion algorithms** - Improve suggestion quality
- **Title generation prompts** - Better title templates
- **Context analysis** - Enhanced conversation understanding
- **Performance optimizations** - Faster processing

## Getting Help

- **[Troubleshooting Guide](../troubleshooting/ai-companion.md)**
- **[GitHub Issues](https://github.com/illusion615/MCSChat/issues)**
- **[Community Discussions](https://github.com/illusion615/MCSChat/discussions)**
- **[Feature Requests](https://github.com/illusion615/MCSChat/issues/new?template=feature_request.md)**

---

**Note**: AI Companion features require a configured AI provider. Some features may consume additional API tokens.

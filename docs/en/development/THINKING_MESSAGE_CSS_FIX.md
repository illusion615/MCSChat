# CSS Hierarchy Fix: Thinking Message Streaming

## Problem Analysis
The thinking message streaming stopped working after CSS refactoring due to CSS cascade conflicts where base `.messageContent` styles were overriding specialized `.thinking-content` styles.

## Root Cause
- **Aggressive base styles**: `.messageContent` had hardcoded `word-break: break-word` and `hyphens: auto`
- **CSS specificity conflicts**: Specialized styles couldn't properly override base styles
- **Poor design token usage**: Missing semantic tokens for different text flow behaviors

## Solution: Proper CSS Hierarchy with Design Tokens

### 1. **Added Semantic Design Tokens** (`css/base/variables.css`)
```css
/* Text flow behavior tokens */
--msg-text-flow-default: break-word;    /* Regular messages */
--msg-text-flow-streaming: normal;      /* Streaming content */
--msg-hyphens-default: auto;           /* Regular text */
--msg-hyphens-streaming: none;         /* Streaming text */
--msg-whitespace-default: normal;      /* Regular flow */
--msg-whitespace-streaming: pre-wrap;  /* Preserve streaming format */

/* Thinking message specific tokens */
--msg-thinking-bg: var(--msg-companion-response-bg);
--msg-thinking-max-width: var(--msg-max-width-full);
--msg-thinking-opacity: 0.9;
--msg-thinking-font-style: italic;
```

### 2. **Conservative Base Styles** (`.messageContent`)
- Uses CSS variables instead of hardcoded values
- Provides sensible defaults that work for most cases
- Easy to override with higher specificity selectors

### 3. **Specialized Thinking Styles** (`.messageContainer.thinking-message .messageContent.thinking-content`)
- Higher CSS specificity naturally overrides base styles
- Uses streaming-optimized design tokens
- No `!important` declarations needed

## Benefits

### ✅ **Maintainability**
- **No `!important`**: Clean CSS cascade
- **Design token consistency**: All values centralized
- **Semantic naming**: Clear purpose of each token

### ✅ **Performance**
- **Proper specificity**: Browser can optimize CSS matching
- **Reduced conflicts**: Clean cascade reduces computation
- **Token reusability**: Same tokens work for other streaming content

### ✅ **Extensibility**
- **Easy theming**: Change tokens to modify behavior
- **Dark mode ready**: Tokens can be swapped for different themes
- **Future streaming content**: Same pattern works for other components

## CSS Architecture Pattern

```css
/* 1. Base conservative styles with token defaults */
.messageContent {
    word-break: var(--msg-text-flow-default);
    hyphens: var(--msg-hyphens-default);
}

/* 2. Specialized overrides with semantic tokens */
.messageContainer.thinking-message .messageContent.thinking-content {
    word-break: var(--msg-text-flow-streaming);
    hyphens: var(--msg-hyphens-streaming);
    white-space: var(--msg-whitespace-streaming);
}
```

## Testing
- ✅ Thinking message streaming works correctly
- ✅ No `!important` declarations
- ✅ Proper CSS cascade maintained
- ✅ Design token pattern followed
- ✅ Easy to maintain and extend

---
*Fix Date: December 2024*  
*Pattern: Semantic Design Tokens + Proper CSS Specificity*

# Conversation-Aware Thinking System

## Overview

The Conversation-Aware Thinking System simulates an AI "thinking process" while waiting for agent responses. It leverages the conversation context (last 3-5 turns) to generate relevant thinking content, making the wait time feel productive and informative.

## How It Works

When a user sends a message:

1. **Thinking starts immediately** — LLM is invoked right away for faster response
2. **Short evaluation period** (~1.5s) — checks if agent responds quickly
3. **If no quick response** — thinking content renders in the chat as a subtle thinking bubble
4. **When agent responds** — thinking ends naturally and agent message renders

## Four Thinking Phases

| Phase | Type | Description |
|-------|------|-------------|
| 1 | Analysis | Initial understanding of the user's question |
| 2 | Context-Aware | References previous conversation topics and patterns |
| 3 | Practical | Considers how to address the specific question |
| 4 | Synthesis | Connects themes across the conversation |

Each phase builds on conversation history, providing progressively deeper context.

## Language Detection

The system automatically detects the user's language and generates thinking content in the same language:
- Chinese questions → Chinese thinking
- English questions → English thinking
- Mixed → follows the dominant language

## Timeout Handling

If the LLM thinking process completes but no agent response arrives:
- A user-friendly timeout message is shown
- Guidance to rephrase or retry is provided
- No hard error — the user can continue the conversation

## Configuration

| Setting | Location | Default |
|---------|----------|---------|
| Thinking display delay | AI Companion settings | 1.5 seconds |
| Enable/Disable | AI Companion toggle | Enabled when AI Companion is on |

## Visual Design

Thinking messages appear as:
- Italic text in a subtle bubble
- Positioned between user message and agent response
- Labeled "AI Companion (Thinking)" in metadata
- Automatically hidden when agent response arrives

## Dependencies

- Requires an active AI Companion LLM provider (OpenAI, Anthropic, Azure, Ollama, or OpenAI Compatible)
- Uses the same provider configured in AI Companion settings
- Does not affect agent communication — runs in parallel

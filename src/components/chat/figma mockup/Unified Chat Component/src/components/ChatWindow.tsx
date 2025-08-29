import React, { useState, useEffect, useRef } from 'react';
import { ScrollArea } from './ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Copy, Volume2, Square, Bot, User } from 'lucide-react';
import { Message, SuggestedAction } from './Chat';

interface ChatWindowProps {
  messages: Message[];
  onSuggestedActionClick?: (action: SuggestedAction) => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ messages, onSuggestedActionClick }) => {
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [speechProgress, setSpeechProgress] = useState(0);
  const [allActionsFading, setAllActionsFading] = useState(false);
  const [allActionsHidden, setAllActionsHidden] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDuration = (duration?: number) => {
    if (!duration) return null;
    return `${duration}s`;
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  const handleSuggestedActionClick = (action: SuggestedAction) => {
    // Start fade animation for all actions
    setAllActionsFading(true);
    
    // Call the parent handler
    onSuggestedActionClick?.(action);
    
    // Hide all actions after animation
    setTimeout(() => {
      setAllActionsHidden(true);
    }, 300);
  };

  // Reset action state when messages change (new messages arrive)
  useEffect(() => {
    setAllActionsFading(false);
    setAllActionsHidden(false);
  }, [messages]);

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    setSpeakingMessageId(null);
    setSpeechProgress(0);
    utteranceRef.current = null;
  };

  const handleSpeak = (messageId: string, content: string) => {
    if (speakingMessageId === messageId) {
      // If this message is already speaking, stop it
      stopSpeaking();
      return;
    }

    // Stop any currently playing speech
    if (speakingMessageId) {
      stopSpeaking();
    }

    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(content);
      utteranceRef.current = utterance;
      setSpeakingMessageId(messageId);
      setSpeechProgress(0);

      // Estimate speaking duration (roughly 150-200 words per minute)
      const wordCount = content.split(/\s+/).length;
      const estimatedDuration = (wordCount / 150) * 60 * 1000; // in milliseconds

      // Start progress tracking
      const startTime = Date.now();
      progressIntervalRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min((elapsed / estimatedDuration) * 100, 100);
        setSpeechProgress(progress);
      }, 100);

      // Handle speech events
      utterance.onend = () => {
        stopSpeaking();
      };

      utterance.onerror = () => {
        stopSpeaking();
      };

      speechSynthesis.speak(utterance);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, []);

  const renderMarkdown = (content: string) => {
    // Simple markdown rendering for demonstration
    const lines = content.split('\n');
    return lines.map((line, index) => {
      // Bold text
      line = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      
      // Bullet points
      if (line.trim().startsWith('- ')) {
        return (
          <li key={index} className="ml-4 list-disc" dangerouslySetInnerHTML={{ __html: line.slice(2) }} />
        );
      }
      
      // Regular paragraphs
      if (line.trim()) {
        return (
          <p key={index} className="mb-2 last:mb-0" dangerouslySetInnerHTML={{ __html: line }} />
        );
      }
      
      // Empty lines
      return <br key={index} />;
    });
  };

  return (
    <ScrollArea className="flex-1 p-4">
      <div className="space-y-6">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 items-start ${
              message.sender === 'user' ? 'flex-row-reverse' : 'flex-row'
            }`}
          >
            {/* Avatar */}
            <Avatar className="h-8 w-8 shrink-0 mt-2.5">
              <AvatarFallback>
                {message.sender === 'user' ? (
                  <User className="h-4 w-4" />
                ) : (
                  <Bot className="h-4 w-4" />
                )}
              </AvatarFallback>
            </Avatar>

            {/* Message content */}
            <div className={`flex-1 max-w-[80%] ${message.sender === 'user' ? 'items-end' : 'items-start'} flex flex-col`}>
              {/* Message bubble */}
              <div
                className={`rounded-lg px-4 py-4 ${
                  message.sender === 'user'
                    ? 'bg-primary text-primary-foreground ml-auto'
                    : 'bg-muted'
                }`}
              >
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  {renderMarkdown(message.content)}
                </div>
                
                {/* Suggested actions within message bubble */}
                {message.sender === 'agent' && message.suggestedActions && message.suggestedActions.length > 0 && !allActionsHidden && (
                  <div className="mt-4 pt-3 border-t border-border/30">
                    <div className="flex flex-wrap gap-2">
                      {message.suggestedActions.map((action) => (
                        <Button
                          key={action.id}
                          variant="outline"
                          size="sm"
                          className={`h-auto px-3 py-2 bg-background/50 hover:bg-background/70 border-border/50 transition-opacity duration-300 ${
                            allActionsFading ? 'opacity-0' : 'opacity-100'
                          }`}
                          onClick={() => handleSuggestedActionClick(action)}
                          disabled={allActionsFading}
                        >
                          {action.text}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Message metadata */}
              <div className={`flex items-center gap-2 mt-2 text-xs text-muted-foreground ${
                message.sender === 'user' ? 'flex-row-reverse' : 'flex-row'
              }`}>
                <span>{formatTime(message.timestamp)}</span>
                {message.duration && (
                  <Badge variant="outline" className="text-xs">
                    {formatDuration(message.duration)}
                  </Badge>
                )}
                
                {/* Message actions */}
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 hover:bg-accent/50"
                    onClick={() => handleCopy(message.content)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`h-6 w-6 p-0 hover:bg-accent/50 ${
                        speakingMessageId === message.id ? 'text-primary' : ''
                      }`}
                      onClick={() => handleSpeak(message.id, message.content)}
                    >
                      {speakingMessageId === message.id ? (
                        <Square className="h-3 w-3" />
                      ) : (
                        <Volume2 className="h-3 w-3" />
                      )}
                    </Button>
                    {speakingMessageId === message.id && (
                      <Progress 
                        value={speechProgress} 
                        className="h-1 w-18" 
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
};
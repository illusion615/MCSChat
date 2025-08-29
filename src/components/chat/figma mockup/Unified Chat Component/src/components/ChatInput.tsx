import React, { useState } from 'react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { 
  Paperclip, 
  Mic, 
  Send, 
  ChevronUp, 
  ChevronDown,
  Zap,
  Brain,
  Sparkles,
  MessageSquare
} from 'lucide-react';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage }) => {
  const [message, setMessage] = useState('');
  const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  const quickActions = [
    { id: 'summarize', label: 'Summarize', icon: Zap },
    { id: 'explain', label: 'Explain Simply', icon: MessageSquare },
    { id: 'expand', label: 'Expand Ideas', icon: Sparkles },
    { id: 'proofread', label: 'Proofread', icon: Brain },
  ];

  const handleSend = () => {
    if (message.trim()) {
      onSendMessage(message.trim());
      setMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleVoiceInput = () => {
    setIsRecording(!isRecording);
    // Voice input logic would go here
  };

  const handleQuickAction = (actionId: string) => {
    const actionMessages = {
      summarize: 'Please summarize the conversation so far.',
      explain: 'Can you explain this in simpler terms?',
      expand: 'Please expand on these ideas with more details.',
      proofread: 'Please proofread and improve the text above.'
    };
    
    const actionMessage = actionMessages[actionId as keyof typeof actionMessages];
    if (actionMessage) {
      onSendMessage(actionMessage);
    }
  };

  return (
    <Collapsible open={isQuickActionsOpen} onOpenChange={setIsQuickActionsOpen}>
      <div className="border-t border-border bg-card">
        {/* Extended quick actions area */}
        <CollapsibleContent>
          <div className="p-4 border-b border-border">
            {/* Quick actions */}
            <div>
              <h4 className="mb-3">Quick Actions</h4>
              <div className="flex flex-wrap gap-2">
                {quickActions.map((action) => {
                  const IconComponent = action.icon;
                  return (
                    <Button
                      key={action.id}
                      variant="outline"
                      size="sm"
                      className="h-auto px-3 py-2"
                      onClick={() => handleQuickAction(action.id)}
                    >
                      <IconComponent className="h-3 w-3 mr-2" />
                      {action.label}
                    </Button>
                  );
                })}
              </div>
            </div>
          </div>
        </CollapsibleContent>

        {/* Main input area */}
        <div className="p-4">
          <div className="flex items-center gap-2">
            {/* Attachment button */}
            <Button variant="ghost" size="sm" className="shrink-0">
              <Paperclip className="h-4 w-4" />
            </Button>

            {/* Text input */}
            <div className="flex-1 relative">
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Type your message..."
                className="min-h-[44px] max-h-32 resize-none pr-12"
                rows={1}
              />
            </div>

            {/* Voice input button */}
            <Button 
              variant="ghost" 
              size="sm" 
              className={`shrink-0 ${isRecording ? 'text-red-500' : ''}`}
              onClick={handleVoiceInput}
            >
              <Mic className={`h-4 w-4 ${isRecording ? 'animate-pulse' : ''}`} />
            </Button>

            {/* Quick actions button */}
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="shrink-0">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  {isQuickActionsOpen ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronUp className="h-3 w-3" />
                  )}
                </div>
              </Button>
            </CollapsibleTrigger>

            {/* Send button */}
            <Button 
              onClick={handleSend}
              disabled={!message.trim()}
              className="shrink-0"
              size="sm"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>

          {/* Input hint */}
          <div className="mt-2 text-xs text-muted-foreground">
            Press Enter to send, Shift+Enter for new line
          </div>
        </div>
      </div>
    </Collapsible>
  );
};
import React, { useState } from 'react';
import { ChatHeader } from './ChatHeader';
import { ChatWindow } from './ChatWindow';
import { ChatInput } from './ChatInput';

export interface SuggestedAction {
  id: string;
  text: string;
}

export interface Message {
  id: string;
  sender: 'user' | 'agent';
  content: string;
  timestamp: Date;
  duration?: number;
  suggestedActions?: SuggestedAction[];
}

export interface AgentStatus {
  name: string;
  status: 'online' | 'busy' | 'offline';
}

export interface ModelStatus {
  name: string;
  status: 'active' | 'loading' | 'error';
}

export const Chat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'agent',
      content: 'Hello! How can I help you today?',
      timestamp: new Date(Date.now() - 60000),
      duration: 0.5,
      suggestedActions: [
        { id: 'setup', text: 'Help with project setup' },
        { id: 'debugging', text: 'Debug an issue' },
        { id: 'explain', text: 'Explain a concept' }
      ]
    },
    {
      id: '2',
      sender: 'user',
      content: 'I need help with setting up my project configuration.',
      timestamp: new Date(Date.now() - 30000)
    },
    {
      id: '3',
      sender: 'agent',
      content: 'I\'d be happy to help you with your project configuration. Could you tell me more about what specific aspects you\'re having trouble with? For example:\n\n- **Environment setup**\n- **Dependencies management**\n- **Build configuration**\n- **Deployment settings**\n\nThe more details you provide, the better I can assist you.',
      timestamp: new Date(Date.now() - 10000),
      duration: 2.1,
      suggestedActions: [
        { id: 'env', text: 'Environment setup' },
        { id: 'deps', text: 'Dependencies management' },
        { id: 'build', text: 'Build configuration' },
        { id: 'deploy', text: 'Deployment settings' }
      ]
    }
  ]);

  const [conversationTitle, setConversationTitle] = useState('Project Configuration Help');
  
  const agentStatus: AgentStatus = {
    name: 'AI Assistant',
    status: 'online'
  };

  const modelStatus: ModelStatus = {
    name: 'GPT-4o',
    status: 'active'
  };

  const handleSendMessage = (content: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      sender: 'user',
      content,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newMessage]);
    
    // Simulate agent response
    setTimeout(() => {
      const agentResponse: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'agent',
        content: 'Thank you for your message. Let me help you with that.',
        timestamp: new Date(),
        duration: 1.2,
        suggestedActions: [
          { id: 'more-info', text: 'Tell me more' },
          { id: 'different-approach', text: 'Try a different approach' },
          { id: 'examples', text: 'Show examples' }
        ]
      };
      setMessages(prev => [...prev, agentResponse]);
    }, 1000);
  };

  const handleSuggestedActionClick = (action: SuggestedAction) => {
    handleSendMessage(action.text);
  };

  return (
    <div className="flex flex-col h-screen max-h-screen bg-background">
      <ChatHeader 
        title={conversationTitle}
        agentStatus={agentStatus}
        modelStatus={modelStatus}
      />
      <ChatWindow 
        messages={messages} 
        onSuggestedActionClick={handleSuggestedActionClick}
      />
      <ChatInput onSendMessage={handleSendMessage} />
    </div>
  );
};
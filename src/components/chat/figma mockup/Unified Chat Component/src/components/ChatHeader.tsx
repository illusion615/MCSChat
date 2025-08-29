import React, { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Search, Download, Circle, X } from 'lucide-react';
import { AgentStatus, ModelStatus } from './Chat';

interface ChatHeaderProps {
  title: string;
  agentStatus: AgentStatus;
  modelStatus: ModelStatus;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({ 
  title, 
  agentStatus, 
  modelStatus 
}) => {
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
      case 'active':
        return 'text-green-500';
      case 'busy':
      case 'loading':
        return 'text-yellow-500';
      case 'offline':
      case 'error':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  const handleSearchExpand = () => {
    setIsSearchExpanded(true);
  };

  const handleSearchCollapse = () => {
    setIsSearchExpanded(false);
    setSearchQuery('');
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleSearchCollapse();
    } else if (e.key === 'Enter') {
      // Handle search execution here
      console.log('Searching for:', searchQuery);
    }
  };

  // Focus input when expanded
  useEffect(() => {
    if (isSearchExpanded && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchExpanded]);

  return (
    <div className="flex items-center justify-between p-4 border-b border-border bg-card">
      {/* Left side - Conversation title */}
      <div className={`flex-1 min-w-0 transition-all duration-200 ${isSearchExpanded ? 'opacity-50 sm:opacity-100' : ''}`}>
        <h1 className="truncate pr-4">{title}</h1>
      </div>

      {/* Right side - Actions and status indicators */}
      <div className="flex items-center gap-3">
        {/* Search - expandable on mobile, always visible on desktop */}
        <div className="flex items-center">
          {isSearchExpanded ? (
            <div className="flex items-center gap-2 animate-in slide-in-from-right-2 duration-200">
              <div className="relative flex items-center">
                <Search className="h-4 w-4 absolute left-3 text-muted-foreground" />
                <Input
                  ref={searchInputRef}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="Search messages..."
                  className="pl-9 pr-9 w-48 sm:w-64"
                  onBlur={(e) => {
                    // Only collapse if not clicking the close button
                    if (!e.relatedTarget?.classList.contains('search-close-btn')) {
                      setTimeout(() => handleSearchCollapse(), 100);
                    }
                  }}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 h-6 w-6 p-0 search-close-btn"
                  onClick={handleSearchCollapse}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={handleSearchExpand}>
                <Search className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm">
                <Download className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Status indicators - hidden when search is expanded on mobile */}
        {!isSearchExpanded && (
          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
            {/* Agent status */}
            <div className="flex items-center gap-1.5">
              <Circle className={`h-2 w-2 fill-current ${getStatusColor(agentStatus.status)}`} />
              <span className="text-sm text-muted-foreground hidden sm:inline">
                {agentStatus.name}
              </span>
              <Badge variant="secondary" className="text-xs hidden sm:inline-flex">
                {agentStatus.status}
              </Badge>
            </div>

            {/* Model status */}
            <div className="flex items-center gap-1.5">
              <Circle className={`h-2 w-2 fill-current ${getStatusColor(modelStatus.status)}`} />
              <span className="text-sm text-muted-foreground">
                {modelStatus.name}
              </span>
              <Badge variant="outline" className="text-xs">
                {modelStatus.status}
              </Badge>
            </div>
          </div>
        )}

        {/* Mobile action buttons - hidden when search is expanded */}
        {!isSearchExpanded && (
          <div className="flex sm:hidden items-center gap-1">
            <Button variant="ghost" size="sm" onClick={handleSearchExpand}>
              <Search className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Download className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
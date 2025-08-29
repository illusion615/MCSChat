import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { SuggestedAction } from './Chat';

interface SuggestedActionsProps {
  actions: SuggestedAction[];
  onActionClick: (action: SuggestedAction) => void;
}

export const SuggestedActions: React.FC<SuggestedActionsProps> = ({
  actions,
  onActionClick
}) => {
  const [fadingActions, setFadingActions] = useState<Set<string>>(new Set());
  const [hiddenActions, setHiddenActions] = useState<Set<string>>(new Set());

  const handleActionClick = (action: SuggestedAction) => {
    // Start fade animation
    setFadingActions(prev => new Set(prev).add(action.id));
    
    // Send the action
    onActionClick(action);
    
    // Hide after animation
    setTimeout(() => {
      setHiddenActions(prev => new Set(prev).add(action.id));
    }, 300);
  };

  // Reset state when actions change
  useEffect(() => {
    setFadingActions(new Set());
    setHiddenActions(new Set());
  }, [actions]);

  const visibleActions = actions.filter(action => !hiddenActions.has(action.id));

  if (visibleActions.length === 0) {
    return null;
  }

  return (
    <div className="px-4 py-3 border-t border-border bg-card/50">
      <div className="flex flex-wrap gap-2">
        {visibleActions.map((action) => (
          <Button
            key={action.id}
            variant="outline"
            size="sm"
            className={`h-auto px-3 py-2 transition-opacity duration-300 ${
              fadingActions.has(action.id) ? 'opacity-0' : 'opacity-100'
            }`}
            onClick={() => handleActionClick(action)}
          >
            {action.text}
          </Button>
        ))}
      </div>
    </div>
  );
};
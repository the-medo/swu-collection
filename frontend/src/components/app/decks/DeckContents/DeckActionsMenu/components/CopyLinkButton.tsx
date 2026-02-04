import * as React from 'react';
import { Button } from '@/components/ui/button.tsx';
import { LinkIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast.ts';
import { NavigationMenuItem } from '@/components/ui/navigation-menu.tsx';
import { cn } from '@/lib/utils.ts';

interface CopyLinkButtonProps {
  deckId: string;
  isPublic: boolean;
  compact?: boolean;
  inNavigation?: boolean;
}

const CopyLinkButton: React.FC<CopyLinkButtonProps> = ({
  deckId,
  isPublic,
  compact,
  inNavigation,
}) => {
  const { toast } = useToast();
  const deckLink = `${window.location.origin}/decks/${deckId}`;

  const handleCopyLink: React.MouseEventHandler<HTMLButtonElement> = e => {
    e.preventDefault();
    navigator.clipboard.writeText(deckLink);
    toast({
      title: `Link copied to clipboard`,
    });
  };

  const content = (
    <Button
      variant="outline"
      size={compact ? 'icon' : 'default'}
      className={cn({
        'opacity-80': !isPublic,
      })}
      onClick={handleCopyLink}
    >
      <LinkIcon className="h-4 w-4" />
      {!compact && <span className="ml-2">Copy link {!isPublic && '(private!)'}</span>}
    </Button>
  );

  if (inNavigation) {
    return <NavigationMenuItem>{content}</NavigationMenuItem>;
  }

  return content;
};

export default CopyLinkButton;

import * as React from 'react';
import { Button } from '@/components/ui/button.tsx';
import { LinkIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast.ts';
import { NavigationMenuItem } from '@/components/ui/navigation-menu.tsx';
import { cn } from '@/lib/utils.ts';

interface CopyLinkButtonProps {
  deckId: string;
  isPublic: boolean;
}

const CopyLinkButton: React.FC<CopyLinkButtonProps> = ({ deckId, isPublic }) => {
  const { toast } = useToast();
  const deckLink = `${window.location.origin}/decks/${deckId}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(deckLink);
    toast({
      title: `Link copied to clipboard`,
    });
  };

  return (
    <NavigationMenuItem>
      <Button
        variant="outline"
        size="default"
        className={cn({
          'opacity-80': !isPublic,
        })}
        onClick={handleCopyLink}
      >
        <LinkIcon className="h-4 w-4 mr-2" />
        Copy link {!isPublic && '(private!)'}
      </Button>
    </NavigationMenuItem>
  );
};

export default CopyLinkButton;
import * as React from 'react';
import { useMemo, CSSProperties } from 'react';
import { NavigationMenu } from '@/components/ui/navigation-menu.tsx';
import { useDeckColors } from '@/hooks/useDeckColors';
import { cn } from '@/lib/utils';

interface DeckNavigationMenuProps {
  deckId: string;
  className?: string;
  children: React.ReactNode;
}

const DeckNavigationMenu: React.FC<DeckNavigationMenuProps> = ({
  deckId,
  className,
  children,
  ...props
}) => {
  const { cssBackground } = useDeckColors(deckId, 'rgb');

  // Create gradient style based on cssBackground
  const gradientStyle = useMemo(() => {
    const style: CSSProperties = {};
    if (cssBackground) {
      style.background = cssBackground;
    }
    return style;
  }, [cssBackground]);

  return (
    <NavigationMenu
      className={cn(
        'rounded-md border-border p-1 w-full mb-2 flex-wrap gap-1 justify-end',
        className,
      )}
      style={gradientStyle}
      {...props}
    >
      {children}
    </NavigationMenu>
  );
};

export default DeckNavigationMenu;

import * as React from 'react';
import { useMemo, CSSProperties } from 'react';
import { Button, type ButtonProps } from '@/components/ui/button.tsx';
import { useDeckColors } from '@/hooks/useDeckColors';

export interface DeckGradientButtonProps extends ButtonProps {
  deckId: string;
}

const DeckGradientButton: React.FC<DeckGradientButtonProps> = ({ deckId, style, ...props }) => {
  const { cssBackground } = useDeckColors(deckId, 'rgb');

  const mergedStyle = useMemo(() => {
    const s: CSSProperties = {};
    if (cssBackground) {
      const lighterGradient = cssBackground.replace(
        /rgba\((\d+),\s*(\d+),\s*(\d+),\s*0.85\)/g,
        'rgba($1, $2, $3, 0.25)',
      );
      s.background = lighterGradient;
    }
    return { ...s, ...(style || {}) };
  }, [cssBackground, style]);

  return <Button style={mergedStyle} {...props} />;
};

export default DeckGradientButton;

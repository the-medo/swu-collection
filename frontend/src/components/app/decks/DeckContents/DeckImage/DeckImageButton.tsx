import * as React from 'react';
import { Button } from '@/components/ui/button.tsx';
import { ClipboardCopy, Download, Image } from 'lucide-react';
import Dialog from '@/components/app/global/Dialog.tsx';
import DeckImage from './DeckImage.tsx';
import { useDeckColors } from '@/hooks/useDeckColors';
import { useMemo, CSSProperties } from 'react';

interface DeckImageButtonProps {
  deckId: string;
}

const DeckImageButton: React.FC<DeckImageButtonProps> = ({ deckId }) => {
  // Create refs to access methods from the DeckImage component
  const deckImageRef = React.useRef<{
    handleDownload: () => void;
    handleCopyToClipboard: () => void;
  } | null>(null);

  // Get gradient colors from the hook
  const { cssBackground } = useDeckColors(deckId, 'rgb');

  // Create custom button styles
  const buttonStyle = useMemo(() => {
    const style: CSSProperties = {};

    if (cssBackground) {
      // Use the same gradient for border
      // style.borderImage = cssBackground.replace('linear-gradient', 'linear-gradient') + ' 1';

      // Create a lighter version of the gradient for background
      const lighterGradient = cssBackground.replace(
        /rgba\((\d+),\s*(\d+),\s*(\d+),\s*0.85\)/g,
        'rgba($1, $2, $3, 0.25)',
      );
      style.background = lighterGradient;
    }

    return style;
  }, [cssBackground]);

  return (
    <Dialog
      trigger={
        <Button
          variant="outline"
          size="default"
          className="border border-accent rounded-md"
          style={buttonStyle}
        >
          <Image className="h-4 w-4 mr-2" />
          Image
        </Button>
      }
      header={'Deck Image'}
      headerHidden={true}
      footer={
        <div className="flex gap-2 justify-end w-full">
          <Button onClick={() => deckImageRef.current?.handleDownload()}>
            <Download className="h-4 w-4 mr-2" />
            Download Image
          </Button>
          <Button variant="outline" onClick={() => deckImageRef.current?.handleCopyToClipboard()}>
            <ClipboardCopy className="h-4 w-4 mr-2" />
            Copy to Clipboard
          </Button>
        </div>
      }
      contentClassName="lg:max-w-[95%] min-h-[80%] max-h-[90%]"
      size="large"
    >
      <DeckImage deckId={deckId} ref={deckImageRef} />
    </Dialog>
  );
};

export default DeckImageButton;

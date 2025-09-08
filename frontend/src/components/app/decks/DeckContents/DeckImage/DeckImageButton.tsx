import * as React from 'react';
import { Button } from '@/components/ui/button.tsx';
import { ClipboardCopy, Download, Image, SettingsIcon, X } from 'lucide-react';
import Dialog from '@/components/app/global/Dialog.tsx';
import DeckImage from './DeckImage.tsx';
import { useDeckColors } from '@/hooks/useDeckColors';
import { useMemo, CSSProperties, useState, useRef } from 'react';
import DeckImageCustomization from './DeckImageCustomization/DeckImageCustomization.tsx';
import { cn } from '@/lib/utils.ts';
import { DeckCardVariantMap } from '@/components/app/decks/DeckContents/DeckImage/deckImageLib.ts';
import { useGetUserSetting } from '@/api/user/useGetUserSetting.ts';

interface DeckImageButtonProps {
  deckId: string;
}

const DeckImageButton: React.FC<DeckImageButtonProps> = ({ deckId }) => {
  // Create refs to access methods from the DeckImage component
  const deckImageRef = useRef<{
    handleDownload: () => void;
    handleCopyToClipboard: () => void;
  } | null>(null);

  const [customizationOpen, setCustomizationOpen] = useState(false);
  const [deckCardVariants, setDeckCardVariants] = useState<DeckCardVariantMap>();
  const { data: showNoisyBackground } = useGetUserSetting('deckImage_showNoisyBackground');
  const { data: exportWidth } = useGetUserSetting('deckImage_exportWidth');

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
      footer={null}
      size="large"
    >
      <DeckImage
        deckId={deckId}
        deckCardVariants={deckCardVariants}
        ref={deckImageRef}
        showNoisyBackground={showNoisyBackground}
        exportWidth={exportWidth}
      />
      <div
        className={cn(
          'flex flex-col fixed  bg-background rounded right-0 bottom-0 p-2 m-2 pt-0  w-full sm:w-[380px] max-w-full',
          {
            'top-0 ': customizationOpen,
          },
        )}
      >
        <DeckImageCustomization
          deckId={deckId}
          open={customizationOpen}
          deckCardVariants={deckCardVariants}
          setDeckCardVariants={setDeckCardVariants}
        />
        <div className="flex gap-2 pt-2 justify-between items-center ">
          <Button
            onClick={() => setCustomizationOpen(o => !o)}
            className="mr-8"
            variant={customizationOpen ? 'secondary' : 'default'}
          >
            {customizationOpen ? (
              <X className="h-4 w-4 mr-2" />
            ) : (
              <SettingsIcon className="h-4 w-4 mr-2" />
            )}
            {customizationOpen ? 'Close' : 'Customization'}
          </Button>
          <div className="flex gap-2 justify-end w-full">
            <Button onClick={() => deckImageRef.current?.handleCopyToClipboard()}>
              <ClipboardCopy className="h-4 w-4 mr-2" />
              Copy
            </Button>
            <Button
              size="icon"
              variant="outline"
              onClick={() => deckImageRef.current?.handleDownload()}
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
};

export default DeckImageButton;

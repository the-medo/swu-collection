import * as React from 'react';
import { Button } from '@/components/ui/button.tsx';
import { ClipboardCopy, Download, Image, SettingsIcon, X } from 'lucide-react';
import Dialog from '@/components/app/global/Dialog.tsx';
import DeckImage from './DeckImage.tsx';
import { useState, useRef } from 'react';
import DeckImageCustomization from './DeckImageCustomization/DeckImageCustomization.tsx';
import { cn } from '@/lib/utils.ts';
import { DeckCardVariantMap } from '@/components/app/decks/DeckContents/DeckImage/deckImageLib.ts';
import { useGetUserSetting } from '@/api/user/useGetUserSetting.ts';
import DeckGradientButton from './DeckGradientButton.tsx';

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


  return (
    <Dialog
      trigger={
        <DeckGradientButton
          deckId={deckId}
          variant="outline"
          size="default"
          className="border border-accent rounded-md"
        >
          <Image className="h-4 w-4 mr-2" />
          Image
        </DeckGradientButton>
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

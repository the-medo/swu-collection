import * as React from 'react';
import { Button } from '@/components/ui/button.tsx';
import { Image } from 'lucide-react';
import Dialog from '@/components/app/global/Dialog.tsx';
import DeckImage from './DeckImage.tsx';

interface DeckImageButtonProps {
  deckId: string;
}

const DeckImageButton: React.FC<DeckImageButtonProps> = ({ deckId }) => {
  // Create refs to access methods from the DeckImage component
  const deckImageRef = React.useRef<{
    handleDownload: () => void;
    handleCopyToClipboard: () => void;
  } | null>(null);

  return (
    <Dialog
      trigger={
        <Button variant="outline" size="default">
          <Image className="h-4 w-4 mr-2" />
          Image
        </Button>
      }
      header={'Deck Image'}
      headerHidden={true}
      /*footer={
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
      }*/
      contentClassName="md:max-w-[95%] min-h-[80%] max-h-[90%]"
      size="large"
    >
      <DeckImage deckId={deckId} ref={deckImageRef} />
    </Dialog>
  );
};

export default DeckImageButton;

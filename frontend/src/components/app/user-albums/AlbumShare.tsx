import { useId, useState } from 'react';
import { Link2, Check, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover.tsx';

export function AlbumShare({ id }: { id: string }) {
  const [message, setMessage] = useState('');
  const inputId = useId();
  const url = new URL(`/albums/${id}`, window.location.origin).href;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Album link"
          title="Album link"
          className="rounded-xl text-[#fffaf0]/80 hover:bg-white/10 hover:text-white"
        >
          <Link2 />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[min(24rem,calc(100vw-2rem))] space-y-3 rounded-2xl"
      >
        <label className="text-sm font-medium" htmlFor={inputId}>
          Album link
        </label>
        <div className="flex gap-2">
          <Input
            id={inputId}
            readOnly
            value={url}
            onFocus={event => event.currentTarget.select()}
          />
          <Button
            variant="outline"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(url);
                setMessage('Album link copied.');
              } catch {
                setMessage('Select and copy the album link.');
              }
            }}
          >
            {message === 'Album link copied.' ? <Check /> : <Copy />}
            Copy link
          </Button>
        </div>
        {message && (
          <p role="status" className="text-sm">
            {message}
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}

import { Image, Link, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import { editorCommands, type InsertKind } from './model.ts';

export function InsertButtons({ onInsert }: { onInsert: (kind: InsertKind) => void }) {
  return (
    <div
      className="flex flex-wrap items-center gap-1 border-b p-2"
      role="group"
      aria-label="Insert SWUBASE content"
    >
      <Button
        variant="ghost"
        size="sm"
        onMouseDown={event => event.preventDefault()}
        onClick={() => onInsert('card-image')}
      >
        <Image size={16} />
        Card image
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onMouseDown={event => event.preventDefault()}
        onClick={() => onInsert('card-link')}
      >
        <Link size={16} />
        Card link
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onMouseDown={event => event.preventDefault()}
        onClick={() => onInsert('decklist')}
      >
        <Layers size={16} />
        Decklist
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onMouseDown={e => e.preventDefault()}
        onClick={() => onInsert('mention')}
      >
        @ Mention
      </Button>
      {editorCommands
        .filter(command => !['card-image', 'card-link', 'decklist'].includes(command.id))
        .map(command => (
          <Button
            key={command.id}
            variant="ghost"
            size="sm"
            onMouseDown={e => e.preventDefault()}
            onClick={() => onInsert(command.id)}
          >
            {command.label}
          </Button>
        ))}
    </div>
  );
}

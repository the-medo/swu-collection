import { useState } from 'react';
import { useStore } from '@tanstack/react-store';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import { Textarea } from '@/components/ui/textarea.tsx';
import type { CrossfireConnection } from './connection.ts';
export function GameChat({ connection }: { connection: CrossfireConnection }) {
  const state = useStore(connection.store),
    [text, setText] = useState('');
  return (
    <section className="cf-chat" aria-label="Player chat">
      <form
        onSubmit={event => {
          event.preventDefault();
          if (connection.sendChat(text)) setText('');
        }}
      >
        <Textarea
          aria-label="Message to opponent"
          value={text}
          maxLength={1000}
          rows={2}
          placeholder="Message your opponent…"
          onChange={event => setText(event.target.value)}
        />
        {state.chatError && <p role="alert">{state.chatError}</p>}
        <Button
          size="sm"
          type="submit"
          disabled={
            !text.trim() || state.chatPending || !state.chatReady || state.status !== 'connected'
          }
        >
          <Send size={14} />
          {state.chatPending ? 'Sending…' : 'Send'}
        </Button>
      </form>
    </section>
  );
}

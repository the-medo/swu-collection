import * as React from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useToast } from '@/hooks/use-toast.ts';
import { useForm } from '@tanstack/react-form';
import { Input } from '@/components/ui/input.tsx';
import { Button } from '@/components/ui/button.tsx';
import { useState } from 'react';
import { useImportSwudbDeck } from '@/api/decks/useImportSwudbDeck.ts';

const getDeckIdFromSwudbLink = (link: string): string | false => {
  if (!link || link.length === 0) return false;
  const url = new URL(link);
  url.search = '';

  let deckLinkSplit = url.pathname.split('/');
  let deckId = deckLinkSplit.pop();
  if (deckId === '') deckId = deckLinkSplit.pop();

  return deckId && (deckId ?? '').length > 0 ? deckId : false;
};

interface ImportNewDeckProps {
  onSuccess: () => void;
}

export const ImportNewDeck: React.FC<ImportNewDeckProps> = ({ onSuccess }) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [swudbDeckId, setSwudbDeckId] = useState<string | false>(false);
  const importSwudbDeck = useImportSwudbDeck();

  const form = useForm({
    defaultValues: {
      swudbLink: '',
    },
    onSubmit: async ({}) => {
      if (!swudbDeckId) {
        toast({
          title: `No correct Deck ID found.`,
        });
        return;
      }
      importSwudbDeck.mutate(
        {
          swudbDeckId,
        },
        {
          onSuccess: result => {
            if (!('data' in result)) return;
            const createdDeck = result.data.deck;
            const errors = result.data.errors;

            if (errors.length > 0) {
              toast({
                title: 'Not all cards are imported',
                description: createdDeck.description,
              });
            } else {
              toast({
                title: `Deck "${createdDeck.name}" created!`,
              });
            }
            navigate({ to: `/decks/${createdDeck.id}` });
            onSuccess();
          },
        },
      );
    },
  });

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={e => {
        e.preventDefault();
        e.stopPropagation();
        void form.handleSubmit();
      }}
    >
      <form.Field
        name="swudbLink"
        children={field => (
          <Input
            type="text"
            className=""
            id={field.name}
            placeholder="SWUDB Link"
            value={field.state.value}
            onBlur={field.handleBlur}
            onChange={e => {
              field.handleChange(e.target.value);
              setSwudbDeckId(getDeckIdFromSwudbLink(e.target.value));
            }}
          />
        )}
      />
      <Button type="submit" disabled={form.state.isSubmitting || !swudbDeckId}>
        {importSwudbDeck.isPending ? '...' : 'Import'}
      </Button>
    </form>
  );
};

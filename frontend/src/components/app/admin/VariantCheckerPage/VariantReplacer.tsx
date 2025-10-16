import React from 'react';
import { Input } from '@/components/ui/input.tsx';
import { Button } from '@/components/ui/button.tsx';
import { useReplaceVariant } from '@/api/admin/useReplaceVariant';

export interface VariantReplacerProps {
  cardId: string;
  oldVariantId: string;
}

export const VariantReplacer: React.FC<VariantReplacerProps> = ({ cardId, oldVariantId }) => {
  const [newVariantId, setNewVariantId] = React.useState('');
  const { mutate, isPending } = useReplaceVariant();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVariantId) return;
    mutate(
      { cardId, oldVariantId, newVariantId },
      {
        onSuccess: () => {
          setNewVariantId('');
        },
      },
    );
  };

  return (
    <form onSubmit={onSubmit} className="flex items-center gap-2">
      <Input
        value={newVariantId}
        onChange={e => setNewVariantId(e.target.value)}
        placeholder="new variant id"
        className="h-8 py-1 px-2 text-xs"
      />
      {newVariantId && (
        <Button type="submit" size="sm" disabled={isPending} className="h-8">
          {isPending ? 'Replacing…' : 'Replace'}
        </Button>
      )}
    </form>
  );
};

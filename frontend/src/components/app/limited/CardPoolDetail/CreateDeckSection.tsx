import React from 'react';
import { CardPool } from '../../../../../../server/db/schema/card_pool.ts';
import { Input } from '@/components/ui/input.tsx';
import { Button } from '@/components/ui/button.tsx';
import VisibilitySelector from '@/components/app/global/VisibilitySelector/VisibilitySelector.tsx';
import { Visibility } from '../../../../../../shared/types/visibility.ts';
import { useCreateCardPoolDeck } from '@/api/card-pools/useCreateCardPoolDeck.ts';
import { cn } from '@/lib/utils.ts';

export interface CreateDeckSectionProps {
  pool?: CardPool;
  className?: string;
  onCreated?: () => void;
}

const CreateDeckSection: React.FC<CreateDeckSectionProps> = ({ pool, className, onCreated }) => {
  const [name, setName] = React.useState<string>('');
  const [visibility, setVisibility] = React.useState<Visibility>(Visibility.Unlisted);

  const defaultName = React.useMemo(() => {
    return pool?.name ? `Deck from ${pool.name}` : '';
  }, [pool?.name]);

  React.useEffect(() => {
    setName(defaultName);
  }, [defaultName]);

  const createMutation = useCreateCardPoolDeck(pool?.id);

  const canSubmit = Boolean(pool?.id) && name.trim().length > 0 && !createMutation.isPending;

  const handleCreate = () => {
    if (!canSubmit) return;
    createMutation.mutate(
      { name: name.trim(), visibility },
      {
        onSuccess: () => {
          // Reset name to default to allow quick subsequent creations
          setName(defaultName);
          onCreated?.();
        },
      },
    );
  };

  return (
    <div className={cn('border rounded-lg p-3', className)}>
      <div className="flex flex-col gap-2">
        <Input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Deck name"
          className="w-full h-8 text-sm"
          disabled={!pool?.id || createMutation.isPending}
        />
        <VisibilitySelector value={visibility} onChange={setVisibility} />
        <Button
          type="button"
          onClick={handleCreate}
          disabled={!canSubmit}
          className="w-full h-8 px-3"
        >
          {createMutation.isPending ? 'Creating…' : 'Start a new deck!'}
        </Button>
        {createMutation.isError && (
          <div className="text-xs text-red-500">Failed to create deck. Please try again.</div>
        )}
        {createMutation.isSuccess && <div className="text-xs text-green-600">Deck created!</div>}
      </div>
    </div>
  );
};

export default CreateDeckSection;

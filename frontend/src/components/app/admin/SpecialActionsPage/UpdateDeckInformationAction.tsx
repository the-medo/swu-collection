import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useUpdateDeckInformation } from '@/api/admin/useUpdateDeckInformation';

export const UpdateDeckInformationAction: React.FC = () => {
  const [isConfirmed, setIsConfirmed] = useState(false);
  const { toast } = useToast();
  const updateDeckInformation = useUpdateDeckInformation();

  const handleUpdateDeckInformation = async () => {
    if (!isConfirmed) {
      toast({
        title: 'Confirmation required',
        description: 'Please check the confirmation box before proceeding.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const result = await updateDeckInformation.mutateAsync();
      toast({
        title: 'Success',
        description: `Successfully updated information for ${result.data.updatedCount} decks.`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Update All Deck Information</h2>
      <p className="text-muted-foreground">
        This action will update the information for all decks in the database. This includes
        recalculating aspect counts and other metadata.
      </p>

      <div className="flex items-center space-x-2 mt-4">
        <Checkbox
          id="confirm-update-decks"
          checked={isConfirmed}
          onCheckedChange={checked => setIsConfirmed(checked === true)}
        />
        <label
          htmlFor="confirm-update-decks"
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          Are you sure?
        </label>
      </div>

      <Button
        onClick={handleUpdateDeckInformation}
        disabled={updateDeckInformation.isPending}
        className="mt-4"
      >
        {updateDeckInformation.isPending ? 'Processing...' : 'Do it!'}
      </Button>
    </div>
  );
};

export default UpdateDeckInformationAction;

import Dialog, { DialogProps } from '@/components/app/global/Dialog.tsx';
import * as React from 'react';
import { useUser } from '@/hooks/useUser.ts';
import { useToast } from '@/hooks/use-toast.ts';
import { useForm } from '@tanstack/react-form';
import { Label } from '@/components/ui/label.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Checkbox } from '@/components/ui/checkbox.tsx';
import { useState } from 'react';
import SignIn from '@/components/app/auth/SignIn.tsx';
import { useNavigate } from '@tanstack/react-router';
import { Textarea } from '@/components/ui/textarea.tsx';
import { usePostDeck } from '@/api/decks/usePostDeck.ts';
import FormatSelect from '@/components/app/decks/components/FormatSelect.tsx';
import LeaderSelector from '@/components/app/global/LeaderSelector/LeaderSelector.tsx';
import BaseSelector from '@/components/app/global/BaseSelector/BaseSelector.tsx';
import { formatDataById } from '../../../../../types/Format.ts';

type NewDeckDialogProps = Pick<DialogProps, 'trigger' | 'triggerDisabled'> & {};

const NewDeckDialog: React.FC<NewDeckDialogProps> = ({ trigger, triggerDisabled }) => {
  const navigate = useNavigate();
  const user = useUser();
  const [open, setOpen] = useState(false);
  const [selectedLeader1, setSelectedLeader1] = useState<string | undefined>(undefined);
  const [selectedLeader2, setSelectedLeader2] = useState<string | undefined>(undefined);
  const [selectedBase, setSelectedBase] = useState<string | undefined>(undefined);
  const { toast } = useToast();
  const postCollectionMutation = usePostDeck();

  const form = useForm<{
    format: number;
    name: string;
    description: string;
    public: boolean;
  }>({
    defaultValues: {
      format: 1,
      name: `My deck`,
      description: ``,
      public: false,
    },
    onSubmit: async ({ value }) => {
      // Call our hook's mutation function.
      postCollectionMutation.mutate(
        {
          format: value.format,
          name: value.name,
          description: value.description,
          public: value.public,
        },
        {
          onSuccess: result => {
            toast({
              title: `Deck "${value.name}" created!`,
            });
            // Navigate to the newly created deck.
            const createdDeck = result.data[0];
            navigate({ to: `/decks/${createdDeck.id}` });
            setOpen(false);
          },
        },
      );
    },
  });

  return (
    <Dialog
      trigger={trigger}
      triggerDisabled={triggerDisabled}
      header={`New deck`}
      open={open}
      onOpenChange={setOpen}
      contentClassName="md:min-w-[500px]"
    >
      {user ? (
        <form
          className="flex flex-col gap-4"
          onSubmit={e => {
            e.preventDefault();
            e.stopPropagation();
            void form.handleSubmit();
          }}
        >
          <form.Field
            name="format"
            children={field => (
              <div className="flex flex-col gap-2">
                <FormatSelect
                  value={field.state.value}
                  allowEmpty={false}
                  onChange={e => field.handleChange(e ?? 1)}
                />
                <div className="flex flex-wrap gap-2 w-full justify-center items-center">
                  <LeaderSelector
                    trigger={null}
                    leaderCardId={selectedLeader1}
                    onLeaderSelected={setSelectedLeader1}
                  />
                  {formatDataById[Number(field.state.value)]?.leaderCount === 2 && (
                    <LeaderSelector
                      trigger={null}
                      leaderCardId={selectedLeader2}
                      onLeaderSelected={setSelectedLeader2}
                    />
                  )}
                  <BaseSelector
                    trigger={null}
                    baseCardId={selectedBase}
                    onBaseSelected={setSelectedBase}
                  />
                </div>
              </div>
            )}
          />
          <form.Field
            name="name"
            children={field => (
              <div className="flex flex-col gap-2">
                <Input
                  type="text"
                  className=""
                  id={field.name}
                  placeholder="Deck name"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={e => field.handleChange(e.target.value)}
                />
              </div>
            )}
          />
          <form.Field
            name="description"
            children={field => (
              <div className="flex flex-col gap-2">
                <Textarea
                  className=""
                  id={field.name}
                  placeholder="Description"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={e => field.handleChange(e.target.value)}
                />
              </div>
            )}
          />
          <form.Field
            name="public"
            children={field => (
              <div className="flex gap-2">
                <Checkbox
                  id={field.name}
                  value={field.state.value ? '1' : '0'}
                  onBlur={field.handleBlur}
                  onCheckedChange={e => field.handleChange(!!e)}
                />
                <Label htmlFor={field.name}>Public</Label>
              </div>
            )}
          />
          <Button type="submit" disabled={form.state.isSubmitting}>
            {form.state.isSubmitting ? '...' : 'Create'}
          </Button>
        </form>
      ) : (
        <>
          Please sign in to create new deck.
          <SignIn />
        </>
      )}
    </Dialog>
  );
};

export default NewDeckDialog;

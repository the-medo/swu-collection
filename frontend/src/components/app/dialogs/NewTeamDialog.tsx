import Dialog, { DialogProps } from '@/components/app/global/Dialog.tsx';
import * as React from 'react';
import { useUser } from '@/hooks/useUser.ts';
import { useToast } from '@/hooks/use-toast.ts';
import { useForm } from '@tanstack/react-form';
import { Input } from '@/components/ui/input.tsx';
import { Button } from '@/components/ui/button.tsx';
import { useState } from 'react';
import SignIn from '@/components/app/auth/SignIn.tsx';
import { useNavigate } from '@tanstack/react-router';
import { Textarea } from '@/components/ui/textarea.tsx';
import { useCreateTeam } from '@/api/teams';
import { Label } from '@/components/ui/label.tsx';

type NewTeamDialogProps = Pick<DialogProps, 'trigger' | 'triggerDisabled'>;

const NewTeamDialog: React.FC<NewTeamDialogProps> = ({ trigger, triggerDisabled }) => {
  const navigate = useNavigate();
  const user = useUser();
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const createTeamMutation = useCreateTeam();

  const form = useForm({
    defaultValues: {
      name: '',
      shortcut: '',
      description: '',
    },
    onSubmit: async ({ value }) => {
      createTeamMutation.mutate(
        {
          name: value.name,
          shortcut: value.shortcut,
          description: value.description || undefined,
        },
        {
          onSuccess: result => {
            toast({
              title: `Team "${value.name}" created!`,
            });
            navigate({ to: `/teams/${result.shortcut ?? result.id}` });
            setOpen(false);
          },
        },
      );
    },
  });

  const handleNameChange = (name: string, currentShortcut: string, field: any) => {
    field.handleChange(name);
    const autoShortcut = name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 30);
    if (
      currentShortcut === '' ||
      currentShortcut ===
        form
          .getFieldValue('name')
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .slice(0, 30)
    ) {
      form.setFieldValue('shortcut', autoShortcut);
    }
  };

  return (
    <Dialog
      trigger={trigger}
      triggerDisabled={triggerDisabled}
      header="Create Team"
      open={open}
      onOpenChange={setOpen}
      contentClassName="md:min-w-[450px]"
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
            name="name"
            children={field => (
              <div className="flex flex-col gap-2">
                <Label htmlFor={field.name}>Team name</Label>
                <Input
                  type="text"
                  id={field.name}
                  placeholder="My Awesome Team"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={e =>
                    handleNameChange(e.target.value, form.getFieldValue('shortcut'), field)
                  }
                />
              </div>
            )}
          />
          <form.Field
            name="shortcut"
            children={field => (
              <div className="flex flex-col gap-2">
                <Label htmlFor={field.name}>Shortcut (URL-friendly)</Label>
                <Input
                  type="text"
                  id={field.name}
                  placeholder="my-awesome-team"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={e => field.handleChange(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Only lowercase letters, numbers and hyphens. Used in the team URL.
                </p>
              </div>
            )}
          />
          <form.Field
            name="description"
            children={field => (
              <div className="flex flex-col gap-2">
                <Label htmlFor={field.name}>Description (optional)</Label>
                <Textarea
                  id={field.name}
                  placeholder="Tell others about your team..."
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={e => field.handleChange(e.target.value)}
                />
              </div>
            )}
          />
          <Button type="submit" disabled={createTeamMutation.isPending}>
            {createTeamMutation.isPending ? 'Creating...' : 'Create Team'}
          </Button>
        </form>
      ) : (
        <div className="flex flex-col gap-4">
          Please sign in to create a team.
          <SignIn />
        </div>
      )}
    </Dialog>
  );
};

export default NewTeamDialog;

import * as React from 'react';
import { useUser } from '@/hooks/useUser.ts';
import { useToast } from '@/hooks/use-toast.ts';
import { authClient } from '@/lib/auth-client.ts';
import { Label } from '@/components/ui/label.tsx';
import { Input } from '@/components/ui/input.tsx';
import { useForm } from '@tanstack/react-form';
import { Button } from '@/components/ui/button.tsx';
import { generateDisplayName } from '../../../../../../server/auth/generateDisplayName.ts';
import { Helmet } from 'react-helmet-async';

export interface UserSettingsProps {}

const UserSettings: React.FC<UserSettingsProps> = ({}) => {
  const user = useUser();
  const { toast } = useToast();

  const form = useForm<{
    displayName: string;
  }>({
    defaultValues: {
      displayName: user?.displayName!,
    },
    onSubmit: async ({ value, formApi }) => {
      try {
        const { error } = await authClient.updateUser({ displayName: value.displayName });
        if (!error) {
          toast({
            title: 'Display name updated',
            description: value.displayName,
          });
        } else {
          throw new Error(error.statusText);
        }
      } catch (e: unknown) {
        toast({
          variant: 'destructive',
          title: 'Error while updating display name',
          description: (e as Error).toString(),
        });
        formApi.setFieldValue('displayName', user?.displayName ?? '');
      }
    },
  });

  return (
    <>
      <Helmet title="User settings | SWUBase" />
      <div className="flex flex-col gap-4">
        <h2 className="text-2xl">User settings</h2>

        <form
          onSubmit={e => {
            e.preventDefault();
            e.stopPropagation();
            void form.handleSubmit();
          }}
        >
          <form.Field
            name="displayName"
            children={field => (
              <div className="flex flex-col gap-2">
                <Label htmlFor={field.name}>Display name</Label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="w-[300px] max-sm:w-full">
                    <Input
                      type="text"
                      id={field.name}
                      placeholder="Display name"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={e => field.handleChange(e.target.value)}
                    />
                  </div>
                  <Button type="submit" disabled={field.getMeta().isPristine}>
                    Save
                  </Button>
                  <Button
                    variant="ghost"
                    type="button"
                    onClick={() => form.setFieldValue('displayName', generateDisplayName())}
                  >
                    Generate random display name
                  </Button>
                </div>
              </div>
            )}
          />
        </form>
      </div>
    </>
  );
};

export default UserSettings;

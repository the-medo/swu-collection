import * as React from 'react';
import { useUser } from '@/hooks/useUser.ts';
import { useToast } from '@/hooks/use-toast.ts';
import { FocusEventHandler, useCallback } from 'react';
import { authClient } from '@/lib/auth-client.ts';
import { Label } from '@/components/ui/label.tsx';
import { Input } from '@/components/ui/input.tsx';

export interface UserSettingsProps {}

const UserSettings: React.FC<UserSettingsProps> = ({}) => {
  const user = useUser();
  const { toast } = useToast();
  const [displayName, setDisplayName] = React.useState(user?.displayName);

  const onDisplayNameChange: FocusEventHandler<HTMLInputElement> = useCallback(async e => {
    if (e.target.value && e.target.value.length > 3) {
      try {
        const { error } = await authClient.updateUser({ displayName: e.target.value });
        if (!error) {
          toast({
            title: 'Display name updated',
            description: e.target.value,
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
        setDisplayName(user?.displayName);
      }
    }
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-2xl">User settings</h2>
      <div className="flex flex-col gap-2">
        <Label>Display name</Label>
        <Input
          className="w-[250px]"
          type="text"
          placeholder="Display name"
          value={displayName}
          onBlur={onDisplayNameChange}
          onChange={e => setDisplayName(e.target.value)}
        />
      </div>
    </div>
  );
};

export default UserSettings;

import * as React from 'react';
import { useRef } from 'react';
import { useForm } from '@tanstack/react-form';
import { useDeleteTeam, useTeamMembers, useUpdateTeam, useUploadTeamLogo } from '@/api/teams';
import { useToast } from '@/hooks/use-toast.ts';
import { Input } from '@/components/ui/input.tsx';
import { Textarea } from '@/components/ui/textarea.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Label } from '@/components/ui/label.tsx';
import { Trash2, Users, Upload } from 'lucide-react';
import { Switch } from '@/components/ui/switch.tsx';
import type { Team } from '../../../../../../server/db/schema/team.ts';
import { useNavigate } from '@tanstack/react-router';
import { useUser } from '@/hooks/useUser.ts';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog.tsx';

type TeamWithMembership = Team & {
  membership: { role: string; joinedAt: string } | null;
};

interface TeamSettingsTabProps {
  team: TeamWithMembership;
}

const TeamSettingsTab: React.FC<TeamSettingsTabProps> = ({ team }) => {
  const navigate = useNavigate();
  const currentUser = useUser();
  const { toast } = useToast();
  const updateTeam = useUpdateTeam(team.id);
  const uploadLogo = useUploadTeamLogo(team.id);
  const deleteTeam = useDeleteTeam(team.id);
  const { data: members, isLoading: isLoadingMembers } = useTeamMembers(team.id);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);

  const canDeleteTeam =
    !!currentUser && members?.length === 1 && members[0]?.userId === currentUser.id;
  const isCheckingDeleteEligibility = isLoadingMembers || !currentUser;

  const form = useForm({
    defaultValues: {
      name: team.name,
      shortcut: team.shortcut ?? '',
      description: team.description ?? '',
    },
    onSubmit: async ({ value }) => {
      updateTeam.mutate(
        {
          name: value.name,
          shortcut: value.shortcut,
          description: value.description || undefined,
        },
        {
          onSuccess: () => {
            toast({ title: 'Team settings updated!' });
          },
        },
      );
    },
  });

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadLogo.mutate(file, {
      onSuccess: () => {
        toast({ title: 'Logo uploaded successfully!' });
      },
    });
  };

  const handleDeleteTeam = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();

    if (!canDeleteTeam) return;

    deleteTeam.mutate(undefined, {
      onSuccess: () => {
        toast({ title: 'Team deleted' });
        setDeleteDialogOpen(false);
        navigate({ to: '/teams' });
      },
    });
  };

  return (
    <div className="flex flex-col gap-6 py-4 max-w-lg">
      <div className="flex flex-col gap-3">
        <Label>Team Logo</Label>
        <div className="flex items-center gap-4">
          {team.logoUrl ? (
            <img
              src={team.logoUrl}
              alt={`${team.name} logo`}
              className="w-16 h-16 rounded-lg object-cover"
            />
          ) : (
            <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center">
              <Users className="w-8 h-8 text-muted-foreground" />
            </div>
          )}
          <div className="flex flex-col gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleLogoUpload}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadLogo.isPending}
            >
              <Upload className="w-4 h-4 mr-2" />
              {uploadLogo.isPending ? 'Uploading...' : 'Upload Logo'}
            </Button>
          </div>
        </div>
      </div>

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
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={e => field.handleChange(e.target.value)}
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
              <Label htmlFor={field.name}>Description</Label>
              <Textarea
                id={field.name}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={e => field.handleChange(e.target.value)}
              />
            </div>
          )}
        />
        <Button type="submit" disabled={updateTeam.isPending}>
          {updateTeam.isPending ? 'Saving...' : 'Save Settings'}
        </Button>
      </form>

      <div className="flex flex-col gap-3">
        <Label>Default "Auto-add deck" value for new members:</Label>
        <div className="flex items-center gap-3">
          <Switch
            checked={team.autoAddDeck}
            onCheckedChange={checked =>
              updateTeam.mutate(
                { autoAddDeck: checked },
                {
                  onSuccess: () => {
                    toast({ title: 'Auto-add deck setting updated!' });
                  },
                },
              )
            }
          />
          <span className="text-sm text-muted-foreground">
            When enabled, `Auto-add deck` will be turned on by default for new members. You can
            still turn it on/off for individual member.
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-4">
        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-semibold text-destructive">Danger zone</h3>
          {isCheckingDeleteEligibility ? (
            <p className="text-sm text-muted-foreground">Checking team members...</p>
          ) : canDeleteTeam ? (
            <p className="text-sm text-muted-foreground">
              Delete this team permanently. This action cannot be undone.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              To delete this team, first kick all other players out of the team. Then you can delete
              the team.
            </p>
          )}
        </div>

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogTrigger asChild>
            <Button
              type="button"
              variant="destructive"
              className="w-fit"
              disabled={!canDeleteTeam || deleteTeam.isPending}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {deleteTeam.isPending ? 'Deleting...' : 'Delete Team'}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete team "{team.name}"?</AlertDialogTitle>
              <AlertDialogDescription>
                This permanently deletes the team and removes all team membership, join requests and
                team deck links. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleteTeam.isPending}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={deleteTeam.isPending}
                onClick={handleDeleteTeam}
              >
                {deleteTeam.isPending ? 'Deleting...' : 'Delete Team'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export default TeamSettingsTab;

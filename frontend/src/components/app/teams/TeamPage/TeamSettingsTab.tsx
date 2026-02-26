import * as React from 'react';
import { useRef } from 'react';
import { useForm } from '@tanstack/react-form';
import { useUpdateTeam, useUploadTeamLogo } from '@/api/teams';
import { useToast } from '@/hooks/use-toast.ts';
import { Input } from '@/components/ui/input.tsx';
import { Textarea } from '@/components/ui/textarea.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Label } from '@/components/ui/label.tsx';
import { Users, Upload } from 'lucide-react';
import { Switch } from '@/components/ui/switch.tsx';
import type { Team } from '../../../../../../server/db/schema/team.ts';

type TeamWithMembership = Team & {
  membership: { role: string; joinedAt: string } | null;
};

interface TeamSettingsTabProps {
  team: TeamWithMembership;
}

const TeamSettingsTab: React.FC<TeamSettingsTabProps> = ({ team }) => {
  const { toast } = useToast();
  const updateTeam = useUpdateTeam(team.id);
  const uploadLogo = useUploadTeamLogo(team.id);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        <Label>Defaul "Auto-add deck" value for new members:</Label>
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
    </div>
  );
};

export default TeamSettingsTab;

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { CalendarDays, Check, Copy, Globe, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import { useToast } from '@/hooks/use-toast.ts';
import { userLocale } from '@/lib/locale.ts';
import type { Team } from '../../../../../../server/db/schema/team.ts';

const teamDate = new Intl.DateTimeFormat(userLocale, { month: 'long', year: 'numeric' });

export function TeamSidebar({
  team,
  isMember = false,
  children,
  navigation,
}: {
  team: Team;
  isMember?: boolean;
  children?: ReactNode;
  navigation?: ReactNode;
}) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const copyTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(copyTimeout.current), []);

  const teamLink = `${window.location.origin}/teams/${team.id}`;
  const PrivacyIcon = team.privacy === 'private' ? Lock : Globe;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(teamLink);
      setCopied(true);
      toast({ description: 'Invite link copied to clipboard' });
      clearTimeout(copyTimeout.current);
      copyTimeout.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        variant: 'destructive',
        description: 'Could not copy the invite link. Select and copy it manually.',
      });
    }
  };

  return (
    <div className="flex min-w-0 flex-col gap-6">
      {children}
      {navigation && <div className="order-1 @[761px]/main-body:order-none">{navigation}</div>}
      <dl className="grid min-w-0 grid-cols-2 gap-5 text-sm @[761px]/main-body:grid-cols-1">
        <div>
          <dt className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <PrivacyIcon className="size-3.5" aria-hidden="true" /> Visibility
          </dt>
          <dd className="m-0 font-medium">
            {team.privacy === 'private' ? 'Private team' : 'Public team'}
          </dd>
        </div>
        <div>
          <dt className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarDays className="size-3.5" aria-hidden="true" /> Team since
          </dt>
          <dd className="m-0 font-medium">{teamDate.format(new Date(team.createdAt))}</dd>
        </div>
      </dl>
      {isMember && (
        <div className="min-w-0 border-t border-border pt-5">
          <label
            htmlFor="team-invite-link"
            className="mb-2 block text-xs font-medium text-muted-foreground"
          >
            Invite teammates
          </label>
          <div className="flex items-center gap-2">
            <Input
              id="team-invite-link"
              readOnly
              value={teamLink}
              className="h-9 min-w-0 text-xs"
            />
            <Button
              variant="outline"
              size="iconMedium"
              onClick={() => void handleCopy()}
              aria-label={copied ? 'Invite link copied' : 'Copy invite link'}
              title={copied ? 'Invite link copied' : 'Copy invite link'}
              className="shrink-0"
            >
              {copied ? (
                <Check className="size-4" aria-hidden="true" />
              ) : (
                <Copy className="size-4" aria-hidden="true" />
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

import * as React from 'react';
import { useTeam } from '@/api/teams';
import { Helmet } from 'react-helmet-async';
import Error404 from '@/components/app/pages/error/Error404.tsx';
import LoadingTitle from '@/components/app/global/LoadingTitle.tsx';
import { Skeleton } from '@/components/ui/skeleton.tsx';
import TeamMemberView from './TeamMemberView.tsx';
import TeamNonMemberView from './TeamNonMemberView.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Copy, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast.ts';
import type { ErrorWithStatus } from '../../../../../../types/ErrorWithStatus.ts';

interface TeamPageProps {
  idOrShortcut: string;
}

const TeamPage: React.FC<TeamPageProps> = ({ idOrShortcut }) => {
  const { data: team, isLoading, error } = useTeam(idOrShortcut);
  const { toast } = useToast();
  const [copied, setCopied] = React.useState(false);

  if (error && (error as ErrorWithStatus).status === 404) {
    return (
      <>
        <Helmet title="Team not found | SWUBase" />
        <Error404
          title="Team not found"
          description="The team you are looking for does not exist or has been deleted."
        />
      </>
    );
  }

  if (isLoading || !team) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <Helmet title="Loading team | SWUBase" />
        <LoadingTitle loading />
        <Skeleton className="h-[200px] w-full" />
      </div>
    );
  }

  const isMember = !!team.membership;
  const isOwner = team.membership?.role === 'owner';

  const teamLink = `${window.location.origin}/teams/${team.id}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(teamLink);
    setCopied(true);
    toast({
      description: 'Invite link copied to clipboard',
    });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <Helmet title={`${team.name} | SWUBase`} />
      <div className="flex flex-col gap-4 p-4">
        <div className="flex items-center gap-4">
          {team.logoUrl && (
            <img
              src={team.logoUrl}
              alt={`${team.name} logo`}
              className="w-16 h-16 rounded-lg object-cover"
            />
          )}
          <div className="flex flex-col gap-2">
            <LoadingTitle mainTitle={team.name} subTitle={team.description} />
            <div className="flex items-center gap-2">
              <span>Invite link: </span>
              <div>
                <Input readOnly value={teamLink} className="h-8 w-[200px] text-[10px]" />
              </div>
              <Button variant="outline" size="iconMedium" onClick={handleCopy} title="Copy Team ID">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
        {isMember ? (
          <TeamMemberView team={team} isOwner={isOwner} />
        ) : (
          <TeamNonMemberView team={team} />
        )}
      </div>
    </>
  );
};

export default TeamPage;

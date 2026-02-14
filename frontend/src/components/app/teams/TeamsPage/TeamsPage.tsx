import * as React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from '@tanstack/react-router';
import {
  Plus,
  Users,
  Lock,
  LinkIcon,
  ShieldCheck,
  ChartSpline,
  BarChart3,
  Target,
} from 'lucide-react';
import { useTeams } from '@/api/teams';
import { useUser } from '@/hooks/useUser.ts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card.tsx';
import NewTeamDialog from '@/components/app/dialogs/NewTeamDialog.tsx';
import SignIn from '@/components/app/auth/SignIn.tsx';

const MAX_TEAMS = 2;

type Team = {
  id: string;
  name: string;
  shortcut: string | null;
  description?: string | null;
  logoUrl?: string | null;
};

const TeamCard: React.FC<{ team: Team }> = ({ team }) => {
  const teamUrl = `/teams/${team.shortcut ?? team.id}`;

  return (
    <Link to={teamUrl} className="block">
      <Card className="h-full transition-colors hover:border-primary/50 hover:shadow-md cursor-pointer">
        <CardHeader className="flex flex-col items-center gap-4 text-center">
          {team.logoUrl ? (
            <img
              src={team.logoUrl}
              alt={`${team.name} logo`}
              className="w-20 h-20 rounded-xl object-cover"
            />
          ) : (
            <div className="w-20 h-20 rounded-xl bg-muted flex items-center justify-center">
              <Users className="w-10 h-10 text-muted-foreground" />
            </div>
          )}
          <div className="flex flex-col gap-1 min-w-0 w-full">
            <CardTitle className="text-xl truncate">{team.name}</CardTitle>
            {team.description && (
              <CardDescription className="line-clamp-2">{team.description}</CardDescription>
            )}
          </div>
        </CardHeader>
      </Card>
    </Link>
  );
};

const EmptyTeamSlot: React.FC = () => {
  return (
    <NewTeamDialog
      trigger={
        <button className="w-full h-full">
          <Card className="h-full border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 transition-colors cursor-pointer bg-transparent">
            <CardContent className="flex flex-col items-center justify-center gap-3 py-10">
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
                <Plus className="w-7 h-7 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">Create a new team</p>
            </CardContent>
          </Card>
        </button>
      }
    />
  );
};

const TeamsPage: React.FC = () => {
  const user = useUser();
  const { data: teams } = useTeams();

  const userTeams = teams ?? [];
  const emptySlots = MAX_TEAMS - userTeams.length;

  return (
    <>
      <Helmet title="Teams | SWUBase" />
      <div className="p-4 max-w-[1200px] mx-auto">
        <h3>Teams</h3>

        <div className="flex flex-col gap-6 mt-4">
          <div className="min-w-0">
            {!user ? (
              <Card>
                <CardContent className="flex flex-col items-center gap-4 py-8">
                  <Users className="w-12 h-12 text-muted-foreground" />
                  <p className="text-muted-foreground text-center">
                    Sign in to create or join teams.
                  </p>
                  <SignIn />
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {userTeams.map(team => (
                  <TeamCard key={team.id} team={team} />
                ))}
                {emptySlots > 0 &&
                  Array.from({ length: emptySlots }).map((_, i) => (
                    <EmptyTeamSlot key={`empty-${i}`} />
                  ))}
              </div>
            )}

            <div className="rounded-lg border bg-card p-6 space-y-4 mt-6">
              <div>
                <h4 className="font-semibold">Why create a team?</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Teams exist to group the statistics of all team members together, giving you a
                  combined view of your team's performance.
                </p>
                <p className="text-sm text-muted-foreground">
                  Each user can be a member of up to {MAX_TEAMS} teams. You can create a new team or
                  join an existing one using an invite link.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-sm">
                <div className="flex gap-3">
                  <ChartSpline className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Combined statistics</p>
                    <p className="text-muted-foreground">
                      Browse through the same statistics pages you already know — dashboard,
                      matchups, card stats — but with data pooled from every team member.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <BarChart3 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Bigger sample size</p>
                    <p className="text-muted-foreground">
                      More games recorded means more reliable win rates, matchup data, and card
                      performance metrics for the decks your team plays.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Target className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Better tournament prep</p>
                    <p className="text-muted-foreground">
                      Coordinate with your teammates, share game results, and analyze matchups
                      together to find the best strategies for upcoming events.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-lg border bg-card p-6 space-y-4 mt-6">
              <h4 className="font-semibold flex items-center gap-2">
                <Users className="w-5 h-5" />
                How do teams work?
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-sm">
                <div className="flex gap-3">
                  <Lock className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Private by default</p>
                    <p className="text-muted-foreground">
                      Teams are private and cannot be discovered through browsing or search. Your
                      team's decks and members are only visible to team members.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <LinkIcon className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Invite via link</p>
                    <p className="text-muted-foreground">
                      The only way to join a team is through a direct invite link. Share your team's
                      link with players you want to invite.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Approval required</p>
                    <p className="text-muted-foreground">
                      When someone uses your invite link, they submit a join request. A team owner
                      must approve the request before they become a member.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default TeamsPage;

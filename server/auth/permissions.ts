import { createAccessControl } from 'better-auth/plugins/access';
import { defaultStatements, adminAc } from 'better-auth/plugins/admin/access';

const statement = {
  ...defaultStatements,
  tournament: ['create', 'update', 'delete', 'import', 'pq-parse'],
  tournamentGroup: [
    'create',
    'update',
    'delete',
    'assignTournament',
    'removeTournament',
    'updateTournamentPosition',
  ],
  meta: ['create', 'update', 'delete'],
  statistics: ['compute'],
  admin: ['access'],
} as const;

export const ac = createAccessControl(statement);

export const moderator = ac.newRole({
  user: ['ban'],
});

export const organizer = ac.newRole({
  tournament: ['create', 'update', 'delete'],
  user: ['ban'],
});

export const admin = ac.newRole({
  tournament: ['create', 'update', 'delete', 'import', 'pq-parse'],
  tournamentGroup: [
    'create',
    'update',
    'delete',
    'assignTournament',
    'removeTournament',
    'updateTournamentPosition',
  ],
  meta: ['create', 'update', 'delete'],
  statistics: ['compute'],
  admin: ['access'],
  ...adminAc.statements,
});

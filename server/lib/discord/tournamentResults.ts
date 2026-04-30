import { and, eq, inArray } from 'drizzle-orm';
import {
  createTournamentScreenshotterScope,
  defaultTournamentScreenshotTargets,
  screenshotterScopeTypes,
  type TournamentScreenshotTarget,
} from '../../../types/Screenshotter.ts';
import { db } from '../../db';
import { screenshotter } from '../../db/schema/screenshotter.ts';
import { tournament } from '../../db/schema/tournament.ts';
import { getTournamentResultsDiscordConfig, joinDiscordAppUrl } from './config.ts';
import {
  discordNotificationTypes,
  type DiscordCreateMessagePayload,
  type DiscordEmbed,
  type DiscordNotificationIdentity,
  type TournamentResultsDiscordConfig,
  type TournamentResultsDiscordMessageData,
  type TournamentResultsDiscordTournament,
  type TournamentResultsScreenshot,
} from './types.ts';

const DISCORD_CONTENT_LIMIT = 2000;
const DISCORD_EMBED_TITLE_LIMIT = 256;
const MAX_DISCORD_EMBEDS = 10;

const targetLabels = {
  bracket: 'Bracket',
  'meta-leaders-and-base-all': 'Meta - all decks',
  'meta-leaders-and-base-top8': 'Meta - top 8',
  'winning-deck': 'Winning deck',
} satisfies Record<TournamentScreenshotTarget, string>;

const targetOrder = new Map(
  defaultTournamentScreenshotTargets.map((target, index) => [target, index]),
);

export class TournamentResultsDiscordValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TournamentResultsDiscordValidationError';
  }
}

function isTournamentScreenshotTarget(target: string): target is TournamentScreenshotTarget {
  return defaultTournamentScreenshotTargets.includes(target as TournamentScreenshotTarget);
}

function truncateDiscordText(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;
  if (maxLength <= 3) return value.slice(0, maxLength);

  return `${value.slice(0, maxLength - 3)}...`;
}

export function sanitizeDiscordMessageText(value: string) {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/([`*_~|])/g, '\\$1')
    .replace(/</g, '(')
    .replace(/>/g, ')')
    .replace(/@/g, 'at ');
}

export function getTournamentResultsDiscordNotificationIdentity(
  tournamentId: string,
): DiscordNotificationIdentity {
  return {
    notificationType: discordNotificationTypes.tournamentResults,
    scopeType: screenshotterScopeTypes.tournament,
    scopeId: tournamentId,
    scopeKey: createTournamentScreenshotterScope(tournamentId).key,
  };
}

export function buildTournamentResultsUrl(appBaseUrl: string, tournamentId: string) {
  return joinDiscordAppUrl(appBaseUrl, `/tournaments/${tournamentId}`);
}

export async function loadTournamentResultsDiscordTournament(
  tournamentId: string,
): Promise<TournamentResultsDiscordTournament> {
  const [record] = await db
    .select({
      id: tournament.id,
      name: tournament.name,
      attendance: tournament.attendance,
      imported: tournament.imported,
    })
    .from(tournament)
    .where(eq(tournament.id, tournamentId))
    .limit(1);

  if (!record) {
    throw new TournamentResultsDiscordValidationError(`Tournament not found: ${tournamentId}`);
  }

  if (!record.imported) {
    throw new TournamentResultsDiscordValidationError(
      `Tournament is not imported yet: ${tournamentId}`,
    );
  }

  return record;
}

export async function loadTournamentResultsScreenshots(
  tournamentId: string,
): Promise<TournamentResultsScreenshot[]> {
  const scope = createTournamentScreenshotterScope(tournamentId);

  const rows = await db
    .select({
      target: screenshotter.target,
      url: screenshotter.url,
      r2Key: screenshotter.r2Key,
      width: screenshotter.width,
      height: screenshotter.height,
      generatedAt: screenshotter.generatedAt,
    })
    .from(screenshotter)
    .where(
      and(
        eq(screenshotter.scopeKey, scope.key),
        eq(screenshotter.status, 'success'),
        inArray(screenshotter.target, defaultTournamentScreenshotTargets),
      ),
    );

  return rows
    .filter((row): row is TournamentResultsScreenshot => isTournamentScreenshotTarget(row.target))
    .sort((a, b) => (targetOrder.get(a.target) ?? 999) - (targetOrder.get(b.target) ?? 999));
}

function buildEmbedDescription(
  tournament: TournamentResultsDiscordTournament,
  tournamentUrl: string,
) {
  return [`Players: ${tournament.attendance}`, `[Open tournament](${tournamentUrl})`].join('\n');
}

function buildTournamentMarker(tournamentId: string) {
  return `SWU Base tournament:${tournamentId}`;
}

function buildScreenshotEmbed({
  screenshot,
  tournament,
  tournamentUrl,
  index,
}: {
  screenshot: TournamentResultsScreenshot;
  tournament: TournamentResultsDiscordTournament;
  tournamentUrl: string;
  index: number;
}): DiscordEmbed {
  const safeName = sanitizeDiscordMessageText(tournament.name);
  const title =
    index === 0
      ? `${truncateDiscordText(safeName, DISCORD_EMBED_TITLE_LIMIT - ' results are in!'.length)} results are in!`
      : targetLabels[screenshot.target];

  return {
    title,
    url: tournamentUrl,
    description: index === 0 ? buildEmbedDescription(tournament, tournamentUrl) : undefined,
    image: { url: screenshot.url },
    footer: { text: buildTournamentMarker(tournament.id) },
  };
}

export function buildTournamentResultsDiscordPayload({
  tournament,
  tournamentUrl,
  screenshots,
  config,
}: {
  tournament: TournamentResultsDiscordTournament;
  tournamentUrl: string;
  screenshots: TournamentResultsScreenshot[];
  config: TournamentResultsDiscordConfig;
}): DiscordCreateMessagePayload {
  if (!config.roleId) {
    throw new Error('DISCORD_TOURNAMENT_RESULTS_ROLE_ID is required to build Discord payload.');
  }

  const safeTournamentName = sanitizeDiscordMessageText(tournament.name);
  const roleMention = `<@&${config.roleId}>`;
  const content = truncateDiscordText(
    `${roleMention} ${safeTournamentName} results are in!`,
    DISCORD_CONTENT_LIMIT,
  );

  const embeds =
    screenshots.length > 0
      ? screenshots.slice(0, MAX_DISCORD_EMBEDS).map((screenshot, index) =>
          buildScreenshotEmbed({
            screenshot,
            tournament,
            tournamentUrl,
            index,
          }),
        )
      : [
          {
            title: truncateDiscordText(
              `${safeTournamentName} results are in!`,
              DISCORD_EMBED_TITLE_LIMIT,
            ),
            url: tournamentUrl,
            description: buildEmbedDescription(tournament, tournamentUrl),
            footer: { text: buildTournamentMarker(tournament.id) },
          },
        ];

  return {
    content,
    embeds,
    allowed_mentions: {
      roles: [config.roleId],
    },
  };
}

export async function loadTournamentResultsDiscordMessageData({
  tournamentId,
  config = getTournamentResultsDiscordConfig({ requireConfigured: true }),
}: {
  tournamentId: string;
  config?: TournamentResultsDiscordConfig;
}): Promise<TournamentResultsDiscordMessageData> {
  const tournamentRecord = await loadTournamentResultsDiscordTournament(tournamentId);
  const tournamentUrl = buildTournamentResultsUrl(config.appBaseUrl, tournamentId);
  const screenshots = await loadTournamentResultsScreenshots(tournamentId);
  const payload = buildTournamentResultsDiscordPayload({
    tournament: tournamentRecord,
    tournamentUrl,
    screenshots,
    config,
  });

  return {
    tournament: tournamentRecord,
    tournamentUrl,
    screenshots,
    payload,
  };
}

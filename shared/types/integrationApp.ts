import { z } from 'zod';

export const integrationAppScopes = ['profile:read', 'game-results:write'] as const;
export type IntegrationAppScope = (typeof integrationAppScopes)[number];
export const integrationAppScopeDescriptions: Record<IntegrationAppScope, string> = {
  'profile:read': 'Read your account ID and display name.',
  'game-results:write': 'Add and update game results submitted by this app in your statistics.',
};

export const integrationRedirectUriSchema = z
  .string()
  .max(2048)
  .url()
  .refine(value => {
    const url = new URL(value);
    return (
      !url.username &&
      !url.password &&
      !url.hash &&
      (url.protocol === 'https:' ||
        (url.protocol === 'http:' && ['127.0.0.1', '[::1]', 'localhost'].includes(url.hostname)))
    );
  }, 'Use HTTPS, or HTTP on localhost, with no credentials or fragment.');

const scopesSchema = z
  .array(z.enum(integrationAppScopes))
  .min(1)
  .max(integrationAppScopes.length)
  .refine(scopes => new Set(scopes).size === scopes.length, 'Duplicate permissions.');
export const integrationAppSchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    description: z.string().trim().max(500).default(''),
    redirectUris: z
      .array(integrationRedirectUriSchema)
      .min(1)
      .max(10)
      .refine(uris => new Set(uris).size === uris.length, 'Duplicate callback URLs.'),
    scopes: scopesSchema,
  })
  .strict();
export type IntegrationAppInput = z.infer<typeof integrationAppSchema>;
export type IntegrationAppSummary = IntegrationAppInput & {
  clientId: string;
  disabled: boolean;
  createdAt: string;
};
export type IntegrationAppCredentials = { app: IntegrationAppSummary; clientSecret: string };
export type IntegrationAppConnection = {
  clientId: string;
  name: string;
  scopes: IntegrationAppScope[];
  connectedAt: string;
};

export const integrationAuthorizeSchema = z.object({
  response_type: z.literal('code'),
  client_id: z.string().min(1).max(100),
  redirect_uri: integrationRedirectUriSchema,
  scope: z
    .string()
    .min(1)
    .max(200)
    .transform(value => value.split(' '))
    .pipe(scopesSchema),
  state: z.string().min(16).max(512),
});
// Keep the wire representation separate: scope is space-delimited in requests.
export type IntegrationAuthorizeInput = z.input<typeof integrationAuthorizeSchema>;
export type IntegrationAuthorization = {
  app: Pick<IntegrationAppSummary, 'clientId' | 'name' | 'description'>;
  redirectUri: string;
  scopes: IntegrationAppScope[];
};

const credentialsSchema = z.object({
  client_id: z.string().min(1).max(100),
  client_secret: z.string().min(1).max(200),
});
export const integrationTokenSchema = z.discriminatedUnion('grant_type', [
  credentialsSchema.extend({
    grant_type: z.literal('authorization_code'),
    code: z.string().min(1).max(200),
    redirect_uri: integrationRedirectUriSchema,
  }),
  credentialsSchema.extend({
    grant_type: z.literal('refresh_token'),
    refresh_token: z.string().min(1).max(200),
  }),
]);

const cardId = z.string().trim().min(1).max(150).nullable().optional();
export const integrationGameResultSchema = z
  .object({
    gameId: z.string().trim().min(1).max(150),
    matchId: z.string().trim().min(1).max(150).optional(),
    gameNumber: z.number().int().min(1).max(32767).optional(),
    playedAt: z.iso.datetime({ offset: true }),
    format: z.string().trim().max(80).optional(),
    deckId: z.uuid().optional(),
    leaderCardId: cardId,
    baseCardKey: cardId,
    opponentLeaderCardId: cardId,
    opponentBaseCardKey: cardId,
    isWinner: z.boolean().nullable(),
    hasInitiative: z.boolean().optional(),
    hasMulligan: z.boolean().optional(),
  })
  .strict();
export type IntegrationGameResultInput = z.infer<typeof integrationGameResultSchema>;

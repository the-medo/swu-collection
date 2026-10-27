import type {
  ConnectionSubject,
  ResolvedReference,
} from '../../../../shared/creators/contracts.ts';
import type {
  YoutubeClaimChoice,
  YoutubeClaimPreview,
  YoutubeConnectionResult,
} from '../../../../shared/creators/claims.ts';
import { api } from '@/lib/api.ts';
import { createApiError } from '@/api/errors.ts';
import type {
  Creation,
  CreatorDeckList,
  CreatorSectionCounts,
  CreatorOnboarding,
  CreatorOnboardingResult,
  PersonalArticleCounts,
  CreationDocument,
  CreatorProfile,
  CreatorProfileInput,
  CreatorRevision,
  DiscoveryQuery,
  DiscoveryResult,
  CreationList,
  CreatorDirectoryResult,
  EntityReference,
  CreatorYoutubeStatus,
  CreatorChannelFetchResult,
} from '../../../../shared/creators/contracts.ts';
import type { CreationTag } from '../../../../shared/creators/taxonomy.ts';
import type {
  CreationReportDecision,
  CreationReportList,
  CreationReportReceipt,
} from '../../../../shared/creators/reports.ts';

const root = api['creator-hub'];
const headers = { 'X-Requested-With': 'swubase' };
async function data<T>(response: Response): Promise<T> {
  if (!response.ok) throw await createApiError(response, 'Could not load creator content.');
  return (await response.json()).data as T;
}
export const hubApi = {
  claimYoutube: async (creatorId?: string) =>
    data<{ url: string }>(await root.youtube.claim.$post({ json: { creatorId } }, { headers })),
  youtubeClaim: async (claimId: string) =>
    data<YoutubeClaimPreview>(await root.youtube.claims[':claimId'].$get({ param: { claimId } })),
  confirmYoutubeClaim: async (input: { claimId: string; choice: YoutubeClaimChoice }) =>
    data<YoutubeConnectionResult>(
      await root.youtube.claims[':claimId'].$post(
        { param: { claimId: input.claimId }, json: input.choice },
        { headers },
      ),
    ),
  cancelYoutubeClaim: async (claimId: string) =>
    data<boolean>(
      await root.youtube.claims[':claimId'].$delete({ param: { claimId } }, { headers }),
    ),
  reportStatus: async (id: string) =>
    data<{ reported: boolean }>(await root.creations[':id'].report.$get({ param: { id } })),
  reportCreation: async (input: { id: string; details: string; clientReportId: string }) =>
    data<CreationReportReceipt>(
      await root.creations[':id'].report.$post(
        {
          param: { id: input.id },
          json: { details: input.details, clientReportId: input.clientReportId },
        },
        { headers },
      ),
    ),
  reports: async (status: 'open' | 'resolved', page: number) =>
    data<CreationReportList>(await root.reports.$get({ query: { status, page: String(page) } })),
  reviewReport: async (input: { id: string } & CreationReportDecision) =>
    data<boolean>(
      await root.reports[':id'].$post(
        {
          param: { id: input.id },
          json: { action: input.action, publishedRevision: input.publishedRevision },
        },
        { headers },
      ),
    ),
  taxonomy: async () => data<CreationTag[]>(await root.tags.$get()),
  creators: async (q = '', page = 1, language?: string, tags?: string) =>
    data<CreatorDirectoryResult>(
      await root.creators.$get({ query: { q, page: String(page), language, tags } }),
    ),
  profile: async (slug: string) =>
    data<CreatorProfile>(await root.creators[':slug'].$get({ param: { slug } })),
  mine: async () => data<CreatorProfile[]>(await root.mine.$get()),
  createProfile: async (profile: CreatorProfileInput) =>
    data<{ id: string; slug: string }>(await root.creators.$post({ json: profile }, { headers })),
  saveProfile: async (input: { id: string; revision: number; profile: CreatorProfileInput }) =>
    data<{ id: string; slug: string }>(
      await root.creators[':id'].$put(
        { param: { id: input.id }, json: { profile: input.profile, revision: input.revision } },
        { headers },
      ),
    ),
  discover: async (query: Partial<DiscoveryQuery>) =>
    data<DiscoveryResult>(
      await root.creations.$get({
        query: {
          ...query,
          following: query.following ? 'true' : undefined,
          page: String(query.page ?? 1),
          limit: String(query.limit ?? 24),
        },
      }),
    ),
  decks: async (id: string, page = 1, limit = 12) =>
    data<CreatorDeckList>(
      await root.creators[':id'].decks.$get({
        param: { id },
        query: { page: String(page), limit: String(limit) },
      }),
    ),
  sectionCounts: async (id: string) =>
    data<CreatorSectionCounts>(await root.creators[':id'].counts.$get({ param: { id } })),
  collections: async (id: string) =>
    data<{
      series: string[];
      decks: (EntityReference & { label: string; href: string })[];
      hasMore: boolean;
    }>(await root.creators[':id'].collections.$get({ param: { id } })),
  personalCounts: async () => data<PersonalArticleCounts>(await root.personal.counts.$get()),
  onboard: async (input: CreatorOnboarding) =>
    data<CreatorOnboardingResult>(await root.creators.onboard.$post({ json: input }, { headers })),
  transferArticles: async (input: { creatorId: string; requestId: string }) =>
    data<CreatorOnboardingResult>(
      await root.creators[':id']['transfer-articles'].$post(
        { param: { id: input.creatorId }, json: { requestId: input.requestId } },
        { headers },
      ),
    ),
  studio: async (id: string | null, page = 1) =>
    data<CreationList>(
      id
        ? await root.creators[':id'].studio.$get({ param: { id }, query: { page: String(page) } })
        : await root.personal.articles.$get({ query: { page: String(page) } }),
    ),
  get: async (id: string) => data<Creation>(await root.creations[':id'].$get({ param: { id } })),
  draft: async (id: string) =>
    data<Creation>(await root.creations[':id'].draft.$get({ param: { id } })),
  revisions: async (id: string) =>
    data<CreatorRevision[]>(await root.creations[':id'].revisions.$get({ param: { id } })),
  saveCreation: async (input: {
    creatorId: string | null;
    ownershipRevision?: number;
    document: CreationDocument;
    id?: string;
    revision?: number;
  }) =>
    data<{ id: string; revision: number; ownershipRevision: number }>(
      input.id
        ? await root.creations[':id'].$put(
            {
              param: { id: input.id },
              json: {
                creatorId: input.creatorId,
                document: input.document,
                revision: input.revision!,
                ownershipRevision: input.ownershipRevision ?? 1,
              },
            },
            { headers },
          )
        : await root.creations.$post(
            { json: { creatorId: input.creatorId, document: input.document } },
            { headers },
          ),
    ),
  publish: async (input: {
    id: string;
    revision: number;
    unpublish?: boolean;
    ownershipRevision?: number;
  }) =>
    data<boolean>(
      await root.creations[':id'].publish.$post(
        {
          param: { id: input.id },
          json: {
            revision: input.revision,
            unpublish: input.unpublish ?? false,
            ownershipRevision: input.ownershipRevision ?? 1,
          },
        },
        { headers },
      ),
    ),
  subjects: async (
    type: EntityReference['type'],
    q: string,
    scope: 'discovery' | 'authoring' = 'discovery',
    page = 1,
    creatorId?: string,
  ) =>
    data<ConnectionSubject[]>(
      await root.subjects.$get({ query: { type, q, scope, page: String(page), creatorId } }),
    ),
  resolveSubjects: async (references: EntityReference[], creatorId?: string) =>
    data<ResolvedReference[]>(
      await root.subjects.resolve.$post({ json: { references, creatorId } }, { headers }),
    ),
  youtube: async (id: string) =>
    data<CreatorYoutubeStatus>(await root.creators[':id'].youtube.$get({ param: { id } })),
  connect: async (id: string) =>
    data<{ url: string }>(await root.creators[':id'].youtube.$post({ param: { id } }, { headers })),
  setYoutubeAutoImport: async (input: {
    id: string;
    channelId: string;
    autoImportEnabled: boolean;
  }) =>
    data<boolean>(
      await root.creators[':id'].youtube.settings.$put(
        {
          param: { id: input.id },
          json: { channelId: input.channelId, autoImportEnabled: input.autoImportEnabled },
        },
        { headers },
      ),
    ),
  fetchYoutubeVideos: async (input: { id: string; channelId: string }) =>
    data<CreatorChannelFetchResult>(
      await root.creators[':id'].youtube.fetch.$post(
        {
          param: { id: input.id },
          json: { channelId: input.channelId },
        },
        { headers },
      ),
    ),
  disconnect: async (input: { id: string; channelId: string }) =>
    data<boolean>(
      await root.creators[':id'].youtube.$delete(
        { param: { id: input.id }, json: { channelId: input.channelId } },
        { headers },
      ),
    ),
  importVideo: async (input: { id: string; channelId: string; url: string }) =>
    data<{ id: string }>(
      await root.creators[':id'].youtube.import.$post(
        { param: { id: input.id }, json: { channelId: input.channelId, url: input.url } },
        { headers },
      ),
    ),
  members: async (id: string) =>
    data<{ userId: string; name: string | null }[]>(
      await root.creators[':id'].members.$get({ param: { id } }),
    ),
  setMember: async (input: { id: string; userId: string; remove: boolean }) =>
    data<boolean>(
      await root.creators[':id'].members.$put(
        { param: { id: input.id }, json: { userId: input.userId, remove: input.remove } },
        { headers },
      ),
    ),
};

import { METADATA_RETENTION_MS } from './youtube-lifecycle-policy.ts';
import { user } from '../../db/schema/auth-schema.ts';
import { sql } from 'drizzle-orm';
import { creation, creatorProfile } from '../../db/schema/creator_hub.ts';
import type { CreationSummary } from '../../../shared/creators/contracts.ts';

/** Do not serve stale provider metadata even if a scheduled maintenance run was missed. */
export const publicCreation = () => sql`${creation.published} IS NOT NULL AND (
  ${creation.sourceVideoId} IS NULL OR (coalesce(${creation.sourceStatus}, 'active') = 'active'
  AND coalesce(${creation.sourceMetadataAt}, ${creation.createdAt}) > now() - (${METADATA_RETENTION_MS}::double precision * interval '1 millisecond')))`;

/** List queries never load article bodies, descriptions, chapters or private draft documents. */
export function creationListSelection(edit = false) {
  const document = edit ? creation.draft : creation.published;
  return {
    id: creation.id,
    creatorId: creation.creatorId,
    authorId: creation.authorId,
    ownershipRevision: creation.ownershipRevision,
    author: sql<
      CreationSummary['author']
    >`CASE WHEN ${user.id} IS NULL OR (${creation.creatorId} IS NOT NULL AND ${creation.ownershipRevision} = 1) THEN NULL ELSE jsonb_build_object('id', ${user.id}, 'name', ${user.displayName}, 'avatarUrl', ${user.image}) END`,
    revision: sql<number>`${edit ? creation.revision : creation.publishedRevision}`,
    document: sql<CreationSummary['document']>`jsonb_build_object(
      'title', ${document}->'title', 'summary', ${document}->'summary',
      'medium', ${document}->'medium', 'coverUrl', ${document}->'coverUrl',
      'language', ${document}->'language', 'tags', ${document}->'tags',
      'freshness', ${document}->'freshness', 'pinned', ${document}->'pinned',
      'series', ${document}->'series', 'seriesOrder', ${document}->'seriesOrder')`,
    sourceVerified: sql<boolean>`${creation.sourceVideoId} IS NOT NULL`,
    ...(edit ? { sourceStatus: creation.sourceStatus } : {}),
    publishedAt: creation.publishedAt,
    updatedAt: edit
      ? creation.updatedAt
      : sql<string>`coalesce(${creation.publicUpdatedAt}, ${creation.publishedAt})`,
    hasUnpublishedChanges: edit
      ? sql<boolean>`${creation.revision} IS DISTINCT FROM ${creation.publishedRevision}`
      : sql<boolean>`false`,
    creator: sql<
      CreationSummary['creator']
    >`CASE WHEN ${creatorProfile.id} IS NULL THEN NULL ELSE jsonb_build_object('slug', ${creatorProfile.slug}, 'name', ${creatorProfile.profile}->'name', 'avatarUrl', ${creatorProfile.profile}->'avatarUrl') END`,
  };
}

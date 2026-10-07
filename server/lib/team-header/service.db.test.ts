import { expect, test } from 'bun:test';
import sharp from 'sharp';
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '../../db';
import { user } from '../../db/schema/auth-schema.ts';
import { userFile } from '../../db/schema/user_file.ts';
import { imageGallery } from '../../db/schema/image_gallery.ts';
import { team } from '../../db/schema/team.ts';
import { teamMember } from '../../db/schema/team_member.ts';
import { teamHeader } from '../../db/schema/team_header.ts';
import {
  createTeamHeaderService,
  getTeamHeader,
  getTeamHeaderSettings,
  persistTeamHeader,
} from './service.ts';
import { resolveHeaderSource } from '../user-header/service.ts';
import { createUserFileService } from '../user-files/service.ts';
import { createImageGalleryService } from '../image-gallery/service.ts';
import { deleteTeam, patchTeamMember } from '../teams/membership.ts';
import { UserFileError } from '../user-files/errors.ts';

test.skipIf(process.env.TEAM_HEADER_DB_TEST !== '1')(
  'team header ownership, source privacy, races, deletion and failed writes',
  async () => {
    const url = new URL(process.env.DATABASE_URL!);
    if (url.hostname !== '127.0.0.1' || !url.pathname.startsWith('/swubase_'))
      throw new Error('Select isolated worktree DB');
    const users = [0, 1, 2].map(() => 'team-header-test-' + crypto.randomUUID());
    const teamIds = [crypto.randomUUID(), crypto.randomUUID()];
    const fileId = crypto.randomUUID(),
      galleryImageId = crypto.randomUUID();
    const objects = new Map<string, Uint8Array>();
    let available = true,
      failPut = false,
      revokeDuringFetch = false;
    const storage = {
      available: () => available,
      publicUrl: (key: string) => 'https://images.swubase.com/' + key,
      async put(key: string, bytes: Uint8Array) {
        objects.set(key, bytes);
        if (failPut) throw new UserFileError('Object write failed.', 502);
      },
      async remove(key: string) {
        objects.delete(key);
      },
    };
    const bytes = await sharp({
      create: { width: 2000, height: 800, channels: 3, background: '#abc' },
    })
      .webp()
      .toBuffer();
    const save = createTeamHeaderService({
      storage,
      resolveSource: resolveHeaderSource,
      persist: persistTeamHeader,
      async fetchSource() {
        if (revokeDuringFetch) {
          revokeDuringFetch = false;
          await patchTeamMember(teamIds[0], users[0], users[1], { role: 'member' });
        }
        return bytes;
      },
    });
    const crop = { left: 100, top: 100, width: 1600, height: 400 };
    const galleryInput = { source: 'gallery' as const, galleryImageId, crop };
    try {
      await db.insert(user).values(
        users.map(id => ({
          id,
          name: 'Team header fixture',
          displayName: id,
          email: id + '@invalid.local',
          emailVerified: false,
          currency: 'USD',
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
      );
      await db
        .insert(team)
        .values(teamIds.map(id => ({ id, name: 'Header fixture', privacy: 'public' as const })));
      await db.insert(teamMember).values([
        { teamId: teamIds[0], userId: users[0], role: 'owner' },
        { teamId: teamIds[0], userId: users[1], role: 'owner' },
        { teamId: teamIds[0], userId: users[2], role: 'member' },
        { teamId: teamIds[1], userId: users[0], role: 'owner' },
      ]);
      await db.insert(userFile).values({
        id: fileId,
        userId: users[0],
        fileName: 'Private owner art',
        imageKey: 'team-header-fixture/art.webp',
        thumbnailKey: 'team-header-fixture/thumb.webp',
        width: 2000,
        height: 800,
        originalByteSize: bytes.length,
        byteSize: bytes.length,
        thumbnailByteSize: 100,
      });
      await db.insert(imageGallery).values({
        id: galleryImageId,
        title: 'Team header art',
        imageKey: 'team-header-fixture/gallery.webp',
        thumbnailKey: 'team-header-fixture/gallery-thumb.webp',
        width: 2000,
        height: 800,
      });
      expect(await getTeamHeader(teamIds[0])).toEqual({
        source: null,
        image: null,
        width: null,
        height: null,
      });
      await expect(
        save(teamIds[0], users[1], { source: 'upload', fileId, crop }),
      ).rejects.toMatchObject({ status: 404 });
      await expect(save(teamIds[0], users[2], galleryInput)).rejects.toMatchObject({ status: 403 });
      expect(objects.size).toBe(0);
      const large = await save(teamIds[0], users[0], {
        source: 'upload',
        fileId,
        crop: { left: 0, top: 0, width: 2000, height: 500 },
      });
      expect(await getTeamHeader(teamIds[0])).toMatchObject({
        width: 2000,
        height: 500,
        image: large.image,
      });
      const small = await save(teamIds[0], users[0], {
        source: 'upload',
        fileId,
        crop: { left: 0, top: 0, width: 800, height: 200 },
      });
      expect(await getTeamHeader(teamIds[0])).toMatchObject({
        width: 800,
        height: 200,
        image: small.image,
      });
      const uploaded = await save(teamIds[0], users[0], { source: 'upload', fileId, crop });
      expect(uploaded.image).toContain(`teams/headers/${teamIds[0]}/`);
      expect(await getTeamHeader(teamIds[0])).toEqual(uploaded);
      expect(Object.keys(uploaded).sort()).toEqual(['height', 'image', 'source', 'width']);
      expect(await getTeamHeaderSettings(teamIds[0], users[0])).toMatchObject({
        selection: { source: { source: 'upload', fileId } },
        crop,
      });
      const otherOwnerSettings = await getTeamHeaderSettings(teamIds[0], users[1]);
      expect(otherOwnerSettings.selection).toBeNull();
      expect(JSON.stringify(otherOwnerSettings)).not.toContain(fileId);
      expect(JSON.stringify(otherOwnerSettings)).not.toContain('Private owner art');
      const legacyCrop = { ...crop, width: 3, height: 1 };
      await db
        .update(teamHeader)
        .set({ width: legacyCrop.width, height: legacyCrop.height })
        .where(eq(teamHeader.teamId, teamIds[0]));
      const legacyHeader = { ...uploaded, width: legacyCrop.width, height: legacyCrop.height };
      expect(await getTeamHeader(teamIds[0])).toEqual(legacyHeader);
      await expect(
        save(teamIds[0], users[0], { source: 'upload', fileId, crop: legacyCrop }),
      ).rejects.toMatchObject({ status: 400 });
      expect(await getTeamHeader(teamIds[0])).toEqual(legacyHeader);
      await db
        .update(teamHeader)
        .set({ width: crop.width, height: crop.height })
        .where(eq(teamHeader.teamId, teamIds[0]));
      await createUserFileService(storage).remove(users[0], fileId);
      expect((await getTeamHeaderSettings(teamIds[0], users[0])).selection).toBeNull();
      expect(await getTeamHeader(teamIds[0])).toEqual(uploaded);
      expect(objects.size).toBe(1);
      failPut = true;
      await expect(save(teamIds[0], users[0], galleryInput)).rejects.toMatchObject({ status: 502 });
      expect(await getTeamHeader(teamIds[0])).toEqual(uploaded);
      expect(objects.size).toBe(1);
      failPut = false;
      await Promise.all(users.slice(0, 2).map(userId => save(teamIds[0], userId, galleryInput)));
      expect(objects.size).toBe(1);
      const previous = await getTeamHeader(teamIds[0]);
      revokeDuringFetch = true;
      await expect(save(teamIds[0], users[0], galleryInput)).rejects.toMatchObject({ status: 403 });
      expect(await getTeamHeader(teamIds[0])).toEqual(previous);
      expect(objects.size).toBe(1);
      await patchTeamMember(teamIds[0], users[0], users[1], { role: 'owner' });
      await expect(save(crypto.randomUUID(), users[0], galleryInput)).rejects.toMatchObject({
        status: 404,
      });
      expect(objects.size).toBe(1);
      await createImageGalleryService(storage).remove(galleryImageId);
      expect((await getTeamHeaderSettings(teamIds[0], users[0])).selection).toBeNull();
      expect(await getTeamHeader(teamIds[0])).toEqual(previous);
      expect((await deleteTeam(teamIds[0], users[0], storage)).status).toBe(400);
      expect(objects.size).toBe(1);
      await save(teamIds[0], users[0], { source: 'none' });
      expect(objects.size).toBe(0);
      expect(
        await db.select().from(teamHeader).where(eq(teamHeader.teamId, teamIds[0])),
      ).toHaveLength(0);
      available = false;
      expect(await save(teamIds[0], users[0], { source: 'none' })).toMatchObject({
        source: null,
        image: null,
      });
      available = true;
      await db.insert(imageGallery).values({
        id: galleryImageId,
        title: 'Team header art',
        imageKey: 'team-header-fixture/gallery.webp',
        thumbnailKey: 'team-header-fixture/gallery-thumb.webp',
        width: 2000,
        height: 800,
      });
      await save(teamIds[1], users[0], galleryInput);
      expect(objects.size).toBe(1);
      const racingSave = createTeamHeaderService({
        storage,
        resolveSource: resolveHeaderSource,
        persist: persistTeamHeader,
        async fetchSource() {
          expect((await deleteTeam(teamIds[1], users[0], storage)).status).toBe(200);
          return bytes;
        },
      });
      await expect(racingSave(teamIds[1], users[0], galleryInput)).rejects.toMatchObject({
        status: 404,
      });
      expect(objects.size).toBe(0);
      expect(
        await db.select().from(teamHeader).where(eq(teamHeader.teamId, teamIds[1])),
      ).toHaveLength(0);
      await expect(getTeamHeader(teamIds[1])).rejects.toMatchObject({ status: 404 });
      expect(
        (
          await db
            .select()
            .from(teamMember)
            .where(and(eq(teamMember.teamId, teamIds[0]), eq(teamMember.userId, users[2])))
        )[0].role,
      ).toBe('member');
    } finally {
      await db.delete(team).where(inArray(team.id, teamIds));
      await db.delete(imageGallery).where(eq(imageGallery.id, galleryImageId));
      await db.delete(user).where(inArray(user.id, users));
    }
  },
);

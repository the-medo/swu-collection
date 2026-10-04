# Posts

Posts use BlockNote and reuse SWUBASE card, deck, matchup, and tournament UI.
The first published use is the public bio on `/users/$userId`, reached through
**My profile** in the user menu. Owners can add/edit, save, cancel, or clear
their bio. Conflicting saves preserve the draft and offer an explicit choice
between loading the saved version and replacing it with the draft. Clearing is published only after saving.

`PostEditor` and `PostContent` require a `type="simple" | "rich"` prop:

- `simple` provides built-in formatting, headings, lists, links, tables, and media.
  It does not register SWUBASE nodes, insertion buttons, slash commands, or `@` mentions.
- `rich` adds all SWUBASE widgets and user mentions.

Profile bios use `simple`. Their save endpoint enforces the same content policy;
the client cannot grant itself rich permissions. Older bios containing widgets
display/edit those references as ordinary text and links. Conversion is persisted
only when the owner saves; opening or cancelling does not change the stored post.

## Storage and access

- [`post`](../server/db/schema/post.ts) stores an ID, author, post type,
  versioned JSON content, revision, and creation/update timestamps.
- `profile-description` has a partial unique index on its author. Other types,
  initially `tournament-report`, may have multiple posts per author.
- [`/api/posts/profile/:userId`](../server/routes/posts.ts) exposes public GET
  and owner-only PUT. Creation uses `revision: null`; updates require the last
  read revision and return 409 on a conflict. A cleared bio retains its row and
  revision, so stale clients cannot recreate an older version over it.
- Tournament reports have storage support only. Their editing/publishing UI,
  metadata, and access policy must be defined before exposing additional routes.
- Deleting an author cascades to posts. Contributor dumps remove all posts,
  including those of opted-in users, because they contain arbitrary personal prose.

## Content and rendering

[`shared/posts/content.ts`](../shared/posts/content.ts) defines v1 as
`{ version: 1, blocks: [...] }`. Server and client share validation of supported
blocks, inline formatting, links, and widget payloads. Content is bounded to
256 KB, 500 blocks, eight block nesting levels, and three meta analysis widgets; executable links and media
URLs are rejected. Remote media uses HTTP(S) URLs; file uploads are not configured.

[`BlocknoteEditor.tsx`](../frontend/src/components/app/rich-text-editor/blocknote/BlocknoteEditor.tsx)
exports the reusable editor and read-only content view. The profile owns saving
and draft state. [`schema.tsx`](../frontend/src/components/app/rich-text-editor/blocknote/schema.tsx)
adapts SWUBASE block/inline widgets, with shared payload schemas in
[`widgets.ts`](../shared/posts/widgets.ts).

Deck widgets store only the deck ID and render the existing `DeckDetail` with
its access checks and controls. Current data loads when content opens; there
is no deck polling or WebSocket subscription. Mentions link to profiles and send
no notifications. Visitors can explore chart filters without changing the
author's saved configuration.

When adding a widget, update the shared payload schema, picker/command, renderer,
and round-trip coverage. Persisted format changes require an explicit version
and migration/compatibility strategy.

## Validation

Run `bun test shared/posts/content.test.ts server/routes/posts.test.ts` for the
stored-format boundary and API authorization/validation checks.
With an isolated worktree running, `bun run play:browser:editors` exercises
simple profile persistence, command/paste restrictions, authorization, conflicts,
clearing, formatting, visitor rendering, mobile layout, and the post sanitization
rule. A browser-only fixture mounts the rich editor with the app's providers to
exercise all widgets and published rendering. Its synthetic database fixtures
are removed on completion.

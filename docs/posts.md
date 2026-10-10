# Posts

Posts use BlockNote and reuse SWUBASE card, deck, matchup, and tournament UI.
The first published use is the public bio on `/users/$userId`, reached through
**My profile** in the user menu. Owners can add/edit, save, cancel, or clear
their bio. Conflicting saves preserve the draft and offer an explicit choice
between loading the saved version and replacing it with the draft. Clearing is published only after saving.

`PostEditor` and `PostContent` require a `type="simple" | "rich" | "comments"` prop:

- `simple` provides built-in formatting, headings, lists, links, tables, and media.
  It does not register SWUBASE nodes, custom slash commands, or `@` mentions.
- `rich` adds all SWUBASE widgets and user mentions.
- `comments` permits user mentions, card links and ordinary formatting, including headings
  H4–H6. H1–H3 are disabled in commands, toolbar and shortcuts; pasted headings
  are normalized. Other SWUBASE widgets become ordinary links/text on paste.
  Server validation enforces this policy and limits comments to 16 KB.

Editors have no persistent insertion header. Rich widgets and comment card
links are available through the `/` menu; user mentions also open with `@`.
Built-in formatting remains available through selection and slash menus.

Profile bios use `simple`. Their save endpoint enforces the same content policy;
the client cannot grant itself rich permissions. Older bios containing widgets
display/edit those references as ordinary text and links. Conversion is persisted
only when the owner saves; opening or cancelling does not change the stored post.

All editor modes strip empty trailing text blocks from their saved content,
including trailing child blocks, and published views apply the same cleanup to
older documents. Interior blank paragraphs, mentions, and structural content
such as media, tables, dividers, and checkboxes remain. A cleared document keeps
one empty paragraph. The live editor retains its typing area; published views
disable BlockNote's extra trailing-block placeholder.
Forms normalize their initial state, recovered content, and save payloads, so
older trailing blanks do not mark an unchanged document dirty or reappear on save.

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
is no deck polling or WebSocket subscription. Mentions open the same profile popup
as comment authors, including an avatar, header, achievements and a profile link.
Public avatar data is fetched only when a mention's popup opens. Mentions send
no notifications. Visitors can explore chart filters without changing the
author's saved configuration.

When adding a widget, update the shared payload schema, picker/command, renderer,
and round-trip coverage. Persisted format changes require an explicit version
and migration/compatibility strategy.

## Deck guides and discussions

Deck owners publish rich guides through `/api/deck/:id/article`. Creation uses
`revision: null`; updates use the last saved revision. The deck's `deckTab` search
parameter selects Decklist, Charts, Collections or the `article` subpage. That
subpage is labelled Guide (X) when a guide exists or the viewer owns the deck,
and Comments (X) otherwise.
The tab displays a comment icon and the count, with the full name retained in
its accessible label and tooltip.
The Guide button beneath leader/base opens it. It matches the Deckbuilder button
in width and styling, and is also shown to the owner before a guide is written.
`deckArticleEdit` controls the guide editor, and `deckComment` opens and focuses
a linked comment thread.

`deck_article` stores the guide. `deck_discussion` attaches a deck to an
independent `discussion`; `discussion_comment` contains the discussion ID, author,
optional parent, nesting depth, content and revision. The reusable service and UI
live under `server/lib/discussions` and `frontend/src/components/app/discussions`.
The deck policy supplies access checks, moderation and notification recipients.
The generic HTTP routes are under `/api/discussions/:id`; deck comment routes
delegate to the same service. New resource types can supply another binding and
policy without putting resource IDs into comments or rewriting the comment UI.

Readers need current deck access, including folder shares. Signed-in readers can
comment or reply up to five nesting levels. Authors edit their own comments;
authors and deck owners can delete them. After access is revoked, the separate
own-comments endpoint lets an author see and remove only their own prose.
Saving a comment resolves mentioned users on the server and uses their actual
display names; unknown users are rejected. Names open a reusable profile popup.
Card links use names from the merged official and active-preview catalog;
unknown cards and nonempty unknown printing IDs are rejected on create and edit.
Preview migration does not rewrite saved comment links. After a preview is
archived or migrated to a different card ID, the author must replace that link
with an available card before saving further edits to the comment.
Single replies open automatically. Threads with two or more replies have a
toggle to the left of Reply in the same action row. Reply and edit composers
appear beneath their comment. Each draft has its own editor and mutation state;
several replies or edits can remain open at once. Opening another composer closes
empty, idle new-comment/reply forms, while preserving typed drafts and ongoing saves.
Saving or cancelling one draft closes only its editor. Each editor moves to a
fallback location if its comment disappears or access refresh hides it, preserving
the draft and editor instance. Drafts live in page memory, with one navigation
warning for unsaved comment drafts; they are not automatically persisted across reloads.
Automatically opened threads stay open as more replies arrive. Hiding replies
is disabled when that thread contains an open composer. Comments responses include complete single-reply
lists, including deleted ancestors, and the frontend fills the corresponding
reply caches before displaying the page. Larger threads load when opened.
The deck discussion response initializes the generic discussion cache; both
views then observe the same metadata query. Guide, metadata, comments and thread
queries have no periodic refresh or metadata-driven invalidation. Successful
writes and failed writes that require access/draft recovery refresh the affected
caches; manual reloads fetch current discussion data. Guide saves refresh metadata
without reloading comment pages or expanded threads. The own-comments view also
stays cached on window focus and refreshes after comment deletion or explicit retry.
Once the deck/discussion binding is known, its viewer-scoped ID is retained separately
from private metadata. Deck updates, access resets and page remounts then reuse
the shared metadata query instead of rediscovering the binding. Access resets
clear private content while keeping only the immutable ID. Included replies remain visible after
descendant cache expiry, while access resets clear the cached comment data.

Deletion clears prose and author identity while retaining a placeholder when
there are surviving replies. Account deletion uses the same representation.
Deck deletion removes its discussion and all comments. Sanitized contributor
dumps remove all articles and comments, including opted-in users' prose.
Replies and owner comments create [in-app notifications](notifications.md).
The editor retains failed/conflicting drafts. Recovering a deleted reply keeps
its parent when possible and posts at the top level if that parent is gone.

## Validation

Run `bun test shared/posts/content.test.ts server/routes/posts.test.ts` for the
stored-format boundary and API authorization/validation checks.
With an isolated worktree running, `bun run play:browser:editors` exercises
simple profile persistence, command/paste restrictions, authorization, conflicts,
clearing, formatting, visitor rendering, mobile layout, and the post sanitization
rule. A browser-only fixture mounts the rich editor with the app's providers to
exercise all widgets and published rendering. Its synthetic database fixtures
are removed on completion.

Deck articles, threaded discussions, notifications and access/draft recovery use:

```bash
DECK_DISCUSSION_DB_TEST=1 bun --env-file=.env.worktree test \
  server/routes/decks/discussion.db.test.ts server/routes/discussions.db.test.ts
DECK_DISCUSSION_BROWSER_TEST=1 bun --env-file=.env --env-file=.env.worktree \
  frontend/tests/deck-discussion.browser.ts
DECK_DISCUSSION_BROWSER_TEST=1 bun --env-file=.env --env-file=.env.worktree \
  frontend/tests/deck-discussion-requests.browser.ts
```

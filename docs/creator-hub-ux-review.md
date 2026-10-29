# Content and creators UX review

Originally reviewed 28 October 2026 against `a0d3177c` on `codex/creator-ux-audit`.

## Implementation status after rebase

Implementation started on `origin/main` at `5ec33601`; the final PR was rebased
onto `976d69dd` and raises the frontend version from `9.8.0` to `9.9.0`. The
observations below describe the original audit, not the current
implementation.

That baseline already addresses profile cancellation, channel claiming, personal
article onboarding, optional branding fields, URL-based profile sections and
filters, content dates, and the oversized studio header. Profile sections now
use navigation links rather than simulated tabs.

This implementation adds:

- Directory search, language, specialties and pagination in the URL, with
  validated return links from profiles and publications to their originating list.
- A refreshable editor URL after the first successful draft save, while retaining
  the mounted editor and text entered during an in-flight save.
- Distinct published/unpublished-change feedback and public view/copy-link actions.
- Server-side studio title search and publication-status filters before pagination,
  including personal articles, with edited dates and linked titles.

Validation: frontend production build, focused ESLint, five database/URL tests
(91 assertions), and the creator UX, creator-browsing, and article-edit-link browser
suites pass. The browser checks include typing during a delayed first save,
refreshing the resulting draft URL, publication versus private draft content,
copying the canonical public link, filtered return journeys, and mobile overflow.
The directory check also exercises insertion in the middle of a query before
submission, and copy-link feedback is checked for expiry. The older browsing
fixture expectations were updated for main's channel-claim
link. Full TypeScript checking reports existing errors outside the changed files;
it is not a passing check for this batch. Independent Claude Code review identified
the per-keystroke search update and persistent copy-feedback issues; both were
corrected, browser-tested, and confirmed resolved in a focused follow-up review.

## Reader improvements

The second implementation batch restores the main panel's position on browser
back/forward and explicit return links. Fresh visits open at the top; creator-tab
changes keep the current position, and pagination starts at the results. Loaded
creator feed/deck pages remain cached for 30 minutes while an article is open.
Restoration waits for data and lazy content, and stops when the reader scrolls,
uses the scrollbar or keyboard, or chooses “Show results.”

Position history is limited to 50 entries and 30 minutes in the current tab's
memory. It is not persisted across reloads or tabs. The existing public-data
freshness and private-query isolation rules remain in force.

Mobile discovery now has a shorter header, search and Watch/Read/Listen choices
above the results, compact cards, and a filter drawer with a persistent “Show
results” action. Active constraints stay visible as individually removable chips,
including filters supplied by incoming links. Historical and pinned labels remain
visible on compact cards. The drawer supports Escape and deliberate focus return.

Validation: the production build, focused ESLint and scroll-hook TypeScript check,
reader browser regression suite, and existing creator-browsing suite pass. The
studio UX regression also passed during this batch. Reader checks cover retained
loaded pages after six minutes of reading, browser Back and explicit return links,
fresh profile visits, section switches, discovery/directory pagination, delayed
responses with wheel/keyboard cancellation, delayed “Show results,” URL filters,
drawer focus, light/dark themes, 320px overflow, and empty/error states.

Independent Claude Code review and a focused follow-up completed. The review's
navigation, filter-focus and mobile-status findings were addressed. Browser checks
also caught native scroll anchoring moving filtered results; replacement cards no
longer serve as scroll anchors. Validation uses Chromium; native find-in-page and
other browsers' overlay-scrollbar behavior are not covered. Repository-wide
TypeScript checking still has the unrelated baseline errors noted above.

Remaining work: clearer import progress and publication policy, plus mobile
profile-section overflow affordances. Live YouTube authorization/import processing
still needs provider-backed validation.

## Original assessment

The creator area supports useful, substantial tasks, but it is not yet comfortable
as a self-service journey. The biggest problems are losing one's place while
browsing, getting started as a creator, and understanding what happened after
publishing. The existing visual language and publishing safeguards provide a good
foundation. Prioritize continuity and clearer next steps before adding features.

This is an expert walkthrough with browser evidence, not a study with real users.
The impact and priorities below are judgments; no abandonment or conversion rates
were measured. The original audit did not change application code; implementation
started after the rebase described above.

## Scope and evidence

Examined anonymous readers, a new creator, an established owner, and an unowned
curated profile. Used an isolated worktree database restored from the public
sanitized dump, then added fictional profiles and 29 published articles/videos,
including English/French content, a series, and a pinned item. Tested desktop
1440×1000 and mobile 390×844, plus the existing browser suites' responsive and
light/dark checks.

Journeys covered: content discovery → publication → return; directory → creator →
publication → return; sign-in entry; profile creation/cancellation; draft save,
preview and publication; studio library; curated-profile ownership; channel
controls; and related deck content. Actual third-party media and channel APIs
were mocked in the regression suites. Live YouTube authorization, imports and
worker completion were not tested.

The main navigation deliberately hides this area during monitoring. This is
documented behavior, not an accidental missing link. The rollout assessment below
assumes the feature will eventually be broadly discoverable.

## Prioritized findings

P1 means fix before broad creator onboarding. P2 means substantial usability work
for the next iteration. Scope estimates are relative, not time commitments.

| Priority | Finding | Main audience | Scope | Evidence confidence |
| --- | --- | --- | --- | --- |
| P1 | Browsing loses context | Readers | Small–medium | High: reproduced |
| P1 | First-profile cancellation does not cancel | New creators | Small | High: reproduced |
| P1 | Existing curated creators have no visible access-request route | Imported creators | Small for a guided request; larger for ownership verification | High: reproduced |
| P1 | Publishing provides weak completion feedback | Authors | Small–medium | High: reproduced |
| P2 | First-time onboarding exposes too much at once | New creators | Medium | High observation; medium impact estimate |
| P2 | Mobile discovery prioritizes framing over content | Readers | Medium | High: measured |
| P2 | Studio libraries lack retrieval tools | Returning creators | Medium | High: reproduced with multiple pages |
| P2 | Import status and publication modes need clearer presentation | Video creators | Medium | High source evidence; impact needs creator testing |
| P2 | Content cards hide useful freshness information | Readers | Small | High: source and browser |
| P2 | Profile tabs lack expected keyboard behavior | Keyboard users | Small | High: reproduced |

### 1. Preserve browsing context

**Observed:** Searching the creator directory, opening a creator, and choosing
“Meet the creators” returns to an empty search. On a creator profile, selecting
Articles, opening a publication, and using browser Back returns to All content.
The profile tab does not appear in its URL. From filtered discovery, “Discover
content” returns to `/content?page=1`, dropping the query, language and tags.
Discovery itself already uses URL filters; its detail-page return link loses them.

**Change:** Put directory query/page/filters and profile tab/language/series/page
in validated URL search state. Preserve the originating list for a clearly
labelled “Back to results” action, with a sensible discovery destination for direct
links. Preserve scroll when returning; start at the results when changing pages.

**Acceptance:** Filter → open → back restores the same selection, page and place.
Refresh and copied URLs reproduce the selected directory/profile view.

Sources: [directory and profile state](../frontend/src/components/app/creators/CreatorPages.tsx),
[publication return link](../frontend/src/components/app/creators/CreationPage.tsx),
[discovery route](../frontend/src/routes/content/index.tsx).

### 2. Make first-profile cancellation work

**Observed:** A new account enters “Discard me,” selects Cancel and confirms
“Discard profile changes?” The same form remains with “Discard me” still entered.
The studio automatically renders the form whenever the account has no profiles;
the cancel callback only clears an already-empty local mode.

**Change:** Cancel should clear the draft and return to a creator welcome screen
or the directory. Keep a genuine exit from onboarding.

**Acceptance:** A confirmed cancellation exits the form, discards the entered
values, and leaves navigation protection correct when creation is started again.

Sources: [studio conditional and cancel callback](../frontend/src/components/app/creators/CreatorStudio.tsx),
[profile cancel handler](../frontend/src/components/app/creators/ProfileEditor.tsx).

### 3. Help an already-listed creator request access

**Observed:** An unowned curated profile has no claim/access-request action.
Trying to create a profile with that address produces “This creator already has a
directory profile. Contact SWUBASE on Discord to request access.” The instruction
appears only after the creator fills and submits the form.

**Change:** Offer “Is this your channel? Request access” on curated profiles and
an “Already listed?” route during onboarding. Initially this can open the existing
support destination with clear instructions and the profile URL. Ownership
verification remains a separate decision; do not automatically grant access based
on a matching name or address. Check address availability early.

**Acceptance:** A listed creator can find the request path without creating a
duplicate profile or discovering it through a validation error.

Sources: [public profile](../frontend/src/components/app/creators/CreatorPages.tsx),
[duplicate-address handling](../server/lib/creators/profiles.ts),
[ownership limitations](creator-hub.md).

### 4. Close the authoring loop

**Observed:** After a successful first publication, the editor still says “New
creation” and “Draft saved · Published version is separate.” The button changes to
“Publish update,” but there is no direct link to the live publication. After a
new draft saves, its ID is not added to the URL; refreshing returns to the list.
The saved content remains intact. An owner viewing their public profile also has
no contextual route back to managing it.

**Change:** Show distinct, explicit states: “Draft saved,” “Published,” and
“Unpublished changes.” After publication, show “View publication” and “Copy link.”
Replace the URL with the saved draft's ID after its first save without resetting
the editor. Add “Manage profile” for authorized owners on their public profile
and an appropriate edit action for authorized publication editors.

**Acceptance:** A creator can publish, see the live result in one click, return
to editing, and refresh a newly saved draft without losing their place. Saving
later changes must continue to preserve the current public version.

Sources: [publication controls](../frontend/src/components/app/creators/CreationPublicationControls.tsx),
[draft lifecycle](../frontend/src/components/app/creators/useCreationDraft.ts),
[studio](../frontend/src/components/app/creators/CreatorStudio.tsx).

### 5. Reduce the first-session workload

**Observed:** Joining opens the full profile editor: name, permanent address,
tagline, images, language, introduction, biography, links and five classification
groups. Save is at the bottom. At mobile size its initial vertical position was
approximately 2,367px. Most fields are optional, but the page does not make a
minimal first step clear. The anonymous entry shows the generic “You must be
logged in to view this page” message.

**Change:** Introduce the benefit before sign-in, then collect name, suggested
address and language. Offer branding, biography and specialties as subsequent
profile improvements. After creation, present concrete actions: “Write an
article,” “Add a video or podcast,” and “Connect YouTube.” Keep advanced
classification available progressively. Move field errors beside their fields;
the current video validation exposes `sourceUrl: Add the original content URL.`

**Acceptance:** A newcomer creates a minimal profile without scrolling through
branding/classification, knows what will be public, and can immediately choose
the task that brought them here.

Sources: [profile form](../frontend/src/components/app/creators/ProfileEditor.tsx),
[authenticated entry](../frontend/src/routes/_authenticated.tsx),
[creation editor](../frontend/src/components/app/creators/CreationEditor.tsx).

### 6. Put useful content earlier on mobile

**Observed:** On a 390×844 viewport, the first discovery card starts around y=586
and its title around y=841. The hero, two navigation actions, a separate filter
panel, search panel and large thumbnail/placeholder consume the first screen.
Opening filters moves the first card to roughly y=2,073. Closing filters leaves
only “Show filters,” with no active-filter count or visible chips. Creator
profiles also place the banner, introduction and horizontally scrolling tabs
before the content; Decks, Series and About begin outside the visible tab strip.
The tested discovery/profile pages did not overflow horizontally.

**Change:** Use a shorter mobile heading, put search and Watch/Read/Listen choices
near it, combine filters into a compact control with a count, and show removable
active-filter chips. Use a drawer or compact expandable region with “Show
results.” Consider a denser card layout and a smaller fallback for missing covers.
Give the profile tab strip a clear overflow affordance and scroll the selected tab
into view. Test the same approach for the unusually tall mobile studio header.

**Acceptance:** A reader sees at least one meaningful title in the first mobile
viewport, can identify active filters while the filter panel is closed, and can
reach all profile sections without guessing that more tabs exist.

Sources: [discovery page](../frontend/src/components/app/creators/DiscoveryPage.tsx),
[cards](../frontend/src/components/app/creators/CreationCards.tsx),
[profile layout](../frontend/src/components/app/creators/CreatorPages.tsx).

### 7. Make a growing library manageable

**Observed:** With more than 24 creations, the studio becomes multiple pages of
title/status rows with Edit/View actions. It has no content search, status filter,
medium filter or visible edited date. Finding a particular old draft requires
scanning pages. The existing Published/Draft/Unpublished changes badges are useful.

**Change:** Add title search and All / Drafts / Published filters, plus a way to
find unpublished changes. Show medium and last-edited date. Make the title an edit
link and offer a compact list mode. Add a “Needs review” view if import workflow
data can support it accurately.

**Acceptance:** An owner can locate an older draft by its name or status without
manually paging through every creation.

Source: [studio library](../frontend/src/components/app/creators/CreatorStudio.tsx).

### 8. Separate channel setup, import progress and publication policy

**Observed in code and provider-free UI tests:** Channel management and manual
import live inside “Connections & editors.” Manual import says “Import as draft”;
automatic imports can publish, and auto-import defaults to on. The connection
panel explains the distinction in prose. Fetching says that videos are queued,
but there is no creator-facing per-video processing/review/failure list. Google
disconnection and pausing public imports are correctly separate, though that
distinction requires explanation.

**Change:** Put channel work in a clearly named Channels area, expose “Import
video” from the main create action, and prominently state whether new imports
become drafts or public publications. Show processing outcomes and actionable
failures. A review-before-publication preference is a larger product decision;
test it with creators before changing existing automation policy.

**Acceptance:** Before connecting, a creator can explain what will appear
publicly. After fetching, they can find the queued videos and their outcomes.
Disconnect and Pause continue to communicate their different effects.

Sources: [connection panel](../frontend/src/components/app/creators/YoutubeConnection.tsx),
[channel controls](../frontend/src/components/app/creators/YoutubeChannelControls.tsx),
[worker publication](../server/lib/creators/worker/publication.ts),
[documented import modes](creator-hub.md).

### 9. Show freshness before opening a publication

**Observed:** Discovery cards show medium, creator, language, title, summary and
tags, but omit the publication date. The detail page has the date. Discovery is
ordered by publication time in the backend, but does not state the sort order.
The current/historical flag alone does not tell a reader how old a meta report is.

**Change:** Show publication date on cards, preserve the Historical badge, and
label the existing order “Newest.” Add duration or reading-time estimates only
when reliable data supports them. Defer extra sorting modes until they serve a
demonstrated browsing need.

**Acceptance:** A reader can assess the age of a guide or meta report from the
results list without opening each item.

Sources: [card presentation](../frontend/src/components/app/creators/CreationCards.tsx),
[discovery ordering](../server/lib/creators/discovery.ts).

### 10. Complete keyboard behavior for profile tabs

**Observed:** After focusing Articles, ArrowRight leaves focus and selection on
Articles. The buttons declare tab roles, but implement no tab keyboard handling
and render no corresponding tabpanel. This is a specific interaction gap, not a
claim that the whole feature has passed or failed an accessibility audit.

**Change:** Use the repository's existing Tabs primitive with correctly linked
panels, focus management, and arrow-key behavior. Keep selection synchronized
with the proposed URL state.

**Acceptance:** Keyboard users can move between tabs, identify the active panel,
and reach off-screen tabs on narrow layouts. Confirm behavior with a screen reader.

Sources: [profile tabs](../frontend/src/components/app/creators/CreatorPages.tsx),
[existing Tabs primitive](../frontend/src/components/ui/tabs.tsx).

## Navigation for broader rollout

The [sidebar](../frontend/src/components/app/navigation/LeftSidebar/LeftSidebar.tsx)
intentionally hides Content, Creators and Creator studio. Related content on
cards/decks/tournaments provides contextual entry when matching publications
exist, but it is not a reliable way to discover the whole area.

At rollout, give readers a stable Content entry and persistent Content / Creators
navigation within the area. Put Creator studio in the account navigation and
add contextual manage/edit actions. The directory currently promotes “Join as a
creator” without a direct Content navigation action. Membership and ownership
should change available management actions, while public reading remains open.

Recommended journeys:

| Person | Intended path |
| --- | --- |
| Reader | Content → search or choose a medium → publication → back to preserved results, or creator profile → more relevant work |
| New creator | Creator introduction → sign in → create a minimal profile or request access → choose article/video/import → draft → preview → publish → view/share |
| Returning creator | Creator studio → searchable library / channels → edit or review → publish update → public result |

## What is already working

- Public reading does not require sign-in. Creator identity is linked from cards
  and publications, and profiles can introduce a useful starting point.
- Drafts and public versions are separated. Autosave, private preview, revision
  history, export and conflict recovery protect author effort.
- Templates and SWU-specific card/deck/tournament relationships make authoring
  useful within this application. Related deck content worked in the browser test.
- Language facets, consistent card styling and responsive filter collapse already
  exist. Improve their hierarchy instead of replacing the entire UI.
- Channel permission explanations, reconnect states, fetch cooldown feedback and
  timestamp fallbacks have deliberate handling.

## Suggested implementation order

1. Fix cancellation and return-state bugs; retain newly saved draft URLs; add
   explicit publish completion and view actions. These are focused changes with
   directly testable outcomes.
2. Improve minimal onboarding and the curated-profile access-request path. Make
   the three creation entry points explicit and reduce the mobile header/filter
   overhead.
3. Add studio retrieval and import outcome visibility; complete tab keyboard
   behavior and card dates. Introduce permanent navigation when monitoring ends.

Use `swubase-frontend-routing`, `swubase-frontend-components`, and
`swubase-frontend-api` for the applicable changes. Add
`swubase-auth-permissions` for ownership/authorization affordances and
`swubase-backend-endpoints` for new server contracts. Publication/import changes
also need their affected domain skills from the selection matrix. Every source
change requires `swubase-validation` and `swubase-change-review` before handoff.

## Verification and limits

- Existing creator-hub browser suite passed: profile setup, authoring, autosave,
  draft privacy, conflict recovery, publication, discovery, series, related decks
  and responsive behavior. Its first attempt stopped at a disabled YouTube
  connection button because the isolated environment lacked an encryption key;
  it passed after local test configuration was completed.
- Additional walkthrough scripts reproduced the context loss, cancellation,
  duplicate-profile error, publication feedback, draft refresh, mobile positions,
  absent library filters and tab-keyboard behavior described above.
- Existing channel-controls browser suite passed: owner controls, independent
  channels, keyboard toggles, fetch feedback/errors, persisted cooldowns,
  responsive themes and manual-edit protection.
- Existing video browser suite passed: playback interaction, readiness, cleanup,
  timestamp fallback and responsive layout, using mocked provider responses.
- Google sign-in initiation returned the configured client and exact worktree
  callback; navigation reached Google's accounts host without an observed
  `invalid_client` or `redirect_uri_mismatch`. A completed user login was not
  exercised.
- Browser checks use fictional audit data. The recorded viewport measurements apply to
  these fixtures; content, banners and device sizes can change exact positions.
- This review does not establish production performance, creator demand,
  third-party provider reliability, or comprehensive accessibility conformance.
  A short follow-up usability study should ask readers to find a relevant guide
  and return to results, new creators to publish a first item, and listed creators
  to request access. Observe wrong turns and task completion before assigning
  conversion targets.

Local walkthrough scripts, JSON observations, screenshots and test logs are retained
under `.swubase/ux-audit/` in the audit worktree as ignored local evidence.

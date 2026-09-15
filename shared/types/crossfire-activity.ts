import type { Bookmark } from '../../play/view/bookmarks.ts';
import type { ProblemReport } from '../../play/view/chat.ts';
import type { PracticeRequest } from '../../play/view/practice.ts';

/** Public leaders from the decks admitted to the game, viewer's seat first.
 * Null when access is no longer available; no deck links or contents are exposed. */
export type CrossfireGameArtwork = { leaders: (string | null)[] | null };
export type CrossfireBookmark = Bookmark & CrossfireGameArtwork;
export type CrossfireProblemReport = ProblemReport & CrossfireGameArtwork;
export type CrossfirePracticeRequest = PracticeRequest & CrossfireGameArtwork;

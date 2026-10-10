import { deckDiscussionPolicy } from '../decks/discussionPolicy.ts';

// Compose resource policies here as further domains attach discussions.
// The comment service and components have no resource-specific knowledge.
export const discussionPolicy = deckDiscussionPolicy;

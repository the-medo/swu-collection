# Crossfire board redesign

The user requests a complete playground redesign guided by their annotated board
screenshot, with cards serving as the primary action controls. This replaces the
current list of action buttons. The layout is an original implementation using
SWUBASE card art and the existing authoritative viewer contract.

## Delivery steps

1. Build and test a browser-only interaction controller. Clicking a card selects
   its available action or opens a menu when several actions exist. Attacks and
   attachments highlight legal target cards; the second click submits the exact
   supplied option. Target prompts, unique-copy choices and multi-card payments
   use card clicks. Explicit confirmation remains for multi-card selections and
   allocations. Cancel/Escape clears an unsubmitted interaction.
2. Rebuild the match surface: opponent above, player below, space left, ground
   right, central bases/leaders, outer hand rails, deck/discard piles, resource
   and token counters, initiative, current-action band and a persistent log rail.
   Use responsive full-screen layout, prominent art and stat/damage badges,
   attached-card groups, hover inspection, keyboard controls and reduced motion.
   Complex/private choices retain complete accessible controls. Reconnect,
   spectators, revealed-hand consent and exact-copy references remain supported.
3. Add live chat alongside the log if included in the requested scope. Keep chat
   separate from game rules, authenticate senders, persist messages, restrict
   spectator sending, bound/rate-limit traffic and test room isolation/reconnect.
4. Validate card-click attacks, play/target flows, abilities, private/multiple
   selection, reconnect, spectators and phone/desktop layout in real browsers.
   Update the browser harness to use the actual card interactions. Review and
   commit each completed source step. Keep only the newest executable when the
   public projection changes require rebuilding it.

The frontend must derive interactions solely from opaque options, references and
selection constraints in the current permitted view. It must not calculate game
legality from artwork, card names or catalog rules. Clear pending selections on
decision/epoch changes; send no speculative board state. Public action status
must identify whose choice is pending without exposing private cards or options.
Do not invent gameplay clocks without a server-backed timing feature.

Matching skills: `swubase-frontend-components`, `swubase-frontend-routing`,
`swubase-online-play`, `swubase-validation`, `swubase-change-review`, and
`swubase-documentation`. For chat, also load `swubase-websockets`,
`swubase-backend-endpoints` and `swubase-database-migrations` with their required
source documents. Use `swubase-worktree-dev` for managed service operations.

Review base: `8eac7d90`. The working tree was clean at the start.

## Implemented board pass

The interaction controller and full-window table are implemented. Card art,
context menus, legal-target clicks, resource selections, bounded allocations,
private choice trays, exact-copy log inspection, responsive log sheet and
keyboard cancellation use the existing viewer contract. The engine and its
executable version do not change for this UI pass. The right rail contains the
existing game log; live chat remains a separate feature, with no placeholder
chat controls. The browser acceptance driver now uses real card interactions.

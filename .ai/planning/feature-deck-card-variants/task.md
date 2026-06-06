# Feature: Deck Card Variants

Some users would like to customize the cosmetic card variant shown while browsing a deck. A selected variant changes only the displayed card image; it must not change deck legality, quantities, exports, pricing, or gameplay-related behavior.

Requested direction:

1. Add `deck_card_variant` to store deck-specific card variant overrides:
   - `deck_id` (PK)
   - `card_id` (PK)
   - `variant_id`

2. Add `deck_card_variant_user_default` to store a user's preferred card variant:
   - `user_id` (PK)
   - `card_id` (PK)
   - `variant_id`
   - `show_everywhere` boolean

3. When a user adds a card to a deck, check `deck_card_variant_user_default` for that user/card and automatically insert a matching `deck_card_variant` row for the deck when a default exists.

4. If a user is viewing their own deck, add a `Change card variant` option to the card arrow dropdown in deck layout. It opens a dialog, probably `CardVariantChangeDialog`, showing all variants for that card.

5. The dialog should offer actions per variant:
   - `Save variant for this deck`: insert/update `deck_card_variant`, rewriting any existing row for this deck/card with the newly selected `variant_id`
   - `Save variant as default`: insert/update `deck_card_variant_user_default` with `show_everywhere = false`, rewriting any existing default for this user/card, without changing the current deck override
   - `Show everywhere`: insert/update `deck_card_variant_user_default` with `show_everywhere = true`, rewriting any existing default for this user/card

6. Above all variants, provide `Clear overrides`, removing rows for the selected `card_id` from `deck_card_variant`.

7. When the deck cards are loaded from the existing deck-card endpoint, return optional variant maps only when the deck owner is not the default `swubase` user. The returned maps should combine deck-specific overrides and user defaults, with `deck_card_variant` taking precedence. Shape can be:
   - `data`: deck cards
   - `deckOverrides`: deck-specific map
   - `showEverywhereDefaults`: owner defaults that apply live
   - `cardVariants`: merged `card_id -> variant_id` display map

8. The frontend should display selected variants for deck cards, leaders, and bases, and pass a `card_id -> variant_id` map into deck layout so the correct images render.

9. When variants/defaults are changed, the frontend should patch the relevant React Query cache maps where possible instead of refetching the whole deck-card list. Fall back to refetching only when the cache is missing or cannot be updated safely.

Important constraint: variants are cosmetic only. They must only affect which image is displayed.

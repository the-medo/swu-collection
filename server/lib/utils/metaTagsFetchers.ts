import { db } from '../../db';
import { tournament } from '../../db/schema/tournament';
import { deck } from '../../db/schema/deck';
import { meta } from '../../db/schema/meta';
import { collection } from '../../db/schema/collection';
import { eq, desc, and } from 'drizzle-orm';
import { cardList } from '../../db/lists.ts';
import { tournamentTypesInfo } from '../../../types/Tournament.ts';
import { selectDefaultVariant } from '../cards/selectDefaultVariant.ts';
import { CollectionType } from '../../../types/enums.ts';
import { user } from '../../db/schema/auth-schema.ts';

export async function getTournamentMetaTags(tournamentId: string) {
  try {
    // Special case for /tournaments/featured, /tournaments/planetary-qualifiers, and /tournaments/all routes
    if (tournamentId === 'featured') {
      return {
        robots: 'index, follow',
        keywords:
          'swubase, swu, star wars, tcg, tournaments, competetive, featured tournaments, top tournaments, competitive play',
        description:
          'Browse featured Star Wars: Unlimited tournaments. View metagame analysis and top performing decks.',
        'og:title': 'Featured Tournaments | SWUBase',
        'og:description':
          'Browse featured Star Wars: Unlimited tournaments. View tournament groups, metagame analysis, and top performing decks.',
        'og:image': 'https://images.swubase.com/thumbnails/base-thumbnail.webp',
        'og:url': 'https://swubase.com/tournaments/featured',
        'og:type': 'website',
      };
    } else if (tournamentId === 'planetary-qualifiers') {
      return {
        robots: 'index, follow',
        keywords:
          'swubase, swu, star wars, tcg, tournaments, competetive, planetary qualifiers, official tournaments, competitive play',
        description:
          'Star Wars: Unlimited Planetary Qualifiers. View official tournament information, results, and qualifying decks.',
        'og:title': 'Planetary Qualifiers | SWUBase',
        'og:description':
          'Star Wars: Unlimited Planetary Qualifiers. View official tournament information, results, and qualifying decks.',
        'og:image': 'https://images.swubase.com/thumbnails/base-thumbnail.webp',
        'og:url': 'https://swubase.com/tournaments/planetary-qualifiers',
        'og:type': 'website',
      };
    } else if (tournamentId === 'all') {
      return {
        robots: 'index, follow',
        keywords:
          'swubase, swu, star wars, tcg, all tournaments, tournament database, tournament search',
        description:
          'Browse all Star Wars: Unlimited tournaments. Search, filter, and find tournaments by format, date, location, and more.',
        'og:title': 'All Tournaments | SWUBase',
        'og:description':
          'Browse all Star Wars: Unlimited tournaments. Search, filter, and find tournaments by format, date, location, and more.',
        'og:image': 'https://images.swubase.com/thumbnails/base-thumbnail.webp',
        'og:url': 'https://swubase.com/tournaments/all',
        'og:type': 'website',
      };
    }

    // Regular tournament handling for valid UUIDs
    const tournamentData = (
      await db.select().from(tournament).where(eq(tournament.id, tournamentId))
    )[0];

    if (!tournamentData) {
      return null;
    }

    const tType = tournamentTypesInfo[tournamentData.type as keyof typeof tournamentTypesInfo].name;
    const title = `${tournamentData.name} | SWUBase`;

    return {
      description: `Star Wars: Unlimited ${tType} in ${tournamentData.location} with ${tournamentData.attendance} players. View metagame, matchup statistics, decklists and most played cards.`,
      robots: 'index, follow',
      keywords: `swubase, swu, star wars, tcg, tournament, ${tType}, meta, deck, decklist, match, matchup, statistics`,
      'og:title': title,
      'og:description': `SWU ${tType} - in ${tournamentData.location} with ${tournamentData.attendance} players. View metagame, matchup statistics, decklists and most played cards.`,
      'og:image': `https://images.swubase.com/tournament/${tournamentId}.webp`,
      'og:url': `https://swubase.com/tournaments/${tournamentId}`,
      'og:type': 'website',
    };
  } catch (error) {
    console.error('Error fetching tournament meta tags:', error);
    return null;
  }
}

export async function getDeckMetaTags(deckId: string) {
  try {
    // Special case for /decks/public and /decks/your routes
    if (deckId === 'public') {
      return {
        robots: 'index, follow',
        keywords: 'swubase, swu, star wars, tcg, public decks, community decks',
        description:
          'Browse public Star Wars: Unlimited decks shared by the community. Find inspiration for your next deck build.',
        'og:title': 'Public Decks | SWUBase',
        'og:description':
          'Browse public Star Wars: Unlimited decks shared by the community. Find inspiration for your next deck build.',
        'og:image': 'https://images.swubase.com/thumbnails/base-thumbnail.webp',
        'og:url': 'https://swubase.com/decks/public',
        'og:type': 'website',
      };
    } else if (deckId === 'your') {
      return {
        robots: 'noindex, nofollow', // Private content shouldn't be indexed
        keywords: 'swubase, swu, star wars, tcg, my decks, personal decks',
        description:
          'Manage your personal Star Wars: Unlimited decks. Create, edit, and organize your deck collection.',
        'og:title': 'Your Decks | SWUBase',
        'og:description':
          'Manage your personal Star Wars: Unlimited decks. Create, edit, and organize your deck collection.',
        'og:image': 'https://images.swubase.com/thumbnails/base-thumbnail.webp',
        'og:url': 'https://swubase.com/decks/your',
        'og:type': 'website',
      };
    }

    // Regular deck handling for valid UUIDs
    const deckData = (await db.select().from(deck).where(eq(deck.id, deckId)))[0];

    if (!deckData || !deckData.leaderCardId1 || !deckData.baseCardId || !deckData.public) {
      return null;
    }

    const leaderCard = cardList[deckData.leaderCardId1];
    const baseCard = cardList[deckData.baseCardId];
    const description = `${leaderCard?.name} [${baseCard?.name}] - ${deckData.description || 'View deck details, cards, and statistics'}`;

    return {
      robots: 'index, follow',
      keywords: `swubase, swu, star wars, tcg, meta, deck, decklist`,
      description: description,
      'og:title': `${deckData.name} | SWUBase`,
      'og:description': description,
      'og:image': `https://images.swubase.com/decks/${deckData.leaderCardId1}_${deckData.baseCardId}.webp`,
      'og:url': `https://swubase.com/decks/${deckId}`,
      'og:type': 'website',
    };
  } catch (error) {
    console.error('Error fetching deck meta tags:', error);
    return null;
  }
}

export async function getMetaMetaTags(metaId?: string, page: string = 'meta') {
  try {
    let metaData;

    if (metaId) {
      // Fetch meta data for the given metaId
      metaData = (
        await db
          .select()
          .from(meta)
          .where(eq(meta.id, parseInt(metaId)))
      )[0];
    } else {
      // Fetch the latest meta with format premier (format id = 1)
      metaData = (
        await db.select().from(meta).where(eq(meta.format, 1)).orderBy(desc(meta.date)).limit(1)
      )[0];
    }

    if (!metaData) {
      return null;
    }

    // Validate page parameter
    const validPages = ['tournaments', 'meta', 'matchups', 'decks', 'card-stats'];
    const validatedPage = validPages.includes(page) ? page : 'meta';

    // For tournaments page, use meta_meta.webp image
    const imagePage = validatedPage === 'tournaments' ? 'meta' : validatedPage;

    const title = `Meta Analysis - ${metaData.name} | SWUBase`;
    const description = `Star Wars: Unlimited ${metaData.name} meta analysis. View metagame, matchup statistics, decklists and most played cards.`;

    return {
      robots: 'index, follow',
      keywords: `swubase, swu, star wars, tcg, meta, deck, decklist, ${metaData.set}, ${metaData.name}, statistics`,
      description: description,
      'og:title': title,
      'og:description': description,
      'og:image': `https://images.swubase.com/thumbnails/sets/${metaData.set}/meta_${imagePage}.webp`,
      'og:url': `https://swubase.com/meta?metaId=${metaData.id}&page=${validatedPage}`,
      'og:type': 'website',
    };
  } catch (error) {
    console.error('Error fetching meta meta tags:', error);
    return null;
  }
}

export async function getCardDetailMetaTags(cardId: string) {
  try {
    const card = cardList[cardId];

    if (!card) {
      return null;
    }

    // Get the default variant of the card
    const defaultVariantId = selectDefaultVariant(card);
    if (!defaultVariantId || !card.variants[defaultVariantId]) {
      return null;
    }

    const defaultVariant = card.variants[defaultVariantId];

    // Create a description with card details
    const cardDetails = [];
    if (card.type) cardDetails.push(`Type: ${card.type}`);
    if (card.cost !== null) cardDetails.push(`Cost: ${card.cost}`);
    if (card.aspects.length > 0) cardDetails.push(`Aspects: ${card.aspects.join(', ')}`);
    if (card.hp !== null) cardDetails.push(`HP: ${card.hp}`);
    if (card.power !== null) cardDetails.push(`Power: ${card.power}`);
    if (card.traits.length > 0) cardDetails.push(`Traits: ${card.traits.join(', ')}`);
    if (card.keywords.length > 0) cardDetails.push(`Keywords: ${card.keywords.join(', ')}`);

    const description = `${card.name}${card.subtitle ? ` - ${card.subtitle}` : ''} | ${cardDetails.join(' | ')}`;
    const title = `${card.name} | SWUBase`;

    // Use the default variant's image as the meta image
    const imageUrl = `https://images.swubase.com/cards/${defaultVariant?.image.front}`;

    return {
      robots: 'index, follow',
      keywords: `swubase, swu, star wars, tcg, card, ${card.name}, ${card.type}, ${card.aspects.join(', ')}`,
      description: description,
      'og:title': title,
      'og:description': description,
      'og:image': imageUrl,
      'og:url': `https://swubase.com/cards/detail/${cardId}`,
      'og:type': 'website',
    };
  } catch (error) {
    console.error('Error fetching card detail meta tags:', error);
    return null;
  }
}

export async function getCollectionMetaTags(collectionId: string) {
  try {
    // Special case for /collections/public and /collections/your routes
    if (collectionId === 'public') {
      return {
        robots: 'index, follow',
        keywords: 'swubase, swu, star wars, tcg, public collections, community collections',
        description: 'Browse public Star Wars: Unlimited card collections shared by the community.',
        'og:title': 'Public Collections | SWUBase',
        'og:description':
          'Browse public Star Wars: Unlimited card collections shared by the community.',
        'og:image': 'https://images.swubase.com/thumbnails/collection.webp',
        'og:url': 'https://swubase.com/collections/public',
        'og:type': 'website',
      };
    } else if (collectionId === 'your') {
      return {
        robots: 'noindex, nofollow', // Private content shouldn't be indexed
        keywords: 'swubase, swu, star wars, tcg, my collections, personal collections',
        description:
          'Manage your personal Star Wars: Unlimited card collections. Track your cards and wantlists.',
        'og:title': 'Your Collections | SWUBase',
        'og:description':
          'Manage your personal Star Wars: Unlimited card collections. Track your cards and wantlists.',
        'og:image': 'https://images.swubase.com/thumbnails/collection.webp',
        'og:url': 'https://swubase.com/collections/your',
        'og:type': 'website',
      };
    }

    // Regular collection handling for valid UUIDs
    // Get collection data and user data
    const collectionData = (
      await db
        .select({
          collection: collection,
          user: user,
        })
        .from(collection)
        .innerJoin(user, eq(collection.userId, user.id))
        .where(and(eq(collection.id, collectionId), eq(collection.public, true)))
    )[0];

    if (!collectionData) {
      return null;
    }

    // Determine collection type
    let collectionTypeText = 'Collection';
    let imageUrl = 'https://images.swubase.com/thumbnails/collection.webp';

    switch (collectionData.collection.collectionType) {
      case CollectionType.WANTLIST:
        collectionTypeText = 'Wantlist';
        imageUrl = 'https://images.swubase.com/thumbnails/wantlist.webp';
        break;
      case CollectionType.OTHER:
        collectionTypeText = 'Card List';
        imageUrl = 'https://images.swubase.com/thumbnails/card-list.webp';
        break;
    }

    const title = `${collectionData.collection.title} | ${collectionTypeText} | SWUBase`;
    const description =
      collectionData.collection.description ||
      `Star Wars: Unlimited ${collectionTypeText.toLowerCase()} by ${collectionData.user.name}`;

    return {
      robots: 'index, follow',
      keywords: `swubase, swu, star wars, tcg, ${collectionTypeText.toLowerCase()}, cards`,
      description: description,
      'og:title': title,
      'og:description': description,
      'og:image': imageUrl,
      'og:url': `https://swubase.com/collections/${collectionId}`,
      'og:type': 'website',
    };
  } catch (error) {
    console.error('Error fetching collection meta tags:', error);
    return null;
  }
}

export function getComparerMetaTags() {
  try {
    const title = 'Card Comparer | SWUBase';
    const description =
      'Compare Star Wars: Unlimited cards side by side. Analyze differences in cost, power, abilities, and more.';
    const imageUrl = 'https://images.swubase.com/thumbnails/comparer.webp';

    return {
      robots: 'index, follow',
      keywords: 'swubase, swu, star wars, tcg, card comparer, compare cards, card analysis',
      description: description,
      'og:title': title,
      'og:description': description,
      'og:image': imageUrl,
      'og:url': 'https://swubase.com/comparer',
      'og:type': 'website',
    };
  } catch (error) {
    console.error('Error creating comparer meta tags:', error);
    return null;
  }
}

export function getSearchMetaTags() {
  try {
    const title = 'Card Search | SWUBase';
    const description =
      'Search for Star Wars: Unlimited cards by name, type, aspect, cost, and more. Find the perfect cards for your deck.';
    const imageUrl = 'https://images.swubase.com/thumbnails/search.webp';

    return {
      robots: 'index, follow',
      keywords: 'swubase, swu, star wars, tcg, card search, find cards, card database',
      description: description,
      'og:title': title,
      'og:description': description,
      'og:image': imageUrl,
      'og:url': 'https://swubase.com/cards/search',
      'og:type': 'website',
    };
  } catch (error) {
    console.error('Error creating search meta tags:', error);
    return null;
  }
}

export async function getUserProfileMetaTags(userId: string) {
  try {
    // Get user data
    const userData = (await db.select().from(user).where(eq(user.id, userId)))[0];

    if (!userData) {
      return null;
    }

    const title = `${userData.name} | User Profile | SWUBase`;
    const description = `View ${userData.name}'s Star Wars: Unlimited profile, collections, wantlists, and decks on SWUBase.`;
    const imageUrl = 'https://images.swubase.com/thumbnails/user-profile.webp';

    return {
      robots: 'index, follow',
      keywords: `swubase, swu, star wars, tcg, user profile, ${userData.name}`,
      description: description,
      'og:title': title,
      'og:description': description,
      'og:image': imageUrl,
      'og:url': `https://swubase.com/users/${userId}`,
      'og:type': 'website',
    };
  } catch (error) {
    console.error('Error fetching user profile meta tags:', error);
    return null;
  }
}

export function getToolsMetaTags() {
  try {
    const title = 'SWU Tools | SWUBase';
    const description =
      'Access a collection of helpful tools for Star Wars: Unlimited TCG players. Convert deck formats, analyze card data, and optimize your gameplay.';
    const imageUrl = 'https://images.swubase.com/thumbnails/base-thumbnail.webp';

    return {
      robots: 'index, follow',
      keywords:
        'swubase, swu, star wars, tcg, tools, deck converter, card analysis, gameplay optimization',
      description: description,
      'og:title': title,
      'og:description': description,
      'og:image': imageUrl,
      'og:url': 'https://swubase.com/tools',
      'og:type': 'website',
    };
  } catch (error) {
    console.error('Error creating tools meta tags:', error);
    return null;
  }
}

export function getDeckFormatConverterMetaTags() {
  try {
    const title = 'Deck Format Converter | SWUBase';
    const description =
      'Convert Star Wars: Unlimited decklists between different formats. Transform decklists from melee.gg or text format into JSON for easy import and sharing.';
    const imageUrl = 'https://images.swubase.com/thumbnails/base-thumbnail.webp';

    return {
      robots: 'index, follow',
      keywords:
        'swubase, swu, star wars, tcg, deck converter, melee.gg, json, deck format, deck import',
      description: description,
      'og:title': title,
      'og:description': description,
      'og:image': imageUrl,
      'og:url': 'https://swubase.com/tools/deck-format-converter',
      'og:type': 'website',
    };
  } catch (error) {
    console.error('Error creating deck format converter meta tags:', error);
    return null;
  }
}

export function getAboutMetaTags() {
  try {
    const title = 'About SWUBase | Star Wars: Unlimited Community Platform';
    const description =
      'Learn about SWUBase, the premier platform for Star Wars: Unlimited TCG players. Discover our mission, features, and how we support the SWU community.';
    const imageUrl = 'https://images.swubase.com/thumbnails/base-thumbnail.webp';

    return {
      robots: 'index, follow',
      keywords: 'swubase, swu, star wars, tcg, about, mission, features, community',
      description: description,
      'og:title': title,
      'og:description': description,
      'og:image': imageUrl,
      'og:url': 'https://swubase.com/about',
      'og:type': 'website',
    };
  } catch (error) {
    console.error('Error creating about meta tags:', error);
    return null;
  }
}

export function getPrivacyMetaTags() {
  try {
    const title = 'Privacy Policy | SWUBase';
    const description =
      'SWUBase privacy policy. Learn how we collect, use, and protect your data while using our Star Wars: Unlimited TCG platform.';
    const imageUrl = 'https://images.swubase.com/thumbnails/base-thumbnail.webp';

    return {
      robots: 'index, follow',
      keywords: 'swubase, privacy policy, data protection, user data, cookies',
      description: description,
      'og:title': title,
      'og:description': description,
      'og:image': imageUrl,
      'og:url': 'https://swubase.com/privacy',
      'og:type': 'website',
    };
  } catch (error) {
    console.error('Error creating privacy meta tags:', error);
    return null;
  }
}

export function getTermsMetaTags() {
  try {
    const title = 'Terms of Service | SWUBase';
    const description =
      'SWUBase terms of service. Understand the rules and guidelines for using our Star Wars: Unlimited TCG platform.';
    const imageUrl = 'https://images.swubase.com/thumbnails/base-thumbnail.webp';

    return {
      robots: 'index, follow',
      keywords: 'swubase, terms of service, user agreement, rules, guidelines',
      description: description,
      'og:title': title,
      'og:description': description,
      'og:image': imageUrl,
      'og:url': 'https://swubase.com/terms',
      'og:type': 'website',
    };
  } catch (error) {
    console.error('Error creating terms meta tags:', error);
    return null;
  }
}

export function getDefaultMetaTags() {
  try {
    const title = 'SWUBase | Star Wars: Unlimited Meta Analysis & Deckbuilding';
    const description =
      'SWUBase is the premier platform for Star Wars: Unlimited TCG meta analysis and deckbuilding. Access powerful tools for deck creation, tournament data analysis, and collection management.';
    const imageUrl = 'https://images.swubase.com/thumbnails/base-thumbnail.webp';

    return {
      robots: 'index, follow',
      keywords:
        'swubase, swu, star wars, tcg, meta analysis, deckbuilding, tournament data, card database, deck builder, collection tracker',
      description: description,
      'og:title': title,
      'og:description': description,
      'og:image': imageUrl,
      'og:url': 'https://swubase.com',
      'og:type': 'website',
    };
  } catch (error) {
    console.error('Error creating default meta tags:', error);
    return null;
  }
}

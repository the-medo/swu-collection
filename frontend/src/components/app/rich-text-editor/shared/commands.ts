import {
  AtSign,
  ChartNoAxesCombined,
  GalleryHorizontalEnd,
  Image,
  Images,
  Layers3,
  Lightbulb,
  Link,
  Swords,
  type LucideIcon,
} from 'lucide-react';
import type { EditorType } from '../../../../../../shared/posts/content.ts';
import type { InsertKind } from './model.ts';

type EditorCommand = {
  label: string;
  description: string;
  commentDescription?: string;
  dialogDescription: string;
  insertTitle?: string;
  editTitle?: string;
  icon: LucideIcon;
  modes: readonly EditorType[];
  aliases: string[];
};

export const editorCommands: Record<InsertKind, EditorCommand> = {
  'card-image': {
    label: 'Card image',
    description: 'Insert card artwork as a resizable image.',
    dialogDescription:
      'Bring a card into your article. Resize and align its artwork after inserting it.',
    icon: Image,
    modes: ['rich'],
    aliases: [],
  },
  'card-link': {
    label: 'Card link',
    description: 'Insert a card reference inside your text.',
    dialogDescription: 'Reference a card in your text so readers can explore its details.',
    icon: Link,
    modes: ['rich', 'comments'],
    aliases: ['card'],
    commentDescription: 'Search for a card to reference in your comment.',
  },
  decklist: {
    label: 'Decklist',
    description: 'Choose a SWUBASE deck to embed.',
    dialogDescription: 'Choose a deck to share its cards, leader, and base with your readers.',
    icon: Layers3,
    modes: ['rich'],
    aliases: [],
  },
  album: {
    label: 'Add album',
    description: 'Share an album with a four-photo preview.',
    dialogDescription: 'Bring your story to life with photos. Choose one of your albums to share.',
    icon: Images,
    modes: ['rich'],
    aliases: [],
    insertTitle: 'Add album',
    editTitle: 'Edit album',
  },
  'meta-analysis': {
    label: 'Meta analysis',
    description: 'A live tournament or tournament-group chart.',
    dialogDescription: 'Explore tournament results and choose the chart your readers will see.',
    icon: ChartNoAxesCombined,
    modes: ['rich'],
    aliases: [],
  },
  matchup: {
    label: 'Matchup',
    description: 'Two leader/base combinations and your game plan.',
    dialogDescription: 'Add optional deck cards, then share your plan for the matchup.',
    icon: Swords,
    modes: ['rich'],
    aliases: [],
  },
  'card-group': {
    label: 'Card group',
    description: 'Arrange several cards with shared sizing.',
    dialogDescription: 'Build a collection of cards that tells a story together.',
    icon: GalleryHorizontalEnd,
    modes: ['rich'],
    aliases: [],
  },
  callout: {
    label: 'Strategy callout',
    description: 'Highlight a tip, warning, or key play.',
    dialogDescription: 'Give an important tip, caution, or key play a moment of its own.',
    icon: Lightbulb,
    modes: ['rich'],
    aliases: [],
  },
  mention: {
    label: 'Mention a user',
    description: 'Link to a player inside your text.',
    dialogDescription: 'Find a player to link in your text. Mentions do not send notifications.',
    icon: AtSign,
    modes: ['rich', 'comments'],
    aliases: ['user'],
    insertTitle: 'Mention a user',
    editTitle: 'Mention a user',
    commentDescription: 'Link to a player inside your comment.',
  },
};

export function commandsForEditor(type: EditorType) {
  return (Object.keys(editorCommands) as InsertKind[])
    .filter(id => editorCommands[id].modes.includes(type))
    .map(id => {
      const command = editorCommands[id];
      return {
        ...command,
        id,
        aliases: [id, ...command.aliases],
        description:
          type === 'comments'
            ? (command.commentDescription ?? command.description)
            : command.description,
      };
    });
}

export function commandDialogTitle(kind: InsertKind, editing: boolean) {
  const command = editorCommands[kind];
  return (
    (editing ? command.editTitle : command.insertTitle) ??
    `${editing ? 'Edit' : 'Insert'} ${command.label.toLowerCase()}`
  );
}

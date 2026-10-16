import {
  BlockNoteSchema,
  createExtension,
  createHeadingBlockSpec,
  defaultBlockSpecs,
  defaultInlineContentSpecs,
} from '@blocknote/core';
import { Plugin } from '@tiptap/pm/state';
import { insertionHref, insertionLabel, parseInsertion } from '../shared/model.ts';
import { inlineEmbed } from './inlineEmbed.tsx';

export const simpleSchema = BlockNoteSchema.create();

const commentsHeading = createHeadingBlockSpec({ levels: [4, 5, 6], defaultLevel: 4 });
export const commentsSchema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    heading: {
      ...commentsHeading,
      extensions: [
        ...(commentsHeading.extensions ?? []),
        createExtension({
          key: 'comments-content',
          prosemirrorPlugins: [
            new Plugin({
              // Pasted article content can bypass the comment editor's controls.
              appendTransaction: (transactions, _oldState, state) => {
                if (!transactions.some(transaction => transaction.docChanged)) return;
                const transaction = state.tr;
                state.doc.descendants((node, position) => {
                  const mappedPosition = transaction.mapping.map(position);
                  if (node.type.name === 'heading' && node.attrs.level < 4)
                    transaction.setNodeMarkup(mappedPosition, undefined, {
                      ...node.attrs,
                      level: 4,
                    });
                  if (node.type.name === 'swuInline') {
                    const value = parseInsertion(node.attrs.data);
                    if (value?.kind === 'mention' || value?.kind === 'card-link') return;
                    const href = value ? insertionHref(value) : undefined;
                    const marks =
                      href && state.schema.marks.link
                        ? [state.schema.marks.link.create({ href })]
                        : [];
                    transaction.replaceWith(
                      mappedPosition,
                      mappedPosition + node.nodeSize,
                      state.schema.text(
                        value ? insertionLabel(value) : 'Content unavailable',
                        marks,
                      ),
                    );
                  }
                });
                return transaction.docChanged ? transaction : undefined;
              },
            }),
          ],
        }),
      ],
    },
  },
  inlineContentSpecs: { ...defaultInlineContentSpecs, swuInline: inlineEmbed },
});

import {
  BlockNoteSchema,
  createExtension,
  createHeadingBlockSpec,
  defaultBlockSpecs,
  defaultInlineContentSpecs,
} from '@blocknote/core';
import { Plugin } from '@tiptap/pm/state';
import { createReactBlockSpec, createReactInlineContentSpec } from '@blocknote/react';
import { InsertionView } from '../shared/InsertionView.tsx';
import { ExternalEmbed } from '../shared/ExternalEmbed.tsx';
import { insertionHref, insertionLabel, parseInsertion } from '../shared/model.ts';

const blockEmbed = createReactBlockSpec(
  { type: 'swuBlock', propSchema: { data: { default: '' } }, content: 'none' },
  {
    // Let the controls inside widgets receive events instead of selecting the whole block.
    meta: { selectable: false },
    render: ({ block, editor }) => {
      const value = parseInsertion(block.props.data);
      return (
        <div className="w-full" contentEditable={false}>
          {value ? (
            <InsertionView
              value={value}
              onChange={
                editor.isEditable
                  ? next => {
                      editor.updateBlock(block, { props: { data: JSON.stringify(next) } });
                    }
                  : undefined
              }
            />
          ) : (
            'Content unavailable'
          )}
        </div>
      );
    },
    toExternalHTML: ({ block }) => <ExternalEmbed data={block.props.data} />,
  },
);
const inlineEmbed = createReactInlineContentSpec(
  { type: 'swuInline', propSchema: { data: { default: '' } }, content: 'none' },
  {
    render: ({ inlineContent }) => {
      const value = parseInsertion(inlineContent.props.data);
      return (
        <span contentEditable={false}>
          {value ? <InsertionView value={value} /> : 'Content unavailable'}
        </span>
      );
    },
    toExternalHTML: ({ inlineContent }) => <ExternalEmbed data={inlineContent.props.data} />,
  },
);
export const schema = BlockNoteSchema.create({
  blockSpecs: { ...defaultBlockSpecs, swuBlock: blockEmbed() },
  inlineContentSpecs: { ...defaultInlineContentSpecs, swuInline: inlineEmbed },
});

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

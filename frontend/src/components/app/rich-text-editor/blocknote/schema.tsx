import { BlockNoteSchema, defaultBlockSpecs, defaultInlineContentSpecs } from '@blocknote/core';
import { createReactBlockSpec, createReactInlineContentSpec } from '@blocknote/react';
import { InsertionView } from '../shared/InsertionView.tsx';
import { ExternalEmbed } from '../shared/ExternalEmbed.tsx';
import { parseInsertion } from '../shared/model.ts';

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

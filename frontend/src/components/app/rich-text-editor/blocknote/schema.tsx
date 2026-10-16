import { BlockNoteSchema, defaultBlockSpecs, defaultInlineContentSpecs } from '@blocknote/core';
import { createReactBlockSpec, useBlockNoteEditor } from '@blocknote/react';
import { InsertionView } from '../shared/InsertionView.tsx';
import { ExternalEmbed } from '../shared/ExternalEmbed.tsx';
import { parseInsertion } from '../shared/model.ts';
import { articleHeading } from './articleHeading.ts';
import { inlineEmbed } from './inlineEmbed.tsx';

const blockEmbed = createReactBlockSpec(
  { type: 'swuBlock', propSchema: { data: { default: '' } }, content: 'none' },
  {
    // Let the controls inside widgets receive events instead of selecting the whole block.
    meta: { selectable: false },
    render: function SwuBlock({ block }) {
      // Block-spec callbacks only know their own block type; the context has the full schema.
      const editor = useBlockNoteEditor(schema);
      const value = parseInsertion(block.props.data);
      return (
        <div className="w-full" contentEditable={false}>
          {value ? (
            <InsertionView
              value={value}
              onChange={
                editor.isEditable
                  ? next => {
                      if (next.kind === 'image') {
                        editor.updateBlock(block, { type: 'image', props: next.props });
                      } else {
                        editor.updateBlock(block, { props: { data: JSON.stringify(next) } });
                      }
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
export const schema = BlockNoteSchema.create({
  blockSpecs: { ...defaultBlockSpecs, heading: articleHeading, swuBlock: blockEmbed() },
  inlineContentSpecs: { ...defaultInlineContentSpecs, swuInline: inlineEmbed },
});

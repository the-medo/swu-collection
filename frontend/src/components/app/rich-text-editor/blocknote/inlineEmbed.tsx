import { createReactInlineContentSpec } from '@blocknote/react';
import { InlineInsertionView } from '../shared/InlineInsertionView.tsx';
import { ExternalEmbed } from '../shared/ExternalEmbed.tsx';
import { parseInsertion } from '../shared/model.ts';

export const inlineEmbed = createReactInlineContentSpec(
  { type: 'swuInline', propSchema: { data: { default: '' } }, content: 'none' },
  {
    render: ({ inlineContent }) => {
      const value = parseInsertion(inlineContent.props.data);
      return (
        <span contentEditable={false}>
          {value ? <InlineInsertionView value={value} /> : 'Content unavailable'}
        </span>
      );
    },
    toExternalHTML: ({ inlineContent }) => <ExternalEmbed data={inlineContent.props.data} />,
  },
);

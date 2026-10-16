import {
  createBlockSpec,
  createHeadingBlockSpec,
  createToggleWrapper,
  defaultToggledState,
} from '@blocknote/core';

const heading = createHeadingBlockSpec();
const toggleHeading = createBlockSpec(
  {
    ...heading.config,
    propSchema: {
      ...heading.config.propSchema,
      defaultOpen: { default: false, optional: true },
    },
  },
  {
    render(block, editor) {
      const contentDOM = document.createElement(`h${block.props.level}`);
      const wrapper = createToggleWrapper(block, editor, contentDOM, {
        get: current => {
          try {
            // Keep BlockNote's per-block preference, including an explicit collapse.
            const saved = window.localStorage.getItem(`toggle-${current.id}`);
            if (saved === 'true' || saved === 'false') return saved === 'true';
          } catch {
            // Storage can be unavailable; the document still supplies the default.
          }
          return block.props.defaultOpen === true;
        },
        set: (current, open) => {
          try {
            defaultToggledState.set(current, open);
          } catch {
            // The toggle still works for this view when preferences cannot be saved.
          }
        },
      });
      return { ...wrapper, contentDOM };
    },
  },
)();

// Retain native heading parsing, export, shortcuts, and behavior outside rendering.
export const articleHeading = {
  ...heading,
  config: toggleHeading.config,
  implementation: { ...heading.implementation, render: toggleHeading.implementation.render },
};

import { cn } from '@/lib/utils.ts';
import * as React from 'react';
import type { LucideIcon } from 'lucide-react';

export interface SectionHeaderProps {
  headerAndTooltips?: React.ReactNode;
  title?: string;
  icon?: LucideIcon;
  description?: string;
  info?: React.ReactNode;
  dropdownMenu?: React.ReactNode; //TODO: should be renamed to something like "endOptions"
}

const SectionHeader: React.FC<SectionHeaderProps> = ({
  headerAndTooltips,
  title,
  icon: Icon,
  description,
  info,
  dropdownMenu,
}) => {
  if (title) {
    return (
      <div className="meta-section-header flex items-start justify-between gap-2.5">
        <div
          className={cn(
            'meta-section-heading flex items-center flex-wrap gap-y-[5px] gap-x-3.5 flex-1 min-w-0',
            '[&_>_p]:flex-[1_1_180px] [&_>_p]:m-0! [&_>_p]:text-muted-foreground [&_>_p]:text-[12px]!',
            '[&_>_p]:leading-[1.5]!',
            '@max-[400.01px]/meta-panel:[&_>_p]:text-[11px]!',
          )}
        >
          <div className="meta-heading-line flex items-center gap-2.5">
            {Icon && (
              <span
                className={cn(
                  'meta-section-icon inline-flex items-center justify-center shrink-0 w-8 h-8 border',
                  'border-[color:var(--meta-line)] rounded-[10px] bg-[var(--meta-tint)] text-[color:var(--meta-accent)]',
                  '@max-[400.01px]/meta-panel:hidden',
                )}
              >
                <Icon size={17} aria-hidden="true" />
              </span>
            )}
            <h4
              className={cn(
                'm-0! text-[21px]! font-semibold! tracking-[-0.035em]! leading-[1.3]!',
                '@max-[400.01px]/meta-panel:text-[18px]!',
              )}
            >
              {title}
            </h4>
          </div>
          {description && <p>{description}</p>}
        </div>
        <div
          className={cn(
            'meta-section-actions flex items-center shrink-0 gap-1',
            '[&_>_div]:pt-0 [&_>_div]:gap-0',
            "[&_button[aria-label='Section_options']]:ml-0.5 [&_button[aria-label='Section_options']]:mr-0",
            "[&_button[aria-label='Section_options']]:mt-0 [&_button[aria-label='Section_options']]:mb-0",
            "[&_button[aria-label='Section_options']]:w-7 [&_button[aria-label='Section_options']]:h-7",
            "[&_button[aria-label='Section_options']]:p-[5px]",
            "[&_button[aria-label='Section_options']]:rounded-[9px]",
            "[&_button[aria-label='Section_options']]:bg-transparent",
            '@max-[400.01px]/meta-panel:gap-0',
            '@max-[400.01px]/meta-panel:[&_svg]:w-3.5 @max-[400.01px]/meta-panel:[&_svg]:h-3.5',
          )}
        >
          {info}
          {dropdownMenu}
        </div>
      </div>
    );
  }
  return (
    <div className="flex gap-2 justify-between items-start border-b">
      <div className="flex items-start gap-2">{headerAndTooltips}</div>
      {dropdownMenu ?? null}
    </div>
  );
};

export default SectionHeader;

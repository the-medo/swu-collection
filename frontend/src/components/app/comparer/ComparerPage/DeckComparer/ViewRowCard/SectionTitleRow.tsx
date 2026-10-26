interface SectionTitleRowProps {
  title: string;
  columnCount: number;
}

const SectionTitleRow = ({ title, columnCount }: SectionTitleRowProps) => (
  <tr className="sticky top-24 z-[25]">
    <th
      colSpan={columnCount}
      scope="rowgroup"
      className="border-y border-[var(--workspace-border)] bg-[var(--workspace-soft)] p-0 text-left"
    >
      <span className="sticky left-0 inline-block px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--workspace-accent)]">
        {title}
      </span>
    </th>
  </tr>
);

export default SectionTitleRow;

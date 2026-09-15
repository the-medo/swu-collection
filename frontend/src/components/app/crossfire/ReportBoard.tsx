import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { MotionConfig } from 'motion/react';
import { MessagesSquare } from 'lucide-react';
import { CrossfireLogo } from './CrossfireLogo.tsx';
import { useCardList } from '@/api/lists/useCardList.ts';
import { parseSavedView } from '../../../../../play/view/saved-view.ts';
import type { ProblemReportDetail } from '../../../../../shared/types/crossfire-reports.ts';
import { GameCatalog } from './gameCatalog.ts';
import { BoardPosition } from './BoardPosition.tsx';
import { ToolbarButton } from './ToolbarButton.tsx';
import './board.css';

export default function ReportBoard({ report }: { report: ProblemReportDetail }) {
  const [logOpen, setLogOpen] = useState(false);
  const { data: catalog } = useCardList();
  const parsed = parseSavedView(report.snapshot?.view);
  return (
    <MotionConfig reducedMotion="user">
      <GameCatalog.Provider value={catalog?.cards}>
        <div className="cf-game" data-testid="crossfire-report">
          <header className="cf-header">
            <div className="flex items-center gap-3">
              <CrossfireLogo dark className="cf-header-logo h-7 w-12" />
              <strong>Saved bug report</strong>
            </div>
            <div className="cf-header-controls">
              <ToolbarButton
                label="Toggle game log"
                icon={<MessagesSquare size={17} />}
                className="cf-log-toggle"
                onClick={() => setLogOpen(!logOpen)}
                aria-expanded={logOpen}
              />
              <Link to="/crossfire" className="cf-leave">
                Back to Crossfire
              </Link>
            </div>
          </header>
          <details open className="border-b px-5 py-3 max-h-[30dvh] overflow-auto shrink-0">
            <summary className="cursor-pointer font-semibold">
              {report.label || 'Game problem'} ·{' '}
              {report.status === 'resolved' ? 'Resolved' : 'Open'}
            </summary>
            <p className="whitespace-pre-wrap break-words my-2">{report.description}</p>
            <p className="text-xs text-slate-400">
              {new Date(report.createdAt).toLocaleString()} · Saved position from the reporter’s
              perspective
            </p>
          </details>
          {parsed.success ? (
            <BoardPosition
              view={parsed.data}
              seat={report.snapshot?.seat ?? undefined}
              pending={false}
              readOnly
              readOnlyLabel="Saved position"
              logOpen={logOpen}
              closeLog={() => setLogOpen(false)}
            />
          ) : (
            <p className="p-6" role="status">
              {report.snapshot
                ? 'This saved board uses an older display format. The report and server snapshot are retained for investigation.'
                : 'This older report has no independent snapshot.'}
            </p>
          )}
        </div>
      </GameCatalog.Provider>
    </MotionConfig>
  );
}

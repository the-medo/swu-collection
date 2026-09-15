import type { GameView } from '../../play/view/types.ts';
import type { ProblemReport } from '../../play/view/chat.ts';
export type ProblemReportDetail = Omit<ProblemReport, 'available'> & {
  snapshot: { view: GameView; seat: string | null } | null;
};

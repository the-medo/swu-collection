import { Link } from '@tanstack/react-router';
import {
  moderationActionLabels,
  type ModerationAction,
} from '../../../../../../shared/types/userReportModeration';
export function ModerationHistory({ actions }: { actions: ModerationAction[] }) {
  if (!actions.length)
    return <p className="text-sm text-muted-foreground">No moderation decisions yet.</p>;
  return (
    <ol className="space-y-3">
      {actions.map(action => (
        <li key={action.id} className="space-y-1 rounded-md border p-3 text-sm">
          <div className="flex flex-wrap justify-between gap-2">
            <strong>{moderationActionLabels[action.action]}</strong>
            <time className="text-xs text-muted-foreground" dateTime={action.createdAt}>
              {new Date(action.createdAt).toLocaleString()}
            </time>
          </div>
          <p className="break-words text-muted-foreground">
            By {action.actorDisplayName}
            {action.targetDisplayName ? ` · Account: ${action.targetDisplayName}` : ''}
          </p>
          {action.expiresAt && <p>Until {new Date(action.expiresAt).toLocaleString()}</p>}
          <p className="whitespace-pre-wrap break-words">{action.reason}</p>
          <Link
            to="/admin"
            search={previous => ({ ...previous, page: 'user-reports', reportId: action.reportId })}
            className="text-xs text-primary hover:underline"
          >
            Open associated report
          </Link>
        </li>
      ))}
    </ol>
  );
}

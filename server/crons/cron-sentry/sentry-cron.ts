import * as Sentry from '@sentry/bun';
import './sentry-init.ts';

type CheckInStatus = 'in_progress' | 'ok' | 'error';

export class SentryCron {
  private checkInId?: string;

  constructor(private readonly monitorSlug: string) {}

  started() {
    this.checkIn('in_progress');
    return this.checkInId;
  }

  finished() {
    this.checkIn('ok');
  }

  crashed(error?: unknown) {
    this.checkIn('error');
    if (error) {
      try {
        Sentry.captureException(error);
      } catch {
        // no-op
      }
    }
  }

  private checkIn(status: CheckInStatus) {
    try {
      if (status === 'in_progress') {
        this.checkInId = Sentry.captureCheckIn({
          monitorSlug: this.monitorSlug,
          status,
        });
      } else {
        Sentry.captureCheckIn({
          monitorSlug: this.monitorSlug,
          status,
          checkInId: this.checkInId,
        });
      }
    } catch {
      // no-op
    }
  }
}

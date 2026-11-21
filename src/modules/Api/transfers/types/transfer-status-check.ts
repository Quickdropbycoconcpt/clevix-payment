export const FIRST_STATUS_CHECK_DELAY_MS = 5_000;

export const STATUS_CHECK_BACKOFF_MS = [
  5_000, 15_000, 30_000, 60_000, 300_000, 900_000, 1_800_000,
];

export const STUCK_PENDING_AFTER_MS = 60_000;

export const NOT_FOUND_FAIL_AFTER_MS = 5 * 60_000;

export const STATUS_CHECK_BATCH_SIZE = 50;

export const PROCESSING_CHECK_LOCK_KEY = 'lock:transfers:tsq:processing';

export const PENDING_CHECK_LOCK_KEY = 'lock:transfers:tsq:pending';

export const PROCESSING_CHECK_LOCK_TTL_MS = 60_000;

export const PENDING_CHECK_LOCK_TTL_MS = 5 * 60_000;

export function nextStatusCheckAt(attempts: number): Date {
  const delay =
    STATUS_CHECK_BACKOFF_MS[
      Math.min(attempts, STATUS_CHECK_BACKOFF_MS.length - 1)
    ];

  return new Date(Date.now() + delay);
}

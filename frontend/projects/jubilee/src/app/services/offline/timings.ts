/** The waits the offline behaviour uses, in milliseconds (L2-121). A test can shorten them before the app starts. */
export interface Timings {
  /** How long a probe waits for the ping before it counts as failed. */
  probeTimeout: number;
  /** The waits between attempts to reach Jubilee again: 5, 10, 20, 40, then 60 seconds. */
  backoff: number[];
  /** The window the mean latency is taken over, and the mean above which the connection is slow. */
  latencyWindow: number;
  slowMean: number;
  /** A write still sending after this long warns the member that the connection is slow. */
  slowRequest: number;
  /** How long a write that cannot reach Jubilee keeps being retried. */
  retryWindow: number;
  /** The wait between retries of a write. */
  retryEvery: number;
  /** How often the queue is checked for messages that waited too long. */
  expiryEvery: number;
  /** How long a queued message waits before it is "Not sent" (L2-120 AC3). */
  queueLifetime: number;
}

export const DEFAULT_TIMINGS: Timings = {
  probeTimeout: 5_000,
  backoff: [5_000, 10_000, 20_000, 40_000, 60_000],
  latencyWindow: 30_000,
  slowMean: 3_000,
  slowRequest: 5_000,
  retryWindow: 60_000,
  retryEvery: 2_000,
  expiryEvery: 60_000,
  queueLifetime: 24 * 60 * 60 * 1_000,
};

/** Set on the window before the app starts to shorten the waits in a test. */
export function timings(): Timings {
  return {
    ...DEFAULT_TIMINGS,
    ...(globalThis as { __jbTimings?: Partial<Timings> }).__jbTimings,
  };
}

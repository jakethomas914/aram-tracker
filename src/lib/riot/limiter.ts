/**
 * Sliding-window rate limiter matching Riot's development key budget
 * (20 requests/second and 100 requests/2 minutes). Requests are serialized
 * through `schedule` so bursts wait instead of earning us a 429.
 */
export interface WindowLimit {
  /** Window length in milliseconds. */
  intervalMs: number;
  /** Maximum requests allowed inside the window. */
  max: number;
}

export const DEV_KEY_LIMITS: WindowLimit[] = [
  { intervalMs: 1_000, max: 20 },
  { intervalMs: 120_000, max: 100 },
];

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export class RateLimiter {
  private readonly limits: WindowLimit[];
  private readonly hits: number[][];
  private chain: Promise<unknown> = Promise.resolve();
  /** Epoch ms until which all requests are paused because of a 429. */
  private pausedUntil = 0;

  constructor(limits: WindowLimit[] = DEV_KEY_LIMITS) {
    this.limits = limits;
    this.hits = limits.map(() => []);
  }

  /** Pause every queued request, honoring a Retry-After response header. */
  penalize(retryAfterSeconds: number) {
    const until = Date.now() + Math.max(1, retryAfterSeconds) * 1000;
    this.pausedUntil = Math.max(this.pausedUntil, until);
  }

  schedule<T>(task: () => Promise<T>): Promise<T> {
    const run = this.chain.then(async () => {
      await this.waitForSlot();
      return task();
    });
    // Keep the chain alive even when a task rejects.
    this.chain = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  private async waitForSlot(): Promise<void> {
    for (;;) {
      const now = Date.now();

      if (now < this.pausedUntil) {
        await sleep(this.pausedUntil - now);
        continue;
      }

      let waitMs = 0;
      this.limits.forEach((limit, index) => {
        const bucket = this.hits[index];
        while (bucket.length > 0 && now - bucket[0] >= limit.intervalMs) {
          bucket.shift();
        }
        if (bucket.length >= limit.max) {
          waitMs = Math.max(waitMs, limit.intervalMs - (now - bucket[0]) + 5);
        }
      });

      if (waitMs === 0) {
        const stamp = Date.now();
        this.hits.forEach((bucket) => bucket.push(stamp));
        return;
      }

      await sleep(waitMs);
    }
  }
}

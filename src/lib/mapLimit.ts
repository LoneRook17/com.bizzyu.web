/**
 * Promise.allSettled with a ceiling on how many run at once.
 *
 * The campus fan-out is 34 schools wide. Firing all 34 POSTs at the V1 Laravel
 * box simultaneously, from a build that renders several pages, is what earned a
 * production 429 and killed a deploy. This is the same shape as allSettled, so
 * a rejection is still a result rather than an exception, but the API sees a
 * queue instead of a stampede.
 */
export async function mapLimit<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<PromiseSettledResult<R>[]> {
  const out: PromiseSettledResult<R>[] = new Array(items.length);
  let next = 0;

  async function worker() {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      try {
        out[i] = { status: "fulfilled", value: await fn(items[i], i) };
      } catch (reason) {
        out[i] = { status: "rejected", reason };
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

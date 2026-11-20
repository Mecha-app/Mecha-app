/**
 * Live-thread client math (live chat, owner order 2026-11-20).
 *
 * The Messages screen polls — there is no socket in this codebase
 * and none is faked: the open thread re-reads every few seconds,
 * the thread list on a slower beat, and the composer heartbeats
 * its typing state while it holds unsent text. The poll responses
 * are FULL lists, so the merge below is the correctness core:
 *
 *   - union by message id (a message the poll hasn't caught up
 *     with yet — e.g. the caller's own just-sent one — is never
 *     dropped, and a message the poll returns twice lands once);
 *   - the incoming copy wins on an id conflict (the server's
 *     record is the truth);
 *   - order is createdAt, with id as the tiebreak, so equal
 *     timestamps can never shuffle between polls.
 *
 * Pure module, client-safe, shared by the page and the tests.
 */

/** Open-thread poll cadence: new messages appear within ~this. */
export const THREAD_POLL_MS = 3500;
/** Thread-list poll cadence while the Messages screen is open. */
export const THREAD_LIST_POLL_MS = 6000;
/** Typing heartbeat cadence while the composer holds text. */
export const TYPING_PING_MS = 3000;

export interface ThreadMessageLike {
  id: string;
  createdAt: string;
}

export function mergeThreadMessages<T extends ThreadMessageLike>(
  existing: readonly T[],
  incoming: readonly T[],
): T[] {
  const byId = new Map<string, T>();
  for (const m of existing) byId.set(m.id, m);
  for (const m of incoming) byId.set(m.id, m);
  return [...byId.values()].sort((a, b) => {
    const byTime = a.createdAt.localeCompare(b.createdAt);
    return byTime !== 0 ? byTime : a.id.localeCompare(b.id);
  });
}

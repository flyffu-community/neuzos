import type {NeuzLayout} from '$lib/types';

export function isSingleSessionLayoutOpenInSessionWindow(
  layout: Pick<NeuzLayout, 'rows'> | undefined,
  sessionWindowSessionIds: readonly string[]
): boolean {
  const sessionIds = layout?.rows.flatMap((row) => row.sessionIds) ?? [];
  return sessionIds.length === 1 && sessionWindowSessionIds.includes(sessionIds[0]);
}

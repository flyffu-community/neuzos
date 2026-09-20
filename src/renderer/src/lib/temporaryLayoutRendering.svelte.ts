export type TemporaryLayoutRenderingLease = {
  release: () => void;
};

let nextLeaseId = 0;
let layoutIdsByLease = $state<Record<number, string[]>>({});

export const temporaryLayoutRendering = {
  get layoutIds(): readonly string[] {
    return [...new Set(Object.values(layoutIdsByLease).flat())];
  },

  acquire(layoutIds: readonly string[]): TemporaryLayoutRenderingLease {
    const leaseId = ++nextLeaseId;
    layoutIdsByLease = {
      ...layoutIdsByLease,
      [leaseId]: [...new Set(layoutIds.filter(Boolean))],
    };
    let released = false;

    return {
      release(): void {
        if (released) return;
        released = true;
        const next = { ...layoutIdsByLease };
        delete next[leaseId];
        layoutIdsByLease = next;
      },
    };
  },
};

export interface RevealRecord {
  cycleId: number;
  introSeen: boolean;
  offerIds: number[];
}

export function freshReveal(cycleId: number): RevealRecord {
  return { cycleId, introSeen: false, offerIds: [] };
}

export function readReveal(raw: string | null, cycleId: number): RevealRecord {
  if (!raw) return freshReveal(cycleId);
  try {
    const parsed = JSON.parse(raw) as Partial<RevealRecord>;
    if (parsed.cycleId !== cycleId) return freshReveal(cycleId);
    const offerIds = Array.isArray(parsed.offerIds) ? parsed.offerIds.filter((id) => typeof id === "number") : [];
    return { cycleId, introSeen: parsed.introSeen === true, offerIds };
  } catch {
    return freshReveal(cycleId);
  }
}

export function markIntroSeen(record: RevealRecord): RevealRecord {
  if (record.introSeen) return record;
  return { ...record, introSeen: true };
}

export function revealOffer(record: RevealRecord, offerId: number): RevealRecord {
  if (record.offerIds.includes(offerId)) return record;
  return { ...record, offerIds: [...record.offerIds, offerId] };
}

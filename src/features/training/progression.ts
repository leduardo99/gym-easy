import { formatTenths, parseMassToTenths } from "./mass";

export type ProgressionSet = {
  sessionId: string;
  finishedAt: Date;
  loadKg: string;
  reps: number;
};

export type ProgressionPoint = {
  sessionId: string;
  finishedAt: Date;
  maxLoadKg: string;
  volumeKg: string;
  isPersonalRecord: boolean;
};

export function summarizeLoadProgression(
  sets: readonly ProgressionSet[],
): ProgressionPoint[] {
  const grouped = new Map<
    string,
    { finishedAt: Date; loads: { tenths: number; reps: number }[] }
  >();

  for (const set of sets) {
    const tenths = parseMassToTenths(set.loadKg);
    if (tenths === null) continue;
    const current = grouped.get(set.sessionId);
    const load = { tenths, reps: set.reps };
    if (current) {
      current.loads.push(load);
    } else {
      grouped.set(set.sessionId, { finishedAt: set.finishedAt, loads: [load] });
    }
  }

  const sessions = [...grouped.entries()].sort((left, right) => {
    const byTime = left[1].finishedAt.getTime() - right[1].finishedAt.getTime();
    if (byTime !== 0) return byTime;
    if (left[0] < right[0]) return -1;
    if (left[0] > right[0]) return 1;
    return 0;
  });

  let bestTenths: number | null = null;
  const points: ProgressionPoint[] = [];

  for (const [sessionId, session] of sessions) {
    let maxQualifying: number | null = null;
    let volumeTenths = 0;
    for (const load of session.loads) {
      volumeTenths += load.tenths * load.reps;
      if (
        load.reps >= 1 &&
        (maxQualifying === null || load.tenths > maxQualifying)
      ) {
        maxQualifying = load.tenths;
      }
    }
    if (maxQualifying === null) continue;

    const isPersonalRecord = bestTenths === null || maxQualifying > bestTenths;
    if (isPersonalRecord) bestTenths = maxQualifying;
    points.push({
      sessionId,
      finishedAt: session.finishedAt,
      maxLoadKg: formatTenths(maxQualifying),
      volumeKg: formatTenths(volumeTenths),
      isPersonalRecord,
    });
  }

  return points;
}

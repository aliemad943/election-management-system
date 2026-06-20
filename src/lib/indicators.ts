import { db } from "./db";

export interface GSIResult {
  gsi: number;
  totalVoters: number;
  checkedIn: number;
  byTribe: { tribeId: string; tribeName: string; total: number; checkedIn: number }[];
}

export interface EDRIResult {
  edri: number;
  dominantTribe: string;
  dominantShare: number;
  entropyScore: number;
}

export interface AllIndicators {
  gsi: GSIResult;
  edri: EDRIResult;
}

export async function computeAllIndicators(): Promise<AllIndicators> {
  const [voters, tribes] = await Promise.all([
    db.voter.findMany({
      select: {
        id: true,
        tribeId: true,
        checkedIn: true,
        tribe: { select: { id: true, name: true } },
      },
    }),
    db.tribe.findMany({
      select: { id: true, name: true, _count: { select: { voters: true } } },
    }),
  ]);

  const totalVoters = voters.length;
  const checkedIn = voters.filter((v) => v.checkedIn).length;

  // GSI — General Support Index
  const byTribeMap = new Map<string, { tribeName: string; total: number; checkedIn: number }>();
  for (const v of voters) {
    const tid = v.tribeId || "__none__";
    const tname = v.tribe?.name || "غير محدد";
    if (!byTribeMap.has(tid)) byTribeMap.set(tid, { tribeName: tname, total: 0, checkedIn: 0 });
    const entry = byTribeMap.get(tid)!;
    entry.total++;
    if (v.checkedIn) entry.checkedIn++;
  }
  const byTribe = Array.from(byTribeMap.entries()).map(([tribeId, data]) => ({
    tribeId,
    tribeName: data.tribeName,
    total: data.total,
    checkedIn: data.checkedIn,
  }));

  const gsi = totalVoters > 0 ? Math.round((checkedIn / totalVoters) * 100) : 0;

  // EDRI — Electoral Dominance & Risk Index
  const tribeShares = tribes.map((t) => ({
    name: t.name,
    share: totalVoters > 0 ? t._count.voters / totalVoters : 0,
    count: t._count.voters,
  }));
  tribeShares.sort((a, b) => b.share - a.share);

  const dominant = tribeShares[0] || { name: "", share: 0 };
  const entropy = -tribeShares.reduce((sum, t) => (t.share > 0 ? sum + t.share * Math.log2(t.share) : sum), 0);
  const maxEntropy = tribeShares.length > 1 ? Math.log2(tribeShares.length) : 1;
  const normalizedEntropy = maxEntropy > 0 ? entropy / maxEntropy : 0;

  const edri = Math.round(dominant.share * 60 + (1 - normalizedEntropy) * 40);

  return {
    gsi: { gsi, totalVoters, checkedIn, byTribe },
    edri: {
      edri,
      dominantTribe: dominant.name,
      dominantShare: dominant.share,
      entropyScore: Math.round(normalizedEntropy * 100) / 100,
    },
  };
}

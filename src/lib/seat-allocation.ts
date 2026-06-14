/**
 * Sainte-Laguë (highest averages) seat allocation.
 * Distributes `totalSeats` among entities proportionally to their `votes`,
 * guaranteeing the allocated seats always sum to totalSeats (no rounding drift).
 */
export function sainteLagueAllocate(votes: number[], totalSeats: number): number[] {
  const n = votes.length;
  const seats = new Array(n).fill(0);
  if (totalSeats <= 0 || n === 0) return seats;

  const totalVotes = votes.reduce((a, b) => a + Math.max(0, b), 0);
  if (totalVotes <= 0) return seats;

  for (let i = 0; i < totalSeats; i++) {
    let bestIdx = -1;
    let bestQuotient = -1;
    for (let j = 0; j < n; j++) {
      const v = Math.max(0, votes[j]);
      if (v <= 0) continue;
      const quotient = v / (2 * seats[j] + 1);
      if (quotient > bestQuotient) {
        bestQuotient = quotient;
        bestIdx = j;
      }
    }
    if (bestIdx === -1) break;
    seats[bestIdx] += 1;
  }

  return seats;
}
import { db } from './db';
import { enrichElectoralKey } from './indicators-helper';
import { sainteLagueAllocate } from './seat-allocation';

const TOTAL_DISTRICT_SEATS = 18;

export async function calculateAllCompositeIndicators() {
  // Fetch raw data
  const [keysRaw, votersRaw, servicesRaw, commissionRaw, competitorsRaw, sentimentTrends] = await Promise.all([
    db.electionKey.findMany({
      include: {
        voters: true,
        services: true,
        tribe: true,
        subTribe: true,
      },
    }),
    db.voter.findMany({}),
    db.service.findMany({}),
    db.commissionData.findMany({}),
    db.competitor.findMany({}),
    db.sentimentTrend.findMany({}),
  ]);

  // Enrich keys
  const keys = keysRaw.map(k => enrichElectoralKey(k, votersRaw, sentimentTrends));

  const totalKeys = keys.length;
  const totalVoters = votersRaw.length;
  const totalNetVotes = keys.reduce((sum, k) => sum + k.netVotes, 0);

  const totalSupported = votersRaw.filter(v => v.status === 'SUPPORTIVE').length;
  const totalNeutral = votersRaw.filter(v => v.status === 'NEUTRAL').length;
  const totalOpposed = votersRaw.filter(v => v.status === 'OPPOSED').length;

  // Calculate Governorate level scores
  const eiiScore = keys.length > 0 ? keys.reduce((sum, k) => sum + k.eiiScore, 0) / keys.length : 0;
  const kriScore = keys.length > 0 ? keys.reduce((sum, k) => sum + k.kriScore, 0) / keys.length : 0;
  const drsScore = keys.length > 0 ? keys.reduce((sum, k) => sum + k.drsScore, 0) / keys.length : 0;
  const vpsScore = keys.length > 0 ? keys.reduce((sum, k) => sum + k.vpsScore, 0) / keys.length : 0;
  const campaignROI = keys.length > 0 ? keys.reduce((sum, k) => sum + k.campaignROI, 0) / keys.length : 0;

  const apiScore = Math.min(100, Math.max(0, (totalNeutral / Math.max(totalVoters, 1)) * 100 + 40));
  const ewliScore = Math.min(100, Math.max(0, drsScore * 0.7 + (totalOpposed / Math.max(totalVoters, 1)) * 100));

  // GSI (Geographic Strength Index) - Governorate level
  // Formula: gsiScore = (districtsCovered / 21) * 40 + (avgVotersPerDistrict / maxVotersPerDistrict) * 35 + (keysPerDistrict_stddev_inverted / 100) * 25
  const uniqueDistricts = [...new Set(keys.map(k => k.district || 'الغراف'))];
  const districtsCovered = uniqueDistricts.length;
  const keysPerDistrictArr = uniqueDistricts.map(d => keys.filter(k => (k.district || 'الغراف') === d).length);
  const votersPerDistrictArr = uniqueDistricts.map(d => keys.filter(k => (k.district || 'الغراف') === d).reduce((s, k) => s + k.totalVotes, 0));
  const maxVotersPerDistrict = Math.max(...votersPerDistrictArr, 1);
  const avgVotersPerDistrict = votersPerDistrictArr.reduce((s, v) => s + v, 0) / Math.max(votersPerDistrictArr.length, 1);
  
  // Compute standard deviation of keys per district (inverted)
  const keysAvg = keysPerDistrictArr.reduce((s, v) => s + v, 0) / Math.max(keysPerDistrictArr.length, 1);
  const keysStdDev = Math.sqrt(keysPerDistrictArr.reduce((s, v) => s + Math.pow(v - keysAvg, 2), 0) / Math.max(keysPerDistrictArr.length, 1));
  const keysPerDistrict_stddev_inverted = Math.max(0, 100 - keysStdDev * 10);
  
  const gsiScore = Math.min(100, Math.max(0,
    (districtsCovered / 21) * 40 +
    (avgVotersPerDistrict / maxVotersPerDistrict) * 35 +
    (keysPerDistrict_stddev_inverted / 100) * 25
  ));

  // EDRI (Election Day Readiness Index) - Governorate level
  // Formula: edriScore = loyalHighRatio * 40 + gpsVerifiedRatio * 30 + registryVerifiedRatio * 30
  const loyalHighCount = keys.filter(k => k.loyaltyScore >= 4).length;
  const loyalHighRatio = totalKeys > 0 ? loyalHighCount / totalKeys : 0;
  const gpsVerifiedCount = votersRaw.filter(v => v.gpsVerified).length;
  const gpsVerifiedRatio = totalVoters > 0 ? gpsVerifiedCount / totalVoters : 0;
  const registryVerifiedCount = votersRaw.filter(v => v.isRegistryVerified).length;
  const registryVerifiedRatio = totalVoters > 0 ? registryVerifiedCount / totalVoters : 0;
  
  const edriScore = Math.min(100, Math.max(0,
    loyalHighRatio * 40 +
    gpsVerifiedRatio * 30 +
    registryVerifiedRatio * 30
  ));

  const efiScore = Math.min(100, Math.max(0, (eiiScore * 0.15) + (kriScore * 0.15) + (vpsScore * 0.20) + ((100 - drsScore) * 0.10) + (apiScore * 0.10) + ((100 - ewliScore) * 0.10) + (gsiScore * 0.10) + (edriScore * 0.10)));

  // Saint-Laguë Seat Allocation
  const totalRegistered = commissionRaw.reduce((sum, d) => sum + d.registeredVoters, 0);
  const avgTurnout = commissionRaw.length > 0
    ? commissionRaw.reduce((sum, d) => sum + d.historicalTurnout, 0) / commissionRaw.length
    : 40; // Default 40% if no data
  const totalExpectedVotes = totalRegistered * (avgTurnout / 100);
  const seatThreshold = totalExpectedVotes > 0 ? totalExpectedVotes / 18 : 2000;
  
  const projectedSeats = totalRegistered > 0 && seatThreshold > 0
    ? Math.min(TOTAL_DISTRICT_SEATS, Math.round(totalNetVotes / seatThreshold))
    : Math.min(TOTAL_DISTRICT_SEATS, Math.round(totalNetVotes / 2000));

  const governorate = {
    id: 'gov-ذي قار',
    eiiScore,
    kriScore,
    vpsScore,
    drsScore,
    campaignROI,
    apiScore,
    ewliScore,
    gsiScore,
    edriScore,
    efiScore,
    totalKeysInArea: totalKeys,
    totalNetVotes,
    totalSupportedVotes: totalSupported,
    totalNeutralVotes: totalNeutral,
    totalWeakVotes: totalOpposed,
    totalVotersInArea: totalVoters,
    projectedSeats,
    calculatedAt: new Date().toISOString(),
  };

  // Group by district to compute district level scores
  const districtsMap: Record<string, typeof keys> = {};
  keys.forEach(k => {
    const dist = k.district || 'الغراف';
    if (!districtsMap[dist]) districtsMap[dist] = [];
    districtsMap[dist].push(k);
  });

  // Allocate the won seats across districts proportionally (Sainte-Laguë),
  // so district seat counts always sum to `projectedSeats`.
  const districtEntries = Object.entries(districtsMap);
  const districtNetVotesArr = districtEntries.map(([, dKeys]) => dKeys.reduce((sum, k) => sum + k.netVotes, 0));
  const districtSeatsArr = sainteLagueAllocate(districtNetVotesArr, projectedSeats);

  const districts = districtEntries.map(([district, dKeys], idx) => {
    const dTotalKeys = dKeys.length;
    const dNetVotes = dKeys.reduce((sum, k) => sum + k.netVotes, 0);

    const dVoters = dKeys.flatMap(k => k.voters || []);
    const dTotalSupported = dVoters.filter(v => v.status === 'SUPPORTIVE').length;
    const dTotalNeutral = dVoters.filter(v => v.status === 'NEUTRAL').length;
    const dTotalWeak = dVoters.filter(v => v.status === 'OPPOSED').length;
    const dTotalVoters = dVoters.length;

    const dEii = dKeys.reduce((sum, k) => sum + k.eiiScore, 0) / dTotalKeys;
    const dKri = dKeys.reduce((sum, k) => sum + k.kriScore, 0) / dTotalKeys;
    const dDrs = dKeys.reduce((sum, k) => sum + k.drsScore, 0) / dTotalKeys;
    const dVps = dKeys.reduce((sum, k) => sum + k.vpsScore, 0) / dTotalKeys;
    const dROI = dKeys.reduce((sum, k) => sum + k.campaignROI, 0) / dTotalKeys;

    // District-level API (Audience Persuasion Index)
    const dApi = Math.min(100, Math.max(0, (dTotalNeutral / Math.max(dTotalVoters, 1)) * 100 + 40));
    // District-level EWLI (Early Warning Likelihood Index)
    const dEwli = Math.min(100, Math.max(0, dDrs * 0.7 + (dTotalWeak / Math.max(dTotalVoters, 1)) * 100));

    // District-level GSI: subdistricts covered by the district's keys
    // Formula: dGsi = (subDistrictsCount / 5) * 40 + (avgVotersPerSubDistrict / maxVotersPerSubDistrict) * 35 + (keysPerSub_stddev_inverted / 100) * 25
    const dSubDistricts = [...new Set(dKeys.map(k => k.subDistrict || 'المركز'))];
    const subDistrictsCount = dSubDistricts.length;
    const votersPerSub = dSubDistricts.map(sd => dKeys.filter(k => (k.subDistrict || 'المركز') === sd).reduce((s, k) => s + k.totalVotes, 0));
    const maxVotersPerSubDistrict = Math.max(...votersPerSub, 1);
    const avgVotersPerSubDistrict = votersPerSub.reduce((s, v) => s + v, 0) / Math.max(votersPerSub.length, 1);
    const dKeysPerSub = dSubDistricts.map(sd => dKeys.filter(k => (k.subDistrict || 'المركز') === sd).length);
    const dKeysSubAvg = dKeysPerSub.reduce((s, v) => s + v, 0) / Math.max(dKeysPerSub.length, 1);
    const dKeysSubStdDev = Math.sqrt(dKeysPerSub.reduce((s, v) => s + Math.pow(v - dKeysSubAvg, 2), 0) / Math.max(dKeysPerSub.length, 1));
    const keysPerSub_stddev_inverted = Math.max(0, 100 - dKeysSubStdDev * 10);
    const dGsi = Math.min(100, Math.max(0,
      (subDistrictsCount / 5) * 40 +
      (avgVotersPerSubDistrict / maxVotersPerSubDistrict) * 35 +
      (keysPerSub_stddev_inverted / 100) * 25
    ));

    // District-level EDRI
    // Formula: dEdri = dLoyalHighRatio * 40 + dGpsRatio * 30 + dRegRatio * 30
    const dLoyalHigh = dKeys.filter(k => k.loyaltyScore >= 4).length;
    const dLoyalHighRatio = dTotalKeys > 0 ? (dLoyalHigh / dTotalKeys) : 0;
    const dGpsVerified = dVoters.filter(v => v.gpsVerified).length;
    const dGpsRatio = dTotalVoters > 0 ? (dGpsVerified / dTotalVoters) : 0;
    const dRegVerified = dVoters.filter(v => v.isRegistryVerified).length;
    const dRegRatio = dTotalVoters > 0 ? (dRegVerified / dTotalVoters) : 0;
    const dEdri = Math.min(100, Math.max(0,
      dLoyalHighRatio * 40 + dGpsRatio * 30 + dRegRatio * 30
    ));

    const dEfi = Math.min(100, Math.max(0, (dEii * 0.15) + (dKri * 0.15) + (dVps * 0.20) + ((100 - dDrs) * 0.10) + (dApi * 0.10) + ((100 - dEwli) * 0.10) + (dGsi * 0.10) + (dEdri * 0.10)));

    // District-level seats: Sainte-Laguë share of the governorate's projected seats
    const dProjectedSeats = districtSeatsArr[idx];

    return {
      id: `dist-${district}`,
      district,
      eiiScore: dEii,
      kriScore: dKri,
      vpsScore: dVps,
      drsScore: dDrs,
      campaignROI: dROI,
      apiScore: dApi,
      ewliScore: dEwli,
      gsiScore: dGsi,
      edriScore: dEdri,
      efiScore: dEfi,
      totalKeysInArea: dTotalKeys,
      totalNetVotes: dNetVotes,
      totalSupportedVotes: dTotalSupported,
      totalNeutralVotes: dTotalNeutral,
      totalWeakVotes: dTotalWeak,
      totalVotersInArea: dTotalVoters,
      projectedSeats: dProjectedSeats,
    };
  });

  return {
    governorate,
    districts,
    lastCalculated: new Date().toISOString(),
  };
}
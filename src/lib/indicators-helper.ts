import { ElectionKey, Voter, Service, Tribe, SubTribe } from '@prisma/client';

export interface EnrichedKey extends ElectionKey {
  voters: Voter[];
  services: Service[];
  tribe: Tribe | null;
  subTribe: SubTribe | null;
  eiiScore: number;
  kriScore: number;
  vpsScore: number;
  drsScore: number;
  campaignROI: number;
  netVotes: number;
  supportedVotes: number;
  neutralVotes: number;
  weakVotes: number;
  totalVotes: number;
  weightedScore: number;
}

export function enrichElectoralKey(
  key: ElectionKey & { voters?: Voter[]; services?: Service[]; tribe?: Tribe | null; subTribe?: SubTribe | null },
  allVoters: Voter[] = [],
  sentimentTrends: any[] = []
): EnrichedKey {
  const voters = key.voters || [];
  const services = key.services || [];

  // Calculate average sentiment score for district
  const districtSentiment = sentimentTrends.filter(t => t.region === key.district);
  const avgSentimentScore = districtSentiment.length > 0
    ? districtSentiment.reduce((sum, t) => sum + (t.score || 0), 0) / districtSentiment.length
    : 0.0; // scale -1 to +1

  // calculate voters counts
  const supported = voters.length > 0 ? voters.filter(v => v.status === 'SUPPORTIVE').length : ((key as any).supportedVotes ?? 0);
  const neutral = voters.length > 0 ? voters.filter(v => v.status === 'NEUTRAL').length : ((key as any).neutralVotes ?? 0);
  const opposed = voters.length > 0 ? voters.filter(v => v.status === 'OPPOSED').length : ((key as any).weakVotes ?? 0);
  const total = voters.length > 0 ? voters.length : (key.expectedVotes ?? 0);

  // Calibrate key accuracy based on GPS and Registry verification rates
  const auditedClaimed = voters.filter(v => v.gpsVerified || v.isRegistryVerified);
  const verifiedSupportiveClaimed = auditedClaimed.filter(v => v.status === 'SUPPORTIVE').length;
  
  const calibratedAccuracy = auditedClaimed.length > 0
    ? (verifiedSupportiveClaimed / auditedClaimed.length)
    : (key.keyAccuracyScore ?? 1.0);

  // Dynamic Imputation of Net Votes using voter-level weights
  let rawNetVotes = 0;
  if (voters.length > 0) {
    voters.forEach(v => {
      if (v.status === 'SUPPORTIVE') {
        rawNetVotes += 1.0;
      } else if (v.status === 'NEUTRAL') {
        // Calculate demographic imputation weight
        let tribeWeight = 0.5;
        if (v.tribeId) {
          const tribeVoters = allVoters.filter(x => x.tribeId === v.tribeId);
          if (tribeVoters.length > 0) {
            tribeWeight = tribeVoters.filter(x => x.status === 'SUPPORTIVE').length / tribeVoters.length;
          }
        }
        
        let areaWeight = 0.5;
        const areaVoters = allVoters.filter(x => x.area === v.area || x.subDistrict === v.subDistrict);
        if (areaVoters.length > 0) {
          areaWeight = areaVoters.filter(x => x.status === 'SUPPORTIVE').length / areaVoters.length;
        }
        
        let eduWeight = 0.5;
        if (v.education === 'بكالوريوس' || v.education === 'ماجستير' || v.education === 'دكتوراه') {
          eduWeight = 0.6;
        } else if (v.education === 'يقرا ويكتب' || v.education === 'ابتدائية') {
          eduWeight = 0.45;
        }

        const combined = (tribeWeight * 0.4) + (areaWeight * 0.4) + (eduWeight * 0.2);
        const sentimentMultiplier = 1.0 + (avgSentimentScore * 0.15); // +/- 15%
        const weight = Math.min(1.0, Math.max(0.0, combined * sentimentMultiplier));
        
        rawNetVotes += weight;
      }
      // OPPOSED adds 0.0
    });
  } else {
    // Fallback formula: المؤيدين 80% + المحايدين 50% + الضعيفة 30%
    rawNetVotes = (supported * 0.8) + (neutral * 0.5) + (opposed * 0.3);
  }
  const loyaltyVal = (((key.loyaltyScore ?? 3) - 1) / 4) * 20;
  const influenceVal = (((key.influenceLevel ?? 3) - 1) / 10) * 20;
  const mobilizationVal = (((key.mobilizationCap ?? 3) - 1) / 4) * 15;
  const voteProtectionVal = (((key.voteProtection ?? 3) - 1) / 4) * 15;
  const supportReasonVal = (((key.supportReason ?? 3) - 1) / 4) * 10;
  const needsVal = (((key.needsLevel ?? 3) - 1) / 4) * 5;
  const politicalVal = (((key.politicalNote ?? 3) - 1) / 4) * 5;
  const organizationalVal = (((key.organizationalNote ?? 3) - 1) / 4) * 5;
  const generalVal = (((key.generalNote ?? 3) - 1) / 4) * 5;
  const infoAccuracyVal = calibratedAccuracy * 2.5;
  const trainingVal = (((key.trainingLevel ?? 3) - 1) / 4) * 2.5;

  const efficiencyScore = Math.min(100, Math.max(0, Math.round(
    loyaltyVal +
    influenceVal +
    mobilizationVal +
    voteProtectionVal +
    supportReasonVal +
    needsVal +
    politicalVal +
    organizationalVal +
    generalVal +
    infoAccuracyVal +
    trainingVal
  )));

  const netVotes = Math.round(rawNetVotes * (efficiencyScore / 100));

  // EII (Electoral Influence Index)
  const influencePart = (((key.influenceLevel ?? 3) - 1) / 10) * 40 + 10;
  const mobilizationPart = (((key.mobilizationCap ?? 3) - 1) / 4) * 40 + 10;
  const eiiScore = Math.min(100, Math.max(0, Math.round(influencePart + mobilizationPart)));

  // KRI (Key Reliability Index)
  const loyaltyPart = key.loyaltyScore * 12;
  const accuracyPart = calibratedAccuracy * 40;
  const kriScore = Math.min(100, Math.max(0, Math.round(loyaltyPart + accuracyPart)));

  // VPS (Voting Probability Score)
  const supportedRatio = total > 0 ? (supported / total) : 0.5;
  const vpsScore = Math.min(100, Math.max(0, Math.round((key.loyaltyScore * 10) + (supportedRatio * 50))));

  // DRS (Defection Risk Score)
  const drsScore = Math.min(100, Math.max(0, key.riskLevel * 20));

  // Campaign ROI based on Services Linked directly to Key + its Voters
  const keyServiceCost = services.reduce((sum, s) => sum + s.cost, 0);
  
  // Find costs of services linked directly to voters of this key
  const voterIds = voters.map(v => v.id);
  const voterServicesCost = allVoters
    .filter(v => voterIds.includes(v.id))
    .flatMap(v => (v as any).services || [])
    .reduce((sum: number, s: any) => sum + (s.cost || 0), 0);

  const totalSpent = keyServiceCost + voterServicesCost;
  
  let campaignROI = 0;
  if (netVotes === 0) {
    campaignROI = 0;
  } else if (totalSpent === 0) {
    campaignROI = 50.0;
  } else {
    campaignROI = Math.min(200, Math.round((netVotes / (totalSpent / 1000000)) * 10) / 10);
  }

  const weightedScore = efficiencyScore;

  return {
    ...key,
    voters,
    services,
    tribe: key.tribe || null,
    subTribe: key.subTribe || null,
    eiiScore,
    kriScore,
    vpsScore,
    drsScore,
    campaignROI,
    netVotes,
    supportedVotes: supported,
    neutralVotes: neutral,
    weakVotes: opposed,
    totalVotes: total,
    weightedScore,
    keyAccuracyScore: calibratedAccuracy,
  };
}
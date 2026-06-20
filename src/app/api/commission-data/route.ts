import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, checkMethodPermission } from '@/lib/auth-guard';

// GET /api/commission-data - بيانات المفوضية العليا الشاملة
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const { user } = authResult;
    if (!checkMethodPermission(user.role, 'GET', 'commission-data')) {
      return NextResponse.json({ error: 'غير مسموح' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const district = searchParams.get('district');
    const subDistrict = searchParams.get('subDistrict');

    const where: any = {};
    if (district) where.district = district;
    if (subDistrict) where.subDistrict = subDistrict;

    const data = await db.commissionData.findMany({ where, orderBy: { createdAt: 'desc' } });

    // Map to include computed compatibility fields
    const mappedData = data.map((d) => ({
      ...d,
      governorate: d.province,
      participationRate: d.historicalTurnout,
      actualParticipants: Math.round(d.registeredVoters * ((d.actualTurnout || d.historicalTurnout) / 100)),
      maleVoters: d.genderMale ?? Math.round(d.registeredVoters * 0.52),
      femaleVoters: d.genderFemale ?? Math.round(d.registeredVoters * 0.48),
      pollingCenters: d.districtCenters ?? 1,
      pollingStations: d.districtStations ?? Math.round(d.registeredVoters / 400),
    }));

    return NextResponse.json(mappedData);
  } catch (error) {
    console.error('Error fetching commission data:', error);
    return NextResponse.json({ error: 'فشل في جلب بيانات المفوضية' }, { status: 500 });
  }
}

// POST /api/commission-data - إضافة بيانات مفوضية شاملة
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const { user } = authResult;
    if (!checkMethodPermission(user.role, 'POST', 'commission-data')) {
      return NextResponse.json({ error: 'غير مسموح' }, { status: 403 });
    }

    const body = await request.json();

    const parseIntSafe = (v: any) => v !== undefined && v !== null && v !== '' ? parseInt(String(v)) : undefined;
    const parseFloatSafe = (v: any) => v !== undefined && v !== null && v !== '' ? parseFloat(String(v)) : undefined;
    const parseJsonSafe = (v: any) => {
      if (!v) return undefined;
      if (typeof v === 'object') return v;
      try { return JSON.parse(v); } catch { return undefined; }
    };

    const data = await db.commissionData.create({
      data: {
        province: body.province || body.governorate || 'ذي قار',
        district: body.district || 'الناصرية',
        subDistrict: body.subDistrict || 'المركز',
        pollingCenter: body.pollingCenter || body.pollingCenterName || `مركز-${Date.now()}`,
        ballotStation: body.ballotStation || '1',
        registeredVoters: parseIntSafe(body.registeredVoters) ?? 0,
        historicalTurnout: parseFloatSafe(body.historicalTurnout) ?? parseFloatSafe(body.participationRate) ?? 40.0,
        expectedTurnout: parseFloatSafe(body.expectedTurnout),
        // أ - البيانات الأساسية للناخبين
        provinceRegistered: parseIntSafe(body.provinceRegistered),
        districtRegistered: parseIntSafe(body.districtRegistered),
        subDistrictRegistered: parseIntSafe(body.subDistrictRegistered),
        actualTurnout: parseFloatSafe(body.actualTurnout),
        ageDistribution: parseJsonSafe(body.ageDistribution),
        genderMale: parseIntSafe(body.genderMale),
        genderFemale: parseIntSafe(body.genderFemale),
        educationDistribution: parseJsonSafe(body.educationDistribution),
        provinceCenters: parseIntSafe(body.provinceCenters),
        districtCenters: parseIntSafe(body.districtCenters),
        subDistrictCenters: parseIntSafe(body.subDistrictCenters),
        provinceStations: parseIntSafe(body.provinceStations),
        districtStations: parseIntSafe(body.districtStations),
        subDistrictStations: parseIntSafe(body.subDistrictStations),
        votersPerCenter: parseIntSafe(body.votersPerCenter),
        registryUpdateRate: parseFloatSafe(body.registryUpdateRate),
        newVotersCount: parseIntSafe(body.newVotersCount),
        urbanRuralRatio: parseJsonSafe(body.urbanRuralRatio),
        // ب - النتائج الانتخابية
        votesPerParty: parseJsonSafe(body.votesPerParty),
        percentagePerParty: parseJsonSafe(body.percentagePerParty),
        votesPerCandidate: parseJsonSafe(body.votesPerCandidate),
        percentagePerCandidate: parseJsonSafe(body.percentagePerCandidate),
        resultsByCenter: parseJsonSafe(body.resultsByCenter),
        seatsPerParty: parseJsonSafe(body.seatsPerParty),
        expectedTurnoutRate: parseFloatSafe(body.expectedTurnoutRate),
        resultsGeographic: parseJsonSafe(body.resultsGeographic),
        candidateRanking: parseJsonSafe(body.candidateRanking),
        candidateWinRateByCenter: parseJsonSafe(body.candidateWinRateByCenter),
        // ج - التحليل الانتخابي
        previousResults: parseJsonSafe(body.previousResults),
        turnoutChange: parseFloatSafe(body.turnoutChange),
        partyStrengthChange: parseJsonSafe(body.partyStrengthChange),
        regionContribution: parseFloatSafe(body.regionContribution),
        regionRankByStrength: parseIntSafe(body.regionRankByStrength),
        // د - البيانات المتغيرة
        popularMood: body.popularMood || undefined,
        hotIssues: parseJsonSafe(body.hotIssues),
        opinionTrends: parseJsonSafe(body.opinionTrends),
        satisfactionRate: parseFloatSafe(body.satisfactionRate),
        opponentStrength: parseJsonSafe(body.opponentStrength),
        influentialEvents: parseJsonSafe(body.influentialEvents),
        digitalTrend: parseJsonSafe(body.digitalTrend),
        // هـ - الإنذار المبكر
        threatenedRegions: parseJsonSafe(body.threatenedRegions),
        penetrableRegions: parseJsonSafe(body.penetrableRegions),
        safeRegions: parseJsonSafe(body.safeRegions),
        swingRegions: parseJsonSafe(body.swingRegions),
        lowTurnoutRegions: parseJsonSafe(body.lowTurnoutRegions),
        highCompetitionRegions: parseJsonSafe(body.highCompetitionRegions),
      }
    });

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error creating commission data:', error);
    return NextResponse.json({ error: 'فشل في إضافة بيانات المفوضية' }, { status: 500 });
  }
}

// PUT /api/commission-data - تعديل بيانات مفوضية
export async function PUT(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const { user } = authResult;
    if (!checkMethodPermission(user.role, 'PUT', 'commission-data')) {
      return NextResponse.json({ error: 'غير مسموح' }, { status: 403 });
    }

    const body = await request.json();
    if (!body.id) {
      return NextResponse.json({ error: 'معرّف السجل مطلوب' }, { status: 400 });
    }

    const parseIntSafe = (v: any) => v !== undefined && v !== null && v !== '' ? parseInt(String(v)) : undefined;
    const parseFloatSafe = (v: any) => v !== undefined && v !== null && v !== '' ? parseFloat(String(v)) : undefined;
    const parseJsonSafe = (v: any) => {
      if (v === undefined) return undefined;
      if (v === null) return null;
      if (typeof v === 'object') return v;
      try { return JSON.parse(v); } catch { return undefined; }
    };

    const updateData: any = {};
    const fields = [
      'province', 'district', 'subDistrict', 'pollingCenter', 'ballotStation', 'popularMood'
    ];
    fields.forEach(f => { if (body[f] !== undefined) updateData[f] = body[f]; });

    const intFields = [
      'registeredVoters', 'provinceRegistered', 'districtRegistered', 'subDistrictRegistered',
      'genderMale', 'genderFemale', 'provinceCenters', 'districtCenters', 'subDistrictCenters',
      'provinceStations', 'districtStations', 'subDistrictStations', 'votersPerCenter',
      'newVotersCount', 'regionRankByStrength'
    ];
    intFields.forEach(f => { if (body[f] !== undefined) updateData[f] = parseIntSafe(body[f]); });

    const floatFields = [
      'historicalTurnout', 'expectedTurnout', 'actualTurnout', 'registryUpdateRate',
      'expectedTurnoutRate', 'turnoutChange', 'regionContribution', 'satisfactionRate'
    ];
    floatFields.forEach(f => { if (body[f] !== undefined) updateData[f] = parseFloatSafe(body[f]); });

    const jsonFields = [
      'ageDistribution', 'educationDistribution', 'urbanRuralRatio',
      'votesPerParty', 'percentagePerParty', 'votesPerCandidate', 'percentagePerCandidate',
      'resultsByCenter', 'seatsPerParty', 'resultsGeographic', 'candidateRanking',
      'candidateWinRateByCenter', 'previousResults', 'partyStrengthChange',
      'hotIssues', 'opinionTrends', 'opponentStrength', 'influentialEvents', 'digitalTrend',
      'threatenedRegions', 'penetrableRegions', 'safeRegions', 'swingRegions',
      'lowTurnoutRegions', 'highCompetitionRegions'
    ];
    jsonFields.forEach(f => { if (body[f] !== undefined) updateData[f] = parseJsonSafe(body[f]); });

    const updated = await db.commissionData.update({
      where: { id: body.id },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating commission data:', error);
    return NextResponse.json({ error: 'فشل في تعديل بيانات المفوضية' }, { status: 500 });
  }
}

// DELETE /api/commission-data - حذف بيانات مفوضية
export async function DELETE(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const { user } = authResult;
    if (!checkMethodPermission(user.role, 'DELETE', 'commission-data')) {
      return NextResponse.json({ error: 'غير مسموح' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'معرّف السجل مطلوب' }, { status: 400 });
    }

    await db.commissionData.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting commission data:', error);
    return NextResponse.json({ error: 'فشل في حذف بيانات المفوضية' }, { status: 500 });
  }
}
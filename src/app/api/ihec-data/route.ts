import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, checkMethodPermission } from '@/lib/auth-guard';

// GET /api/ihec-data - بيانات المفوضية العليا (alias route)
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const { user } = authResult;
    if (!checkMethodPermission(user.role, 'GET', 'ihec-data')) {
      return NextResponse.json({ error: 'غير مسموح' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const district = searchParams.get('district');
    const subDistrict = searchParams.get('subDistrict');

    const where: any = {};
    if (district) where.district = district;
    if (subDistrict) where.subDistrict = subDistrict;

    const data = await db.commissionData.findMany({ where, orderBy: { createdAt: 'desc' } });

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
    console.error('Error fetching IHEC data:', error);
    return NextResponse.json({ error: 'فشل في جلب بيانات المفوضية' }, { status: 500 });
  }
}

// POST /api/ihec-data - إضافة بيانات مفوضية (alias route)
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const { user } = authResult;
    if (!checkMethodPermission(user.role, 'POST', 'ihec-data')) {
      return NextResponse.json({ error: 'غير مسموح' }, { status: 403 });
    }

    const body = await request.json();

    const data = await db.commissionData.create({
      data: {
        province: body.province || body.governorate || 'ذي قار',
        district: body.district || 'الناصرية',
        subDistrict: body.subDistrict || 'المركز',
        pollingCenter: body.pollingCenter || body.pollingCenterName || `مركز-${Date.now()}`,
        ballotStation: body.ballotStation || '1',
        registeredVoters: body.registeredVoters ? parseInt(body.registeredVoters) : 0,
        historicalTurnout: body.historicalTurnout ? parseFloat(body.historicalTurnout) : parseFloat(body.participationRate || '40.0'),
        expectedTurnout: body.expectedTurnout ? parseFloat(body.expectedTurnout) : undefined,
      }
    });

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error creating IHEC data:', error);
    return NextResponse.json({ error: 'فشل في إضافة بيانات المفوضية' }, { status: 500 });
  }
}
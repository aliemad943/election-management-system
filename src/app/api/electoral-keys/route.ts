import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, checkMethodPermission } from '@/lib/auth-guard';
import { enrichElectoralKey } from '@/lib/indicators-helper';

function mapGender(genderStr: string | null): string {
  if (genderStr === 'أنثى') return 'أنثى';
  return 'ذكر';
}

function mapDegree(degreeStr: string | null): string {
  if (!degreeStr) return 'بكالوريوس';
  return degreeStr;
}

// GET /api/electoral-keys - قائمة المفاتيح الانتخابية مع فلاتر
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const { user } = authResult;
    if (!checkMethodPermission(user.role, 'GET', 'electoral-keys')) {
      return NextResponse.json({ error: 'غير مسموح' }, { status: 403 });
    }
    const { searchParams } = new URL(request.url);
    const district = searchParams.get('district');
    const search = searchParams.get('search');
    const tribeId = searchParams.get('tribeId');

    const where: any = {};

    if (district) where.district = district;
    if (tribeId) where.tribeId = tribeId;
    if (search) {
      where.OR = [
        { keyCode: { contains: search } },
        { firstName: { contains: search } },
        { fatherName: { contains: search } },
        { phone: { contains: search } },
      ];
    }

    const [keys, allVoters, sentimentTrends] = await Promise.all([
      db.electionKey.findMany({
        where,
        include: {
          voters: true,
          services: true,
          tribe: true,
          subTribe: true,
        },
        orderBy: { expectedVotes: 'desc' },
      }),
      db.voter.findMany({}),
      db.sentimentTrend.findMany({}),
    ]);

    // Enrich for frontend compatibility using helper
    const enriched = keys.map((key) => {
      const enrichedKey = enrichElectoralKey(key, allVoters, sentimentTrends);

      return {
        ...enrichedKey,
        code: key.keyCode,
        gender: key.gender === 'أنثى' ? 'أنثى' : 'ذكر',
        educationLevel: key.education,
        nickname: key.tribe?.name || 'غير محدد',
        classification: enrichedKey.weightedScore >= 80 ? 'قوي' : enrichedKey.weightedScore >= 60 ? 'جيد' : enrichedKey.weightedScore >= 30 ? 'مقبول' : 'ضعيف',
        voterCount: enrichedKey.voters.length,
      };
    });

    return NextResponse.json(enriched);
  } catch (error) {
    console.error('Error fetching electoral keys:', error);
    return NextResponse.json({ error: 'فشل في جلب المفاتيح الانتخابية' }, { status: 500 });
  }
}

// POST /api/electoral-keys - إنشاء مفتاح انتخابي جديد
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const { user } = authResult;
    if (!checkMethodPermission(user.role, 'POST', 'electoral-keys')) {
      return NextResponse.json({ error: 'غير مسموح' }, { status: 403 });
    }
    const body = await request.json();

    // Map tribe name/id
    let tribeId: string | null = null;
    let subTribeId: string | null = null;

    if (body.tribeId) {
      tribeId = body.tribeId;
    } else if (body.nickname || body.tribe) {
      // Find or create tribe by name
      const tribeName = body.nickname || body.tribe;
      const foundTribe = await db.tribe.findUnique({ where: { name: tribeName } });
      if (foundTribe) {
        tribeId = foundTribe.id;
      } else {
        const newTribe = await db.tribe.create({ data: { name: tribeName } });
        tribeId = newTribe.id;
      }
    }

    const key = await db.electionKey.create({
      data: {
        keyCode: body.keyCode || body.code,
        firstName: body.firstName,
        fatherName: body.fatherName || '',
        grandfatherName: body.grandfatherName || '',
        fourthName: body.fourthName || '',
        gender: mapGender(body.gender),
        birthDate: body.birthDate ? new Date(body.birthDate) : new Date('1980-01-01'),
        education: mapDegree(body.education || body.educationLevel),
        profession: body.profession || '',
        phone: body.phone,
        socialMedia: body.socialMedia || {},
        province: body.province || body.governorate || 'ذي قار',
        district: body.district || 'الغراف',
        subDistrict: body.subDistrict || 'المركز',
        pollingCenter: body.pollingCenter || 'مدرسة العراق الابتدائية',
        expectedVotes: Number(body.totalVotes !== undefined ? body.totalVotes : body.expectedVotes) || 0,
        supportedVotes: Number(body.supportedVotes) || 0,
        neutralVotes: Number(body.neutralVotes) || 0,
        weakVotes: Number(body.weakVotes) || 0,
        voteProtection: Number(body.voteProtection) || 3,
        supportReason: Number(body.supportReason) || 3,
        needsLevel: Number(body.needsLevel) || 3,
        politicalNote: Number(body.politicalNote) || 3,
        organizationalNote: Number(body.organizationalNote) || 3,
        generalNote: Number(body.generalNote) || 3,
        trainingLevel: Number(body.trainingLevel) || 3,
        influenceLevel: Number(body.influenceLevel) || 3,
        mobilizationCap: Number(body.mobilizationCap || body.mobilizationAbility) || 3,
        loyaltyScore: Number(body.loyaltyScore || body.loyaltyLevel) || 3,
        riskLevel: Number(body.riskLevel) || 1,
        keyAccuracyScore: body.keyAccuracyScore !== undefined ? parseFloat(body.keyAccuracyScore) : 1.0,
        reliabilityLogs: body.reliabilityLogs || {},
        tribeId,
        subTribeId,
      },
      include: {
        voters: true,
        services: true,
        tribe: true,
        subTribe: true,
      }
    });

    return NextResponse.json(key, { status: 201 });
  } catch (error: any) {
    console.error('Error creating electoral key:', error);
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'كود المفتاح أو رقم الهاتف موجود مسبقاً' }, { status: 409 });
    }
    return NextResponse.json({ error: 'فشل في إنشاء المفتاح الانتخابي' }, { status: 500 });
  }
}
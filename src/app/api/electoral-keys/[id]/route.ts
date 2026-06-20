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

// GET /api/electoral-keys/[id] - تفاصيل مفتاح انتخابي
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const { user } = authResult;
    if (!checkMethodPermission(user.role, 'GET', 'electoral-keys')) {
      return NextResponse.json({ error: 'غير مسموح' }, { status: 403 });
    }

    const { id } = await params;
    const [key, allVoters, sentimentTrends] = await Promise.all([
      db.electionKey.findUnique({
        where: { id },
        include: {
          voters: true,
          services: true,
          tribe: true,
        },
      }),
      db.voter.findMany({}),
      db.sentimentTrend.findMany({}),
    ]);

    if (!key) {
      return NextResponse.json({ error: 'المفتاح غير موجود' }, { status: 404 });
    }

    const enrichedKey = enrichElectoralKey(key, allVoters, sentimentTrends);

    const voterStats = {
      total: enrichedKey.voters.length,
      supported: enrichedKey.supportedVotes,
      neutral: enrichedKey.neutralVotes,
      weak: enrichedKey.weakVotes,
      voted: enrichedKey.voters.filter((v) => v.votedOnDay).length,
    };

    const mappedKey = {
      ...enrichedKey,
      code: key.keyCode,
      gender: key.gender === 'أنثى' ? 'أنثى' : 'ذكر',
      educationLevel: key.education,
      nickname: key.tribe?.name || 'غير محدد',
      classification: enrichedKey.weightedScore >= 80 ? 'قوي' : enrichedKey.weightedScore >= 60 ? 'جيد' : enrichedKey.weightedScore >= 30 ? 'مقبول' : 'ضعيف',
      voterStats,
      voters: enrichedKey.voters.map(v => ({
        ...v,
        fullName: `${v.firstName} ${v.fatherName} ${v.grandfatherName} ${v.fourthName}`.trim(),
        votedStatus: v.votedOnDay,
        confidenceScore: v.supportDegree,
        voterCategory: v.status === 'SUPPORTIVE' ? 'مؤيد' : v.status === 'NEUTRAL' ? 'محايد' : 'ضعيف',
      })),
    };

    return NextResponse.json(mappedKey);
  } catch (error) {
    console.error('Error fetching electoral key:', error);
    return NextResponse.json({ error: 'فشل في جلب المفتاح الانتخابي' }, { status: 500 });
  }
}

// PUT /api/electoral-keys/[id] - تحديث مفتاح انتخابي
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const { user } = authResult;
    if (!checkMethodPermission(user.role, 'PUT', 'electoral-keys')) {
      return NextResponse.json({ error: 'غير مسموح' }, { status: 403 });
    }

    const { id } = await params;

    // Ensure key exists before attempting update
    const existing = await db.electionKey.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'المفتاح الانتخابي غير موجود', details: `id=${id}` }, { status: 404 });
    }

    const body = await request.json();

    // Map tribe name/id
    let tribeId: string | undefined = undefined;
    if (body.tribeId && typeof body.tribeId === 'string' && body.tribeId.trim()) {
      // Validate the tribe exists before using its ID
      const tribeExists = await db.tribe.findUnique({ where: { id: body.tribeId.trim() } });
      if (tribeExists) {
        tribeId = body.tribeId.trim();
      }
    } else if (body.tribe && typeof body.tribe === 'string' && body.tribe.trim()) {
      const tribeName = body.tribe.trim();
      const foundTribe = await db.tribe.findUnique({ where: { name: tribeName } });
      tribeId = foundTribe?.id ?? (await db.tribe.create({ data: { name: tribeName } })).id;
    } else if (body.nickname && typeof body.nickname === 'string' && body.nickname.trim() && body.nickname !== 'غير محدد') {
      const tribeName = body.nickname.trim();
      const foundTribe = await db.tribe.findUnique({ where: { name: tribeName } });
      tribeId = foundTribe?.id ?? (await db.tribe.create({ data: { name: tribeName } })).id;
    }

    // Handle socialMedia - accept object or JSON string
    let socialMediaValue: object | undefined = undefined;
    if (body.socialMedia) {
      if (typeof body.socialMedia === 'string') {
        try { socialMediaValue = JSON.parse(body.socialMedia); } catch { socialMediaValue = {}; }
      } else if (typeof body.socialMedia === 'object') {
        socialMediaValue = body.socialMedia;
      }
    }

    // Handle birth date - client may send dateOfBirth or birthDate
    // Guard against empty strings and invalid dates
    const birthDateRaw = body.birthDate || body.dateOfBirth;
    let birthDateValue: Date | undefined = undefined;
    if (birthDateRaw && birthDateRaw.toString().trim()) {
      const parsed = new Date(birthDateRaw);
      if (!isNaN(parsed.getTime())) {
        birthDateValue = parsed;
      }
    }

    // Only update phone if it's a non-empty valid value
    const phoneValue = body.phone && typeof body.phone === 'string' && body.phone.trim()
      ? body.phone.trim()
      : undefined;

    // Helper: only include non-empty strings for required string fields
    const nonEmptyStr = (val: any): string | undefined => {
      if (val && typeof val === 'string' && val.trim()) return val.trim();
      return undefined;
    };

    // Helper: safely convert to number, return undefined if invalid
    const safeNum = (val: any): number | undefined => {
      if (val === undefined || val === null || val === '') return undefined;
      const n = Number(val);
      return isNaN(n) ? undefined : n;
    };

    const key = await db.electionKey.update({
      where: { id },
      data: {
        keyCode: nonEmptyStr(body.keyCode || body.code),
        firstName: nonEmptyStr(body.firstName),
        fatherName: body.fatherName ?? undefined,
        grandfatherName: body.grandfatherName ?? undefined,
        fourthName: body.fourthName ?? undefined,
        tribeId: tribeId,
        gender: body.gender ? mapGender(body.gender) : undefined,
        birthDate: birthDateValue,
        education: (body.education || body.educationLevel)
          ? mapDegree(body.education || body.educationLevel)
          : undefined,
        profession: body.profession ?? undefined,
        phone: phoneValue,
        socialMedia: socialMediaValue,
        province: nonEmptyStr(body.province || body.governorate),
        district: nonEmptyStr(body.district),
        subDistrict: nonEmptyStr(body.subDistrict || body.area),
        pollingCenter: nonEmptyStr(body.pollingCenter),
        expectedVotes: body.totalVotes !== undefined ? Number(body.totalVotes)
          : body.expectedVotes !== undefined ? Number(body.expectedVotes)
          : undefined,
        supportedVotes: safeNum(body.supportedVotes),
        neutralVotes: safeNum(body.neutralVotes),
        weakVotes: safeNum(body.weakVotes),
        voteProtection: safeNum(body.voteProtection),
        supportReason: safeNum(body.supportReason),
        needsLevel: safeNum(body.needsLevel),
        politicalNote: safeNum(body.politicalNote),
        organizationalNote: safeNum(body.organizationalNote),
        generalNote: safeNum(body.generalNote),
        trainingLevel: safeNum(body.trainingLevel),
        influenceLevel: safeNum(body.influenceLevel),
        mobilizationCap: body.mobilizationCap !== undefined ? safeNum(body.mobilizationCap)
          : body.mobilizationAbility !== undefined ? safeNum(body.mobilizationAbility)
          : undefined,
        loyaltyScore: body.loyaltyScore !== undefined ? safeNum(body.loyaltyScore)
          : body.loyaltyLevel !== undefined ? safeNum(body.loyaltyLevel)
          : undefined,
        riskLevel: safeNum(body.riskLevel),
        keyAccuracyScore: body.keyAccuracyScore !== undefined ? parseFloat(body.keyAccuracyScore) : undefined,
      },
      include: {
        voters: true,
        services: true,
        tribe: true,
        subTribe: true,
      },
    });

    return NextResponse.json(key);
  } catch (error: any) {
    console.error('Error updating electoral key:', error?.message || error);
    console.error('Full error:', JSON.stringify(error, null, 2));

    // معالجة خطأ تكرار القيم الفريدة (رقم الهاتف / كود المفتاح)
    if (error?.code === 'P2002') {
      const target: string[] = error?.meta?.target || [];
      let field = 'القيمة المدخلة';
      if (target.includes('phone')) field = 'رقم الهاتف';
      else if (target.includes('keyCode')) field = 'كود المفتاح';

      return NextResponse.json({
        error: `${field} مستخدم بالفعل لدى مفتاح انتخابي آخر`,
        details: error?.message,
        code: error?.code,
      }, { status: 409 });
    }

    return NextResponse.json({
      error: 'فشل في تحديث المفتاح الانتخابي',
      details: error?.message,
      code: error?.code,
    }, { status: 500 });
  }
}

// DELETE /api/electoral-keys/[id] - حذف مفتاح انتخابي
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const { user } = authResult;
    if (!checkMethodPermission(user.role, 'DELETE', 'electoral-keys')) {
      return NextResponse.json({ error: 'غير مسموح' }, { status: 403 });
    }

    const { id } = await params;
    
    await db.service.deleteMany({ where: { keyId: id } });
    await db.voter.deleteMany({ where: { keyId: id } });
    
    await db.electionKey.delete({
      where: { id },
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting electoral key:', error);
    return NextResponse.json({ error: 'فشل في حذف المفتاح الانتخابي' }, { status: 500 });
  }
}
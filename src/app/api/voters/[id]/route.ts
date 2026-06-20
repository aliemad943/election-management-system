import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, checkMethodPermission } from '@/lib/auth-guard';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const { user } = authResult;
    if (!checkMethodPermission(user.role, 'GET', 'voters')) {
      return NextResponse.json({ error: 'غير مسموح' }, { status: 403 });
    }

    const { id } = await params;
    const voter = await db.voter.findUnique({
      where: { id },
      include: {
        electionKey: { select: { id: true, keyCode: true, firstName: true, fatherName: true } },
        tribe: true,
        subTribe: true,
      },
    });

    if (!voter) {
      return NextResponse.json({ error: 'الناخب غير موجود' }, { status: 404 });
    }

    const mapped = {
      ...voter,
      fullName: `${voter.firstName} ${voter.fatherName} ${voter.grandfatherName} ${voter.fourthName}`.trim(),
      phoneNumber: voter.phone,
      nickname: voter.tribe?.name || 'غير محدد',
    };

    return NextResponse.json(mapped);
  } catch (error) {
    console.error('Error fetching voter:', error);
    return NextResponse.json({ error: 'فشل في جلب بيانات الناخب' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const { user } = authResult;
    if (!checkMethodPermission(user.role, 'PUT', 'voters')) {
      return NextResponse.json({ error: 'غير مسموح' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    let parsedSocialMedia: any = undefined;
    if (body.socialMedia !== undefined) {
      if (body.socialMedia === null) {
        parsedSocialMedia = null;
      } else {
        try {
          parsedSocialMedia = typeof body.socialMedia === 'string' ? JSON.parse(body.socialMedia) : body.socialMedia;
        } catch (e) {
          console.error('Failed to parse social media JSON in PUT:', e);
        }
      }
    }

    const voter = await db.voter.update({
      where: { id },
      data: {
        firstName: body.firstName,
        fatherName: body.fatherName,
        grandfatherName: body.grandfatherName,
        fourthName: body.fourthName,
        gender: body.gender,
        birthDate: body.birthDate ? new Date(body.birthDate) : (body.dateOfBirth ? new Date(body.dateOfBirth) : undefined),
        phone: body.phone !== undefined ? body.phone : body.phoneNumber,
        education: (body.education || body.educationLevel) || undefined,
        profession: body.profession,
        maritalStatus: body.maritalStatus,
        familySize: body.familySize !== undefined ? Number(body.familySize) : undefined,
        nationalId: body.nationalId,
        area: body.area,
        socialMedia: parsedSocialMedia as any,
        firstContactDate: body.firstContactDate ? new Date(body.firstContactDate) : undefined,
        province: body.province,
        district: body.district,
        subDistrict: body.subDistrict,
        pollingCenter: body.pollingCenter || body.pollingCenterName,
        ballotStation: body.ballotStation || body.pollingCenterId,
        status: body.status,
        supportDegree: body.supportDegree !== undefined ? Number(body.supportDegree) : (body.confidenceScore !== undefined ? Number(body.confidenceScore) : undefined),
        supportReason: body.supportReason,
        voterCategory: body.voterCategory,
        conversionPath: body.conversionPath,
        votedOnDay: body.votedOnDay !== undefined ? Boolean(body.votedOnDay) : undefined,
        keyId: body.keyId || body.electoralKeyId,
        relationship: body.relationship,
        influenceRate: body.influenceRate !== undefined ? Number(body.influenceRate) : undefined,
        isPrimaryFollow: body.isPrimaryFollow !== undefined ? Boolean(body.isPrimaryFollow) : undefined,
        lastContactDate: body.lastContactDate ? new Date(body.lastContactDate) : undefined,
        contactResult: body.contactResult,
        nextAction: body.nextAction,
        followUpDate: body.followUpDate ? new Date(body.followUpDate) : undefined,
        tribeId: body.tribeId,
        subTribeId: body.subTribeId,
        latitude: body.latitude !== undefined ? (body.latitude === null ? null : Number(body.latitude)) : undefined,
        longitude: body.longitude !== undefined ? (body.longitude === null ? null : Number(body.longitude)) : undefined,
        gpsVerified: body.gpsVerified !== undefined ? Boolean(body.gpsVerified) : undefined,
        isRegistryVerified: body.isRegistryVerified !== undefined ? Boolean(body.isRegistryVerified) : undefined,
        registryVoterId: body.registryVoterId !== undefined ? body.registryVoterId : undefined,
      },
      include: {
        electionKey: { select: { id: true, keyCode: true, firstName: true, fatherName: true } },
        tribe: true,
        subTribe: true,
      },
    });

    const mapped = {
      ...voter,
      fullName: `${voter.firstName} ${voter.fatherName} ${voter.grandfatherName} ${voter.fourthName}`.trim(),
      phoneNumber: voter.phone,
      nickname: voter.tribe?.name || 'غير محدد',
    };

    return NextResponse.json(mapped);
  } catch (error) {
    console.error('Error updating voter:', error);
    return NextResponse.json({ error: 'فشل في تحديث بيانات الناخب' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const { user } = authResult;
    if (!checkMethodPermission(user.role, 'DELETE', 'voters')) {
      return NextResponse.json({ error: 'غير مسموح' }, { status: 403 });
    }

    const { id } = await params;
    await db.voter.delete({ where: { id } });
    return NextResponse.json({ message: 'تم حذف الناخب بنجاح' });
  } catch (error) {
    console.error('Error deleting voter:', error);
    return NextResponse.json({ error: 'فشل في حذف الناخب' }, { status: 500 });
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, checkMethodPermission } from '@/lib/auth-guard';
import { calculateAllCompositeIndicators } from '@/lib/indicators-engine';

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const { user } = authResult;
    if (!checkMethodPermission(user.role, 'GET', 'war-room')) {
      return NextResponse.json({ error: 'غير مسموح' }, { status: 403 });
    }

    // Get composite indicators (predictions/seat projection)
    const indicators = await calculateAllCompositeIndicators();

    // Get general stats
    const voters = await db.voter.findMany({
      where: { province: 'ذي قار' },
    });

    const totalVoters = voters.length;
    const votedCount = voters.filter(v => v.votedOnDay).length;
    const votedPercentage = totalVoters > 0 ? Math.round((votedCount / totalVoters) * 100) : 0;
    const highConfidenceCount = voters.filter(v => v.supportDegree >= 4).length;

    return NextResponse.json({
      title: "غرفة العمليات الانتخابية المركزية",
      status: "LIVE",
      totalVoters,
      votedCount,
      votedPercentage,
      highConfidenceCount,
      projectedSeats: indicators.governorate.projectedSeats,
      governorateGsi: indicators.governorate.gsiScore,
      governorateEdri: indicators.governorate.edriScore,
      districts: indicators.districts,
    });
  } catch (error) {
    console.error('Error in war-room API:', error);
    return NextResponse.json({ error: 'فشل في جلب بيانات غرفة العمليات' }, { status: 500 });
  }
}
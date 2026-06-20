import { NextRequest, NextResponse } from 'next/server';
import { calculateComprehensiveIndicators } from '@/lib/comprehensive-indicators-engine';
import { requireAuth, checkMethodPermission } from '@/lib/auth-guard';

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const { user } = authResult;
    if (!checkMethodPermission(user.role, 'GET', 'comprehensive-indicators')) {
      return NextResponse.json({ error: 'غير مسموح' }, { status: 403 });
    }

    const data = await calculateComprehensiveIndicators();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error calculating comprehensive indicators:', error);
    return NextResponse.json(
      { error: 'Failed to calculate indicators', details: error?.message },
      { status: 500 }
    );
  }
}
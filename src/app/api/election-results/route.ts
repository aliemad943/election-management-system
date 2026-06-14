import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, checkMethodPermission } from '@/lib/auth-guard';

const mockResults = [
  {
    id: 'res-1',
    electionYear: '2023',
    governorate: 'ذي قار',
    district: 'الغراف',
    partyOrList: 'ائتلاف دولة القانون',
    partyPercentage: 25.5,
    partyVotes: 4200,
    candidateName: 'حيدر الغزي',
    candidateVotes: 2100,
    seatsWon: 1,
    participationChange: 2.1,
    partyStrengthChange: 1.5,
  },
  {
    id: 'res-2',
    electionYear: '2023',
    governorate: 'ذي قار',
    district: 'الغراف',
    partyOrList: 'تيار الحكمة الوطني',
    partyPercentage: 18.2,
    partyVotes: 2900,
    candidateName: 'علي الركابي',
    candidateVotes: 1450,
    seatsWon: 0,
    participationChange: 1.2,
    partyStrengthChange: -0.8,
  }
];

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const { user } = authResult;
    if (!checkMethodPermission(user.role, 'GET', 'election-results')) {
      return NextResponse.json({ error: 'غير مسموح' }, { status: 403 });
    }

    return NextResponse.json(mockResults);
  } catch (error) {
    console.error('Error fetching election results:', error);
    return NextResponse.json({ error: 'فشل في جلب نتائج الانتخابات' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const { user } = authResult;
    if (!checkMethodPermission(user.role, 'POST', 'election-results')) {
      return NextResponse.json({ error: 'غير مسموح' }, { status: 403 });
    }

    return NextResponse.json(mockResults[0], { status: 201 });
  } catch (error) {
    console.error('Error in election results POST:', error);
    return NextResponse.json({ error: 'فشل في إضافة النتيجة' }, { status: 500 });
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, checkMethodPermission } from '@/lib/auth-guard';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const { user } = authResult;
    if (!checkMethodPermission(user.role, 'GET', 'tribes')) {
      return NextResponse.json({ error: 'غير مسموح' }, { status: 403 });
    }

    const { id } = await params;
    const tribe = await db.tribe.findUnique({
      where: { id },
      include: { subTribes: true, voters: true, electionKeys: true }
    });

    if (!tribe) {
      return NextResponse.json({ error: 'العشيرة غير موجودة' }, { status: 404 });
    }

    return NextResponse.json(tribe);
  } catch (error) {
    console.error('Error fetching tribe:', error);
    return NextResponse.json({ error: 'فشل في جلب بيانات العشيرة' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const { user } = authResult;
    if (!checkMethodPermission(user.role, 'PUT', 'tribes')) {
      return NextResponse.json({ error: 'غير مسموح' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name } = body;

    const tribe = await db.tribe.update({
      where: { id },
      data: { name }
    });

    return NextResponse.json(tribe);
  } catch (error) {
    console.error('Error updating tribe:', error);
    return NextResponse.json({ error: 'فشل في تحديث بيانات العشيرة' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const { user } = authResult;
    if (!checkMethodPermission(user.role, 'DELETE', 'tribes')) {
      return NextResponse.json({ error: 'غير مسموح' }, { status: 403 });
    }

    const { id } = await params;
    await db.tribe.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting tribe:', error);
    return NextResponse.json({ error: 'فشل في حذف العشيرة' }, { status: 500 });
  }
}
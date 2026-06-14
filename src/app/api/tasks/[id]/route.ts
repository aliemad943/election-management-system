import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, checkMethodPermission } from '@/lib/auth-guard';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const { user } = authResult;
    if (!checkMethodPermission(user.role, 'PUT', 'tasks')) {
      return NextResponse.json({ error: 'غير مسموح' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    let dbStatus = 'قيد المتابعة';
    if (status === 'COMPLETED') dbStatus = 'منجزة';
    else if (status === 'CANCELLED') dbStatus = 'مرفوضة';
    else if (status === 'IN_PROGRESS') dbStatus = 'قيد المتابعة';

    const service = await db.service.update({
      where: { id },
      data: {
        status: dbStatus
      },
      include: {
        electionKey: true
      }
    });

    // Map back to task structure for frontend
    const mapped = {
      id: service.id,
      title: service.title,
      description: service.description,
      priority: 'NORMAL',
      status: status,
      taskType: service.category,
      targetVoter: service.electionKey ? {
        id: service.electionKey.id,
        fullName: `${service.electionKey.firstName} ${service.electionKey.fatherName}`,
        phoneNumber: service.electionKey.phone,
      } : null,
      assignedTo: {
        id: 'admin',
        name: 'مدير النظام',
        district: service.electionKey?.district || 'الغراف',
      },
      createdAt: service.createdAt,
    };

    return NextResponse.json(mapped);
  } catch (error) {
    console.error('Error updating task:', error);
    return NextResponse.json({ error: 'فشل في تحديث المهمة' }, { status: 500 });
  }
}
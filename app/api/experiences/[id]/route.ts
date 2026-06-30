import { NextResponse } from 'next/server';
import { adminUpdateExperience } from '@/lib/admin-service';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (!body.content) {
      return NextResponse.json({ error: 'Missing content field' }, { status: 400 });
    }

    const updatedExperience = await adminUpdateExperience(id, { content: body.content });

    return NextResponse.json({ success: true, data: updatedExperience });
  } catch (error: any) {
    console.error("Error updating experience:", error);
    return NextResponse.json({ error: error.message || String(error) }, { status: 500 });
  }
}

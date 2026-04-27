import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const parentId = searchParams.get('parent_id');

    let query = supabase
      .from('goals')
      .select('*, tasks(id, title, status, date, task_type)')
      .order('created_at', { ascending: false });

    if (type) query = query.eq('type', type);
    if (status) query = query.eq('status', status);
    if (parentId) query = query.eq('parent_id', parentId);

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { title, description, type, parent_id, start_date, end_date, status, remarks } = body;

    if (!title || !type || !start_date || !end_date) {
      return NextResponse.json(
        { error: 'title, type, start_date, and end_date are required' },
        { status: 400 }
      );
    }

    if (!['monthly', 'weekly'].includes(type)) {
      return NextResponse.json({ error: 'type must be monthly or weekly' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('goals')
      .insert({
        title,
        description: description || null,
        type,
        parent_id: parent_id || null,
        start_date,
        end_date,
        status: status || 'pending',
        remarks: remarks || null,
        user_id: user.id,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

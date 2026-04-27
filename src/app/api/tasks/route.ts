import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const goalId = searchParams.get('goal_id');
    const date = searchParams.get('date');
    const status = searchParams.get('status');
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    let query = supabase
      .from('tasks')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (goalId) query = query.eq('goal_id', goalId);
    if (date) query = query.eq('date', date);
    if (status) query = query.eq('status', status);
    if (from) query = query.gte('date', from);
    if (to) query = query.lte('date', to);

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
    const { goal_id, title, description, date, task_type, youtube_url, youtube_title, status, remarks, sort_order } = body;

    if (!title || !date) {
      return NextResponse.json({ error: 'title and date are required' }, { status: 400 });
    }

    if (task_type && !['study', 'video', 'revision', 'practice', 'other'].includes(task_type)) {
      return NextResponse.json({ error: 'Invalid task_type' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        goal_id: goal_id || null,
        title,
        description: description || null,
        date,
        task_type: task_type || 'study',
        youtube_url: youtube_url || null,
        youtube_title: youtube_title || null,
        status: status || 'pending',
        remarks: remarks || null,
        sort_order: sort_order || 0,
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

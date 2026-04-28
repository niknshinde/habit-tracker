import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'week'; // week, month, all
    const today = new Date();

    let fromDate: string;
    let toDate: string = format(today, 'yyyy-MM-dd');

    switch (period) {
      case 'week':
        fromDate = format(subDays(today, 6), 'yyyy-MM-dd');
        break;
      case 'month':
        fromDate = format(startOfMonth(today), 'yyyy-MM-dd');
        toDate = format(endOfMonth(today), 'yyyy-MM-dd');
        break;
      case 'all':
        fromDate = '2020-01-01';
        break;
      default:
        fromDate = format(subDays(today, 6), 'yyyy-MM-dd');
    }

    // Fetch study sessions for the period
    const { data: sessions, error: sessionsError } = await supabase
      .from('study_sessions')
      .select('*')
      .gte('date', fromDate)
      .lte('date', toDate)
      .order('date', { ascending: true });

    if (sessionsError) {
      return NextResponse.json({ error: sessionsError.message }, { status: 500 });
    }

    // Also fetch last 14 days for comparison (regardless of period)
    const { data: recentSessions } = await supabase
      .from('study_sessions')
      .select('*')
      .gte('date', format(subDays(today, 13), 'yyyy-MM-dd'))
      .lte('date', format(today, 'yyyy-MM-dd'));

    // Fetch tasks for last 30 days for streak calculation (based on task completion)
    const { data: streakTasks } = await supabase
      .from('tasks')
      .select('date, status')
      .gte('date', format(subDays(today, 29), 'yyyy-MM-dd'))
      .lte('date', format(today, 'yyyy-MM-dd'));

    // Fetch goals for the period
    const { data: goals, error: goalsError } = await supabase
      .from('goals')
      .select('*')
      .gte('start_date', fromDate)
      .lte('start_date', toDate);

    if (goalsError) {
      return NextResponse.json({ error: goalsError.message }, { status: 500 });
    }

    // Fetch tasks for the period
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('*')
      .gte('date', fromDate)
      .lte('date', toDate);

    if (tasksError) {
      return NextResponse.json({ error: tasksError.message }, { status: 500 });
    }

    // Calculate daily study hours
    const dailyStudyHours: Record<string, number> = {};
    for (const session of sessions || []) {
      const d = session.date;
      dailyStudyHours[d] = (dailyStudyHours[d] || 0) + (session.duration_minutes || 0);
    }

    // Calculate last 14 days daily hours for comparison
    const recentDailyMinutes: Record<string, number> = {};
    for (const session of recentSessions || []) {
      const d = session.date;
      recentDailyMinutes[d] = (recentDailyMinutes[d] || 0) + (session.duration_minutes || 0);
    }

    // Convert minutes to hours for display
    const studyTimeByDay = Object.entries(dailyStudyHours).map(([date, minutes]) => ({
      date,
      hours: Math.round((minutes / 60) * 100) / 100,
      minutes,
    }));

    // Goal completion stats
    const totalGoals = goals?.length || 0;
    const completedGoals = goals?.filter(g => g.status === 'completed').length || 0;
    const goalCompletionRate = totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0;

    // Task completion stats
    const totalTasks = tasks?.length || 0;
    const completedTasks = tasks?.filter(t => t.status === 'completed').length || 0;
    const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Total study time
    const totalMinutes = (sessions || []).reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
    const totalHours = Math.round((totalMinutes / 60) * 100) / 100;

    // Today's stats
    const todayStr = format(today, 'yyyy-MM-dd');
    const todayMinutes = dailyStudyHours[todayStr] || 0;
    const todayTasks = tasks?.filter(t => t.date === todayStr) || [];
    const todayCompleted = todayTasks.filter(t => t.status === 'completed').length;

    // Yesterday's stats for comparison
    const yesterdayStr = format(subDays(today, 1), 'yyyy-MM-dd');
    const yesterdayMinutes = recentDailyMinutes[yesterdayStr] || 0;

    // Average daily study (last 7 days, excluding today)
    let avgDaysCount = 0;
    let avgDaysTotal = 0;
    for (let i = 1; i <= 7; i++) {
      const dStr = format(subDays(today, i), 'yyyy-MM-dd');
      if (recentDailyMinutes[dStr] !== undefined) {
        avgDaysTotal += recentDailyMinutes[dStr];
        avgDaysCount++;
      }
    }
    const avgDailyMinutes = avgDaysCount > 0 ? Math.round(avgDaysTotal / avgDaysCount) : 0;

    // Best day in last 7 days
    let bestDayMinutes = 0;
    let bestDayDate = '';
    for (let i = 0; i <= 6; i++) {
      const dStr = format(subDays(today, i), 'yyyy-MM-dd');
      const mins = recentDailyMinutes[dStr] || 0;
      if (mins > bestDayMinutes) {
        bestDayMinutes = mins;
        bestDayDate = dStr;
      }
    }

    // Streak calculation - based on ALL tasks being completed for a day
    // A day counts toward streak only if it has tasks AND all of them are completed
    const tasksByDate: Record<string, { total: number; completed: number }> = {};
    for (const task of streakTasks || []) {
      if (!tasksByDate[task.date]) {
        tasksByDate[task.date] = { total: 0, completed: 0 };
      }
      tasksByDate[task.date].total++;
      if (task.status === 'completed') {
        tasksByDate[task.date].completed++;
      }
    }

    let streak = 0;
    const checkDate = new Date(today);
    while (true) {
      const dateStr = format(checkDate, 'yyyy-MM-dd');
      const dayTasks = tasksByDate[dateStr];
      if (dayTasks && dayTasks.total > 0 && dayTasks.total === dayTasks.completed) {
        // All tasks for this day are completed
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else if (dateStr === todayStr) {
        // Don't break streak for today if tasks aren't all done yet
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    // Task breakdown by type
    const tasksByType: Record<string, { total: number; completed: number }> = {};
    for (const task of tasks || []) {
      if (!tasksByType[task.task_type]) {
        tasksByType[task.task_type] = { total: 0, completed: 0 };
      }
      tasksByType[task.task_type].total++;
      if (task.status === 'completed') {
        tasksByType[task.task_type].completed++;
      }
    }

    return NextResponse.json({
      period,
      fromDate,
      toDate,
      studyTimeByDay,
      totalHours,
      totalMinutes,
      goalCompletionRate,
      taskCompletionRate,
      totalGoals,
      completedGoals,
      totalTasks,
      completedTasks,
      todayMinutes,
      todayTasks: todayTasks.length,
      todayCompleted,
      yesterdayMinutes,
      avgDailyMinutes,
      bestDayMinutes,
      bestDayDate,
      streak,
      tasksByType,
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

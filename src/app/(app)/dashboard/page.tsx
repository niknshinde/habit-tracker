'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { formatHours } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import TaskItem from '@/components/task-item';
import {
  Clock,
  Play,
  Pause,
  Square,
  Target,
  CheckCircle2,
  Flame,
  BookOpen,
  ExternalLink,
  Timer,
} from 'lucide-react';
import { format } from 'date-fns';
import Celebration from '@/components/celebration';

interface Task {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  task_type: string;
  youtube_url?: string;
  youtube_title?: string;
  remarks?: string;
  date: string;
}

interface Analytics {
  todayMinutes: number;
  todayTasks: number;
  todayCompleted: number;
  taskCompletionRate: number;
  goalCompletionRate: number;
  streak: number;
  totalHours: number;
}

interface TimerState {
  elapsedSeconds: number;
  lastResumedAt: number | null;
  date: string;
}

const TIMER_KEY = 'upsc_study_timer';

function getToday(): string {
  return new Date().toLocaleDateString('en-CA');
}

function loadTimerState(): TimerState | null {
  try {
    const raw = localStorage.getItem(TIMER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed.elapsedSeconds === 'number' && typeof parsed.date === 'string') {
      return parsed;
    }
  } catch { /* corrupt */ }
  localStorage.removeItem(TIMER_KEY);
  return null;
}

function saveTimerState(state: TimerState) {
  localStorage.setItem(TIMER_KEY, JSON.stringify(state));
}

function clearTimerState() {
  localStorage.removeItem(TIMER_KEY);
}

function getCurrentElapsed(state: TimerState): number {
  if (state.lastResumedAt !== null) {
    return state.elapsedSeconds + (Date.now() - state.lastResumedAt) / 1000;
  }
  return state.elapsedSeconds;
}

function getMsUntilMidnight(): number {
  const now = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
  return midnight.getTime() - now.getTime();
}

export default function DashboardPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [timerState, setTimerState] = useState<TimerState | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [timerLoading, setTimerLoading] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const midnightRef = useRef<NodeJS.Timeout | null>(null);
  const timerStateRef = useRef<TimerState | null>(null);
  const prevCompletedRef = useRef<number>(0);

  const today = format(new Date(), 'yyyy-MM-dd');

  // Keep ref in sync
  useEffect(() => {
    timerStateRef.current = timerState;
  }, [timerState]);

  // Submit elapsed time to backend
  const submitSession = useCallback(async (seconds: number, date: string) => {
    const durationMinutes = seconds / 60;
    if (durationMinutes < 0.1) return;
    try {
      await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ duration_minutes: durationMinutes, date }),
      });
    } catch (err) {
      console.error('Failed to submit session:', err);
    }
  }, []);

  // Midnight handler
  const scheduleMidnightCheck = useCallback(() => {
    if (midnightRef.current) clearTimeout(midnightRef.current);
    const ms = getMsUntilMidnight();
    midnightRef.current = setTimeout(async () => {
      const current = timerStateRef.current;
      if (!current) return;
      const totalSeconds = Math.floor(getCurrentElapsed(current));
      if (totalSeconds > 0) {
        await submitSession(totalSeconds, current.date);
      }
      const newState: TimerState = {
        elapsedSeconds: 0,
        lastResumedAt: current.lastResumedAt !== null ? Date.now() : null,
        date: getToday(),
      };
      setTimerState(newState);
      saveTimerState(newState);
      scheduleMidnightCheck();
    }, ms);
  }, [submitSession]);

  const fetchData = useCallback(async () => {
    try {
      const [tasksRes, analyticsRes] = await Promise.all([
        fetch(`/api/tasks?date=${today}`),
        fetch('/api/analytics?period=week'),
      ]);
      if (tasksRes.ok) setTasks(await tasksRes.json());
      if (analyticsRes.ok) setAnalytics(await analyticsRes.json());
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, [today]);

  // On mount: restore timer from localStorage
  useEffect(() => {
    const saved = loadTimerState();
    if (saved) {
      const todayStr = getToday();
      if (saved.date !== todayStr) {
        const totalSeconds = Math.floor(getCurrentElapsed(saved));
        if (totalSeconds > 0) {
          submitSession(totalSeconds, saved.date);
        }
        const freshState: TimerState = {
          elapsedSeconds: 0,
          lastResumedAt: saved.lastResumedAt !== null ? Date.now() : null,
          date: todayStr,
        };
        setTimerState(freshState);
        saveTimerState(freshState);
      } else {
        setTimerState(saved);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist timer state
  useEffect(() => {
    if (timerState) {
      saveTimerState(timerState);
    }
  }, [timerState]);

  // Timer tick + midnight scheduling
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    if (timerState && timerState.lastResumedAt !== null) {
      const tick = () => setElapsed(Math.floor(getCurrentElapsed(timerState)));
      tick();
      intervalRef.current = setInterval(tick, 1000);
      scheduleMidnightCheck();
    } else if (timerState) {
      setElapsed(Math.floor(timerState.elapsedSeconds));
      scheduleMidnightCheck();
    } else {
      setElapsed(0);
      if (midnightRef.current) clearTimeout(midnightRef.current);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [timerState, scheduleMidnightCheck]);

  // Cleanup midnight timer on unmount
  useEffect(() => {
    return () => {
      if (midnightRef.current) clearTimeout(midnightRef.current);
    };
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const startTimer = () => {
    const newState: TimerState = {
      elapsedSeconds: 0,
      lastResumedAt: Date.now(),
      date: getToday(),
    };
    setTimerState(newState);
  };

  const stopTimer = async () => {
    if (!timerState) return;
    setTimerLoading(true);
    try {
      const totalSeconds = Math.floor(getCurrentElapsed(timerState));
      await submitSession(totalSeconds, timerState.date);
      setTimerState(null);
      clearTimerState();
      setElapsed(0);
      fetchData(); // refresh stats
    } catch (err) {
      console.error('Failed to stop session:', err);
    } finally {
      setTimerLoading(false);
    }
  };

  const pauseTimer = () => {
    setTimerState(prev => {
      if (!prev || prev.lastResumedAt === null) return prev;
      return {
        ...prev,
        elapsedSeconds: prev.elapsedSeconds + (Date.now() - prev.lastResumedAt) / 1000,
        lastResumedAt: null,
      };
    });
  };

  const resumeTimer = () => {
    setTimerState(prev => {
      if (!prev) return prev;
      return { ...prev, lastResumedAt: Date.now() };
    });
  };

  const toggleTask = async (task: Task) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const updatedTasks = tasks.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t));
        setTasks(updatedTasks);

        // Check if all tasks are now completed
        if (updatedTasks.length > 0) {
          const allDone = updatedTasks.every((t) => t.status === 'completed');
          const wasDone = prevCompletedRef.current === updatedTasks.length;
          if (allDone && !wasDone) {
            setCelebrate(true);
          }
          prevCompletedRef.current = updatedTasks.filter(t => t.status === 'completed').length;
        }

        fetchData(); // refresh analytics
      }
    } catch (err) {
      console.error('Failed to update task:', err);
    }
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const taskTypeColors: Record<string, string> = {
    study: 'bg-sky-400/10 text-sky-400',
    video: 'bg-rose-400/10 text-rose-400',
    revision: 'bg-emerald-400/10 text-emerald-400',
    practice: 'bg-purple-400/10 text-purple-400',
    other: 'bg-[#948979]/10 text-[#948979]',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-[#948979]/30 border-t-[#DFD0B8] rounded-full" />
      </div>
    );
  }

  const todayCompleted = tasks.filter((t) => t.status === 'completed').length;
  const todayTotal = tasks.length;
  const completionPercent = todayTotal > 0 ? Math.round((todayCompleted / todayTotal) * 100) : 0;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Page title */}
      <div>
        <h1 className="text-[22px] font-semibold text-[#F0E6D3] tracking-tight">Dashboard</h1>
        <p className="text-[13px] text-[#948979] mt-1 font-medium">
          {format(new Date(), 'EEEE, MMMM d, yyyy')}
        </p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-[#DFD0B8]/20 shadow-sm">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#DFD0B8]/10 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-[#DFD0B8]" />
              </div>
              <div>
                <p className="text-[20px] font-semibold text-[#F0E6D3] tracking-tight">
                  {analytics ? `${Math.round(analytics.todayMinutes / 60 * 10) / 10}h` : '0h'}
                </p>
                <p className="text-[11.5px] text-[#948979] font-medium">Today&apos;s Study</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-400/20 shadow-sm">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-400/10 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-[20px] font-semibold text-[#F0E6D3] tracking-tight">
                  {todayCompleted}/{todayTotal}
                </p>
                <p className="text-[11.5px] text-[#948979] font-medium">Tasks Done</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-sky-400/20 shadow-sm">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-sky-400/10 rounded-lg flex items-center justify-center">
                <Target className="w-5 h-5 text-sky-400" />
              </div>
              <div>
                <p className="text-[20px] font-semibold text-[#F0E6D3] tracking-tight">
                  {analytics?.taskCompletionRate || 0}%
                </p>
                <p className="text-[11.5px] text-[#948979] font-medium">Week Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-rose-400/20 shadow-sm">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-rose-400/10 rounded-lg flex items-center justify-center">
                <Flame className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <p className="text-[20px] font-semibold text-[#F0E6D3] tracking-tight">
                  {analytics?.streak || 0}
                </p>
                <p className="text-[11.5px] text-[#948979] font-medium">Day Streak</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Study Timer */}
        <Card className="md:col-span-1 border-[#DFD0B8]/20 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-[15px] font-semibold tracking-tight flex items-center gap-2">
              <Timer className="w-5 h-5 text-[#DFD0B8]" />
              Study Timer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <p
                className={`text-5xl font-mono font-semibold tracking-tighter ${
                  timerState ? 'text-[#DFD0B8]' : 'text-[#948979]/40'
                }`}
              >
                {formatTime(elapsed)}
              </p>
              {timerState && (
                <p className={`text-xs mt-2 flex items-center justify-center gap-1 ${
                  timerState.lastResumedAt === null ? 'text-amber-400' : 'text-emerald-400'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${
                    timerState.lastResumedAt === null ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse'
                  }`} />
                  {timerState.lastResumedAt === null ? 'Paused' : 'Session in progress'}
                </p>
              )}
            </div>
            {timerState ? (
              <div className="space-y-2">
                <div className="flex gap-2">
                  {timerState.lastResumedAt === null ? (
                    <Button
                      onClick={resumeTimer}
                      className="flex-1 bg-[#DFD0B8] hover:bg-[#C4B8A2] text-[#222831]"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Resume
                    </Button>
                  ) : (
                    <Button
                      onClick={pauseTimer}
                      className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
                    >
                      <Pause className="w-4 h-4 mr-2" />
                      Pause
                    </Button>
                  )}
                  <Button
                    onClick={stopTimer}
                    disabled={timerLoading}
                    variant="outline"
                    className="border-rose-400/30 text-rose-400 hover:bg-rose-400/10 hover:text-rose-300"
                  >
                    <Square className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                onClick={startTimer}
                className="w-full bg-[#DFD0B8] hover:bg-[#C4B8A2] text-[#222831]"
              >
                <Play className="w-4 h-4 mr-2" />
                Start Studying
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Today's Tasks */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-[15px] font-semibold tracking-tight flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-[#DFD0B8]" />
                Today&apos;s Tasks
              </CardTitle>
              <span className="text-[13px] text-[#948979] font-medium">{completionPercent}%</span>
            </div>
            <Progress value={completionPercent} className="h-2 mt-2" />
          </CardHeader>
          <CardContent>
            {tasks.length === 0 ? (
              <div className="text-center py-8 text-[#948979]">
                <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-[13.5px] font-medium">No tasks for today.</p>
                <p className="text-[12px] mt-1">Add tasks from the Goals page.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {tasks.map((task) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    onToggle={() => toggleTask(task)}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Weekly overview */}
      {analytics && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-[15px] font-semibold tracking-tight">This Week Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-[22px] font-semibold text-[#DFD0B8] tracking-tight">{formatHours(analytics.totalHours)}</p>
                <p className="text-[11.5px] text-[#948979] font-medium mt-0.5">Total Study</p>
              </div>
              <div>
                <p className="text-[22px] font-semibold text-emerald-400 tracking-tight">{analytics.taskCompletionRate}%</p>
                <p className="text-[11.5px] text-[#948979] font-medium mt-0.5">Task Rate</p>
              </div>
              <div>
                <p className="text-[22px] font-semibold text-sky-400 tracking-tight">{analytics.goalCompletionRate || 0}%</p>
                <p className="text-[11.5px] text-[#948979] font-medium mt-0.5">Goal Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Celebration
        trigger={celebrate}
        onComplete={() => setCelebrate(false)}
        message="All tasks done for today! Amazing work! 🔥"
        emoji="🎉"
      />
    </div>
  );
}

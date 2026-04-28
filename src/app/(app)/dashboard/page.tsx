'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { formatHours } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
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
    study: 'bg-blue-100 text-blue-700',
    video: 'bg-red-100 text-red-700',
    revision: 'bg-green-100 text-green-700',
    practice: 'bg-purple-100 text-purple-700',
    other: 'bg-gray-100 text-gray-700',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-orange-200 border-t-orange-600 rounded-full" />
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
        <h1 className="text-[22px] font-semibold text-gray-900 tracking-tight">Dashboard</h1>
        <p className="text-[13px] text-gray-400 mt-1 font-medium">
          {format(new Date(), 'EEEE, MMMM d, yyyy')}
        </p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-orange-200 shadow-sm">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-[20px] font-semibold text-gray-900 tracking-tight">
                  {analytics ? `${Math.round(analytics.todayMinutes / 60 * 10) / 10}h` : '0h'}
                </p>
                <p className="text-[11.5px] text-gray-400 font-medium">Today&apos;s Study</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 shadow-sm">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-[20px] font-semibold text-gray-900 tracking-tight">
                  {todayCompleted}/{todayTotal}
                </p>
                <p className="text-[11.5px] text-gray-400 font-medium">Tasks Done</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 shadow-sm">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Target className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-[20px] font-semibold text-gray-900 tracking-tight">
                  {analytics?.taskCompletionRate || 0}%
                </p>
                <p className="text-[11.5px] text-gray-400 font-medium">Week Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-200 shadow-sm">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <Flame className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-[20px] font-semibold text-gray-900 tracking-tight">
                  {analytics?.streak || 0}
                </p>
                <p className="text-[11.5px] text-gray-400 font-medium">Day Streak</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Study Timer */}
        <Card className="md:col-span-1 border-orange-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-[15px] font-semibold tracking-tight flex items-center gap-2">
              <Timer className="w-5 h-5 text-orange-600" />
              Study Timer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <p
                className={`text-5xl font-mono font-semibold tracking-tighter ${
                  timerState ? 'text-orange-600' : 'text-gray-300'
                }`}
              >
                {formatTime(elapsed)}
              </p>
              {timerState && (
                <p className={`text-xs mt-2 flex items-center justify-center gap-1 ${
                  timerState.lastResumedAt === null ? 'text-amber-600' : 'text-green-600'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${
                    timerState.lastResumedAt === null ? 'bg-amber-500' : 'bg-green-500 animate-pulse'
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
                      className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
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
                    className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                  >
                    <Square className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                onClick={startTimer}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white"
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
                <BookOpen className="w-5 h-5 text-orange-600" />
                Today&apos;s Tasks
              </CardTitle>
              <span className="text-[13px] text-gray-400 font-medium">{completionPercent}%</span>
            </div>
            <Progress value={completionPercent} className="h-2 mt-2" />
          </CardHeader>
          <CardContent>
            {tasks.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-[13.5px] font-medium">No tasks for today.</p>
                <p className="text-[12px] mt-1">Add tasks from the Goals page.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                      task.status === 'completed'
                        ? 'bg-green-50/60 border-green-200'
                        : 'bg-white border-gray-200 hover:border-orange-200'
                    }`}
                  >
                    <Checkbox
                      checked={task.status === 'completed'}
                      onCheckedChange={() => toggleTask(task)}
                      className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600 border-gray-400"
                    />
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-[13.5px] font-medium ${
                          task.status === 'completed'
                            ? 'line-through text-gray-400'
                            : 'text-gray-800'
                        }`}
                      >
                        {task.title}
                      </p>
                      {task.youtube_title && (
                        <p className="text-xs text-gray-400 truncate">
                          📹 {task.youtube_title}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className={`text-xs ${taskTypeColors[task.task_type] || ''}`}>
                        {task.task_type}
                      </Badge>
                      {task.youtube_url && (
                        <a
                          href={task.youtube_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-red-500 hover:text-red-700"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </div>
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
                <p className="text-[22px] font-semibold text-orange-600 tracking-tight">{formatHours(analytics.totalHours)}</p>
                <p className="text-[11.5px] text-gray-400 font-medium mt-0.5">Total Study</p>
              </div>
              <div>
                <p className="text-[22px] font-semibold text-green-600 tracking-tight">{analytics.taskCompletionRate}%</p>
                <p className="text-[11.5px] text-gray-400 font-medium mt-0.5">Task Rate</p>
              </div>
              <div>
                <p className="text-[22px] font-semibold text-blue-600 tracking-tight">{analytics.goalCompletionRate || 0}%</p>
                <p className="text-[11.5px] text-gray-400 font-medium mt-0.5">Goal Rate</p>
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

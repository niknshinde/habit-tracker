'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Pause, Square, Timer } from 'lucide-react';

const TIMER_KEY = 'upsc_study_timer';

interface TimerState {
  elapsedSeconds: number;       // accumulated seconds from previous start/pause cycles
  lastResumedAt: number | null; // epoch ms when last resumed/started (null = paused)
  date: string;                 // YYYY-MM-DD this session belongs to
}

function getToday(): string {
  return new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
}

function loadTimerState(): TimerState | null {
  try {
    const raw = localStorage.getItem(TIMER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed.elapsedSeconds === 'number' && typeof parsed.date === 'string') {
      return parsed;
    }
  } catch { /* corrupt data */ }
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

export default function StudyTimer() {
  const [timerState, setTimerState] = useState<TimerState | null>(null);
  const [displaySeconds, setDisplaySeconds] = useState(0);
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const midnightRef = useRef<NodeJS.Timeout | null>(null);
  const timerStateRef = useRef<TimerState | null>(null);

  // Keep ref in sync for use in midnight callback
  useEffect(() => {
    timerStateRef.current = timerState;
  }, [timerState]);

  // Submit elapsed time to backend
  const submitSession = useCallback(async (seconds: number, date: string) => {
    const durationMinutes = seconds / 60;
    if (durationMinutes < 0.1) return; // skip trivially short sessions
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

  // Midnight handler: submit accumulated time for today, then auto-start fresh for new day
  const scheduleMidnightCheck = useCallback(() => {
    if (midnightRef.current) clearTimeout(midnightRef.current);

    const ms = getMsUntilMidnight();
    midnightRef.current = setTimeout(async () => {
      const current = timerStateRef.current;
      if (!current) return;

      // Calculate total elapsed up to midnight
      const totalSeconds = Math.floor(getCurrentElapsed(current));
      const oldDate = current.date;

      if (totalSeconds > 0) {
        await submitSession(totalSeconds, oldDate);
      }

      // Auto-start fresh session for new day
      const newState: TimerState = {
        elapsedSeconds: 0,
        lastResumedAt: current.lastResumedAt !== null ? Date.now() : null,
        date: getToday(),
      };
      setTimerState(newState);
      saveTimerState(newState);

      // Schedule next midnight check
      scheduleMidnightCheck();
    }, ms);
  }, [submitSession]);

  // On mount: restore from localStorage
  useEffect(() => {
    const saved = loadTimerState();
    if (saved) {
      // If the saved date is from a previous day, submit that time and start fresh
      const today = getToday();
      if (saved.date !== today) {
        const totalSeconds = Math.floor(getCurrentElapsed(saved));
        if (totalSeconds > 0) {
          submitSession(totalSeconds, saved.date);
        }
        // Reset for today — keep running if it was running
        const freshState: TimerState = {
          elapsedSeconds: 0,
          lastResumedAt: saved.lastResumedAt !== null ? Date.now() : null,
          date: today,
        };
        setTimerState(freshState);
        saveTimerState(freshState);
      } else {
        setTimerState(saved);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist to localStorage whenever timerState changes
  useEffect(() => {
    if (timerState) {
      saveTimerState(timerState);
    }
  }, [timerState]);

  // Tick display and schedule midnight
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    if (timerState && timerState.lastResumedAt !== null) {
      // Running — tick every second
      const tick = () => setDisplaySeconds(Math.floor(getCurrentElapsed(timerState)));
      tick();
      intervalRef.current = setInterval(tick, 1000);
      scheduleMidnightCheck();
    } else if (timerState) {
      // Paused — show frozen value
      setDisplaySeconds(Math.floor(timerState.elapsedSeconds));
      scheduleMidnightCheck();
    } else {
      setDisplaySeconds(0);
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

  const startTimer = useCallback(() => {
    const newState: TimerState = {
      elapsedSeconds: 0,
      lastResumedAt: Date.now(),
      date: getToday(),
    };
    setTimerState(newState);
  }, []);

  const pauseTimer = useCallback(() => {
    setTimerState(prev => {
      if (!prev || prev.lastResumedAt === null) return prev;
      return {
        ...prev,
        elapsedSeconds: prev.elapsedSeconds + (Date.now() - prev.lastResumedAt) / 1000,
        lastResumedAt: null,
      };
    });
  }, []);

  const resumeTimer = useCallback(() => {
    setTimerState(prev => {
      if (!prev) return prev;
      return { ...prev, lastResumedAt: Date.now() };
    });
  }, []);

  const stopTimer = useCallback(async () => {
    if (!timerState) return;
    setLoading(true);
    try {
      const totalSeconds = Math.floor(getCurrentElapsed(timerState));
      await submitSession(totalSeconds, timerState.date);
      setTimerState(null);
      clearTimerState();
      setDisplaySeconds(0);
    } catch (err) {
      console.error('Failed to stop session:', err);
    } finally {
      setLoading(false);
    }
  }, [timerState, submitSession]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const isActive = timerState !== null;
  const isPaused = timerState !== null && timerState.lastResumedAt === null;
  const isRunning = timerState !== null && timerState.lastResumedAt !== null;

  return (
    <Card className={`border-2 transition-colors ${isActive ? (isPaused ? 'border-yellow-300 bg-yellow-50/50' : 'border-orange-300 bg-orange-50/50') : 'border-gray-100'}`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isActive ? (isPaused ? 'bg-yellow-100' : 'bg-orange-100') : 'bg-gray-100'}`}>
              <Timer className={`w-5 h-5 ${isActive ? (isPaused ? 'text-yellow-600' : 'text-orange-600') : 'text-gray-400'}`} />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Study Timer</p>
              <p className={`text-3xl font-mono font-bold tracking-wider ${isActive ? (isPaused ? 'text-yellow-700' : 'text-orange-700') : 'text-gray-300'}`}>
                {formatTime(displaySeconds)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isActive && (
              <Button
                size="lg"
                onClick={isPaused ? resumeTimer : pauseTimer}
                disabled={loading}
                className={
                  isPaused
                    ? 'bg-green-500 hover:bg-green-600 text-white'
                    : 'bg-yellow-500 hover:bg-yellow-600 text-white'
                }
              >
                {isPaused ? (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Resume
                  </>
                ) : (
                  <>
                    <Pause className="w-4 h-4 mr-2" />
                    Pause
                  </>
                )}
              </Button>
            )}
            <Button
              size="lg"
              onClick={isActive ? stopTimer : startTimer}
              disabled={loading}
              className={
                isActive
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-orange-600 hover:bg-orange-700 text-white'
              }
            >
              {isActive ? (
                <>
                  <Square className="w-4 h-4 mr-2" />
                  Stop
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Start
                </>
              )}
            </Button>
          </div>
        </div>
        {isActive && (
          <div className="mt-3">
            <div className="h-1 bg-orange-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${isPaused ? 'bg-yellow-500' : 'bg-orange-500 animate-pulse'}`}
                style={{ width: `${Math.min((displaySeconds / 3600) * 100, 100)}%` }}
              />
            </div>
            <p className={`text-xs mt-1 ${isPaused ? 'text-yellow-600' : 'text-orange-500'}`}>
              {isPaused ? 'Session paused' : 'Session in progress...'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  getDay,
} from 'date-fns';
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Clock,
  CheckCircle2,
} from 'lucide-react';

interface DayData {
  date: string;
  tasks: {
    id: string;
    title: string;
    status: string;
    task_type: string;
  }[];
  studyMinutes: number;
}

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [dayDataMap, setDayDataMap] = useState<Record<string, DayData>>({});
  const [selectedDate, setSelectedDate] = useState<string | null>(format(new Date(), 'yyyy-MM-dd'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMonthData() {
      setLoading(true);
      const from = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
      const to = format(endOfMonth(currentMonth), 'yyyy-MM-dd');

      try {
        const [tasksRes, sessionsRes] = await Promise.all([
          fetch(`/api/tasks?from=${from}&to=${to}`),
          fetch(`/api/sessions?from=${from}&to=${to}`),
        ]);

        const tasks = tasksRes.ok ? await tasksRes.json() : [];
        const sessions = sessionsRes.ok ? await sessionsRes.json() : [];

        const map: Record<string, DayData> = {};

        for (const task of tasks) {
          if (!map[task.date]) {
            map[task.date] = { date: task.date, tasks: [], studyMinutes: 0 };
          }
          map[task.date].tasks.push({
            id: task.id,
            title: task.title,
            status: task.status,
            task_type: task.task_type,
          });
        }

        for (const session of sessions) {
          if (!map[session.date]) {
            map[session.date] = { date: session.date, tasks: [], studyMinutes: 0 };
          }
          map[session.date].studyMinutes += session.duration_minutes || 0;
        }

        setDayDataMap(map);
      } catch (err) {
        console.error('Failed to fetch calendar data:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchMonthData();
  }, [currentMonth]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPadding = getDay(monthStart); // 0=Sun

  const today = new Date();

  const getHeatColor = (minutes: number) => {
    if (minutes === 0) return '';
    if (minutes < 30) return 'bg-orange-50';
    if (minutes < 60) return 'bg-orange-100';
    if (minutes < 120) return 'bg-orange-200';
    if (minutes < 240) return 'bg-orange-300';
    return 'bg-orange-400';
  };

  const selectedDayData = selectedDate ? dayDataMap[selectedDate] : null;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-[22px] font-semibold text-gray-900 tracking-tight">Calendar</h1>
        <p className="text-[13px] text-gray-400 mt-1 font-medium">View your study activity by day</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Calendar Grid */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <CardTitle className="text-[15px] font-semibold tracking-tight">
                {format(currentMonth, 'MMMM yyyy')}
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                <div key={d} className="text-center text-xs font-medium text-gray-400 py-2">
                  {d}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7 gap-1">
              {/* Padding for days before month start */}
              {Array.from({ length: startPadding }).map((_, i) => (
                <div key={`pad-${i}`} className="aspect-square" />
              ))}

              {days.map((day) => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const dayData = dayDataMap[dateStr];
                const isToday = isSameDay(day, today);
                const isSelected = selectedDate === dateStr;
                const hasActivity = dayData && (dayData.tasks.length > 0 || dayData.studyMinutes > 0);
                const completedCount = dayData?.tasks.filter((t) => t.status === 'completed').length || 0;
                const totalTasks = dayData?.tasks.length || 0;

                return (
                  <button
                    key={dateStr}
                    onClick={() => setSelectedDate(dateStr)}
                    className={`aspect-square rounded-lg p-1 text-sm transition-all relative flex flex-col items-center justify-center gap-0.5
                      ${isToday ? 'ring-2 ring-orange-400' : ''}
                      ${isSelected ? 'bg-orange-600 text-white' : getHeatColor(dayData?.studyMinutes || 0)}
                      ${!hasActivity && !isSelected ? 'text-gray-400 hover:bg-gray-50' : ''}
                      ${hasActivity && !isSelected ? 'text-gray-900 hover:ring-1 hover:ring-orange-300' : ''}
                    `}
                  >
                    <span className="font-medium text-xs">{format(day, 'd')}</span>
                    {hasActivity && !isSelected && (
                      <div className="flex gap-0.5">
                        {dayData.studyMinutes > 0 && (
                          <span className="w-1.5 h-1.5 bg-orange-500 rounded-full" />
                        )}
                        {totalTasks > 0 && completedCount === totalTasks && (
                          <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                        )}
                        {totalTasks > 0 && completedCount < totalTasks && (
                          <span className="w-1.5 h-1.5 bg-gray-300 rounded-full" />
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 mt-4 text-xs text-gray-400">
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 bg-orange-500 rounded-full" /> Study time
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full" /> All tasks done
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 bg-gray-300 rounded-full" /> Tasks pending
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Day Detail Panel */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-orange-600" />
              {selectedDate
                ? format(new Date(selectedDate + 'T00:00:00'), 'MMM d, yyyy')
                : 'Select a Day'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedDate ? (
              <div className="text-center py-12 text-gray-400">
                <CalendarDays className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Click a day to see details</p>
              </div>
            ) : !selectedDayData ? (
              <div className="text-center py-12 text-gray-400">
                <p className="text-sm">No activity on this day</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Study time */}
                {selectedDayData.studyMinutes > 0 && (
                  <div className="flex items-center gap-2 p-3 bg-orange-50 rounded-lg">
                    <Clock className="w-4 h-4 text-orange-600" />
                    <span className="text-sm font-medium text-orange-700">
                      {selectedDayData.studyMinutes >= 60
                        ? `${(selectedDayData.studyMinutes / 60).toFixed(1)} hours`
                        : `${selectedDayData.studyMinutes} minutes`}{' '}
                      studied
                    </span>
                  </div>
                )}

                {/* Tasks */}
                {selectedDayData.tasks.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                      Tasks ({selectedDayData.tasks.filter((t) => t.status === 'completed').length}/
                      {selectedDayData.tasks.length})
                    </p>
                    <div className="space-y-1.5">
                      {selectedDayData.tasks.map((task) => (
                        <div
                          key={task.id}
                          className={`flex items-center gap-2 p-2 rounded-lg text-sm ${
                            task.status === 'completed'
                              ? 'bg-green-50 text-green-700'
                              : 'bg-gray-50 text-gray-700'
                          }`}
                        >
                          {task.status === 'completed' ? (
                            <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                          ) : (
                            <div className="w-4 h-4 border-2 border-gray-300 rounded-full shrink-0" />
                          )}
                          <span className={task.status === 'completed' ? 'line-through' : ''}>
                            {task.title}
                          </span>
                          <Badge variant="secondary" className="text-xs ml-auto shrink-0">
                            {task.task_type}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

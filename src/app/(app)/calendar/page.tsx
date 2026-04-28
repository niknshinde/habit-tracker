'use client';

import { useEffect, useState } from 'react';
import { formatTime } from '@/lib/utils';
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
import TaskItem from '@/components/task-item';

interface DayData {
  date: string;
  tasks: {
    id: string;
    title: string;
    description?: string;
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
            description: task.description || undefined,
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
    if (minutes < 30) return 'bg-[#DFD0B8]/5';
    if (minutes < 60) return 'bg-[#DFD0B8]/10';
    if (minutes < 120) return 'bg-[#DFD0B8]/15';
    if (minutes < 240) return 'bg-[#DFD0B8]/20';
    return 'bg-[#DFD0B8]/30';
  };

  const selectedDayData = selectedDate ? dayDataMap[selectedDate] : null;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-[22px] font-semibold text-[#F0E6D3] tracking-tight">Calendar</h1>
        <p className="text-[13px] text-[#948979] mt-1 font-medium">View your study activity by day</p>
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
                <div key={d} className="text-center text-xs font-medium text-[#948979] py-2">
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
                      ${isToday ? 'ring-2 ring-[#DFD0B8]' : ''}
                      ${isSelected ? 'bg-[#DFD0B8] text-[#222831]' : getHeatColor(dayData?.studyMinutes || 0)}
                      ${!hasActivity && !isSelected ? 'text-[#948979] hover:bg-[#393E46]' : ''}
                      ${hasActivity && !isSelected ? 'text-[#F0E6D3] hover:ring-1 hover:ring-[#DFD0B8]/50' : ''}
                    `}
                  >
                    <span className="font-medium text-xs">{format(day, 'd')}</span>
                    {hasActivity && !isSelected && (
                      <div className="flex gap-0.5">
                        {dayData.studyMinutes > 0 && (
                          <span className="w-1.5 h-1.5 bg-[#DFD0B8] rounded-full" />
                        )}
                        {totalTasks > 0 && completedCount === totalTasks && (
                          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                        )}
                        {totalTasks > 0 && completedCount < totalTasks && (
                          <span className="w-1.5 h-1.5 bg-[#948979]/50 rounded-full" />
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 mt-4 text-xs text-[#948979]">
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 bg-[#DFD0B8] rounded-full" /> Study time
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 bg-emerald-400 rounded-full" /> All tasks done
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 bg-[#948979]/50 rounded-full" /> Tasks pending
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Day Detail Panel */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-[#DFD0B8]" />
              {selectedDate
                ? format(new Date(selectedDate + 'T00:00:00'), 'MMM d, yyyy')
                : 'Select a Day'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedDate ? (
              <div className="text-center py-12 text-[#948979]">
                <CalendarDays className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Click a day to see details</p>
              </div>
            ) : !selectedDayData ? (
              <div className="text-center py-12 text-[#948979]">
                <p className="text-sm">No activity on this day</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Study time */}
                {selectedDayData.studyMinutes > 0 && (
                  <div className="flex items-center gap-2 p-3 bg-[#DFD0B8]/10 rounded-lg">
                    <Clock className="w-4 h-4 text-[#DFD0B8]" />
                    <span className="text-sm font-medium text-[#DFD0B8]">
                      {formatTime(selectedDayData.studyMinutes)}{' '}
                      studied
                    </span>
                  </div>
                )}

                {/* Tasks */}
                {selectedDayData.tasks.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-[#948979] uppercase tracking-wider mb-2">
                      Tasks ({selectedDayData.tasks.filter((t) => t.status === 'completed').length}/
                      {selectedDayData.tasks.length})
                    </p>
                    <div className="space-y-1.5">
                      {selectedDayData.tasks.map((task) => (
                        <TaskItem
                          key={task.id}
                          task={task}
                          showCheckbox={false}
                          showStatusDot={true}
                        />
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

'use client';

import { useEffect, useState } from 'react';
import { formatHours } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Clock,
  Flame,
  Target,
  Info,
  X,
  Minus,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface AnalyticsData {
  period: string;
  studyTimeByDay: { date: string; hours: number; minutes: number }[];
  totalHours: number;
  totalMinutes: number;
  goalCompletionRate: number;
  taskCompletionRate: number;
  totalGoals: number;
  completedGoals: number;
  totalTasks: number;
  completedTasks: number;
  todayMinutes: number;
  todayTasks: number;
  todayCompleted: number;
  yesterdayMinutes: number;
  avgDailyMinutes: number;
  bestDayMinutes: number;
  bestDayDate: string;
  streak: number;
  tasksByType: Record<string, { total: number; completed: number }>;
}

function formatMins(m: number) {
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const r = m % h;
  return r > 0 ? `${h}h ${r}m` : `${h}h`;
}

// Info tooltip component
function InfoTip({ text, open, onToggle }: { text: string; open: boolean; onToggle: () => void }) {
  return (
    <span className="relative inline-block">
      <button
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
        className="text-[#948979]/60 hover:text-[#948979] transition-colors ml-1.5"
      >
        <Info className="w-3.5 h-3.5" />
      </button>
      {open && (
        <span className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 bg-[#1C2028] text-[#F0E6D3] text-[11.5px] leading-relaxed rounded-lg px-3 py-2.5 shadow-xl block">
          <span className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-transparent border-t-[#1C2028] block" />
          {text}
          <button onClick={onToggle} className="absolute top-1.5 right-1.5 text-[#948979] hover:text-[#F0E6D3]">
            <X className="w-3 h-3" />
          </button>
        </span>
      )}
    </span>
  );
}

function PaceIndicator({ todayMinutes, avgDailyMinutes }: { todayMinutes: number; avgDailyMinutes: number }) {
  // Get India time (IST = UTC+5:30)
  const nowIST = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const hoursLeft = Math.max(0, 24 - nowIST.getHours() - (nowIST.getMinutes() / 60));
  const usableHoursLeft = Math.max(0, Math.min(hoursLeft, 24 - nowIST.getHours() > 0 ? 24 - nowIST.getHours() : 0));

  // Check if still time to study (before midnight, say useful until 11pm)
  const hourNow = nowIST.getHours();
  const isLateNight = hourNow >= 23;

  if (avgDailyMinutes === 0 && todayMinutes === 0) {
    return (
      <div className="flex items-center gap-2 mt-2.5 px-3 py-2 bg-[#393E46] rounded-lg">
        <Minus className="w-4 h-4 text-[#948979]" />
        <span className="text-[12.5px] text-[#948979]">Start studying to see your pace</span>
      </div>
    );
  }

  if (avgDailyMinutes === 0) {
    return (
      <div className="flex items-center gap-2 mt-2.5 px-3 py-2 bg-emerald-400/10 rounded-lg">
        <TrendingUp className="w-4 h-4 text-emerald-400" />
        <span className="text-[12.5px] text-emerald-400 font-medium">Great start! Keep it going</span>
      </div>
    );
  }

  const diff = todayMinutes - avgDailyMinutes;
  const pct = Math.round((todayMinutes / avgDailyMinutes) * 100);

  if (todayMinutes >= avgDailyMinutes) {
    return (
      <div className="flex items-center gap-2 mt-2.5 px-3 py-2 bg-emerald-400/10 rounded-lg">
        <ArrowUpRight className="w-4 h-4 text-emerald-400" />
        <span className="text-[12.5px] text-emerald-400 font-medium">
          {pct >= 150 ? 'Crushing it! ' : 'Ahead of pace — '}{formatMins(diff)} more than avg
        </span>
      </div>
    );
  }

  const behind = avgDailyMinutes - todayMinutes;

  if (isLateNight) {
    return (
      <div className="flex items-center gap-2 mt-2.5 px-3 py-2 bg-[#DFD0B8]/10 rounded-lg">
        <ArrowDownRight className="w-4 h-4 text-[#DFD0B8]" />
        <span className="text-[12.5px] text-[#DFD0B8] font-medium">
          {formatMins(behind)} less than avg · Rest well, try tomorrow!
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 mt-2.5 px-3 py-2 bg-amber-400/10 rounded-lg">
      <ArrowDownRight className="w-4 h-4 text-amber-400" />
      <span className="text-[12.5px] text-amber-400 font-medium">
        {formatMins(behind)} behind avg · ~{Math.round(usableHoursLeft)}h left today
      </span>
    </div>
  );
}

const TASK_TYPE_COLORS: Record<string, string> = {
  study: '#DFD0B8',
  video: '#7A8B9A',
  revision: '#a78bfa',
  practice: '#6B9080',
  other: '#948979',
};

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [period, setPeriod] = useState<'week' | 'month' | 'all'>('week');
  const [loading, setLoading] = useState(true);
  const [openTip, setOpenTip] = useState<string | null>(null);

  useEffect(() => {
    async function fetch_data() {
      setLoading(true);
      try {
        const res = await fetch(`/api/analytics?period=${period}`);
        if (res.ok) setData(await res.json());
      } catch (err) {
        console.error('Failed to fetch analytics:', err);
      } finally {
        setLoading(false);
      }
    }
    fetch_data();
  }, [period]);

  // Close any open tooltip when clicking outside
  useEffect(() => {
    if (!openTip) return;
    const handler = () => setOpenTip(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [openTip]);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-[#948979]/30 border-t-[#DFD0B8] rounded-full" />
      </div>
    );
  }

  const taskTypeData = Object.entries(data.tasksByType).map(([name, val]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    key: name,
    total: val.total,
    completed: val.completed,
    rate: val.total > 0 ? Math.round((val.completed / val.total) * 100) : 0,
  }));

  const todayVsYesterday = data.todayMinutes - data.yesterdayMinutes;

  return (
    <div className="max-w-6xl mx-auto space-y-5" onClick={() => setOpenTip(null)}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold text-[#F0E6D3] tracking-tight">Analytics</h1>
          <p className="text-[13px] text-[#948979] mt-0.5 font-medium">Your study patterns & progress</p>
        </div>
        <div className="flex gap-1.5 bg-[#393E46] rounded-lg p-1">
          {(['week', 'month', 'all'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3.5 py-1.5 text-[12.5px] font-medium rounded-md transition-all ${
                period === p
                  ? 'bg-[#2D333B] text-[#DFD0B8] shadow-sm'
                  : 'text-[#948979] hover:text-[#DFD0B8]'
              }`}
            >
              {p === 'week' ? '7 Days' : p === 'month' ? 'Month' : 'All'}
            </button>
          ))}
        </div>
      </div>

      {/* Today's Focus Card */}
      <Card className="border-[#DFD0B8]/20 bg-gradient-to-br from-[#DFD0B8]/5 to-[#2D333B] overflow-hidden">
        <CardContent className="pt-5 pb-5">
          <div className="flex items-start justify-between mb-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#DFD0B8]/10 rounded-lg flex items-center justify-center">
                <Clock className="w-4 h-4 text-[#DFD0B8]" />
              </div>
              <div>
                <span className="block text-[12px] text-[#948979] font-medium uppercase tracking-wide">
                  Today&apos;s Study
                  <InfoTip
                    text="Total time studied today from timer sessions. The pace indicator compares this to your 7-day average and shows how much of the day is left."
                    open={openTip === 'today'}
                    onToggle={() => setOpenTip(openTip === 'today' ? null : 'today')}
                  />
                </span>
              </div>
            </div>
            {todayVsYesterday !== 0 && (
              <span className={`flex items-center gap-0.5 text-[11.5px] font-medium px-2 py-0.5 rounded-full ${
                todayVsYesterday > 0
                  ? 'bg-emerald-400/10 text-emerald-400'
                  : 'bg-rose-400/10 text-rose-400'
              }`}>
                {todayVsYesterday > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {formatMins(Math.abs(todayVsYesterday))} vs yesterday
              </span>
            )}
          </div>

          <div className="flex items-end gap-3 mt-2">
            <span className="text-[36px] font-bold text-[#F0E6D3] leading-none tracking-tight">
              {formatMins(data.todayMinutes)}
            </span>
            <span className="text-[13px] text-[#948979] font-medium mb-1">
              / avg {formatMins(data.avgDailyMinutes)}
            </span>
          </div>

          {/* Progress bar */}
          <div className="mt-3 h-2 bg-[#393E46] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${Math.min(100, data.avgDailyMinutes > 0 ? (data.todayMinutes / data.avgDailyMinutes) * 100 : (data.todayMinutes > 0 ? 100 : 0))}%`,
                background: data.todayMinutes >= data.avgDailyMinutes
                  ? 'linear-gradient(90deg, #6B9080, #7daa96)'
                  : 'linear-gradient(90deg, #DFD0B8, #B8A99A)',
              }}
            />
          </div>

          <PaceIndicator todayMinutes={data.todayMinutes} avgDailyMinutes={data.avgDailyMinutes} />

          {/* Today's tasks mini-summary */}
          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-[#948979]/15">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[12.5px] text-[#948979] font-medium">
                {data.todayCompleted}/{data.todayTasks} tasks done
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-[#DFD0B8]" />
              <span className="text-[12.5px] text-[#948979] font-medium">
                {data.streak} day streak
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-[#948979]/15">
          <CardContent className="py-3.5 px-4">
            <span className="block text-[11px] text-[#948979] font-medium uppercase tracking-wide">
              Total Study
              <InfoTip
                text="Sum of all timer sessions in the selected period."
                open={openTip === 'total'}
                onToggle={() => setOpenTip(openTip === 'total' ? null : 'total')}
              />
            </span>
            <p className="text-[22px] font-bold text-[#F0E6D3] tracking-tight mt-1">{formatHours(data.totalHours)}</p>
          </CardContent>
        </Card>
        <Card className="border-[#948979]/15">
          <CardContent className="py-3.5 px-4">
            <span className="block text-[11px] text-[#948979] font-medium uppercase tracking-wide">
              Task Rate
              <InfoTip
                text="Percentage of tasks marked as completed out of all tasks in this period."
                open={openTip === 'taskrate'}
                onToggle={() => setOpenTip(openTip === 'taskrate' ? null : 'taskrate')}
              />
            </span>
            <p className="text-[22px] font-bold text-[#F0E6D3] tracking-tight mt-1">{data.taskCompletionRate}%</p>
          </CardContent>
        </Card>
        <Card className="border-[#948979]/15">
          <CardContent className="py-3.5 px-4">
            <span className="block text-[11px] text-[#948979] font-medium uppercase tracking-wide">
              Goal Rate
              <InfoTip
                text="Percentage of goals marked as completed in this period."
                open={openTip === 'goalrate'}
                onToggle={() => setOpenTip(openTip === 'goalrate' ? null : 'goalrate')}
              />
            </span>
            <p className="text-[22px] font-bold text-[#F0E6D3] tracking-tight mt-1">{data.goalCompletionRate}%</p>
          </CardContent>
        </Card>
        <Card className="border-[#948979]/15">
          <CardContent className="py-3.5 px-4">
            <span className="block text-[11px] text-[#948979] font-medium uppercase tracking-wide">
              Best Day
              <InfoTip
                text="Your longest study session day in the last 7 days."
                open={openTip === 'bestday'}
                onToggle={() => setOpenTip(openTip === 'bestday' ? null : 'bestday')}
              />
            </span>
            <p className="text-[22px] font-bold text-[#F0E6D3] tracking-tight mt-1">{formatMins(data.bestDayMinutes)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Daily Study Chart */}
      <Card className="border-[#948979]/15">
        <CardContent className="pt-5 pb-4">
          <div className="flex items-center justify-between mb-4">
            <span className="block text-[14px] font-semibold text-[#F0E6D3] tracking-tight">
              Daily Study Time
              <InfoTip
                text="Bar chart showing hours studied each day. Higher bars mean more study time. Compare today's bar to others to see your consistency."
                open={openTip === 'chart'}
                onToggle={() => setOpenTip(openTip === 'chart' ? null : 'chart')}
              />
            </span>
          </div>
          {data.studyTimeByDay.length === 0 ? (
            <div className="text-center py-10 text-[#948979]">
              <BarChart3 className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-[13px]">No study sessions yet</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.studyTimeByDay} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" stroke="#393E46" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: '#948979' }}
                  tickFormatter={(v) => {
                    const d = new Date(v + 'T00:00:00');
                    return d.toLocaleDateString('en-IN', { weekday: 'short' });
                  }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#948979' }}
                  axisLine={false}
                  tickLine={false}
                  width={30}
                  tickFormatter={(v) => `${v}h`}
                />
                <Tooltip
                  contentStyle={{ borderRadius: 10, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.3)', fontSize: 13, backgroundColor: '#1C2028', color: '#F0E6D3' }}
                  formatter={(value) => [`${value}h`, 'Study']}
                  labelFormatter={(label) => {
                    const d = new Date(label + 'T00:00:00');
                    return d.toLocaleDateString('en-IN', { weekday: 'long', month: 'short', day: 'numeric' });
                  }}
                />
                <Bar dataKey="hours" fill="#DFD0B8" radius={[6, 6, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Task Breakdown by Type */}
      <Card className="border-[#948979]/15">
        <CardContent className="pt-5 pb-4">
          <span className="block text-[14px] font-semibold text-[#F0E6D3] tracking-tight mb-4">
            Tasks by Type
            <InfoTip
              text="Shows how many tasks of each type (study, video, practice, etc.) you completed vs total. Helps identify which areas you're focusing on."
              open={openTip === 'types'}
              onToggle={() => setOpenTip(openTip === 'types' ? null : 'types')}
            />
          </span>
          {taskTypeData.length === 0 ? (
            <div className="text-center py-10 text-[#948979]">
              <Target className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-[13px]">No tasks in this period</p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {taskTypeData.map((item) => (
                <div key={item.key}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: TASK_TYPE_COLORS[item.key] || '#6b7280' }}
                      />
                      <span className="text-[13px] font-medium text-[#DFD0B8]">{item.name}</span>
                    </div>
                    <span className="text-[12px] text-[#948979] font-medium">
                      {item.completed}/{item.total}
                      <span className="ml-1.5 text-[11px]">({item.rate}%)</span>
                    </span>
                  </div>
                  <div className="h-2 bg-[#393E46] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${item.rate}%`,
                        backgroundColor: TASK_TYPE_COLORS[item.key] || '#6b7280',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Progress Summary */}
      <Card className="border-[#948979]/15">
        <CardContent className="pt-5 pb-4">
          <span className="block text-[14px] font-semibold text-[#F0E6D3] tracking-tight mb-4">
            Progress Overview
            <InfoTip
              text="A snapshot of your goals and tasks for this period. Green = completed, gray = remaining."
              open={openTip === 'overview'}
              onToggle={() => setOpenTip(openTip === 'overview' ? null : 'overview')}
            />
          </span>
          <div className="grid grid-cols-2 gap-4">
            {/* Goals ring */}
            <div className="text-center">
              <div className="relative w-24 h-24 mx-auto">
                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#393E46"
                    strokeWidth="3"
                  />
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#DFD0B8"
                    strokeWidth="3"
                    strokeDasharray={`${data.goalCompletionRate}, 100`}
                    strokeLinecap="round"
                    className="transition-all duration-700"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[18px] font-bold text-[#F0E6D3]">{data.goalCompletionRate}%</span>
                </div>
              </div>
              <p className="text-[12px] text-[#948979] font-medium mt-2">Goals</p>
              <p className="text-[11px] text-[#948979]/60">{data.completedGoals} of {data.totalGoals}</p>
            </div>
            {/* Tasks ring */}
            <div className="text-center">
              <div className="relative w-24 h-24 mx-auto">
                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#393E46"
                    strokeWidth="3"
                  />
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#6B9080"
                    strokeWidth="3"
                    strokeDasharray={`${data.taskCompletionRate}, 100`}
                    strokeLinecap="round"
                    className="transition-all duration-700"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[18px] font-bold text-[#F0E6D3]">{data.taskCompletionRate}%</span>
                </div>
              </div>
              <p className="text-[12px] text-[#948979] font-medium mt-2">Tasks</p>
              <p className="text-[11px] text-[#948979]/60">{data.completedTasks} of {data.totalTasks}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, CheckCircle2, Target, Flame } from 'lucide-react';
import { formatTime } from '@/lib/utils';

interface Stats {
  todayMinutes: number;
  todayCompleted: number;
  todayTasks: number;
  taskCompletionRate: number;
  streak: number;
  totalHours: number;
}

export default function QuickStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/analytics?period=week');
        const data = await res.json();
        setStats(data);
      } catch (err) {
        console.error('Failed to fetch stats:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  if (loading || !stats) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map(i => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="animate-pulse space-y-2">
                <div className="h-3 bg-gray-100 rounded w-1/2" />
                <div className="h-6 bg-gray-50 rounded w-2/3" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const items = [
    {
      label: 'Today\'s Study',
      value: formatTime(stats.todayMinutes),
      icon: Clock,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
    },
    {
      label: 'Done Today',
      value: `${stats.todayCompleted}/${stats.todayTasks}`,
      icon: CheckCircle2,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      label: 'Weekly Rate',
      value: `${stats.taskCompletionRate}%`,
      icon: Target,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Streak',
      value: `${stats.streak} day${stats.streak !== 1 ? 's' : ''}`,
      icon: Flame,
      color: 'text-red-600',
      bg: 'bg-red-50',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {items.map((item) => (
        <Card key={item.label} className="border-gray-100">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-8 h-8 rounded-lg ${item.bg} flex items-center justify-center`}>
                <item.icon className={`w-4 h-4 ${item.color}`} />
              </div>
            </div>
            <p className="text-[20px] font-semibold text-gray-900 tracking-tight">{item.value}</p>
            <p className="text-[11.5px] text-gray-400 font-medium mt-0.5">{item.label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

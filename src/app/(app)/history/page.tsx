'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  History as HistoryIcon,
  Download,
  Target,
  CheckCircle2,
  XCircle,
  Calendar,
  MessageSquare,
} from 'lucide-react';

interface Goal {
  id: string;
  title: string;
  description?: string;
  type: string;
  start_date: string;
  end_date: string;
  status: string;
  remarks?: string;
  tasks?: {
    id: string;
    title: string;
    status: string;
    task_type: string;
  }[];
  created_at: string;
}

export default function HistoryPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'pending' | 'in-progress'>('all');

  useEffect(() => {
    async function fetchGoals() {
      try {
        const res = await fetch('/api/goals');
        if (res.ok) {
          const data = await res.json();
          setGoals(data);
        }
      } catch (err) {
        console.error('Failed to fetch goals:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchGoals();
  }, []);

  const filteredGoals =
    filterStatus === 'all' ? goals : goals.filter((g) => g.status === filterStatus);

  const exportData = (format: 'json' | 'csv') => {
    if (format === 'json') {
      const blob = new Blob([JSON.stringify(goals, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `upsc-goals-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const headers = ['Title', 'Type', 'Status', 'Start Date', 'End Date', 'Tasks Total', 'Tasks Completed', 'Remarks'];
      const rows = goals.map((g) => {
        const totalTasks = g.tasks?.length || 0;
        const completedTasks = g.tasks?.filter((t) => t.status === 'completed').length || 0;
        return [
          `"${g.title}"`,
          g.type,
          g.status,
          g.start_date,
          g.end_date,
          totalTasks,
          completedTasks,
          `"${(g.remarks || '').replace(/"/g, '""')}"`,
        ].join(',');
      });
      const csv = [headers.join(','), ...rows].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `upsc-goals-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const statusColors: Record<string, string> = {
    pending: 'bg-gray-100 text-gray-600',
    'in-progress': 'bg-orange-100 text-orange-700',
    completed: 'bg-green-100 text-green-700',
  };

  const statusIcons: Record<string, React.ReactNode> = {
    pending: <XCircle className="w-4 h-4 text-gray-400" />,
    'in-progress': <Target className="w-4 h-4 text-orange-500" />,
    completed: <CheckCircle2 className="w-4 h-4 text-green-500" />,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-orange-200 border-t-orange-600 rounded-full" />
      </div>
    );
  }

  // Stats
  const totalGoals = goals.length;
  const completedGoals = goals.filter((g) => g.status === 'completed').length;
  const completionRate = totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-semibold text-gray-900 tracking-tight">History</h1>
          <p className="text-sm text-gray-500 mt-1">
            Archive of all goals — set vs achieved
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportData('csv')}
            className="text-gray-600"
          >
            <Download className="w-4 h-4 mr-1" />
            CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportData('json')}
            className="text-gray-600"
          >
            <Download className="w-4 h-4 mr-1" />
            JSON
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-gray-100">
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-3xl font-bold text-gray-900">{totalGoals}</p>
            <p className="text-xs text-gray-500">Total Goals</p>
          </CardContent>
        </Card>
        <Card className="border-green-100">
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-3xl font-bold text-green-600">{completedGoals}</p>
            <p className="text-xs text-gray-500">Achieved</p>
          </CardContent>
        </Card>
        <Card className="border-orange-100">
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-3xl font-bold text-orange-600">{completionRate}%</p>
            <p className="text-xs text-gray-500">Success Rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {(['all', 'completed', 'in-progress', 'pending'] as const).map((f) => (
          <Button
            key={f}
            variant={filterStatus === f ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterStatus(f)}
            className={filterStatus === f ? 'bg-orange-600 hover:bg-orange-700' : ''}
          >
            {f === 'all' ? 'All' : f === 'in-progress' ? 'In Progress' : f.charAt(0).toUpperCase() + f.slice(1)}
          </Button>
        ))}
      </div>

      {/* Goals List */}
      <div className="space-y-3">
        {filteredGoals.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-gray-400">
              <HistoryIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-lg">No goals found</p>
            </CardContent>
          </Card>
        ) : (
          filteredGoals.map((goal) => {
            const totalTasks = goal.tasks?.length || 0;
            const completedTasks = goal.tasks?.filter((t) => t.status === 'completed').length || 0;

            return (
              <Card key={goal.id} className="hover:border-orange-100 transition-colors">
                <CardContent className="py-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-1">{statusIcons[goal.status]}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-medium text-gray-900">{goal.title}</h3>
                        <Badge className={statusColors[goal.status]}>{goal.status}</Badge>
                        <Badge variant="outline" className="text-xs">
                          {goal.type}
                        </Badge>
                      </div>
                      {goal.description && (
                        <p className="text-sm text-gray-500 mt-1">{goal.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {goal.start_date} → {goal.end_date}
                        </span>
                        {totalTasks > 0 && (
                          <span>
                            {completedTasks}/{totalTasks} tasks completed
                          </span>
                        )}
                      </div>
                      {goal.remarks && (
                        <div className="mt-2 p-2 bg-orange-50/50 rounded-md">
                          <p className="text-xs text-orange-700 flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" /> {goal.remarks}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}

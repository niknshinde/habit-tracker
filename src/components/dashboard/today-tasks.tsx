'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ExternalLink, BookOpen, Video, RotateCcw, PenLine, MoreHorizontal } from 'lucide-react';
import { format } from 'date-fns';

interface Task {
  id: string;
  title: string;
  description: string | null;
  date: string;
  task_type: string;
  youtube_url: string | null;
  youtube_title: string | null;
  status: string;
  remarks: string | null;
  goal_id: string | null;
}

const taskTypeIcons: Record<string, React.ReactNode> = {
  study: <BookOpen className="w-3.5 h-3.5" />,
  video: <Video className="w-3.5 h-3.5" />,
  revision: <RotateCcw className="w-3.5 h-3.5" />,
  practice: <PenLine className="w-3.5 h-3.5" />,
  other: <MoreHorizontal className="w-3.5 h-3.5" />,
};

const taskTypeColors: Record<string, string> = {
  study: 'bg-blue-50 text-blue-700',
  video: 'bg-purple-50 text-purple-700',
  revision: 'bg-green-50 text-green-700',
  practice: 'bg-amber-50 text-amber-700',
  other: 'bg-gray-50 text-gray-700',
};

export default function TodayTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const today = format(new Date(), 'yyyy-MM-dd');

  const fetchTasks = async () => {
    try {
      const res = await fetch(`/api/tasks?date=${today}`);
      const data = await res.json();
      if (Array.isArray(data)) setTasks(data);
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const toggleTask = async (task: Task) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    try {
      await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      setTasks(prev =>
        prev.map(t => (t.id === task.id ? { ...t, status: newStatus } : t))
      );
    } catch (err) {
      console.error('Failed to update task:', err);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-100 rounded w-1/3" />
            <div className="h-10 bg-gray-50 rounded" />
            <div className="h-10 bg-gray-50 rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Today&apos;s Tasks</h3>
          <Badge variant="secondary" className="text-xs">
            {tasks.filter(t => t.status === 'completed').length}/{tasks.length}
          </Badge>
        </div>

        {tasks.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-400 text-sm">No tasks for today</p>
            <p className="text-gray-300 text-xs mt-1">Add tasks from the Goals page</p>
          </div>
        ) : (
          <div className="space-y-2">
            {tasks.map((task) => (
              <div
                key={task.id}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                  task.status === 'completed'
                    ? 'bg-green-50/50 border-green-100'
                    : 'bg-white border-gray-100 hover:border-gray-200'
                }`}
              >
                <Checkbox
                  checked={task.status === 'completed'}
                  onCheckedChange={() => toggleTask(task)}
                  className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${
                    task.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-900'
                  }`}>
                    {task.title}
                  </p>
                  {task.youtube_title && (
                    <p className="text-xs text-purple-500 truncate mt-0.5">
                      🎥 {task.youtube_title}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="secondary" className={`text-xs ${taskTypeColors[task.task_type] || ''}`}>
                    {taskTypeIcons[task.task_type]}
                  </Badge>
                  {task.youtube_url && (
                    <a
                      href={task.youtube_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-500 hover:text-purple-700 p-1"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

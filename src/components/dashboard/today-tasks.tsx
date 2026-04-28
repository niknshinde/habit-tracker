'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ExternalLink, BookOpen, Video, RotateCcw, PenLine, MoreHorizontal, ChevronDown, ChevronRight } from 'lucide-react';
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
  study: 'bg-sky-400/10 text-sky-400',
  video: 'bg-purple-400/10 text-purple-400',
  revision: 'bg-emerald-400/10 text-emerald-400',
  practice: 'bg-amber-400/10 text-amber-400',
  other: 'bg-[#948979]/10 text-[#948979]',
};

export default function TodayTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

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

  const toggleExpand = (taskId: string) => {
    setExpandedTasks(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-[#393E46] rounded w-1/3" />
            <div className="h-10 bg-[#393E46]/60 rounded" />
            <div className="h-10 bg-[#393E46]/60 rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-[#F0E6D3]">Today&apos;s Tasks</h3>
          <Badge variant="secondary" className="text-xs">
            {tasks.filter(t => t.status === 'completed').length}/{tasks.length}
          </Badge>
        </div>

        {tasks.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-[#948979] text-sm">No tasks for today</p>
            <p className="text-[#948979]/50 text-xs mt-1">Add tasks from the Goals page</p>
          </div>
        ) : (
          <div className="space-y-2">
            {tasks.map((task) => (
              <div
                key={task.id}
                className={`rounded-lg border transition-colors ${
                  task.status === 'completed'
                    ? 'bg-emerald-400/5 border-emerald-400/20'
                    : 'bg-[#2D333B] border-[#948979]/15 hover:border-[#948979]/30'
                }`}
              >
                <div className="flex items-center gap-3 p-3">
                  <Checkbox
                    checked={task.status === 'completed'}
                    onCheckedChange={() => toggleTask(task)}
                    className="data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                  />
                  {task.description && (
                    <button
                      onClick={() => toggleExpand(task.id)}
                      className="text-[#948979] hover:text-[#DFD0B8] transition-colors"
                    >
                      {expandedTasks.has(task.id) ? (
                        <ChevronDown className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}
                  <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => task.description && toggleExpand(task.id)}
                  >
                    <p className={`text-sm font-medium truncate ${
                      task.status === 'completed' ? 'line-through text-[#948979]/60' : 'text-[#F0E6D3]'
                    }`}>
                      {task.title}
                    </p>
                    {task.youtube_title && (
                      <p className="text-xs text-purple-400 truncate mt-0.5">
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
                        className="text-purple-400 hover:text-purple-300 p-1"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
                {expandedTasks.has(task.id) && task.description && (
                  <div className="px-3 pb-3 pl-10">
                    <div className="text-xs text-[#948979] leading-relaxed space-y-1">
                      {(() => {
                        const parts = task.description.split(/\s+(?=Q\d+[\.\:]\s)/).map(s => s.trim()).filter(Boolean);
                        if (parts.length > 1) {
                          return parts.map((item, i) => (
                            <p key={i} className="py-1.5 px-2.5 bg-[#393E46] rounded text-[11.5px] leading-relaxed">
                              {item}
                            </p>
                          ));
                        }
                        return <p className="whitespace-pre-wrap">{task.description}</p>;
                      })()}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

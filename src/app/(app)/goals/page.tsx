'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Plus,
  Target,
  ChevronDown,
  ChevronRight,
  Trash2,
  Edit,
  ExternalLink,
  MessageSquare,
  Calendar,
} from 'lucide-react';
import { format } from 'date-fns';
import Celebration from '@/components/celebration';
import TaskItem from '@/components/task-item';

interface Task {
  id: string;
  title: string;
  status: string;
  task_type: string;
  date: string;
  youtube_url?: string;
  youtube_title?: string;
  remarks?: string;
  description?: string;
}

interface Goal {
  id: string;
  title: string;
  description?: string;
  type: string;
  parent_id?: string;
  start_date: string;
  end_date: string;
  status: string;
  remarks?: string;
  tasks?: Task[];
  children?: Goal[];
}

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set());
  const [showGoalDialog, setShowGoalDialog] = useState(false);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [selectedGoalForTask, setSelectedGoalForTask] = useState<string>('');
  const [filter, setFilter] = useState<'all' | 'monthly' | 'weekly'>('weekly');
  const [celebrate, setCelebrate] = useState(false);
  const [celebrateMsg, setCelebrateMsg] = useState('');

  // Goal form state
  const [goalForm, setGoalForm] = useState({
    title: '',
    description: '',
    type: 'monthly' as 'monthly' | 'weekly',
    parent_id: '',
    start_date: format(new Date(), 'yyyy-MM-dd'),
    end_date: '',
    remarks: '',
  });

  // Task form state
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    task_type: 'study',
    youtube_url: '',
    youtube_title: '',
    remarks: '',
  });

  const fetchGoals = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  const monthlyGoals = goals.filter((g) => g.type === 'monthly');
  const weeklyGoals = goals.filter((g) => g.type === 'weekly');

  const filteredGoals = filter === 'all' ? goals : filter === 'weekly' ? weeklyGoals : monthlyGoals;

  const toggleExpand = (id: string) => {
    setExpandedGoals((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const createGoal = async () => {
    try {
      const res = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...goalForm,
          parent_id: goalForm.parent_id || null,
        }),
      });
      if (res.ok) {
        setShowGoalDialog(false);
        resetGoalForm();
        fetchGoals();
      }
    } catch (err) {
      console.error('Failed to create goal:', err);
    }
  };

  const updateGoal = async () => {
    if (!editingGoal) return;
    try {
      const res = await fetch(`/api/goals/${editingGoal.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(goalForm),
      });
      if (res.ok) {
        setEditingGoal(null);
        setShowGoalDialog(false);
        resetGoalForm();
        fetchGoals();
      }
    } catch (err) {
      console.error('Failed to update goal:', err);
    }
  };

  const deleteGoal = async (id: string) => {
    if (!confirm('Delete this goal and all its sub-goals and tasks?')) return;
    try {
      await fetch(`/api/goals/${id}`, { method: 'DELETE' });
      fetchGoals();
    } catch (err) {
      console.error('Failed to delete goal:', err);
    }
  };

  const updateGoalStatus = async (id: string, status: string) => {
    try {
      await fetch(`/api/goals/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (status === 'completed') {
        const goal = goals.find(g => g.id === id);
        setCelebrateMsg(`Goal completed: ${goal?.title || 'Great job!'} 🏆`);
        setCelebrate(true);
      }
      fetchGoals();
    } catch (err) {
      console.error('Failed to update goal status:', err);
    }
  };

  const createTask = async () => {
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...taskForm,
          goal_id: selectedGoalForTask || null,
        }),
      });
      if (res.ok) {
        setShowTaskDialog(false);
        resetTaskForm();
        fetchGoals();
      }
    } catch (err) {
      console.error('Failed to create task:', err);
    }
  };

  const toggleTaskStatus = async (taskId: string, currentStatus: string, goalId?: string) => {
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      // Check if this completes all tasks for the goal
      if (newStatus === 'completed' && goalId) {
        const goal = goals.find(g => g.id === goalId);
        if (goal?.tasks) {
          const otherTasks = goal.tasks.filter(t => t.id !== taskId);
          const allOthersDone = otherTasks.every(t => t.status === 'completed');
          if (allOthersDone && otherTasks.length > 0) {
            setCelebrateMsg(`All tasks done for: ${goal.title}! 🌟`);
            setCelebrate(true);
          }
        }
      }

      fetchGoals();
    } catch (err) {
      console.error('Failed to toggle task:', err);
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
      fetchGoals();
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  const resetGoalForm = () => {
    setGoalForm({
      title: '',
      description: '',
      type: 'monthly',
      parent_id: '',
      start_date: format(new Date(), 'yyyy-MM-dd'),
      end_date: '',
      remarks: '',
    });
  };

  const resetTaskForm = () => {
    setTaskForm({
      title: '',
      description: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      task_type: 'study',
      youtube_url: '',
      youtube_title: '',
      remarks: '',
    });
  };

  const startEditGoal = (goal: Goal) => {
    setEditingGoal(goal);
    setGoalForm({
      title: goal.title,
      description: goal.description || '',
      type: goal.type as 'monthly' | 'weekly',
      parent_id: goal.parent_id || '',
      start_date: goal.start_date,
      end_date: goal.end_date,
      remarks: goal.remarks || '',
    });
    setShowGoalDialog(true);
  };

  const statusColors: Record<string, string> = {
    pending: 'bg-[#948979]/15 text-[#948979]',
    'in-progress': 'bg-[#DFD0B8]/15 text-[#DFD0B8]',
    completed: 'bg-emerald-400/15 text-emerald-400',
  };

  const getGoalProgress = (goal: Goal) => {
    const tasks = goal.tasks || [];
    if (tasks.length === 0) return 0;
    const completed = tasks.filter((t) => t.status === 'completed').length;
    return Math.round((completed / tasks.length) * 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-[#948979]/30 border-t-[#DFD0B8] rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-4 md:space-y-6">
      {/* Header */}
      <div className="space-y-3">
        <div>
          <h1 className="text-[22px] font-semibold text-[#F0E6D3] tracking-tight">Goals</h1>
          <p className="text-[13px] text-[#948979] mt-1 font-medium">Manage your study goals and tasks</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
            <DialogTrigger
              className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap text-[13px] font-medium rounded-md border border-[#DFD0B8]/30 text-[#DFD0B8] hover:bg-[#DFD0B8]/10 h-9 px-3 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Task
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Task</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Title</Label>
                  <Input
                    value={taskForm.title}
                    onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                    placeholder="e.g., Watch Polity Lecture 5"
                  />
                </div>
                <div>
                  <Label>Link to Goal (optional)</Label>
                  <Select value={selectedGoalForTask} onValueChange={(v) => setSelectedGoalForTask(v || '')}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a goal" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Goal</SelectItem>
                      {goals.map((g) => (
                        <SelectItem key={g.id} value={g.id}>
                          {g.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={taskForm.date}
                      onChange={(e) => setTaskForm({ ...taskForm, date: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Type</Label>
                    <Select value={taskForm.task_type} onValueChange={(v) => setTaskForm({ ...taskForm, task_type: v || 'study' })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="study">Study</SelectItem>
                        <SelectItem value="video">Video</SelectItem>
                        <SelectItem value="revision">Revision</SelectItem>
                        <SelectItem value="practice">Practice</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {taskForm.task_type === 'video' && (
                  <div className="space-y-3">
                    <div>
                      <Label>YouTube URL</Label>
                      <Input
                        value={taskForm.youtube_url}
                        onChange={(e) => setTaskForm({ ...taskForm, youtube_url: e.target.value })}
                        placeholder="https://youtube.com/watch?v=..."
                      />
                    </div>
                    <div>
                      <Label>Video Title</Label>
                      <Input
                        value={taskForm.youtube_title}
                        onChange={(e) => setTaskForm({ ...taskForm, youtube_title: e.target.value })}
                        placeholder="Lecture title"
                      />
                    </div>
                  </div>
                )}
                <div>
                  <Label>Description (optional)</Label>
                  <Textarea
                    value={taskForm.description}
                    onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                    placeholder="Additional details..."
                    rows={2}
                  />
                </div>
                <Button
                  onClick={createTask}
                  className="w-full bg-[#DFD0B8] hover:bg-[#C4B8A2] text-[#222831]"
                  disabled={!taskForm.title || !taskForm.date}
                >
                  Add Task
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog
            open={showGoalDialog}
            onOpenChange={(v) => {
              setShowGoalDialog(v);
              if (!v) {
                setEditingGoal(null);
                resetGoalForm();
              }
            }}
          >
            <DialogTrigger
              className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap text-[13px] font-medium rounded-md bg-[#DFD0B8] hover:bg-[#C4B8A2] text-[#222831] h-9 px-3 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              New Goal
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingGoal ? 'Edit Goal' : 'Create New Goal'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Title</Label>
                  <Input
                    value={goalForm.title}
                    onChange={(e) => setGoalForm({ ...goalForm, title: e.target.value })}
                    placeholder="e.g., Complete Indian Polity"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Type</Label>
                    <Select
                      value={goalForm.type}
                      onValueChange={(v) => setGoalForm({ ...goalForm, type: (v || 'monthly') as 'monthly' | 'weekly' })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {goalForm.type === 'weekly' && (
                    <div>
                      <Label>Parent Goal</Label>
                      <Select value={goalForm.parent_id} onValueChange={(v) => setGoalForm({ ...goalForm, parent_id: v || '' })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {monthlyGoals.map((g) => (
                            <SelectItem key={g.id} value={g.id}>
                              {g.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Start Date</Label>
                    <Input
                      type="date"
                      value={goalForm.start_date}
                      onChange={(e) => setGoalForm({ ...goalForm, start_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>End Date</Label>
                    <Input
                      type="date"
                      value={goalForm.end_date}
                      onChange={(e) => setGoalForm({ ...goalForm, end_date: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label>Description (optional)</Label>
                  <Textarea
                    value={goalForm.description}
                    onChange={(e) => setGoalForm({ ...goalForm, description: e.target.value })}
                    placeholder="Goal description..."
                    rows={2}
                  />
                </div>
                <div>
                  <Label>Remarks (optional)</Label>
                  <Textarea
                    value={goalForm.remarks}
                    onChange={(e) => setGoalForm({ ...goalForm, remarks: e.target.value })}
                    placeholder="Notes, reflections..."
                    rows={2}
                  />
                </div>
                <Button
                  onClick={editingGoal ? updateGoal : createGoal}
                  className="w-full bg-[#DFD0B8] hover:bg-[#C4B8A2] text-[#222831]"
                  disabled={!goalForm.title || !goalForm.start_date || !goalForm.end_date}
                >
                  {editingGoal ? 'Update Goal' : 'Create Goal'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {['weekly', 'monthly', 'all'].map((f) => (
          <Button
            key={f}
            variant={filter === f ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(f as typeof filter)}
            className={filter === f ? 'bg-[#DFD0B8] hover:bg-[#C4B8A2] text-[#222831]' : ''}
          >
            {f === 'all' ? 'All Goals' : f === 'monthly' ? 'Monthly' : 'Weekly'}
          </Button>
        ))}
      </div>

      {/* Goals list */}
      <div className="space-y-4">
        {filteredGoals.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-[#948979]">
                <Target className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-[15px] font-medium">No goals yet</p>
                <p className="text-sm mt-1">Click &ldquo;New Goal&rdquo; to create your first goal.</p>
              </CardContent>
            </Card>
          ) : (
            filteredGoals.map((goal) => {
              const isExpanded = expandedGoals.has(goal.id);
              const progress = getGoalProgress(goal);
              const childGoals = weeklyGoals.filter((g) => g.parent_id === goal.id);

              return (
                <Card key={goal.id} className="overflow-hidden border-[#948979]/15 shadow-sm">
                  <CardHeader className="pb-3 px-3 md:px-6">
                    <div className="flex items-start gap-2">
                      <button
                        onClick={() => toggleExpand(goal.id)}
                        className="mt-1 text-[#948979] hover:text-[#DFD0B8] shrink-0"
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-5 h-5" />
                        ) : (
                          <ChevronRight className="w-5 h-5" />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <CardTitle className="text-[15px] leading-snug">{goal.title}</CardTitle>
                            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                              <Badge className={`text-[11px] font-medium ${statusColors[goal.status]}`}>{goal.status}</Badge>
                              <Badge variant="outline" className="text-[11px]">
                                {goal.type}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex items-center gap-0.5 shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-[#948979] hover:text-sky-400"
                              onClick={() => startEditGoal(goal)}
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-[#948979] hover:text-rose-400"
                              onClick={() => deleteGoal(goal.id)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                        <p className="text-[11.5px] text-[#948979] mt-1.5 flex items-center gap-1">
                          <Calendar className="w-3 h-3 shrink-0" />
                          {format(new Date(goal.start_date + 'T00:00:00'), 'MMM d')} → {format(new Date(goal.end_date + 'T00:00:00'), 'MMM d, yyyy')}
                        </p>
                        {goal.description && (
                          <p className="text-[12.5px] text-[#948979] mt-1 line-clamp-2">{goal.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <Progress value={progress} className="h-1.5 flex-1" />
                          <span className="text-[11px] text-[#948979] font-medium">{progress}%</span>
                        </div>
                        <div className="mt-2">
                          <Select
                            value={goal.status}
                            onValueChange={(v) => updateGoalStatus(goal.id, v || 'pending')}
                          >
                            <SelectTrigger className="w-[120px] h-7 text-[11.5px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="in-progress">In Progress</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </CardHeader>

                  {isExpanded && (
                    <CardContent className="pt-0 px-3 md:px-6 space-y-4">
                      {/* Remarks */}
                      {goal.remarks && (
                        <div className="bg-[#DFD0B8]/8 p-3 rounded-lg">
                          <p className="text-xs font-medium text-[#DFD0B8] flex items-center gap-1 mb-1">
                            <MessageSquare className="w-3 h-3" /> Remarks
                          </p>
                          <p className="text-sm text-[#948979]">{goal.remarks}</p>
                        </div>
                      )}

                      {/* Sub-goals (weekly under monthly) */}
                      {childGoals.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-[#948979] mb-2 uppercase tracking-wider">
                            Weekly Sub-Goals
                          </p>
                          <div className="space-y-2 pl-4 border-l-2 border-[#DFD0B8]/20">
                            {childGoals.map((child) => (
                              <div
                                key={child.id}
                                className="flex items-center justify-between p-2 bg-[#393E46] rounded-lg"
                              >
                                <div>
                                  <p className="text-sm font-medium text-[#F0E6D3]">{child.title}</p>
                                  <p className="text-xs text-[#948979]">
                                    {child.start_date} → {child.end_date}
                                  </p>
                                </div>
                                <Badge className={statusColors[child.status]}>{child.status}</Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Tasks */}
                      {goal.tasks && goal.tasks.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-[#948979] mb-2 uppercase tracking-wider">
                            Tasks ({goal.tasks.filter((t) => t.status === 'completed').length}/{goal.tasks.length})
                          </p>
                          <div className="space-y-1.5">
                            {goal.tasks.map((task) => (
                              <TaskItem
                                key={task.id}
                                task={task}
                                showCheckbox={false}
                                rightContent={
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-[#948979] hover:text-rose-400"
                                    onClick={() => deleteTask(task.id)}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                }
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Add task inline */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-[#DFD0B8] hover:text-[#C4B8A2] hover:bg-[#DFD0B8]/10"
                        onClick={() => {
                          setSelectedGoalForTask(goal.id);
                          setShowTaskDialog(true);
                        }}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add Task to this Goal
                      </Button>
                    </CardContent>
                  )}
                </Card>
              );
            })
          )}
        </div>

      <Celebration
        trigger={celebrate}
        onComplete={() => setCelebrate(false)}
        message={celebrateMsg}
        emoji="🏆"
      />
    </div>
  );
}

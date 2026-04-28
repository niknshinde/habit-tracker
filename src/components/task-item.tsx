'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronDown, ChevronRight, ExternalLink, BookOpen, Video, RotateCcw, PenLine, MoreHorizontal } from 'lucide-react';

export interface TaskItemData {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  task_type: string;
  youtube_url?: string | null;
  youtube_title?: string | null;
}

interface TaskItemProps {
  task: TaskItemData;
  onToggle?: () => void;
  showCheckbox?: boolean;
  showStatusDot?: boolean;
  rightContent?: React.ReactNode;
  className?: string;
}

const taskTypeIcons: Record<string, React.ReactNode> = {
  study: <BookOpen className="w-3.5 h-3.5" />,
  video: <Video className="w-3.5 h-3.5" />,
  revision: <RotateCcw className="w-3.5 h-3.5" />,
  practice: <PenLine className="w-3.5 h-3.5" />,
  other: <MoreHorizontal className="w-3.5 h-3.5" />,
};

const taskTypeBadgeColors: Record<string, string> = {
  study: 'bg-sky-400/10 text-sky-400 border-sky-400/20',
  video: 'bg-rose-400/10 text-rose-400 border-rose-400/20',
  revision: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20',
  practice: 'bg-amber-400/10 text-amber-400 border-amber-400/20',
  other: 'bg-[#948979]/10 text-[#948979] border-[#948979]/20',
};

function formatDescription(description: string) {
  const parts = description.split(/\s+(?=Q\d+[\.\:]\s)/).map(s => s.trim()).filter(Boolean);
  if (parts.length > 1) {
    return (
      <div className="space-y-1">
        {parts.map((item, i) => (
          <p key={i} className="py-1.5 px-2.5 bg-[#393E46] rounded text-[11.5px] leading-relaxed">
            {item}
          </p>
        ))}
      </div>
    );
  }
  return <p className="whitespace-pre-wrap">{description}</p>;
}

export default function TaskItem({ task, onToggle, showCheckbox = true, showStatusDot = false, rightContent, className }: TaskItemProps) {
  const [expanded, setExpanded] = useState(false);
  const hasDescription = !!task.description;
  const isCompleted = task.status === 'completed';

  return (
    <div
      className={`rounded-lg border transition-colors ${
        isCompleted
          ? 'bg-emerald-400/5 border-emerald-400/20'
          : 'bg-[#2D333B] border-[#948979]/15 hover:border-[#DFD0B8]/30'
      } ${className || ''}`}
    >
      <div className="flex items-center gap-2.5 p-2.5">
        {showCheckbox && onToggle && (
          <Checkbox
            checked={isCompleted}
            onCheckedChange={onToggle}
            className="data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500 border-[#948979]/40"
          />
        )}
        {showStatusDot && (
          <div className={`w-4 h-4 rounded-full shrink-0 border-2 ${
            isCompleted ? 'bg-emerald-500 border-emerald-500' : 'border-[#948979]/40'
          }`} />
        )}

        {hasDescription && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-[#948979] hover:text-[#DFD0B8] transition-colors shrink-0"
          >
            {expanded ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
          </button>
        )}

        <div
          className={`flex-1 min-w-0 ${hasDescription ? 'cursor-pointer' : ''}`}
          onClick={() => hasDescription && setExpanded(!expanded)}
        >
          <p className={`text-[13.5px] font-medium ${
            isCompleted ? 'line-through text-[#948979]/60' : 'text-[#F0E6D3]'
          }`}>
            {taskTypeIcons[task.task_type] && (
              <span className="inline-flex align-middle mr-1.5">{taskTypeIcons[task.task_type]}</span>
            )}
            {task.title}
          </p>
          {task.youtube_title && (
            <p className="text-xs text-[#948979] truncate mt-0.5">
              📹 {task.youtube_title}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="secondary" className={`text-[11px] font-medium ${taskTypeBadgeColors[task.task_type] || ''}`}>
            {task.task_type}
          </Badge>
          {task.youtube_url && (
            <a
              href={task.youtube_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-rose-400 hover:text-rose-300"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
          {rightContent}
        </div>
      </div>

      {expanded && task.description && (
        <div className="px-3 pb-3 pl-11">
          <div className="text-xs text-[#948979] leading-relaxed">
            {formatDescription(task.description)}
          </div>
        </div>
      )}
    </div>
  );
}

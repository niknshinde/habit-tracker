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
  study: 'bg-blue-100 text-blue-700 border-blue-200',
  video: 'bg-red-100 text-red-700 border-red-200',
  revision: 'bg-green-100 text-green-700 border-green-200',
  practice: 'bg-amber-100 text-amber-700 border-amber-200',
  other: 'bg-gray-100 text-gray-700 border-gray-200',
};

function formatDescription(description: string) {
  const parts = description.split(/\s+(?=Q\d+[\.\:]\s)/).map(s => s.trim()).filter(Boolean);
  if (parts.length > 1) {
    return (
      <div className="space-y-1">
        {parts.map((item, i) => (
          <p key={i} className="py-1.5 px-2.5 bg-gray-50 rounded text-[11.5px] leading-relaxed">
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
          ? 'bg-green-50/60 border-green-200'
          : 'bg-white border-gray-200 hover:border-orange-200'
      } ${className || ''}`}
    >
      <div className="flex items-center gap-2.5 p-2.5">
        {showCheckbox && onToggle && (
          <Checkbox
            checked={isCompleted}
            onCheckedChange={onToggle}
            className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600 border-gray-400"
          />
        )}
        {showStatusDot && (
          <div className={`w-4 h-4 rounded-full shrink-0 border-2 ${
            isCompleted ? 'bg-green-500 border-green-500' : 'border-gray-300'
          }`} />
        )}

        {hasDescription && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-gray-400 hover:text-gray-600 transition-colors shrink-0"
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
            isCompleted ? 'line-through text-gray-400' : 'text-gray-800'
          }`}>
            {taskTypeIcons[task.task_type] && (
              <span className="inline-flex align-middle mr-1.5">{taskTypeIcons[task.task_type]}</span>
            )}
            {task.title}
          </p>
          {task.youtube_title && (
            <p className="text-xs text-gray-400 truncate mt-0.5">
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
              className="text-red-500 hover:text-red-700"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
          {rightContent}
        </div>
      </div>

      {expanded && task.description && (
        <div className="px-3 pb-3 pl-11">
          <div className="text-xs text-gray-500 leading-relaxed">
            {formatDescription(task.description)}
          </div>
        </div>
      )}
    </div>
  );
}

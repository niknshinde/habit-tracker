'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
  Bot,
  Copy,
  Check,
  Terminal,
  Monitor,
  Wrench,
  ChevronDown,
  ChevronUp,
  Zap,
  MessageSquare,
  Key,
} from 'lucide-react';
import { getSession } from '@/lib/auth';

function CopyBlock({ code, label }: { code: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      {label && (
        <span className="text-[11px] text-[#948979] font-medium uppercase tracking-wide block mb-1.5">{label}</span>
      )}
      <div className="bg-[#1C2028] rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-3 py-1.5 bg-[#222831]">
          <span className="text-[11px] text-[#948979] font-mono">config</span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 text-[11px] text-[#948979] hover:text-[#F0E6D3] transition-colors"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <pre className="p-3 text-[12.5px] text-[#DFD0B8] font-mono overflow-x-auto leading-relaxed whitespace-pre">
          {code}
        </pre>
      </div>
    </div>
  );
}

function ToolCard({
  name,
  description,
  example,
}: {
  name: string;
  description: string;
  example: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-[#948979]/15 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[#393E46] transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-[#DFD0B8]/10 rounded-md flex items-center justify-center shrink-0">
            <Wrench className="w-3.5 h-3.5 text-[#DFD0B8]" />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-[#F0E6D3] font-mono">{name}</p>
            <p className="text-[12px] text-[#948979] mt-0.5">{description}</p>
          </div>
        </div>
        {open ? (
          <ChevronUp className="w-4 h-4 text-[#948979] shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-[#948979] shrink-0" />
        )}
      </button>
      {open && (
        <div className="px-4 pb-3 border-t border-[#948979]/15 pt-3">
          <p className="text-[11px] text-[#948979] font-medium uppercase tracking-wide mb-1.5">Example prompt</p>
          <div className="bg-[#DFD0B8]/8 rounded-lg px-3 py-2.5">
            <p className="text-[12.5px] text-[#DFD0B8] leading-relaxed">&ldquo;{example}&rdquo;</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MCPSetupPage() {
  const appUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001';
  const serverUrl = `${appUrl}/api/mcp`;
  const [token, setToken] = useState<string | null>(null);
  const [tokenLoading, setTokenLoading] = useState(false);
  const [tokenCopied, setTokenCopied] = useState(false);

  // Auto-fetch token on mount
  useEffect(() => {
    getSession().then((session) => {
      if (session?.access_token) setToken(session.access_token);
    });
  }, []);

  const handleGetToken = async () => {
    setTokenLoading(true);
    try {
      const session = await getSession();
      if (session?.access_token) {
        setToken(session.access_token);
      }
    } finally {
      setTokenLoading(false);
    }
  };

  const handleCopyToken = () => {
    if (!token) return;
    navigator.clipboard.writeText(token);
    setTokenCopied(true);
    setTimeout(() => setTokenCopied(false), 2000);
  };

  const tokenDisplay = token || 'YOUR_SUPABASE_ACCESS_TOKEN';

  const claudeDesktopConfig = `{
  "mcpServers": {
    "upsc-tracker": {
      "type": "streamable-http",
      "url": "${serverUrl}",
      "headers": {
        "Authorization": "Bearer ${tokenDisplay}"
      }
    }
  }
}`;

  const claudeCodeConfig = `claude mcp add upsc-tracker \\
  --transport http \\
  ${serverUrl} \\
  --header "Authorization: Bearer ${tokenDisplay}"`;

  const cursorConfig = `{
  "mcpServers": {
    "upsc-tracker": {
      "url": "${serverUrl}",
      "headers": {
        "Authorization": "Bearer ${tokenDisplay}"
      }
    }
  }
}`;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-9 h-9 bg-[#DFD0B8]/10 rounded-lg flex items-center justify-center">
            <Bot className="w-5 h-5 text-[#DFD0B8]" />
          </div>
          <div>
            <h1 className="text-[22px] font-semibold text-[#F0E6D3] tracking-tight">MCP Setup</h1>
            <p className="text-[13px] text-[#948979] font-medium">Connect any AI client to manage your study plan</p>
          </div>
        </div>
      </div>

      {/* What is MCP */}
      <Card className="border-[#DFD0B8]/20 bg-[#DFD0B8]/5">
        <CardContent className="py-4">
          <div className="flex gap-3">
            <Zap className="w-5 h-5 text-[#DFD0B8] shrink-0 mt-0.5" />
            <div>
              <p className="text-[13.5px] font-semibold text-[#F0E6D3] mb-1">What is this?</p>
              <p className="text-[13px] text-[#948979] leading-relaxed">
                MCP (Model Context Protocol) lets AI assistants directly create goals, add tasks, and check your analytics — all through conversation. 
                The MCP server is built into this app — no separate setup needed. Any MCP-compatible client (Claude, Cursor, VS Code Copilot, etc.) can connect. 
                Just tell your AI: <span className="font-medium text-[#DFD0B8]">&ldquo;Create a weekly plan for Indian Polity chapters 6-10&rdquo;</span> and it does it instantly.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step 1: Get Access Token */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="w-6 h-6 bg-[#DFD0B8] text-[#222831] rounded-full flex items-center justify-center text-[12px] font-bold">1</span>
          <h2 className="text-[15px] font-semibold text-[#F0E6D3] tracking-tight">Get Your Access Token</h2>
        </div>
        <Card className={`border-[#948979]/15 ${token ? 'border-emerald-400/30 bg-emerald-400/5' : ''}`}>
          <CardContent className="py-4 space-y-3">
            <p className="text-[13px] text-[#948979] leading-relaxed">
              Click the button below to generate your access token. It will be automatically injected into all the config snippets below — just copy and paste.
            </p>

            <div className="flex items-center gap-3">
              <button
                onClick={handleGetToken}
                disabled={tokenLoading}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#DFD0B8] text-[#222831] text-[13px] font-semibold rounded-lg hover:bg-[#C4B8A2] active:scale-[0.98] transition-all disabled:opacity-50"
              >
                <Key className="w-4 h-4" />
                {tokenLoading ? 'Loading...' : token ? 'Refresh Token' : 'Get My Token'}
              </button>

              {token && (
                <button
                  onClick={handleCopyToken}
                  className="flex items-center gap-1.5 px-3 py-2.5 bg-[#393E46] text-[#DFD0B8] text-[13px] font-medium rounded-lg hover:bg-[#414851] transition-colors"
                >
                  {tokenCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {tokenCopied ? 'Copied!' : 'Copy Token'}
                </button>
              )}
            </div>

            {token ? (
              <div className="bg-emerald-400/10 border border-emerald-400/20 rounded-lg px-3 py-2">
                <p className="text-[12px] text-emerald-400">
                  <span className="font-semibold">Token ready!</span> Your token has been injected into all config snippets below. Just copy the config you need — no manual editing required.
                </p>
                <p className="text-[11px] text-emerald-400/60 mt-1 font-mono break-all">
                  {token.slice(0, 20)}...{token.slice(-20)}
                </p>
              </div>
            ) : (
              <div className="bg-amber-400/10 border border-amber-400/20 rounded-lg px-3 py-2">
                <p className="text-[12px] text-amber-400">
                  <span className="font-semibold">Note:</span> Token expires after 30 days. Come back here to refresh it when needed.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Step 3a: Claude Desktop */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="w-6 h-6 bg-[#DFD0B8] text-[#222831] rounded-full flex items-center justify-center text-[12px] font-bold">2a</span>
          <div className="flex items-center gap-2">
            <Monitor className="w-4 h-4 text-[#948979]" />
            <h2 className="text-[15px] font-semibold text-[#F0E6D3] tracking-tight">Claude Desktop</h2>
          </div>
        </div>
        <Card className="border-[#948979]/15">
          <CardContent className="py-4 space-y-3">
            <ol className="space-y-2 text-[13px] text-[#948979]">
              <li className="flex gap-2">
                <span className="text-[#DFD0B8] font-semibold shrink-0">1.</span>
                Open Claude Desktop → <span className="font-medium text-[#F0E6D3]">Settings</span> → <span className="font-medium text-[#F0E6D3]">Developer</span> → <span className="font-medium text-[#F0E6D3]">Edit Config</span>
              </li>
              <li className="flex gap-2">
                <span className="text-[#DFD0B8] font-semibold shrink-0">2.</span>
                <span>Paste this into <span className="font-mono text-[12px] text-[#948979]">claude_desktop_config.json</span>:</span>
              </li>
            </ol>
            <CopyBlock
              label="claude_desktop_config.json"
              code={claudeDesktopConfig}
            />
            {!token && (
              <div className="bg-amber-400/10 border border-amber-400/20 rounded-lg px-3 py-2">
                <p className="text-[12px] text-amber-400">
                  <span className="font-semibold">Tip:</span> Click &ldquo;Get My Token&rdquo; in Step 1 to auto-fill the token above.
                </p>
              </div>
            )}
            <ol start={3} className="space-y-2 text-[13px] text-[#948979]">
              <li className="flex gap-2">
                <span className="text-[#DFD0B8] font-semibold shrink-0">3.</span>
                Restart Claude Desktop. You&apos;ll see a 🔨 icon — that means MCP tools are connected.
              </li>
            </ol>
          </CardContent>
        </Card>
      </div>

      {/* Step 3b: Claude Code */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="w-6 h-6 bg-[#DFD0B8] text-[#222831] rounded-full flex items-center justify-center text-[12px] font-bold">2b</span>
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-[#948979]" />
            <h2 className="text-[15px] font-semibold text-[#F0E6D3] tracking-tight">Claude Code (CLI)</h2>
          </div>
        </div>
        <Card className="border-[#948979]/15">
          <CardContent className="py-4 space-y-3">
            <p className="text-[13px] text-[#948979]">
              Run this command in your terminal:
            </p>
            <CopyBlock code={claudeCodeConfig} />
            <p className="text-[13px] text-[#948979]">
              Verify it&apos;s connected:
            </p>
            <CopyBlock code="claude mcp list" />
          </CardContent>
        </Card>
      </div>

      {/* Step 3c: Cursor / VS Code / Other */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="w-6 h-6 bg-[#DFD0B8] text-[#222831] rounded-full flex items-center justify-center text-[12px] font-bold">2c</span>
          <div className="flex items-center gap-2">
            <Monitor className="w-4 h-4 text-[#948979]" />
            <h2 className="text-[15px] font-semibold text-[#F0E6D3] tracking-tight">Cursor / VS Code / Other MCP Clients</h2>
          </div>
        </div>
        <Card className="border-[#948979]/15">
          <CardContent className="py-4 space-y-3">
            <p className="text-[13px] text-[#948979]">
              Add this to your MCP settings (usually <span className="font-mono text-[12px] text-[#948979]/70">.cursor/mcp.json</span> or equivalent):
            </p>
            <CopyBlock
              label="MCP config"
              code={cursorConfig}
            />
            {token ? (
              <div className="bg-emerald-400/10 border border-emerald-400/20 rounded-lg px-3 py-2">
                <p className="text-[12px] text-emerald-400">
                  <span className="font-semibold">Ready to copy!</span> Your token is already injected above.
                </p>
              </div>
            ) : (
              <div className="bg-amber-400/10 border border-amber-400/20 rounded-lg px-3 py-2">
                <p className="text-[12px] text-amber-400">
                  <span className="font-semibold">Any HTTP MCP client works!</span> Click &ldquo;Get My Token&rdquo; in Step 1 to auto-fill all configs.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Step 3: Available Tools */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="w-6 h-6 bg-[#DFD0B8] text-[#222831] rounded-full flex items-center justify-center text-[12px] font-bold">3</span>
          <h2 className="text-[15px] font-semibold text-[#F0E6D3] tracking-tight">Available Tools ({13})</h2>
        </div>
        <div className="space-y-2">
          <ToolCard
            name="add_monthly_goal"
            description="Create a monthly study goal"
            example="Create a monthly goal for completing Indian Polity by Laxmikant, starting May 1 to May 31"
          />
          <ToolCard
            name="add_weekly_goal"
            description="Create a weekly sub-goal under a monthly goal"
            example="Break down my Polity goal into 4 weekly goals — chapters 1-5, 6-10, 11-15, and revision"
          />
          <ToolCard
            name="add_task"
            description="Add a daily task (study, video, revision, practice)"
            example="Add tasks for this week: read Ch 1 tomorrow, solve MCQs on Thursday, and revise notes on Friday"
          />
          <ToolCard
            name="list_goals"
            description="List all goals with optional filters"
            example="Show me all my pending weekly goals"
          />
          <ToolCard
            name="list_tasks"
            description="List tasks by date, status, or goal"
            example="Show me all my tasks for today"
          />
          <ToolCard
            name="update_goal_status"
            description="Mark a goal as completed or in-progress"
            example="Mark my Indian Polity weekly goal as completed"
          />
          <ToolCard
            name="update_task_status"
            description="Mark a task as completed, in-progress, or pending"
            example="Mark the 'Read Chapter 3' task as completed"
          />
          <ToolCard
            name="start_study_session"
            description="Start a study session timer, optionally linked to a task"
            example="Start a study session for my Indian Economy reading task"
          />
          <ToolCard
            name="stop_study_session"
            description="Stop a running study session and record the duration"
            example="Stop my current study session"
          />
          <ToolCard
            name="get_analytics"
            description="Get study time, task rates, and progress stats"
            example="How am I doing this week? Show me my study analytics"
          />
          <ToolCard
            name="add_remarks"
            description="Add notes or remarks to any goal or task"
            example="Add a note to my Polity goal: focus more on fundamental rights for prelims"
          />
          <ToolCard
            name="delete_goal"
            description="Delete a goal and its linked sub-goals"
            example="Delete my old Geography monthly goal"
          />
          <ToolCard
            name="delete_task"
            description="Delete a task by its ID"
            example="Remove the duplicate task from yesterday"
          />
        </div>
      </div>

      {/* Step 4: Example Conversations */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="w-6 h-6 bg-[#DFD0B8] text-[#222831] rounded-full flex items-center justify-center text-[12px] font-bold">4</span>
          <h2 className="text-[15px] font-semibold text-[#F0E6D3] tracking-tight">Try These Prompts</h2>
        </div>
        <Card className="border-[#948979]/15">
          <CardContent className="py-4 space-y-3">
            {[
              {
                icon: '📅',
                prompt: 'Create a weekly study plan for Indian Economy chapters 1-4. Add study tasks for reading, one video lecture, and a practice MCQ session.',
              },
              {
                icon: '📊',
                prompt: 'Show me my analytics for this week. Am I on track? How does it compare to last week?',
              },
              {
                icon: '🎯',
                prompt: 'Create a monthly goal for May: Complete NCERT Geography class 11. Break it into 4 weekly goals and add daily tasks.',
              },
              {
                icon: '✅',
                prompt: 'List all my pending tasks and goals. Mark the Polity Ch 1-5 goal as completed.',
              },
              {
                icon: '📝',
                prompt: 'Add a remark to my current weekly goal: Need to focus more on map-based questions for Geography.',
              },
            ].map((item, i) => (
              <div key={i} className="flex gap-3 p-3 bg-[#393E46] rounded-lg">
                <span className="text-xl shrink-0">{item.icon}</span>
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <MessageSquare className="w-3 h-3 text-[#948979]" />
                    <span className="text-[11px] text-[#948979] font-medium uppercase tracking-wide">Example prompt</span>
                  </div>
                  <p className="text-[13px] text-[#DFD0B8] leading-relaxed">{item.prompt}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="pb-8" />
    </div>
  );
}

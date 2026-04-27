import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { z } from "zod";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { format } from "date-fns";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// ─── Auth Helper ─────────────────────────────────────────────────────────
async function authenticateRequest(
  request: Request
): Promise<{ supabase: SupabaseClient; userId: string } | null> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7);
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;

  return { supabase, userId: user.id };
}

// ─── MCP Server Factory ─────────────────────────────────────────────────
function createMcpServer(supabase: SupabaseClient, userId: string) {
  const server = new McpServer({
    name: "upsc-study-tracker",
    version: "1.0.0",
  });

  // ─── Tool: Add Monthly Goal ──────────────────────────────────────────
  server.tool(
    "add_monthly_goal",
    "Create a new monthly study goal for UPSC preparation",
    {
      title: z
        .string()
        .describe("Goal title, e.g. 'Complete Indian Polity by Laxmikant'"),
      description: z
        .string()
        .optional()
        .describe("Detailed description of the goal"),
      start_date: z.string().describe("Start date in YYYY-MM-DD format"),
      end_date: z.string().describe("End date in YYYY-MM-DD format"),
      remarks: z.string().optional().describe("Initial remarks or notes"),
    },
    async ({ title, description, start_date, end_date, remarks }) => {
      const { data, error } = await supabase
        .from("goals")
        .insert({
          title,
          description: description || null,
          type: "monthly",
          start_date,
          end_date,
          status: "pending",
          remarks: remarks || null,
          user_id: userId,
        })
        .select()
        .single();

      if (error)
        return {
          content: [{ type: "text" as const, text: `Error: ${error.message}` }],
        };
      return {
        content: [
          {
            type: "text" as const,
            text: `Created monthly goal: "${data.title}" (${data.id})\nPeriod: ${data.start_date} → ${data.end_date}`,
          },
        ],
      };
    }
  );

  // ─── Tool: Add Weekly Goal ───────────────────────────────────────────
  server.tool(
    "add_weekly_goal",
    "Create a weekly sub-goal under a monthly goal",
    {
      title: z.string().describe("Weekly goal title"),
      parent_id: z
        .string()
        .optional()
        .describe("UUID of the parent monthly goal"),
      start_date: z.string().describe("Start date in YYYY-MM-DD format"),
      end_date: z.string().describe("End date in YYYY-MM-DD format"),
      description: z.string().optional(),
      remarks: z.string().optional(),
    },
    async ({ title, parent_id, start_date, end_date, description, remarks }) => {
      const { data, error } = await supabase
        .from("goals")
        .insert({
          title,
          description: description || null,
          type: "weekly",
          parent_id: parent_id || null,
          start_date,
          end_date,
          status: "pending",
          remarks: remarks || null,
          user_id: userId,
        })
        .select()
        .single();

      if (error)
        return {
          content: [{ type: "text" as const, text: `Error: ${error.message}` }],
        };
      return {
        content: [
          {
            type: "text" as const,
            text: `Created weekly goal: "${data.title}" (${data.id})\nPeriod: ${data.start_date} → ${data.end_date}`,
          },
        ],
      };
    }
  );

  // ─── Tool: Add Task ──────────────────────────────────────────────────
  server.tool(
    "add_task",
    "Add a daily study task, optionally linked to a goal. Supports YouTube video links.",
    {
      title: z.string().describe("Task title"),
      goal_id: z.string().optional().describe("UUID of the parent goal"),
      date: z.string().describe("Task date in YYYY-MM-DD format"),
      task_type: z
        .enum(["study", "video", "revision", "practice", "other"])
        .default("study"),
      youtube_url: z.string().optional().describe("YouTube lecture URL"),
      youtube_title: z.string().optional().describe("YouTube video title"),
      description: z.string().optional(),
      remarks: z.string().optional(),
    },
    async ({
      title,
      goal_id,
      date,
      task_type,
      youtube_url,
      youtube_title,
      description,
      remarks,
    }) => {
      const { data, error } = await supabase
        .from("tasks")
        .insert({
          title,
          goal_id: goal_id || null,
          date,
          task_type,
          youtube_url: youtube_url || null,
          youtube_title: youtube_title || null,
          description: description || null,
          remarks: remarks || null,
          status: "pending",
          user_id: userId,
        })
        .select()
        .single();

      if (error)
        return {
          content: [{ type: "text" as const, text: `Error: ${error.message}` }],
        };
      return {
        content: [
          {
            type: "text" as const,
            text: `Created task: "${data.title}" for ${data.date} (${data.id})${youtube_url ? `\nVideo: ${youtube_url}` : ""}`,
          },
        ],
      };
    }
  );

  // ─── Tool: List Goals ────────────────────────────────────────────────
  server.tool(
    "list_goals",
    "List study goals with optional filters",
    {
      type: z
        .enum(["monthly", "weekly"])
        .optional()
        .describe("Filter by goal type"),
      status: z
        .enum(["pending", "in-progress", "completed"])
        .optional()
        .describe("Filter by status"),
    },
    async ({ type, status }) => {
      let query = supabase
        .from("goals")
        .select("id, title, type, status, start_date, end_date, remarks")
        .order("created_at", { ascending: false });

      if (type) query = query.eq("type", type);
      if (status) query = query.eq("status", status);

      const { data, error } = await query;

      if (error)
        return {
          content: [{ type: "text" as const, text: `Error: ${error.message}` }],
        };
      if (!data || data.length === 0)
        return {
          content: [{ type: "text" as const, text: "No goals found." }],
        };

      const list = data
        .map(
          (g) =>
            `• [${g.status.toUpperCase()}] ${g.title} (${g.type}) — ${g.start_date} → ${g.end_date}${g.remarks ? `\n  Remarks: ${g.remarks}` : ""}`
        )
        .join("\n");

      return {
        content: [
          {
            type: "text" as const,
            text: `Found ${data.length} goals:\n\n${list}`,
          },
        ],
      };
    }
  );

  // ─── Tool: List Tasks ────────────────────────────────────────────────
  server.tool(
    "list_tasks",
    "List study tasks with optional filters by date, status, or goal",
    {
      date: z
        .string()
        .optional()
        .describe("Filter by date in YYYY-MM-DD format (e.g. today's tasks)"),
      status: z
        .enum(["pending", "in-progress", "completed"])
        .optional()
        .describe("Filter by task status"),
      goal_id: z.string().optional().describe("Filter by parent goal UUID"),
      from: z
        .string()
        .optional()
        .describe("Start date for date range (YYYY-MM-DD)"),
      to: z
        .string()
        .optional()
        .describe("End date for date range (YYYY-MM-DD)"),
    },
    async ({ date, status, goal_id, from, to }) => {
      let query = supabase
        .from("tasks")
        .select(
          "id, title, date, task_type, status, goal_id, youtube_url, remarks"
        )
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });

      if (date) query = query.eq("date", date);
      if (status) query = query.eq("status", status);
      if (goal_id) query = query.eq("goal_id", goal_id);
      if (from) query = query.gte("date", from);
      if (to) query = query.lte("date", to);

      const { data, error } = await query;

      if (error)
        return {
          content: [{ type: "text" as const, text: `Error: ${error.message}` }],
        };
      if (!data || data.length === 0)
        return {
          content: [{ type: "text" as const, text: "No tasks found." }],
        };

      const list = data
        .map(
          (t) =>
            `• [${t.status.toUpperCase()}] ${t.title} (${t.task_type}) — ${t.date}${t.youtube_url ? ` 🎥` : ""}${t.remarks ? `\n  Remarks: ${t.remarks}` : ""}`
        )
        .join("\n");

      return {
        content: [
          {
            type: "text" as const,
            text: `Found ${data.length} tasks:\n\n${list}`,
          },
        ],
      };
    }
  );

  // ─── Tool: Update Goal Status ────────────────────────────────────────
  server.tool(
    "update_goal_status",
    "Update the status of a goal",
    {
      goal_id: z.string().describe("UUID of the goal"),
      status: z
        .enum(["pending", "in-progress", "completed"])
        .describe("New status"),
      remarks: z.string().optional().describe("Optional remarks to add"),
    },
    async ({ goal_id, status, remarks }) => {
      const updates: Record<string, unknown> = { status };
      if (remarks) updates.remarks = remarks;

      const { data, error } = await supabase
        .from("goals")
        .update(updates)
        .eq("id", goal_id)
        .select("id, title, status")
        .single();

      if (error)
        return {
          content: [{ type: "text" as const, text: `Error: ${error.message}` }],
        };
      return {
        content: [
          {
            type: "text" as const,
            text: `Updated "${data.title}" → ${data.status}`,
          },
        ],
      };
    }
  );

  // ─── Tool: Update Task Status ────────────────────────────────────────
  server.tool(
    "update_task_status",
    "Update the status of a task (mark as pending, in-progress, or completed)",
    {
      task_id: z.string().describe("UUID of the task"),
      status: z
        .enum(["pending", "in-progress", "completed"])
        .describe("New status"),
      remarks: z.string().optional().describe("Optional remarks to add"),
    },
    async ({ task_id, status, remarks }) => {
      const updates: Record<string, unknown> = { status };
      if (remarks) updates.remarks = remarks;

      const { data, error } = await supabase
        .from("tasks")
        .update(updates)
        .eq("id", task_id)
        .select("id, title, status")
        .single();

      if (error)
        return {
          content: [{ type: "text" as const, text: `Error: ${error.message}` }],
        };
      return {
        content: [
          {
            type: "text" as const,
            text: `Updated task "${data.title}" → ${data.status}`,
          },
        ],
      };
    }
  );

  // ─── Tool: Get Analytics ─────────────────────────────────────────────
  server.tool(
    "get_analytics",
    "Get study analytics and progress statistics",
    {
      period: z
        .enum(["week", "month", "all"])
        .default("week")
        .describe("Time period for analytics"),
    },
    async ({ period }) => {
      const today = new Date();
      let fromDate: string;

      switch (period) {
        case "week":
          fromDate = format(
            new Date(today.getTime() - 6 * 86400000),
            "yyyy-MM-dd"
          );
          break;
        case "month":
          fromDate = format(
            new Date(today.getFullYear(), today.getMonth(), 1),
            "yyyy-MM-dd"
          );
          break;
        default:
          fromDate = "2020-01-01";
      }

      const toDate = format(today, "yyyy-MM-dd");

      const [sessionsRes, goalsRes, tasksRes] = await Promise.all([
        supabase
          .from("study_sessions")
          .select("*")
          .gte("date", fromDate)
          .lte("date", toDate),
        supabase
          .from("goals")
          .select("*")
          .gte("start_date", fromDate)
          .lte("start_date", toDate),
        supabase
          .from("tasks")
          .select("*")
          .gte("date", fromDate)
          .lte("date", toDate),
      ]);

      const sessions = sessionsRes.data || [];
      const goals = goalsRes.data || [];
      const tasks = tasksRes.data || [];

      const totalMinutes = sessions.reduce(
        (s, sess) => s + (sess.duration_minutes || 0),
        0
      );
      const totalHours = (totalMinutes / 60).toFixed(1);
      const completedGoals = goals.filter(
        (g) => g.status === "completed"
      ).length;
      const completedTasks = tasks.filter(
        (t) => t.status === "completed"
      ).length;

      const text = [
        `📊 Analytics for ${period === "all" ? "All Time" : period === "month" ? "This Month" : "This Week"}`,
        ``,
        `⏱ Study Time: ${totalHours} hours (${totalMinutes} minutes)`,
        `🎯 Goals: ${completedGoals}/${goals.length} completed (${goals.length > 0 ? Math.round((completedGoals / goals.length) * 100) : 0}%)`,
        `✅ Tasks: ${completedTasks}/${tasks.length} completed (${tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0}%)`,
        `📅 Study Sessions: ${sessions.length}`,
      ].join("\n");

      return { content: [{ type: "text" as const, text }] };
    }
  );

  // ─── Tool: Add Remarks ───────────────────────────────────────────────
  server.tool(
    "add_remarks",
    "Add or update remarks/notes on a goal or task",
    {
      type: z
        .enum(["goal", "task"])
        .describe("Whether to update a goal or task"),
      id: z.string().describe("UUID of the goal or task"),
      remarks: z.string().describe("The remarks text to set"),
    },
    async ({ type, id, remarks }) => {
      const table = type === "goal" ? "goals" : "tasks";
      const { data, error } = await supabase
        .from(table)
        .update({ remarks })
        .eq("id", id)
        .select("id, title, remarks")
        .single();

      if (error)
        return {
          content: [{ type: "text" as const, text: `Error: ${error.message}` }],
        };
      return {
        content: [
          {
            type: "text" as const,
            text: `Updated remarks on "${data.title}":\n${data.remarks}`,
          },
        ],
      };
    }
  );

  // ─── Tool: Delete Goal ───────────────────────────────────────────────
  server.tool(
    "delete_goal",
    "Delete a goal by its ID. This also deletes linked weekly sub-goals (cascade).",
    {
      goal_id: z.string().describe("UUID of the goal to delete"),
    },
    async ({ goal_id }) => {
      const { data: goal } = await supabase
        .from("goals")
        .select("title")
        .eq("id", goal_id)
        .single();

      const { error } = await supabase
        .from("goals")
        .delete()
        .eq("id", goal_id);

      if (error)
        return {
          content: [{ type: "text" as const, text: `Error: ${error.message}` }],
        };
      return {
        content: [
          {
            type: "text" as const,
            text: `Deleted goal: "${goal?.title || goal_id}"`,
          },
        ],
      };
    }
  );

  // ─── Tool: Delete Task ───────────────────────────────────────────────
  server.tool(
    "delete_task",
    "Delete a task by its ID",
    {
      task_id: z.string().describe("UUID of the task to delete"),
    },
    async ({ task_id }) => {
      const { data: task } = await supabase
        .from("tasks")
        .select("title")
        .eq("id", task_id)
        .single();

      const { error } = await supabase
        .from("tasks")
        .delete()
        .eq("id", task_id);

      if (error)
        return {
          content: [{ type: "text" as const, text: `Error: ${error.message}` }],
        };
      return {
        content: [
          {
            type: "text" as const,
            text: `Deleted task: "${task?.title || task_id}"`,
          },
        ],
      };
    }
  );

  return server;
}

// ─── POST: MCP requests (initialize, tool calls) ────────────────────────
// Fully stateless for Vercel serverless — no in-memory session persistence.
// Each request creates a fresh server+transport. Non-initialize requests
// are auto-initialized so they work on cold starts / new instances.
export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth) {
    return Response.json(
      { error: "Unauthorized. Provide a valid Supabase access token as Bearer token." },
      { status: 401 }
    );
  }

  // Create a fresh server + transport per request (stateless, no session tracking)
  const server = createMcpServer(auth.supabase, auth.userId);
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // Disable sessions for serverless
  });
  await server.connect(transport);

  // Read the body to check if auto-initialization is needed
  const bodyText = await request.text();
  let body: { method?: string } | Array<{ method?: string }>;
  try {
    body = JSON.parse(bodyText);
  } catch {
    return Response.json(
      { jsonrpc: "2.0", error: { code: -32700, message: "Parse error: Invalid JSON" }, id: null },
      { status: 400 }
    );
  }

  const method = Array.isArray(body) ? body[0]?.method : body.method;

  if (method !== "initialize") {
    // Auto-initialize for serverless cold starts
    const initReq = new Request(request.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "__auto_init__",
        method: "initialize",
        params: {
          protocolVersion: "2025-03-26",
          capabilities: {},
          clientInfo: { name: "serverless-auto-init", version: "1.0.0" },
        },
      }),
    });
    await transport.handleRequest(initReq);

    // Send initialized notification to complete the handshake
    const notifReq = new Request(request.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
      },
      body: JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }),
    });
    await transport.handleRequest(notifReq);
  }

  // Handle the actual request with the original body
  const actualReq = new Request(request.url, {
    method: "POST",
    headers: request.headers,
    body: bodyText,
  });
  return transport.handleRequest(actualReq);
}

// ─── GET: SSE not supported in stateless serverless mode ────────────────
export async function GET() {
  return Response.json(
    { error: "SSE not supported in stateless mode. Use POST for all requests." },
    { status: 405 }
  );
}

// ─── DELETE: no-op in stateless mode ─────────────────────────────────────
export async function DELETE() {
  return Response.json({ ok: true });
}

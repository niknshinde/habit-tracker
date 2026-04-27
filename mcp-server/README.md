# UPSC Study Tracker — MCP Server

This is a standalone MCP (Model Context Protocol) server that lets you manage UPSC study goals and tasks directly from Claude Desktop.

## Setup

### 1. Install dependencies

```bash
cd mcp-server
npm install
```

### 2. Configure environment

Copy `.env` and add your Supabase credentials:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
```

### 3. Build

```bash
npm run build
```

### 4. Configure Claude Desktop

Add this to your Claude Desktop config file:

**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "upsc-tracker": {
      "command": "node",
      "args": ["C:/path/to/habit-tracker/mcp-server/dist/index.js"],
      "env": {
        "SUPABASE_URL": "https://your-project.supabase.co",
        "SUPABASE_ANON_KEY": "your-anon-key-here"
      }
    }
  }
}
```

Replace the path and credentials with your actual values.

### 5. Restart Claude Desktop

Close and reopen Claude Desktop. You should see the MCP tools available.

## Available Tools

| Tool                 | Description                                         |
| -------------------- | --------------------------------------------------- |
| `add_monthly_goal`   | Create a monthly study goal                         |
| `add_weekly_goal`    | Create a weekly sub-goal under a monthly goal       |
| `add_task`           | Add a daily task (study, video, revision, practice) |
| `list_goals`         | List goals with optional filters                    |
| `update_goal_status` | Change goal status (pending/in-progress/completed)  |
| `get_analytics`      | Get study time and completion stats                 |
| `add_remarks`        | Add notes/remarks to goals or tasks                 |

## Example Usage in Claude

> "Add a monthly goal to complete Indian Polity by Laxmikant from April 21 to May 20"

> "Create daily tasks for this week: watch Polity lectures 1-5 on YouTube"

> "Show me this week's analytics"

> "Mark the Polity goal as in-progress"

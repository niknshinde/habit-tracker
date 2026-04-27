-- Migration: Multi-user auth with Supabase Auth
-- Run this in the Supabase SQL editor AFTER enabling Email Auth (no confirmation) in Dashboard → Authentication → Providers

-- 1. Add user_id column to all tables
ALTER TABLE goals ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE study_sessions ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Create indexes for user_id
CREATE INDEX IF NOT EXISTS idx_goals_user ON goals(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON study_sessions(user_id);

-- 3. Drop old permissive policies
DROP POLICY IF EXISTS "Allow all on goals" ON goals;
DROP POLICY IF EXISTS "Allow all on tasks" ON tasks;
DROP POLICY IF EXISTS "Allow all on study_sessions" ON study_sessions;
DROP POLICY IF EXISTS "Allow all on app_config" ON app_config;

-- 4. Create user-scoped RLS policies
-- Goals: users can only see/edit their own goals
CREATE POLICY "Users manage own goals" ON goals
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Tasks: users can only see/edit their own tasks
CREATE POLICY "Users manage own tasks" ON tasks
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Study sessions: users can only see/edit their own sessions
CREATE POLICY "Users manage own sessions" ON study_sessions
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- app_config: allow read for everyone (no longer needed for auth, but keep for future config)
DROP POLICY IF EXISTS "Allow read app_config" ON app_config;
CREATE POLICY "Allow read app_config" ON app_config
  FOR SELECT USING (true);

-- 5. Disable email confirmation in Supabase Dashboard:
-- Go to Authentication → Providers → Email → Toggle OFF "Confirm email"
-- This allows users to sign up and immediately use the app without email verification.

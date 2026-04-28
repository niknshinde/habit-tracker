'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { signIn, signUp } from '@/lib/auth';
import { BookOpen, Mail, Lock, UserPlus, LogIn } from 'lucide-react';

interface LoginFormProps {
  onSuccess: () => void;
}

export default function LoginForm({ onSuccess }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'login' | 'register'>('login');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'register') {
        if (password.length < 6) {
          setError('Password must be at least 6 characters');
          setLoading(false);
          return;
        }
        await signUp(email, password);
      } else {
        await signIn(email, password);
      }
      onSuccess();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#222831] via-[#2D333B] to-[#222831] p-4">
      <Card className="w-full max-w-md shadow-2xl border-[#948979]/20 bg-[#2D333B]">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-[#DFD0B8]/10 rounded-full flex items-center justify-center mb-2">
            <BookOpen className="w-8 h-8 text-[#DFD0B8]" />
          </div>
          <CardTitle className="text-[22px] font-semibold text-[#F0E6D3] tracking-tight">UPSC Study Tracker</CardTitle>
          <CardDescription className="text-[#948979] text-[13.5px] font-normal tracking-[-0.01em]">
            {mode === 'login' ? 'Sign in to your account' : 'Create a new account'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[#948979] text-[13px] font-medium">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#948979]" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  autoFocus
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-[#948979] text-[13px] font-medium">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#948979]" />
                <Input
                  id="password"
                  type="password"
                  placeholder={mode === 'register' ? 'Min 6 characters' : 'Enter your password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>
            {error && (
              <p className="text-[13px] text-rose-400 bg-rose-400/10 px-3 py-2 rounded-lg font-medium">{error}</p>
            )}
            <Button
              type="submit"
              className="w-full bg-[#DFD0B8] hover:bg-[#C4B8A2] text-[#222831]"
              disabled={loading || !email || !password}
            >
              {loading ? (
                mode === 'login' ? 'Signing in...' : 'Creating account...'
              ) : (
                <span className="flex items-center gap-2">
                  {mode === 'login' ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                  {mode === 'login' ? 'Sign In' : 'Create Account'}
                </span>
              )}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
              className="text-[13px] text-[#DFD0B8] hover:text-[#F0E6D3] font-medium"
            >
              {mode === 'login' ? "Don't have an account? Register" : 'Already have an account? Sign in'}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

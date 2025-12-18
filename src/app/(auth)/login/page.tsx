'use client';

import { useState, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Sword, Shield } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Invalid email or password');
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 text-sm text-red-500 bg-red-50 dark:bg-red-950 rounded-lg">
          {error}
        </div>
      )}

      <Input
        id="email"
        type="email"
        label="Email"
        placeholder="hero@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        autoComplete="email"
      />

      <Input
        id="password"
        type="password"
        label="Password"
        placeholder="Enter your password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        autoComplete="current-password"
      />

      <Button
        type="submit"
        className="w-full"
        size="lg"
        isLoading={isLoading}
      >
        Sign In
      </Button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center gap-2 mb-4">
            <Sword className="w-8 h-8 text-indigo-600" />
            <Shield className="w-8 h-8 text-purple-600" />
          </div>
          <CardTitle className="text-2xl">Welcome to Mythweaver</CardTitle>
          <CardDescription>Sign in to continue your adventure</CardDescription>
        </CardHeader>

        <CardContent>
          <Suspense fallback={<div className="animate-pulse h-48 bg-gray-100 dark:bg-gray-700 rounded-lg"></div>}>
            <LoginForm />
          </Suspense>

          <div className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
            Don&apos;t have an account?{' '}
            <Link
              href="/signup"
              className="text-indigo-600 hover:text-indigo-500 font-medium"
            >
              Create one
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

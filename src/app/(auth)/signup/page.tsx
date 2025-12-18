'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Sword, Shield, User, Crown } from 'lucide-react';

export default function SignupPage() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    isPlayer: false,
    isDm: false,
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!formData.isPlayer && !formData.isDm) {
      setError('Please select at least one role (Player or DM)');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          isPlayer: formData.isPlayer,
          isDm: formData.isDm,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Registration failed');
        return;
      }

      // Auto sign in after registration
      const result = await signIn('credentials', {
        email: formData.email,
        password: formData.password,
        redirect: false,
      });

      if (result?.error) {
        setError('Account created but sign in failed. Please try logging in.');
      } else {
        router.push('/dashboard');
        router.refresh();
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center gap-2 mb-4">
            <Sword className="w-8 h-8 text-indigo-600" />
            <Shield className="w-8 h-8 text-purple-600" />
          </div>
          <CardTitle className="text-2xl">Join Mythweaver</CardTitle>
          <CardDescription>Create your account and begin your journey</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-500 bg-red-50 dark:bg-red-950 rounded-lg">
                {error}
              </div>
            )}

            <Input
              id="name"
              type="text"
              label="Display Name"
              placeholder="Your adventurer name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              autoComplete="name"
            />

            <Input
              id="email"
              type="email"
              label="Email"
              placeholder="hero@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              autoComplete="email"
            />

            <Input
              id="password"
              type="password"
              label="Password"
              placeholder="At least 8 characters"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              minLength={8}
              autoComplete="new-password"
            />

            <Input
              id="confirmPassword"
              type="password"
              label="Confirm Password"
              placeholder="Confirm your password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              required
              autoComplete="new-password"
            />

            <div className="space-y-3 pt-2">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Select your role(s):
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div
                  onClick={() => setFormData({ ...formData, isPlayer: !formData.isPlayer })}
                  className={`
                    p-4 rounded-lg border-2 cursor-pointer transition-all
                    ${formData.isPlayer
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }
                  `}
                >
                  <div className="flex flex-col items-center gap-2">
                    <User className={`w-8 h-8 ${formData.isPlayer ? 'text-indigo-600' : 'text-gray-400'}`} />
                    <span className={`font-medium ${formData.isPlayer ? 'text-indigo-600' : 'text-gray-600 dark:text-gray-400'}`}>
                      Player
                    </span>
                    <span className="text-xs text-gray-500 text-center">
                      Create & play characters
                    </span>
                  </div>
                </div>

                <div
                  onClick={() => setFormData({ ...formData, isDm: !formData.isDm })}
                  className={`
                    p-4 rounded-lg border-2 cursor-pointer transition-all
                    ${formData.isDm
                      ? 'border-purple-600 bg-purple-50 dark:bg-purple-950'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }
                  `}
                >
                  <div className="flex flex-col items-center gap-2">
                    <Crown className={`w-8 h-8 ${formData.isDm ? 'text-purple-600' : 'text-gray-400'}`} />
                    <span className={`font-medium ${formData.isDm ? 'text-purple-600' : 'text-gray-600 dark:text-gray-400'}`}>
                      Dungeon Master
                    </span>
                    <span className="text-xs text-gray-500 text-center">
                      Build worlds & run games
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              size="lg"
              isLoading={isLoading}
            >
              Create Account
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
            Already have an account?{' '}
            <Link
              href="/login"
              className="text-indigo-600 hover:text-indigo-500 font-medium"
            >
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

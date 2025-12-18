'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, User, Shield, Palette, Lock, Check, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

type Theme = 'light' | 'dark' | 'system';

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Profile settings
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isPlayer, setIsPlayer] = useState(false);
  const [isDm, setIsDm] = useState(false);

  // Theme settings
  const [theme, setTheme] = useState<Theme>('system');

  // Password change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // UI state
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingRoles, setIsSavingRoles] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [rolesError, setRolesError] = useState('');
  const [rolesSuccess, setRolesSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  useEffect(() => {
    if (session?.user) {
      setName(session.user.name || '');
      setEmail(session.user.email || '');
      setIsPlayer(session.user.isPlayer || false);
      setIsDm(session.user.isDm || false);
    }

    // Load theme from localStorage
    const savedTheme = localStorage.getItem('theme') as Theme;
    if (savedTheme) {
      setTheme(savedTheme);
    }
  }, [session]);

  useEffect(() => {
    // Apply theme
    const root = document.documentElement;

    if (theme === 'system') {
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.toggle('dark', systemDark);
    } else {
      root.classList.toggle('dark', theme === 'dark');
    }

    localStorage.setItem('theme', theme);
  }, [theme]);

  async function handleSaveProfile() {
    setProfileError('');
    setProfileSuccess('');
    setIsSavingProfile(true);

    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setProfileError(data.error || 'Failed to save profile');
        return;
      }

      setProfileSuccess('Profile saved! Refreshing...');
      // Reload to refresh the session with new data
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch {
      setProfileError('An error occurred. Please try again.');
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function handleSaveRoles() {
    setRolesError('');
    setRolesSuccess('');
    setIsSavingRoles(true);

    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPlayer, isDm }),
      });

      const data = await res.json();

      if (!res.ok) {
        setRolesError(data.error || 'Failed to save roles');
        return;
      }

      setRolesSuccess('Roles saved! Refreshing...');
      // Reload to refresh the session with new data
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch {
      setRolesError('An error occurred. Please try again.');
    } finally {
      setIsSavingRoles(false);
    }
  }

  async function handleChangePassword() {
    setPasswordError('');
    setPasswordSuccess('');

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return;
    }

    setIsSavingPassword(true);

    try {
      const res = await fetch('/api/user/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setPasswordError(data.error || 'Failed to change password');
        return;
      }

      setPasswordSuccess('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(''), 3000);
    } catch {
      setPasswordError('An error occurred. Please try again.');
    } finally {
      setIsSavingPassword(false);
    }
  }

  if (status === 'loading' || !session) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
            <p className="text-gray-600 dark:text-gray-400">Manage your account and preferences</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Profile Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Profile
              </CardTitle>
              <CardDescription>Your account information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {profileError && (
                <div className="p-3 text-sm text-red-500 bg-red-50 dark:bg-red-950 rounded-lg">
                  {profileError}
                </div>
              )}
              {profileSuccess && (
                <div className="p-3 text-sm text-green-600 bg-green-50 dark:bg-green-950 rounded-lg flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  {profileSuccess}
                </div>
              )}

              <Input
                id="name"
                label="Display Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
              />

              <Input
                id="email"
                type="email"
                label="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
              />
              <p className="text-xs text-gray-500 -mt-2">
                Changing your email will require you to log in again with the new email.
              </p>

              <Button onClick={handleSaveProfile} isLoading={isSavingProfile}>
                <Save className="w-4 h-4 mr-2" />
                Save Profile
              </Button>
            </CardContent>
          </Card>

          {/* Role Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Roles
              </CardTitle>
              <CardDescription>Choose how you want to use Mythweaver</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {rolesError && (
                <div className="p-3 text-sm text-red-500 bg-red-50 dark:bg-red-950 rounded-lg">
                  {rolesError}
                </div>
              )}
              {rolesSuccess && (
                <div className="p-3 text-sm text-green-600 bg-green-50 dark:bg-green-950 rounded-lg flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  {rolesSuccess}
                </div>
              )}

              <div className="space-y-3">
                <label className="flex items-center gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <input
                    type="checkbox"
                    checked={isPlayer}
                    onChange={(e) => setIsPlayer(e.target.checked)}
                    className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Player</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Create characters and join games as a player
                    </p>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <input
                    type="checkbox"
                    checked={isDm}
                    onChange={(e) => setIsDm(e.target.checked)}
                    className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Dungeon Master</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Create worlds, manage sessions, and run games
                    </p>
                  </div>
                </label>
              </div>

              <p className="text-sm text-gray-500">
                You can enable both roles to switch between playing and DMing.
              </p>

              <Button onClick={handleSaveRoles} isLoading={isSavingRoles}>
                <Save className="w-4 h-4 mr-2" />
                Save Roles
              </Button>
            </CardContent>
          </Card>

          {/* Theme Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5" />
                Appearance
              </CardTitle>
              <CardDescription>Customize how Mythweaver looks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => setTheme('light')}
                  className={`p-4 rounded-lg border-2 transition-colors ${
                    theme === 'light'
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="w-8 h-8 mx-auto mb-2 rounded-full bg-yellow-400 flex items-center justify-center">
                    <div className="w-4 h-4 rounded-full bg-yellow-200"></div>
                  </div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Light</p>
                </button>

                <button
                  onClick={() => setTheme('dark')}
                  className={`p-4 rounded-lg border-2 transition-colors ${
                    theme === 'dark'
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="w-8 h-8 mx-auto mb-2 rounded-full bg-gray-800 flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                  </div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Dark</p>
                </button>

                <button
                  onClick={() => setTheme('system')}
                  className={`p-4 rounded-lg border-2 transition-colors ${
                    theme === 'system'
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="w-8 h-8 mx-auto mb-2 rounded-full bg-gradient-to-r from-yellow-400 to-gray-800 flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full bg-white"></div>
                  </div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">System</p>
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-3">
                System will follow your device's theme preference.
              </p>
            </CardContent>
          </Card>

          {/* Password Change */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5" />
                Change Password
              </CardTitle>
              <CardDescription>Update your account password</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {passwordError && (
                <div className="p-3 text-sm text-red-500 bg-red-50 dark:bg-red-950 rounded-lg">
                  {passwordError}
                </div>
              )}
              {passwordSuccess && (
                <div className="p-3 text-sm text-green-600 bg-green-50 dark:bg-green-950 rounded-lg flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  {passwordSuccess}
                </div>
              )}

              <Input
                id="currentPassword"
                type="password"
                label="Current Password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
              />

              <Input
                id="newPassword"
                type="password"
                label="New Password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
              />

              <Input
                id="confirmPassword"
                type="password"
                label="Confirm New Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
              />

              <Button
                onClick={handleChangePassword}
                isLoading={isSavingPassword}
                disabled={!currentPassword || !newPassword || !confirmPassword}
              >
                <Lock className="w-4 h-4 mr-2" />
                Change Password
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

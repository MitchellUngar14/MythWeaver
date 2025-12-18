'use client';

import { signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

export function SignOutButton() {
  const handleSignOut = () => {
    signOut({ callbackUrl: window.location.origin });
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleSignOut}
    >
      <LogOut className="w-5 h-5" />
    </Button>
  );
}

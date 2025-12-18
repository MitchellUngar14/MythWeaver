import Link from 'next/link';
import { Sword, Shield, Users, Dice6, Globe, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <nav className="flex justify-between items-center mb-16">
          <div className="flex items-center gap-2">
            <Sword className="w-8 h-8 text-indigo-400" />
            <span className="text-2xl font-bold text-white">Mythweaver</span>
          </div>
          <div className="flex gap-4">
            <Link href="/login">
              <Button variant="ghost" className="text-white hover:bg-white/10">
                Sign In
              </Button>
            </Link>
            <Link href="/signup">
              <Button>Get Started</Button>
            </Link>
          </div>
        </nav>

        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
            Your D&D Companion
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
              Reimagined
            </span>
          </h1>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Connect players and Dungeon Masters in real-time. Manage characters,
            roll dice, and run epic campaigns from any device.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup">
              <Button size="lg" className="w-full sm:w-auto">
                Start Your Adventure
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="w-full sm:w-auto border-white/20 text-white hover:bg-white/10">
                Continue Quest
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-white text-center mb-12">
          Everything You Need
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <FeatureCard
            icon={<Users className="w-8 h-8" />}
            title="Character Management"
            description="Create, customize, and manage your characters with an intuitive interface. Track stats, inventory, and abilities."
          />
          <FeatureCard
            icon={<Dice6 className="w-8 h-8" />}
            title="Dice Roller"
            description="Roll any dice combination with satisfying animations. Share results with your party in real-time."
          />
          <FeatureCard
            icon={<Globe className="w-8 h-8" />}
            title="World Building"
            description="DMs can create rich worlds with NPCs, locations, and lore. Share what players need to see."
          />
          <FeatureCard
            icon={<Shield className="w-8 h-8" />}
            title="Combat Tracker"
            description="Manage initiative, track HP, and execute combat actions with real-time updates for all players."
          />
          <FeatureCard
            icon={<Sparkles className="w-8 h-8" />}
            title="AI DM Assistant"
            description="Get help with storytelling, NPC dialogue, rulings, and encounter balancing powered by AI."
          />
          <FeatureCard
            icon={<Sword className="w-8 h-8" />}
            title="Real-time Sessions"
            description="Connect your party with a simple room code. Everyone stays in sync during gameplay."
          />
        </div>
      </div>

      {/* CTA Section */}
      <div className="container mx-auto px-4 py-16 text-center">
        <div className="bg-white/5 backdrop-blur rounded-2xl p-8 md:p-12 max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Begin?
          </h2>
          <p className="text-gray-300 mb-8">
            Join thousands of adventurers using Mythweaver to enhance their tabletop experience.
          </p>
          <Link href="/signup">
            <Button size="lg">Create Free Account</Button>
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 border-t border-white/10">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-gray-400 text-sm">
          <div className="flex items-center gap-2">
            <Sword className="w-5 h-5" />
            <span>Mythweaver</span>
          </div>
          <p>&copy; 2024 Mythweaver. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-white/5 backdrop-blur rounded-xl p-6 hover:bg-white/10 transition-colors">
      <div className="text-indigo-400 mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
      <p className="text-gray-400">{description}</p>
    </div>
  );
}

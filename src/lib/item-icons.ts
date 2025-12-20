import {
  Sword,
  Target,
  Shield,
  ShieldCheck,
  FlaskConical,
  Sparkles,
  Package,
  Flame,
  Snowflake,
  Zap,
  CloudLightning,
  Skull,
  Droplets,
  Sun,
  Moon,
  Brain,
  Wind,
  type LucideIcon,
} from 'lucide-react';

// Item type icons - weapons get special handling for ranged vs melee
export function getItemTypeIcon(type: string, isRanged?: boolean): LucideIcon {
  switch (type) {
    case 'weapon':
      return isRanged ? Target : Sword;
    case 'armor':
      return ShieldCheck;
    case 'shield':
      return Shield;
    case 'consumable':
      return FlaskConical;
    case 'wondrous':
      return Sparkles;
    case 'misc':
    default:
      return Package;
  }
}

// Damage type icons
export function getDamageTypeIcon(damageType: string): LucideIcon {
  switch (damageType.toLowerCase()) {
    case 'slashing':
      return Sword;
    case 'piercing':
      return Target;
    case 'bludgeoning':
      return Shield; // Using shield as it represents impact
    case 'fire':
      return Flame;
    case 'cold':
      return Snowflake;
    case 'lightning':
      return Zap;
    case 'thunder':
      return CloudLightning;
    case 'poison':
      return Skull;
    case 'acid':
      return Droplets;
    case 'necrotic':
      return Moon;
    case 'radiant':
      return Sun;
    case 'force':
      return Wind;
    case 'psychic':
      return Brain;
    default:
      return Sparkles;
  }
}

// Color coding for damage types
export function getDamageTypeColor(damageType: string): string {
  switch (damageType.toLowerCase()) {
    case 'slashing':
      return 'text-gray-600 dark:text-gray-400';
    case 'piercing':
      return 'text-gray-600 dark:text-gray-400';
    case 'bludgeoning':
      return 'text-gray-600 dark:text-gray-400';
    case 'fire':
      return 'text-orange-500';
    case 'cold':
      return 'text-cyan-500';
    case 'lightning':
      return 'text-yellow-500';
    case 'thunder':
      return 'text-purple-500';
    case 'poison':
      return 'text-green-600';
    case 'acid':
      return 'text-lime-500';
    case 'necrotic':
      return 'text-gray-800 dark:text-gray-300';
    case 'radiant':
      return 'text-amber-400';
    case 'force':
      return 'text-indigo-500';
    case 'psychic':
      return 'text-pink-500';
    default:
      return 'text-gray-500';
  }
}

// Item type colors
export function getItemTypeColor(type: string): string {
  switch (type) {
    case 'weapon':
      return 'text-red-500';
    case 'armor':
      return 'text-blue-500';
    case 'shield':
      return 'text-blue-400';
    case 'consumable':
      return 'text-green-500';
    case 'wondrous':
      return 'text-purple-500';
    case 'misc':
    default:
      return 'text-gray-500';
  }
}

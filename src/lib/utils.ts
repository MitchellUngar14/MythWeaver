// Generate a random room key (6 characters, uppercase alphanumeric)
export function generateRoomKey(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluding similar looking characters
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Format date for display
export function formatDate(date: Date | string | null): string {
  if (!date) return 'N/A';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// Calculate modifier from ability score
export function calculateModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

// Format modifier with sign
export function formatModifier(modifier: number): string {
  return modifier >= 0 ? `+${modifier}` : `${modifier}`;
}

// Parse dice notation (e.g., "2d6+3")
export function parseDiceNotation(notation: string): { count: number; sides: number; modifier: number } | null {
  const match = notation.match(/^(\d+)d(\d+)([+-]\d+)?$/);
  if (!match) return null;
  return {
    count: parseInt(match[1]),
    sides: parseInt(match[2]),
    modifier: match[3] ? parseInt(match[3]) : 0,
  };
}

// Roll dice
export function rollDice(count: number, sides: number): number[] {
  const results: number[] = [];
  for (let i = 0; i < count; i++) {
    results.push(Math.floor(Math.random() * sides) + 1);
  }
  return results;
}

// Roll dice from notation
export function rollDiceNotation(notation: string): { rolls: number[]; total: number; modifier: number } | null {
  const parsed = parseDiceNotation(notation);
  if (!parsed) return null;

  const rolls = rollDice(parsed.count, parsed.sides);
  const total = rolls.reduce((a, b) => a + b, 0) + parsed.modifier;

  return { rolls, total, modifier: parsed.modifier };
}

// Class name utility
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

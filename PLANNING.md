# Mythweaver - Project Planning Document

## Overview

Mythweaver (MW) is a mobile-first D&D companion web application that connects players and Dungeon Masters in real-time during tabletop sessions.

---

## User Profiles & Roles

### Account Creation
Users create an account and select one or both profile types:
- **Player Profile** - For those who want to create and play characters
- **DM Profile** - For those who want to build worlds and run games
- **Both** - Many users will want both capabilities

### Profile Types

#### Player Profile
- Create and manage personal characters
- Join DM worlds using a room/invite key
- Access only their own characters and resources
- View world-specific information shared by the DM
- Participate in game sessions within joined worlds

#### DM Profile
- Create and manage worlds/campaigns
- Build world resources: locations, NPCs, lore, enemy templates
- Generate room keys for players to join
- Full access to all characters that have joined their world
- View character sheets, stats, inventory for party management
- Run game sessions with connected players

### World System
- **Worlds** are DM-owned containers for campaigns
- Each world has a unique **room key** (6-character code) for players to join
- Players link a character to a world when joining
- A character can only be in one world at a time
- DMs can have multiple worlds (different campaigns)
- Players can have characters in different worlds

### Access Control Summary
| Resource | Player Access | DM Access |
|----------|---------------|-----------|
| Own characters | Full CRUD | - |
| Characters in their world | - | Read-only (view stats, HP, inventory) |
| World settings | Read (name, description) | Full CRUD |
| World resources (NPCs, locations) | Read (DM-shared only) | Full CRUD |
| Enemy templates | - | Full CRUD (own templates) |
| Game sessions | Join & participate | Create & manage |

---

## Core Features

### Player Features (Mobile-First)
- **Dice Roller** - All standard D&D dice (d4, d6, d8, d10, d12, d20, d100) with animations
- **Character Management** - Create, edit, view character stats
- **Inventory System** - Add/remove/organize items
- **Import/Export** - Save and load character data as JSON
- **Real-time Combat** - Receive DM actions and respond with available options

### DM Features (Multi-Device)
- **Dashboard** - View all player characters at a glance
- **Enemy Management** - Create enemy templates with stats and abilities
- **Session Management** - Create game sessions with join codes
- **Combat Controller** - Initiate attacks, target players, manage initiative
- **Import/Export** - Save and load enemy templates
- **AI DM Assistant** - Context-aware AI chat for storytelling and encounter guidance

### Real-time Interaction
- DM initiates combat actions (e.g., "Enemy attacks Player")
- Player receives notification with response options (dodge, block, counter)
- Results broadcast to all participants
- Initiative tracking and turn order

### AI DM Assistant

A floating chat bubble accessible from the DM's session view that provides context-aware AI assistance for storytelling, rulings, and encounter management.

#### Context Gathering
The AI receives automatic context including:
- **Session State** - Current session name, active players, session settings
- **Player Characters** - Names, classes, races, levels, current HP, notable abilities
- **Active Combat** - Initiative order, enemy stats, current HP, status effects
- **Recent Actions** - Last 10-20 actions from the action log (dice rolls, attacks, etc.)
- **Enemy Templates** - Stats and abilities of enemies in the current encounter

#### DM Input
The DM can provide additional situational context:
- Current narrative situation ("The party just entered the dragon's lair")
- Specific questions ("How should this NPC react to being caught lying?")
- Request types:
  - **Story Prompts** - "What happens next?" / "Describe this scene"
  - **NPC Dialogue** - "What does the merchant say?"
  - **Ruling Assistance** - "Can a player do X? What check should I call for?"
  - **Encounter Balancing** - "Is this fight too hard for the party?"
  - **Improvisation Help** - "The players did something unexpected..."

#### Response Types
- Narrative descriptions and flavor text
- NPC dialogue suggestions with personality
- Rule clarifications and suggested DCs
- Tactical suggestions for enemies
- Plot hooks and story continuations
- Environmental details and sensory descriptions

#### UI/UX
- **Floating Action Button** - Bottom-right of DM session view
- **Expandable Chat Panel** - Slides up/in on tap
- **Quick Prompt Chips** - Pre-built prompts for common requests
- **Conversation History** - Persisted per session, scrollable
- **Copy Button** - Easy copy of AI responses to use elsewhere
- **Minimize/Collapse** - Stays out of the way during active play

#### Technical Implementation
- API route: `POST /api/ai/dm-assist`
- Uses streaming responses for real-time text generation
- Context assembled server-side from session data
- Rate limiting to prevent abuse
- Conversation history stored in session (not persisted to DB by default)

---

## Technology Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Framework | Next.js 14+ (App Router) | SSR, API routes, Vercel-optimized |
| Database | Neon PostgreSQL + Drizzle ORM | Free tier, serverless-friendly, TypeScript |
| Hosting | Vercel | Free tier, excellent DX, edge functions |
| Real-time | Pusher | Reliable, generous free tier, serverless-compatible |
| Styling | Tailwind CSS | Rapid development, mobile-first utilities |
| State | Zustand + TanStack Query | Lightweight, offline persistence |
| Auth | NextAuth.js | Easy setup, multiple providers |
| AI | Vercel AI SDK + Google Gemini | Streaming responses, generous free tier |

---

## Database Schema

```sql
-- Users table with profile roles
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  is_player BOOLEAN DEFAULT false,      -- Has player profile
  is_dm BOOLEAN DEFAULT false,          -- Has DM profile
  avatar_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Worlds (DM-owned campaign containers)
CREATE TABLE worlds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dm_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  room_key VARCHAR(6) UNIQUE NOT NULL,  -- Join code for players
  settings JSONB DEFAULT '{}',          -- World-specific settings
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- World membership (players joined to worlds)
CREATE TABLE world_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  world_id UUID REFERENCES worlds(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  character_id UUID REFERENCES characters(id) ON DELETE SET NULL,
  joined_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(world_id, user_id)             -- One membership per user per world
);

-- Game sessions (individual play sessions within a world)
CREATE TABLE game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  world_id UUID REFERENCES worlds(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  session_number INTEGER DEFAULT 1,
  notes TEXT,                           -- DM session notes
  is_active BOOLEAN DEFAULT true,
  started_at TIMESTAMP DEFAULT NOW(),
  ended_at TIMESTAMP
);

-- Characters (player-owned)
CREATE TABLE characters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  world_id UUID REFERENCES worlds(id) ON DELETE SET NULL,  -- Current world (nullable)
  name VARCHAR(100) NOT NULL,
  class VARCHAR(50),
  race VARCHAR(50),
  level INTEGER DEFAULT 1,
  stats JSONB NOT NULL,                 -- {str, dex, con, int, wis, cha, hp, maxHp, ac, etc.}
  inventory JSONB DEFAULT '[]',
  abilities JSONB DEFAULT '[]',
  backstory TEXT,
  notes TEXT,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- World resources (NPCs, locations, lore - DM created)
CREATE TABLE world_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  world_id UUID REFERENCES worlds(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,            -- 'npc', 'location', 'lore', 'item', 'faction'
  name VARCHAR(100) NOT NULL,
  description TEXT,
  data JSONB DEFAULT '{}',              -- Type-specific data
  is_player_visible BOOLEAN DEFAULT false,  -- Can players see this?
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Enemy templates (DM-created, reusable across worlds)
CREATE TABLE enemy_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dm_id UUID REFERENCES users(id) ON DELETE CASCADE,
  world_id UUID REFERENCES worlds(id) ON DELETE SET NULL,  -- Optional: world-specific
  name VARCHAR(100) NOT NULL,
  stats JSONB NOT NULL,
  abilities JSONB DEFAULT '[]',
  description TEXT,
  challenge_rating VARCHAR(10),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Combat encounters (active enemies in session)
CREATE TABLE combat_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES game_sessions(id) ON DELETE CASCADE,
  template_id UUID REFERENCES enemy_templates(id),
  current_hp INTEGER,
  status_effects JSONB DEFAULT '[]',
  position INTEGER, -- initiative order
  is_active BOOLEAN DEFAULT true
);

-- Dice roll history
CREATE TABLE dice_rolls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES game_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  roll_type VARCHAR(20),
  result INTEGER[],
  total INTEGER,
  context VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Action log for audit trail
CREATE TABLE action_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES game_sessions(id),
  actor_id UUID REFERENCES users(id),
  action_type VARCHAR(50),
  payload JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Character history for versioning
CREATE TABLE character_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID REFERENCES characters(id),
  version INTEGER,
  snapshot JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_worlds_dm ON worlds(dm_id);
CREATE INDEX idx_worlds_room_key ON worlds(room_key);
CREATE INDEX idx_world_members_world ON world_members(world_id);
CREATE INDEX idx_world_members_user ON world_members(user_id);
CREATE INDEX idx_characters_user ON characters(user_id);
CREATE INDEX idx_characters_world ON characters(world_id);
CREATE INDEX idx_world_resources_world ON world_resources(world_id);
CREATE INDEX idx_world_resources_type ON world_resources(world_id, type);
CREATE INDEX idx_enemy_templates_dm ON enemy_templates(dm_id);
CREATE INDEX idx_sessions_world ON game_sessions(world_id);
CREATE INDEX idx_combat_session ON combat_instances(session_id);
CREATE INDEX idx_rolls_session ON dice_rolls(session_id);
CREATE INDEX idx_action_log_session ON action_log(session_id);
```

---

## Project Structure

```
mythweaver/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   ├── signup/page.tsx           # Role selection during signup
│   │   │   └── profile/page.tsx          # Edit profile, manage roles
│   │   ├── (player)/
│   │   │   ├── characters/page.tsx       # List player's characters
│   │   │   ├── character/[id]/page.tsx   # Character sheet view/edit
│   │   │   ├── dice/page.tsx
│   │   │   ├── worlds/page.tsx           # List joined worlds
│   │   │   └── session/[code]/page.tsx   # Active game session
│   │   ├── (dm)/
│   │   │   ├── dashboard/page.tsx        # Overview of all worlds
│   │   │   ├── worlds/page.tsx           # List DM's worlds
│   │   │   ├── world/[id]/
│   │   │   │   ├── page.tsx              # World overview & settings
│   │   │   │   ├── members/page.tsx      # View party, manage members
│   │   │   │   ├── resources/page.tsx    # NPCs, locations, lore
│   │   │   │   └── sessions/page.tsx     # Session history
│   │   │   ├── enemies/page.tsx          # Enemy template library
│   │   │   └── session/[code]/page.tsx   # Active session (DM view)
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   ├── [...nextauth]/route.ts
│   │   │   │   ├── register/route.ts
│   │   │   │   └── me/route.ts
│   │   │   ├── worlds/
│   │   │   │   ├── route.ts
│   │   │   │   ├── join/route.ts
│   │   │   │   └── [id]/
│   │   │   │       ├── route.ts
│   │   │   │       ├── members/route.ts
│   │   │   │       └── resources/route.ts
│   │   │   ├── characters/route.ts
│   │   │   ├── enemies/route.ts
│   │   │   ├── sessions/route.ts
│   │   │   ├── combat/route.ts
│   │   │   └── ai/dm-assist/route.ts
│   │   ├── layout.tsx
│   │   └── page.tsx (landing)
│   ├── components/
│   │   ├── ui/
│   │   ├── auth/                         # Login, signup, profile forms
│   │   ├── dice/
│   │   ├── character/
│   │   ├── combat/
│   │   ├── world/                        # World cards, member lists
│   │   └── dm/
│   │       ├── AIAssistant.tsx           # Floating AI chat bubble
│   │       ├── ResourceEditor.tsx        # NPC/location/lore editor
│   │       └── PartyOverview.tsx         # View all characters in world
│   ├── hooks/
│   │   ├── useRealtime.ts
│   │   ├── useDiceRoll.ts
│   │   ├── useCharacter.ts
│   │   ├── useWorld.ts                   # World data & membership
│   │   └── useAIAssistant.ts             # AI chat state & streaming
│   ├── stores/
│   │   ├── combatStore.ts
│   │   ├── sessionStore.ts
│   │   └── userStore.ts                  # Current user & roles
│   ├── lib/
│   │   ├── db.ts
│   │   ├── schema.ts
│   │   ├── dice.ts
│   │   ├── export.ts
│   │   ├── validation.ts
│   │   ├── permissions.ts                # Role-based access helpers
│   │   └── ai.ts                         # Gemini integration
│   └── styles/
├── drizzle/
├── public/
├── .env.local
├── drizzle.config.ts
└── package.json
```

---

## API Routes

### Authentication
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/auth/[...nextauth]` | NextAuth.js handler |
| POST | `/api/auth/register` | Create new account with role selection |
| GET | `/api/auth/me` | Get current user profile |
| PATCH | `/api/auth/me` | Update profile (name, avatar, roles) |

### Worlds (DM only)
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/worlds` | List DM's worlds |
| POST | `/api/worlds` | Create new world |
| GET | `/api/worlds/[id]` | Get world details |
| PATCH | `/api/worlds/[id]` | Update world settings |
| DELETE | `/api/worlds/[id]` | Delete world |
| GET | `/api/worlds/[id]/members` | List world members & their characters |
| DELETE | `/api/worlds/[id]/members/[userId]` | Remove player from world |
| POST | `/api/worlds/[id]/regenerate-key` | Generate new room key |
| POST | `/api/worlds/join` | Join world with room key (player) |
| POST | `/api/worlds/leave/[id]` | Leave world (player) |

### World Resources (DM only)
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/worlds/[id]/resources` | List world resources (with type filter) |
| POST | `/api/worlds/[id]/resources` | Create resource (NPC, location, etc.) |
| GET | `/api/worlds/[id]/resources/[resourceId]` | Get resource details |
| PATCH | `/api/worlds/[id]/resources/[resourceId]` | Update resource |
| DELETE | `/api/worlds/[id]/resources/[resourceId]` | Delete resource |

### Characters
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/characters` | List user's characters |
| POST | `/api/characters` | Create new character |
| GET | `/api/characters/[id]` | Get character by ID |
| PATCH | `/api/characters/[id]` | Update character |
| DELETE | `/api/characters/[id]` | Delete character |
| POST | `/api/characters/[id]/inventory` | Add inventory item |
| DELETE | `/api/characters/[id]/inventory/[itemId]` | Remove inventory item |

### Sessions
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/sessions` | List DM's sessions |
| POST | `/api/sessions` | Create new session |
| GET | `/api/sessions/[code]` | Get session by join code |
| PATCH | `/api/sessions/[code]` | Update session settings |
| POST | `/api/sessions/[code]/join` | Player joins session |
| POST | `/api/sessions/[code]/leave` | Player leaves session |

### Enemies
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/enemies` | List DM's enemy templates |
| POST | `/api/enemies` | Create enemy template |
| GET | `/api/enemies/[id]` | Get enemy template |
| PATCH | `/api/enemies/[id]` | Update enemy template |
| DELETE | `/api/enemies/[id]` | Delete enemy template |

### Combat
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/combat/start` | Start combat encounter |
| POST | `/api/combat/action` | Execute combat action |
| POST | `/api/combat/initiative` | Roll/set initiative |
| POST | `/api/combat/end` | End combat encounter |
| GET | `/api/combat/[sessionCode]` | Get current combat state |

### AI Assistant
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/ai/dm-assist` | AI DM assistant (streaming) |

---

## Pusher Channel Conventions

### Channel Naming
- `game-{sessionCode}` - Main session channel for all participants
- `private-dm-{sessionCode}` - DM-only channel for sensitive data
- `presence-session-{sessionCode}` - Presence channel for online status

### Event Types
| Channel | Event | Payload | Description |
|---------|-------|---------|-------------|
| `game-*` | `combat:start` | `{ enemies: [], initiative: [] }` | Combat initiated |
| `game-*` | `combat:action` | `{ actor, target, action, result }` | Combat action executed |
| `game-*` | `combat:turn` | `{ currentTurn, nextTurn }` | Turn advanced |
| `game-*` | `combat:end` | `{ summary }` | Combat ended |
| `game-*` | `dice:roll` | `{ user, dice, result, context }` | Dice rolled |
| `game-*` | `character:update` | `{ characterId, changes }` | Character modified |
| `game-*` | `session:message` | `{ from, message }` | DM broadcast message |
| `presence-*` | `pusher:member_added` | `{ user }` | Player joined |
| `presence-*` | `pusher:member_removed` | `{ user }` | Player left |

---

## State Management

### Zustand Stores

#### `combatStore`
```typescript
interface CombatState {
  isActive: boolean;
  initiative: InitiativeEntry[];
  currentTurn: number;
  enemies: CombatEnemy[];
  pendingAction: PendingAction | null;

  // Actions
  startCombat: (enemies: Enemy[], players: Character[]) => void;
  executeAction: (action: CombatAction) => void;
  advanceTurn: () => void;
  endCombat: () => void;
  respondToAction: (response: PlayerResponse) => void;
}
```

#### `sessionStore`
```typescript
interface SessionState {
  sessionCode: string | null;
  session: GameSession | null;
  players: Character[];
  isConnected: boolean;

  // Actions
  joinSession: (code: string) => Promise<void>;
  leaveSession: () => void;
  updatePlayer: (characterId: string, changes: Partial<Character>) => void;
}
```

### TanStack Query Keys
```typescript
const queryKeys = {
  characters: ['characters'] as const,
  character: (id: string) => ['characters', id] as const,
  sessions: ['sessions'] as const,
  session: (code: string) => ['sessions', code] as const,
  enemies: ['enemies'] as const,
  enemy: (id: string) => ['enemies', id] as const,
  combat: (sessionCode: string) => ['combat', sessionCode] as const,
};
```

---

## AI DM Assistant - Technical Details

### System Prompt Structure
```
You are an experienced Dungeon Master assistant for a D&D 5e game.
You help the DM with storytelling, rulings, NPC dialogue, and encounter management.

CURRENT SESSION CONTEXT:
{sessionContext}

PLAYER CHARACTERS:
{characterSummaries}

ACTIVE COMBAT (if any):
{combatState}

RECENT ACTIONS:
{recentActions}

Guidelines:
- Stay in character for NPC dialogue
- Reference player characters by name
- Consider party composition for encounter advice
- Keep responses concise but flavorful
- Suggest dice checks with appropriate DCs when relevant
```

### Request/Response Schema
```typescript
// Request
interface DMAssistRequest {
  sessionCode: string;
  message: string;
  conversationHistory?: { role: 'user' | 'assistant'; content: string }[];
  promptType?: 'story' | 'npc' | 'ruling' | 'encounter' | 'general';
}

// Response (streamed)
interface DMAssistResponse {
  content: string; // Streamed text
  suggestedActions?: {
    type: 'dice_check' | 'combat_action' | 'broadcast';
    details: Record<string, unknown>;
  }[];
}
```

### Rate Limiting
- 20 requests per minute per session
- 100 requests per hour per DM account
- Soft limit with warning before hard cutoff

---

## Implementation Phases

### Phase 1: Foundation
- Initialize Next.js project with TypeScript and Tailwind
- Set up Neon database and Drizzle ORM
- Implement authentication with NextAuth.js
- **User profile system with role selection (Player/DM/Both)**
- Deploy baseline to Vercel

### Phase 2: World & Profile System
- **DM: Create and manage worlds**
- **DM: Generate and share room keys**
- **DM: View party members and their characters**
- **Player: Join worlds with room key**
- **Player: Link characters to worlds**
- Profile management (avatar, display name, role changes)

### Phase 3: Player Features
- Character management (CRUD)
- Inventory system
- Dice roller with animations
- Import/export functionality

### Phase 4: DM Features
- DM dashboard
- Enemy template management
- **World resource management (NPCs, locations, lore)**
- Session management with join codes

### Phase 5: Real-time Interaction
- Pusher integration
- Combat system with initiative tracking
- DM-to-player action broadcasting
- Player response system

### Phase 6: Polish & PWA
- Progressive Web App capabilities
- Offline character sheet access
- Dark/light mode
- Haptic feedback for mobile

### Phase 7: AI DM Assistant
- Vercel AI SDK integration
- Context gathering from session data
- Streaming chat UI component
- Quick prompt chips for common requests
- Conversation history management
- Rate limiting implementation

---

## Environment Variables

```env
# Database (Neon)
DATABASE_URL=postgres://...@...neon.tech/mythweaver

# Auth
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=https://mythweaver.vercel.app

# Real-time (Pusher)
PUSHER_APP_ID=...
PUSHER_KEY=...
PUSHER_SECRET=...
PUSHER_CLUSTER=...
NEXT_PUBLIC_PUSHER_KEY=...
NEXT_PUBLIC_PUSHER_CLUSTER=...

# AI (Google Gemini)
GOOGLE_GENERATIVE_AI_API_KEY=...
```

---

## Design Principles

- **Mobile-first** - Touch-friendly, responsive from 320px up
- **Clean UI** - Fantasy-themed but not cluttered, high contrast
- **Offline-capable** - Character sheets viewable without connection
- **Accessible** - ARIA labels, keyboard navigation, screen reader support
- **Real-time** - Instant updates for all session participants

---

## Free Tier Limits to Monitor

- **Neon:** 0.5 GB storage, 190 compute hours/month
- **Vercel:** 100 GB bandwidth, 100 hours serverless function execution
- **Pusher:** 200k messages/day, 100 concurrent connections
- **Google Gemini:** 15 requests/minute, 1 million tokens/minute, 1,500 requests/day (Gemini 1.5 Flash)

# CLAUDE.md - Mythweaver

## Project Overview

Mythweaver (MW) is a mobile-first D&D companion web application connecting players and Dungeon Masters in real-time.

## Tech Stack

- **Framework:** Next.js 14+ (App Router) with TypeScript
- **Database:** Neon PostgreSQL with Drizzle ORM
- **Hosting:** Vercel
- **Real-time:** Pusher
- **Styling:** Tailwind CSS
- **State:** Zustand + TanStack Query
- **Auth:** NextAuth.js

## Commands

```bash
# Development
npm run dev          # Start dev server
npm run build        # Production build
npm run lint         # ESLint

# Database (Drizzle)
npm run db:generate  # Generate migrations from schema
npm run db:push      # Push schema to database
npm run db:studio    # Open Drizzle Studio
```

## Project Structure

- `src/app/` - Next.js App Router pages and API routes
  - `(auth)/` - Login and signup pages
  - `(player)/` - Player-facing pages (characters, dice, session)
  - `(dm)/` - DM-facing pages (dashboard, enemies, session management)
  - `api/` - REST API endpoints
- `src/components/` - React components organized by feature
  - `ui/` - Reusable UI primitives
  - `dice/` - Dice roller components
  - `character/` - Character sheet components
  - `combat/` - Combat and initiative components
  - `dm/` - DM-specific components
- `src/hooks/` - Custom React hooks
- `src/stores/` - Zustand state stores
- `src/lib/` - Utilities and configurations
  - `db.ts` - Database connection
  - `schema.ts` - Drizzle schema definitions
  - `dice.ts` - Dice rolling logic
  - `validation.ts` - Zod schemas for validation
- `drizzle/` - Database migrations

## Key Patterns

### Database
- Use Drizzle ORM for all database operations
- JSONB columns for flexible stat/inventory storage
- Migrations in `drizzle/` directory

### API Routes
- REST endpoints in `src/app/api/`
- Use Zod for request validation
- DM-only endpoints check role-based access

### Real-time
- Pusher channels per game session (`game-{sessionId}`)
- Combat actions broadcast to all participants
- `useRealtime` hook for subscription management

### State Management
- Zustand for client-side state (combat, session)
- TanStack Query for server state with offline persistence
- Optimistic updates for responsive UX

## Environment Variables

Required in `.env.local`:
```
DATABASE_URL
NEXTAUTH_SECRET
NEXTAUTH_URL
PUSHER_APP_ID
PUSHER_KEY
PUSHER_SECRET
PUSHER_CLUSTER
NEXT_PUBLIC_PUSHER_KEY
NEXT_PUBLIC_PUSHER_CLUSTER
```

## Design Guidelines

- Mobile-first responsive design
- Touch targets minimum 44x44px
- Dark/light mode support
- Clean fantasy aesthetic without clutter
- Accessibility: ARIA labels, keyboard navigation

## Reference Documentation

See `PLANNING.md` for detailed architecture decisions and database schema.

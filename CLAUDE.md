# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Start development server
npm run start

# Run on Android (requires connected device or emulator)
npm run android

# Run on iOS (macOS only)
npm run ios

# Lint
npm run lint

# Tests
npm run test          # run tests
npm run test:watch    # watch mode
npm run test:coverage # coverage report

# Prebuild native projects (after adding native dependencies)
npm run native:build

# Clean prebuild
npm run native:build:clean

# EAS cloud builds
npm run android:eas:dev    # development build
npm run android:eas:pre    # preview build
```

## Architecture

**React Native + Expo** app using file-based routing via Expo Router.

### Routing

`app/` uses Expo Router's file-based routing:
- `app/_layout.tsx` — root layout: wraps everything in `AuthProvider`, sets up Stack navigation
- `app/(tabs)/_layout.tsx` — bottom tab navigator (Home, Explore)
- `app/(tabs)/index.tsx` — Home tab
- `app/(tabs)/explore.tsx` — Explore tab
- `app/list/[listId].tsx` — list detail screen: view/manage items, sorting, filtering, grouping, translations

### Auth

- `context/auth-context.tsx` — `AuthProvider` and `useAuth()` hook; exposes `user`, `isLoading`, `signIn()`, `signOut()`
- `services/auth.service.ts` — Firebase Auth + Google Sign-In logic
- Uses `@react-native-firebase/auth` (native SDK, not the JS SDK) — auto-initializes from `android/app/google-services.json`; no `initializeApp()` needed
- Google Sign-In Web Client ID: `203722623000-e1nuqqv0mo5dsd9ga0sofiojrafske9v.apps.googleusercontent.com`

### Data & Backend

- **Supabase** is the primary database (Firebase is Auth-only)
- `lib/supabase.ts` — Supabase client; credentials via `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- PostgreSQL tables: `todo_list`, `todo_list_items`, `todo_items`
- Real-time via Supabase broadcast channels (private, per-list)
- Supabase Edge Functions handle text translation (HU→ES)

### Hooks & Services

- `hooks/useTodoItems.ts` — manages todo items for a list: CRUD, real-time Supabase subscriptions, optimistic UI with rollback, translation integration
- `services/translator.service.ts` — calls Supabase Edge Functions to translate item names on creation; fails gracefully
- `services/auth.service.ts` — Firebase Auth + Google Sign-In

### Styling

- **Nativewind v4** (Tailwind CSS for React Native) — use `className` prop on components
- Global CSS in `global.css`; imported in root layout
- Theme uses HSL CSS variables with dark mode via `"class"` strategy
- Path alias `@/*` maps to the repo root (e.g. `import { ... } from "@/components/..."`)
- `cn()` utility from `lib/utils` merges Tailwind classes (clsx + tailwind-merge)

### UI Components

- `components/ui/` — Shadcn-style primitives built on `@rn-primitives/` (Radix UI ports for React Native)
- Icons via `lucide-react-native`
- `components/ItemListFilter.tsx` — sort/filter bar for todo items (order by date, order by alphabet)
- `components/ScreenHeader.tsx` — navigation header with back button
- `components/TodoItemRow.tsx` — individual todo item row with animated transitions, checkbox, delete
- Animations via `react-native-reanimated` (~4.1.1)

### Native / Build

- Android package: `com.palhaziadev.awesomelist2`
- Firebase project: `list-27ccf`
- New Architecture (Fabric/TurboModules) is **enabled**
- React Compiler experiment enabled (`"reactCompiler": true` in `app.json`)
- EAS build profiles defined in `eas.json`: `development`, `preview`, `production`
- Supabase env vars (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`) injected via EAS build profiles
- After adding any native module, run `npm run native:build` and rebuild

### Pending

- Dark/light theme manual switcher (noted in README)

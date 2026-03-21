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

# Prebuild native projects (after adding native dependencies)
npm run native:build

# Clean prebuild
npm run native:build:clean

# EAS cloud builds
npm run android:eas:dev    # development build
npm run android:eas:pre    # preview build
```

There is no test runner configured.

## Architecture

**React Native + Expo** app using file-based routing via Expo Router.

### Routing

`app/` uses Expo Router's file-based routing:
- `app/_layout.tsx` — root layout: wraps everything in `AuthProvider`, sets up Stack navigation
- `app/(tabs)/_layout.tsx` — bottom tab navigator (Home, Explore)
- `app/(tabs)/index.tsx` — Home tab
- `app/(tabs)/explore.tsx` — Explore tab

### Auth

- `context/auth-context.tsx` — `AuthProvider` and `useAuth()` hook; exposes `user`, `isLoading`, `signIn()`, `signOut()`
- `services/auth.service.ts` — Firebase Auth + Google Sign-In logic
- Uses `@react-native-firebase/auth` (native SDK, not the JS SDK) — auto-initializes from `android/app/google-services.json`; no `initializeApp()` needed
- Google Sign-In Web Client ID: `203722623000-e1nuqqv0mo5dsd9ga0sofiojrafske9v.apps.googleusercontent.com`

### Styling

- **Nativewind v4** (Tailwind CSS for React Native) — use `className` prop on components
- Global CSS in `global.css`; imported in root layout
- Theme uses HSL CSS variables with dark mode via `"class"` strategy
- Path alias `@/*` maps to the repo root (e.g. `import { ... } from "@/components/..."`)
- `cn()` utility from `lib/utils` merges Tailwind classes (clsx + tailwind-merge)

### UI Components

- `components/ui/` — Shadcn-style primitives built on `@rn-primitives/` (Radix UI ports for React Native)
- Icons via `lucide-react-native`

### Native / Build

- Android package: `com.palhaziadev.awesomelist2`
- Firebase project: `list-27ccf`
- New Architecture (Fabric/TurboModules) is **enabled**
- EAS build profiles defined in `eas.json`: `development`, `preview`, `production`
- After adding any native module, run `npm run native:build` and rebuild

### Pending

- Dark/light theme manual switcher (noted in README)

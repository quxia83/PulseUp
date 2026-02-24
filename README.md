# PulseUp

A React Native workout tracking app built with Expo.

## Overview

PulseUp lets you log strength training sessions in real time. Each session holds one or more exercises with individual sets (reps + weight). After finishing a workout you can review the full history with per-exercise reference videos.

---

## Tech Stack

| Layer | Library |
|---|---|
| Framework | [Expo](https://expo.dev) (SDK 52+) / React Native |
| Navigation | [React Navigation](https://reactnavigation.org) v7 — Bottom Tabs + Stack |
| Database | [expo-sqlite](https://docs.expo.dev/versions/latest/sdk/sqlite/) (WAL mode) |
| Video playback | [expo-video](https://docs.expo.dev/versions/latest/sdk/video/) |
| Video picking | [expo-image-picker](https://docs.expo.dev/versions/latest/sdk/imagepicker/) |
| Video thumbnails | expo-video-thumbnails |
| Background tasks | expo-task-manager + expo-background-fetch |
| Notifications | expo-notifications |
| Safe area | react-native-safe-area-context |

---

## Features

### Active Workout
- Start a new session with a live timer.
- Add / remove exercises; each exercise has its own set rows (reps + weight kg).
- **Per-exercise reference video** — tap "+ Add Video" on any exercise card to attach a tutorial:
  - **Camera Roll** — picks a local video file via `expo-image-picker` (ph:// URIs are copied to cache automatically).
  - **Paste URL** — enter any direct video URL (`.mp4`, `.mov`, `.m3u8`, `.webm`) or a YouTube link.
- Tap **▶ Watch** to play: YouTube links open in the system browser via `Linking`; direct/file URLs open in a fullscreen `VideoView` modal.
- Session notes text field.
- Finish saves to SQLite; Discard drops the session.

### Workout History
- List of all past workouts sorted by date.
- Detail view shows date, duration, notes, and each exercise with its sets.
- Each exercise shows a **▶ Watch** button if a reference video was attached.

### Inactivity Reminders
- Configurable push notification when you haven't worked out for N days.
- Toggle and threshold configurable in the Reminder Settings screen.

---

## Database Schema

```sql
CREATE TABLE workouts (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at       INTEGER NOT NULL,   -- Unix seconds
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  notes            TEXT,
  video_uri        TEXT                -- legacy workout-level video (kept for old rows)
);

CREATE TABLE exercises (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  workout_id   INTEGER NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  order_index  INTEGER NOT NULL DEFAULT 0,
  sets         TEXT NOT NULL DEFAULT '[]',  -- JSON array of {reps, weight_kg}
  video_uri    TEXT                          -- per-exercise reference video URI or URL
);
```

Existing installs without `exercises.video_uri` are migrated automatically on first launch via `ALTER TABLE exercises ADD COLUMN video_uri TEXT`.

---

## Dev Setup

### Prerequisites
- Node.js 20+
- Expo CLI: `npm install -g expo-cli` (or use `npx expo`)
- iOS Simulator (macOS) or Android Emulator / physical device

### Install

```bash
npm install
```

### Run (Expo Go)

```bash
npx expo start
```

### Run (Dev Build — required for expo-video native module)

```bash
# Build dev client once
npx expo run:ios   # or run:android

# Then start the dev server
npx expo start --dev-client
```

> **Note:** `expo-video` requires a custom dev client or production build. It will not work inside the standard Expo Go app.

---

## Project Structure

```
src/
  components/
    ExerciseCard.tsx      # Exercise card with per-exercise video attach/watch
    SetRow.tsx
    Timer.tsx
    VideoAttachment.tsx   # Workout-level video component (legacy, kept for old DB rows)
    WorkoutCard.tsx
  context/
    WorkoutContext.tsx    # Global reducer for active workout session
  db/
    client.ts             # SQLite init + migrations
    queries.ts            # CRUD helpers
  hooks/
    useTimer.ts
    useReminderSettings.ts
    useWorkouts.ts
  navigation/
    RootNavigator.tsx
    HomeStack.tsx
    HistoryStack.tsx
    types.ts
  screens/
    ActiveWorkoutScreen.tsx
    HistoryScreen.tsx
    HomeScreen.tsx
    ReminderSettingsScreen.tsx
    WorkoutDetailScreen.tsx
  services/
    videoService.ts       # pickVideoFromGallery() with ph:// → file:// copy
    notifications.ts
    backgroundTask.ts
  types/
    index.ts              # Shared TypeScript interfaces
```

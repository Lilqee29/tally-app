# Tally — "Did I Do?"

A minimalist, pure-black daily accountability and habit tracker app for iOS with native interactive home screen widgets.

![Tally Logo](./src/components/TallyLogo.tsx)

## Features

- **Daily Yes/No Accountability**: Track questions like *"Did I do a stretch session?"* or *"Did I read today?"*.
- **One-Tap Completion**: Tap a row to mark it done with a haptic ping, completion timestamp, and strikethrough styling.
- **Streak & Heatmap per Question**:
  - Tapping the flame button opens the heatmap view.
  - View multi-month dot grid history for each task (Mon–Sun rows).
  - Tap the ⚙️ gear icon next to any task title in the Heatmap view to **customize its dot color**!
- **Interactive iOS Widget (WidgetKit + App Intents)**:
  - Supports Small & Medium home screen widgets.
  - Shows task title, completion time, big bold **YES** (blue) or **NO** (red), and a 7-day week streak dot row.
  - Tappable directly from your home screen without opening the app (iOS 17+ App Intents).
  - Edit Widget configuration sheet to choose which task (First/Second/Third Task) to display and toggle Week History.
- **Settings Sheet**:
  - Widget Appearance (Auto / Light / Dark)
  - Colored Text toggle
  - Require Confirmation toggle
  - Sound & Taptic Feedback toggle
- **Zero Cloud, 100% Private**: All data is stored locally in AsyncStorage and synced directly with the shared App Group UserDefaults (`group.com.qomex.tally`) for the widget extension.

---

## Tech Stack

- **Framework**: [Expo](https://expo.dev) / React Native / TypeScript
- **State Management**: [Zustand](https://github.com/pmndrs/zustand) + `@react-native-async-storage/async-storage`
- **Widget**: Native Swift WidgetKit extension via `@bacons/apple-targets`
- **CI / Build**: GitHub Actions macOS runner building unsigned `.ipa` for free Apple ID sideloading via **Sideloadly**

---

## Project Structure

```
tally-app/
├── App.tsx                          # App root & Zustand store hydration
├── app.json                         # Expo configuration, App Group entitlements & plugins
├── src/
│   ├── components/
│   │   ├── TallyLogo.tsx            # SVG tally mark wordmark (||||̶)
│   │   ├── TopBar.tsx               # Top navigation bar (Logo, Edit toggle, Settings)
│   │   ├── TaskRow.tsx              # Task item with pending/done/edit states
│   │   ├── FABs.tsx                 # + Add button & flame streak button
│   │   └── HeatmapGrid.tsx          # Multi-month dot grid calendar
│   ├── screens/
│   │   ├── MainScreen.tsx           # Main single-page list & interaction hub
│   │   ├── AddEditSheet.tsx         # Add and Edit question modal sheet
│   │   ├── HeatmapSheet.tsx         # Per-question streak & dot color customization
│   │   └── SettingsSheet.tsx        # Widget & sound/haptic preferences
│   ├── store/
│   │   ├── storage.ts               # AsyncStorage + Shared App Group UserDefaults sync
│   │   ├── streaks.ts               # Date math, streaks, and heatmap data generator
│   │   └── useStore.ts              # Zustand store definition
│   └── theme/
│       ├── colors.ts                # Design system color tokens & dot palette
│       └── typography.ts            # Typography scale
├── targets/
│   └── widget/
│       ├── target.json              # WidgetKit target configuration
│       └── Widget.swift             # Swift WidgetKit & AppIntent extension
└── .github/
    └── workflows/
        └── build-ipa.yml            # CI workflow to build unsigned .ipa
```

---

## Sideloading Instructions (Sideloadly)

1. Push your code to your GitHub repo on the `main` branch.
2. Under GitHub Actions, download the **`tally-ipa`** artifact from the build.
3. Open **Sideloadly** on your computer (Windows or Mac).
4. Drag and drop the `tally.ipa` into Sideloadly.
5. Enter your Apple ID (free accounts are fully supported).
6. Click **Advanced Options** and verify that **"Remove app plug-ins and extensions" is UNCHECKED** (this ensures the widget is included).
7. Click **Start** to install on your iPhone.
8. On your iPhone: Go to **Settings → General → VPN & Device Management** and trust your developer certificate.
9. Long-press your home screen → Tap `+` → Search **Tally** → Add widget!

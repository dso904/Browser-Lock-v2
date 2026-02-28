<div align="center">

# 🔒 BROWSER LOCK

<br>

![Browser Lock](https://img.shields.io/badge/BROWSER-LOCK-00f0ff?style=for-the-badge&logo=google-chrome&logoColor=white&labelColor=030014)
![Version](https://img.shields.io/badge/v1.0.0-b400ff?style=for-the-badge&labelColor=030014)
![Manifest V3](https://img.shields.io/badge/Manifest-V3-00d4aa?style=for-the-badge&labelColor=030014)
![License](https://img.shields.io/badge/License-MIT-ff2d7c?style=for-the-badge&labelColor=030014)

**A Chrome extension that locks your browser with a password.**<br>
**Built with the NEXUS PROTOCOL design system — a cinematic, futuristic UI.**

<br>

[🚀 Features](#-features) · [📦 Installation](#-installation) · [🔑 Getting Started](#-getting-started) · [⚙️ Settings](#%EF%B8%8F-settings) · [🏗️ Architecture](#%EF%B8%8F-architecture) · [🛡️ Security](#%EF%B8%8F-security-architecture) · [🛠️ Development](#%EF%B8%8F-development)

<br>

</div>

---

## 🚀 Features

<table>
<tr>
<td width="50%" valign="top">

### 🔐 Password Protection
Lock your entire browser instantly. No tabs, no windows, no browsing — until you authenticate.

### ⌨️ Quick Lock (`Ctrl+M`)
One shortcut to lock everything. Customizable in Chrome's keyboard shortcuts.

### 🧠 Smart Tab Restoration
Lock → unlock in the same session? **All your tabs come back exactly as they were.** Browser was closed while locked? Opens with your configured start page instead.

</td>
<td width="50%" valign="top">

### 🚀 Auto Lock on Startup
Automatically lock the browser every time Chrome opens. Choose what happens after unlock: restore tabs, new tab, or a custom URL.

### ⏱️ Idle Lock
Step away from your desk? The browser locks itself after a configurable inactivity period, with an optional 5-second countdown notification.

### 🛡️ Quarantine Mode
Too many wrong passwords? Quarantine mode kicks in — hard-locks the browser for a set duration and optionally **wipes browsing data** (history, cookies, cache).

</td>
</tr>
<tr>
<td width="50%" valign="top">

### 🔑 Recovery Codes
Forgot your password? A one-time recovery code is generated when you first set your password. Store it safely — it's your emergency key.

### 🎨 NEXUS PROTOCOL UI
A cinematic, futuristic design system featuring glassmorphism panels, neon cyan/magenta glows, animated particle fields, holographic elements, and HUD-style typography.

</td>
<td width="50%" valign="top">

### 🧊 Complete Window Lockdown
While locked, **every** new tab, window, and focus event is intercepted and blocked. Background windows are minimized. The lock screen is the only thing visible.

### 🔄 First-Time Setup
On first install, a cinematic "Initialize Protocol" screen guides you through password creation — no manual navigation to settings needed.

</td>
</tr>
</table>

---

## 📦 Installation

### Load from Source

```bash
# 1. Clone the repository
git clone https://github.com/dso904/Browser-Lock-v2.git
cd Browser-Lock-v2

# 2. Install dependencies
npm install

# 3. Build for production
npm run build
```

Then load in Chrome:

1. Navigate to `chrome://extensions/`
2. Enable **Developer Mode** (toggle in the top right)
3. Click **Load unpacked**
4. Select the `dist/` folder

> **Tip:** To share with others, zip the `dist/` folder and send it. They can load it the same way.

---

## 🔑 Getting Started

### First-Time Setup

When you install Browser Lock, a cinematic **"Initialize Protocol"** screen opens automatically:

1. **Create a master password** (minimum 4 characters)
2. **Save your recovery code** — displayed once, never shown again
3. Click **"I've Saved My Recovery Code"** to enter the settings dashboard

### Locking Your Browser

| Method | How |
|:-------|:----|
| ⌨️ **Keyboard Shortcut** | `Ctrl+M` (Windows/Linux) · `Cmd+M` (Mac) |
| 🖱️ **Extension Popup** | Click the extension icon → **Engage Lock** |
| 🔄 **Auto Lock** | Automatically on browser startup (if enabled) |
| 💤 **Idle Lock** | After configurable inactivity (if enabled) |
| 📋 **Right-Click Menu** | Right-click anywhere → **🔒 Lock Browser** |

### Unlocking

Enter your password on the lock screen, or click **"Forgot your password?"** to use your recovery code.

### What Happens When You Lock

1. A fullscreen lock screen popup appears
2. **All other windows are minimized** — nothing is visible or accessible
3. Any attempt to open a new tab/window while locked is **immediately blocked**
4. Clicking away from the lock screen? The guard **re-minimizes** the window and refocuses the lock screen

### What Happens When You Unlock

| Scenario | Behavior |
|:---------|:---------|
| **Same session** (locked → enter password) | All your original tabs and windows restore exactly as they were |
| **Browser was closed while locked** | Opens according to your configured Start State (new tab / URL / restore) |

---

## ⚙️ Settings

Access settings via: Extension popup → **Control Panel**, or right-click the extension icon → **Options**.

### 🚀 Auto Lock

| Setting | Description |
|:--------|:------------|
| **Auto Lock on Startup** | Lock the browser every time Chrome opens |
| **Run in Background** | Keep the lock active even if all windows are closed |
| **Start State** | What opens after unlock: `New Tab`, `Restore Session`, or `Custom URL` |
| **Start URL** | The URL to open (only in Custom URL mode) |

### 🛡️ Quarantine Mode

| Setting | Description |
|:--------|:------------|
| **Max Attempts** | Wrong password attempts before quarantine (3–10) |
| **Lock Duration** | How long the hard-lock lasts (1–30 minutes) |
| **Clear on Quarantine** | Optionally wipe: browsing history, cookies, cache, downloads, form data, passwords |

### ⏱️ Idle Lock

| Setting | Description |
|:--------|:------------|
| **Idle Timeout** | Minutes of inactivity before auto-lock (1–60) |
| **Notification** | Show a 5-second warning before locking |
| **Audio Check** | Won't lock if media is playing in any tab |

### ⌨️ Keyboard Shortcut

Default: `Ctrl+M` / `Cmd+M`. Customize at `chrome://extensions/shortcuts`.

---

## 🏗️ Architecture

### Project Structure

```
Browser-Lock-v2/
├── public/
│   ├── manifest.json          # Chrome Extension Manifest V3
│   └── icons/                 # Extension icons (16/32/48/128px)
├── src/
│   ├── background/            # Service Worker (MV3)
│   │   ├── index.ts           # Entry point — MV3-compliant sync listener registration
│   │   ├── lockManager.ts     # Lock/unlock/restore logic, quarantine
│   │   ├── windowGuard.ts     # Tab/window interception, exit cascade
│   │   ├── windowUtils.ts     # Window minimize/restore utilities
│   │   ├── state.ts           # Session-persisted shared state (chrome.storage.session)
│   │   ├── messageHandler.ts  # UI ↔ background message bridge
│   │   ├── contextMenu.ts     # Right-click menu registration
│   │   └── idleHandler.ts     # Idle detection and auto-lock
│   ├── lockscreen/
│   │   ├── LockScreen.tsx     # Lock screen UI (holographic emblem, particle field)
│   │   └── main.tsx           # Lock screen React entry
│   ├── popup/
│   │   ├── Popup.tsx          # Extension popup (status, lock button, shortcuts)
│   │   └── main.tsx           # Popup React entry
│   ├── options/
│   │   ├── OptionsPage.tsx    # Settings dashboard + first-time setup view
│   │   ├── components.tsx     # 10 reusable NEXUS-themed UI components
│   │   ├── sections/          # Settings sections (password, auto-lock, quarantine, etc.)
│   │   └── main.tsx           # Options React entry
│   ├── shared/
│   │   ├── storage.ts         # Chrome storage helpers (local + session)
│   │   ├── crypto.ts          # SHA-256 hashing, recovery code generation
│   │   └── types.ts           # TypeScript interfaces and defaults
│   └── styles/
│       └── index.css          # NEXUS PROTOCOL design system (~1100 lines)
├── dist/                      # Built extension — load this in Chrome
├── vite.config.ts             # Multi-page Vite build config
└── package.json
```

### Tech Stack

| Technology | Purpose |
|:-----------|:--------|
| ⚛️ **React 19** | UI components |
| 🎨 **Tailwind CSS 4** | Utility styling |
| ⚡ **Vite 7** | Build tool, multi-page config |
| 📘 **TypeScript** | Type safety |
| 🔧 **Manifest V3** | Chrome Extension platform |

### MV3 Service Worker Boot Sequence

```
┌─────────────────────────────────────────┐
│         SERVICE WORKER STARTS           │
├─────────────────────────────────────────┤
│  PHASE 1: Synchronous (first tick)      │
│  ├── State.initialize() (non-blocking)  │
│  ├── WindowGuard.register()             │
│  ├── MessageHandler.register()          │
│  ├── ContextMenu.registerListener()     │
│  ├── chrome.commands.onCommand          │
│  ├── chrome.runtime.onInstalled         │
│  └── chrome.runtime.onStartup          │
├─────────────────────────────────────────┤
│  PHASE 2: Async bootstrap()            │
│  ├── await State.waitForReady()         │
│  ├── ContextMenu.createMenuItems()      │
│  ├── IdleHandler.register() (if active) │
│  └── LockManager.ensureLockScreenVisible│
│      (if locked from previous session)  │
└─────────────────────────────────────────┘
```

> **Why two phases?** Manifest V3 requires all Chrome event listeners to be registered synchronously in the first execution tick. If placed behind an `await`, Chrome may discard wake-up events, letting unauthorized tabs slip through.

---

## 🛡️ Security Architecture

### Password Storage

| Layer | Mechanism |
|:------|:----------|
| **Hashing** | SHA-256 with random salt |
| **Storage** | `chrome.storage.local` (never transmitted) |
| **Recovery** | One-time generated codes, hashed identically |

### Lock State Persistence

| Storage | Purpose |
|:--------|:--------|
| `chrome.storage.local` | Lock state (`locked`, `failedAttempts`, `hardLockedUntil`) — **persists across browser restarts** |
| `chrome.storage.session` | Service worker state (`lockScreenWindowId`, `isGuardPaused`, `isShuttingDown`, `forceMinimizedWindowIds`) — survives SW restarts within a session |

### Window Guard (Hardened)

- **Zero debounce on tab creation** — every unauthorized tab is removed immediately
- **Per-ID re-entry tracking** via `Set<number>` — concurrent events for different IDs handled simultaneously
- **Focus interception** — clicking a non-lock window re-minimizes it and refocuses the lock screen
- **Exit cascade protection** — `isShuttingDown` flag prevents recursive `onRemoved` event loops

### Lock Screen Reconstruction

If the service worker restarts and loses in-memory state:

1. **Rehydrate** from `chrome.storage.session`
2. **Validate** stored window ID via `chrome.windows.get()`
3. **Fallback**: scan all open windows for a `type: 'popup'` window containing `lockscreen.html`

### Lock State Rollback

If lock screen creation fails, the lock state is **never written** — preventing a soft-brick where the guard blocks everything but no lock screen exists.

---

## 🎨 NEXUS PROTOCOL Design System

The entire UI is built on a custom design system:

| Token | Value | Usage |
|:------|:------|:------|
| `--nx-void` | `#030014` | Background |
| `--nx-cyan` | `#00f0ff` | Primary accent |
| `--nx-magenta` | `#b400ff` | Secondary accent |
| `--nx-pink` | `#ff2d7c` | Tertiary / errors |
| `--nx-teal` | `#00d4aa` | Success states |
| `--nx-violet` | `#7c3aed` | Subtle highlights |

**Visual elements:** Glassmorphism panels · Neon glows · HUD corner brackets · Animated particle orbs · Scan-line overlays · Holographic emblems · Energy ring animations

**Typography:** `Orbitron` (headings) · `Rajdhani` (body) · `Share Tech Mono` (code/mono)

---

## 🛠️ Development

### Scripts

```bash
npm run dev       # Vite dev server (UI preview only, not for testing extension logic)
npm run build     # Production build → dist/
npm run lint      # ESLint check
```

### Loading Changes

After modifying code:

1. Run `npm run build`
2. Go to `chrome://extensions`
3. Click the 🔄 refresh icon on the Browser Lock card
4. The extension reloads with your changes

---

## 📋 Permissions

| Permission | Why It's Needed |
|:-----------|:----------------|
| `storage` | Store settings, password hashes, and lock state |
| `tabs` | Monitor and close unauthorized tabs while locked |
| `windows` | Create lock screen, minimize/restore windows |
| `idle` | Detect inactivity for idle auto-lock |
| `contextMenus` | "🔒 Lock Browser" right-click menu |
| `notifications` | Idle lock countdown warning |
| `browsingData` *(optional)* | Wipe data in quarantine mode |
| `background` *(optional)* | Keep lock active in background |

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

<div align="center">
<br>

**Built with 🔒 for privacy-conscious users**

⭐ **Star this repo if you find it useful!**

<br>

![Built with React](https://img.shields.io/badge/React-19-61dafb?style=flat-square&logo=react&logoColor=white&labelColor=030014)
![Built with TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?style=flat-square&logo=typescript&logoColor=white&labelColor=030014)
![Built with Vite](https://img.shields.io/badge/Vite-7-646cff?style=flat-square&logo=vite&logoColor=white&labelColor=030014)
![Built with Tailwind](https://img.shields.io/badge/Tailwind-4-06b6d4?style=flat-square&logo=tailwindcss&logoColor=white&labelColor=030014)

</div>

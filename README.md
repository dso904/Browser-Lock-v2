# 🔒 Browser Lock

<div align="center">

![Browser Lock Logo](https://img.shields.io/badge/Browser-Lock-5865F2?style=for-the-badge&logo=google-chrome&logoColor=white)
![Version](https://img.shields.io/badge/version-1.0.0-7c3aed?style=for-the-badge)
![Manifest](https://img.shields.io/badge/Manifest-V3-10b981?style=for-the-badge)
![License](https://img.shields.io/badge/license-MIT-f59e0b?style=for-the-badge)

**🛡️ Protect your browser with a password • Lock on startup • Quarantine mode • Idle lock**

[Features](#-features) • [Installation](#-installation) • [Usage](#-usage) • [Configuration](#-configuration) • [Development](#-development)

</div>

---

## ✨ Features

<table>
<tr>
<td width="50%">

### 🚀 Auto Lock on Startup
Lock your browser automatically when it opens. Choose to restore previous tabs, open a new tab, or navigate to a specific URL after unlocking.

### ⏱️ Idle Lock
Automatically lock when you step away. Configurable timeout with optional notification before locking.

### ⌨️ Quick Lock Shortcut
Instantly lock your browser with `Ctrl+M` (or customize your own shortcut). Perfect for quickly securing your session.

</td>
<td width="50%">

### 🛡️ Quarantine Mode
Enhanced security after multiple failed unlock attempts:
- Configurable max attempts (3-10)
- Lock duration (1-30 minutes)
- Optional browser data clearing

### 🔐 Recovery Code
Forgot your password? Use your recovery code to regain access. Generated when you set your password.

### 🎨 Modern Futuristic UI
Beautiful dark theme with glowing accents, smooth animations, and intuitive controls.

</td>
</tr>
</table>

---

## 📸 Screenshots

<div align="center">

| Lock Screen | Settings Page |
|:-----------:|:-------------:|
| ![Lock Screen](https://via.placeholder.com/400x300/0d0d1a/5865F2?text=Lock+Screen) | ![Settings](https://via.placeholder.com/400x300/0d0d1a/9f7aea?text=Settings) |

</div>

---

## 🚀 Installation

### From Source (Development)

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/browser-lock.git
   cd browser-lock
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the extension**
   ```bash
   npm run build
   ```

4. **Load in Chrome**
   - Open `chrome://extensions/`
   - Enable "Developer mode" (top right toggle)
   - Click "Load unpacked"
   - Select the `dist` folder

---

## 📖 Usage

### First Time Setup

1. **Set a Password**
   - Click the Browser Lock extension icon
   - Go to Settings → Set Password
   - Create a password (minimum 4 characters)
   - **Save your recovery code** - you'll need it if you forget your password!

2. **Enable Protection**
   - Toggle "BrowserLock" ON in settings
   - Configure Auto Lock, Idle Lock, etc.

### Locking Your Browser

| Method | How To |
|--------|--------|
| **Keyboard Shortcut** | Press `Ctrl+M` (Windows/Linux) or `Cmd+M` (Mac) |
| **Extension Popup** | Click the extension icon → Lock Now |
| **Auto Lock** | Happens automatically on browser startup |
| **Idle Lock** | Triggers after configured inactivity period |

### Unlocking

- Enter your password on the lock screen
- Or use your recovery code if you forgot your password

---

## ⚙️ Configuration

### Auto Lock Settings

| Option | Description |
|--------|-------------|
| **Run in Background** | Keep lock active even when all windows are closed |
| **Start State** | What to open after unlock: New tab, Restore session, or Custom URL |

### Quarantine Mode

| Option | Description |
|--------|-------------|
| **Max Attempts** | Number of wrong attempts before quarantine (3-10) |
| **Lock Duration** | How long to lock out (1-30 minutes) |
| **Clear History** | Optionally clear browser data on quarantine trigger |

### Idle Lock

| Option | Description |
|--------|-------------|
| **Lock After** | Minutes of inactivity before auto-lock (1-60) |
| **Show Notification** | 5-second warning before locking |

---

## 🛠️ Development

### Tech Stack

- ⚛️ **React 19** - UI Framework
- 🎨 **Tailwind CSS 4** - Styling
- ⚡ **Vite 7** - Build Tool
- 📘 **TypeScript** - Type Safety
- 🔧 **Chrome Extension Manifest V3**

### Scripts

```bash
# Development server (for UI preview only)
npm run dev

# Production build
npm run build

# Lint code
npm run lint
```

### Project Structure

```
browser-lock/
├── public/
│   ├── manifest.json      # Extension manifest
│   └── icons/             # Extension icons
├── src/
│   ├── background/        # Service worker scripts
│   │   ├── index.ts       # Main background entry
│   │   ├── lockManager.ts # Lock/unlock logic
│   │   ├── windowGuard.ts # Window monitoring
│   │   └── state.ts       # Shared state module
│   ├── lockscreen/        # Lock screen UI
│   ├── options/           # Settings page UI
│   │   ├── sections/      # Settings sections
│   │   └── components.tsx # UI components
│   ├── popup/             # Extension popup UI
│   ├── shared/            # Shared utilities
│   │   ├── storage.ts     # Chrome storage helpers
│   │   ├── crypto.ts      # Password hashing
│   │   └── types.ts       # TypeScript types
│   └── styles/            # Global CSS
└── dist/                  # Built extension (load this in Chrome)
```

---

## 🔐 Security

- **Password Hashing**: Passwords are hashed using SHA-256 with salt
- **No Remote Transmission**: All data stays local in Chrome storage
- **Session Storage**: Lock state uses session storage (cleared on browser close)
- **Recovery Codes**: One-time generated codes for password recovery

---

## 📋 Permissions

| Permission | Purpose |
|------------|---------|
| `storage` | Store settings and password hashes |
| `tabs` | Monitor and manage browser tabs |
| `windows` | Create lock screen window, minimize others |
| `idle` | Detect user inactivity for idle lock |
| `contextMenus` | Right-click menu options |
| `notifications` | Idle lock warnings |
| `browsingData` *(optional)* | Clear data in quarantine mode |
| `background` *(optional)* | Run in background mode |

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">

**Made with ❤️ for privacy-conscious users**

⭐ Star this repo if you find it useful!

</div>

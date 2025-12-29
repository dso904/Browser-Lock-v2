// ============================================
// Browser Lock - Shared Types
// ============================================

/**
 * User settings stored in chrome.storage.local
 */
export interface Settings {
    // Master toggle
    active: boolean;

    // Password (SHA-256 hashed)
    passwordHash: string | null;

    // Recovery code (SHA-256 hashed)
    recoveryCodeHash: string | null;

    // Idle lock settings
    idleMode: {
        active: boolean;
        duration: number; // minutes
        notify: boolean;
    };

    // Auto lock on browser start
    autoLock: {
        active: boolean;
        runInBackground: boolean;
        startState: 'new_tab' | 'restore' | 'url';
        startUrl: string;
    };

    // Keyboard shortcut
    shortcutLock: {
        active: boolean;
    };

    // Quarantine mode (security features)
    quarantineMode: {
        active: boolean;
        maxAttempts: number;
        hardLockDuration: number; // minutes
        clearHistory: boolean;
        clearOptions: {
            cookies: boolean;
            passwords: boolean;
            downloads: boolean;
            formData: boolean;
            history: boolean;
        };
    };

    // Theme
    theme: 'light' | 'dark' | 'system';
}

/**
 * Session state stored in chrome.storage.session (per profile)
 */
export interface LockState {
    locked: boolean;
    lockedAt: number | null; // timestamp
    failedAttempts: number;
    hardLockedUntil: number | null; // timestamp for quarantine
    popup: {
        windowId: number | null;
        tabId: number | null;
    } | null;
    openAfter: string[]; // URLs to open after unlock
}

/**
 * Default settings
 */
export const DEFAULT_SETTINGS: Settings = {
    active: true,
    passwordHash: null,
    recoveryCodeHash: null,
    idleMode: {
        active: false,
        duration: 5,
        notify: true,
    },
    autoLock: {
        active: false,
        runInBackground: false,
        startState: 'new_tab',
        startUrl: '',
    },
    shortcutLock: {
        active: true,
    },
    quarantineMode: {
        active: false,
        maxAttempts: 5,
        hardLockDuration: 5,
        clearHistory: false,
        clearOptions: {
            cookies: false,
            passwords: false,
            downloads: false,
            formData: false,
            history: false,
        },
    },
    theme: 'system',
};

/**
 * Default lock state
 */
export const DEFAULT_LOCK_STATE: LockState = {
    locked: false,
    lockedAt: null,
    failedAttempts: 0,
    hardLockedUntil: null,
    popup: null,
    openAfter: [],
};

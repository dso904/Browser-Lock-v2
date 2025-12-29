// ============================================
// Browser Lock - Storage Utilities
// ============================================

import type { Settings, LockState } from './types';
import { DEFAULT_SETTINGS, DEFAULT_LOCK_STATE } from './types';

const STORAGE_KEYS = {
    SETTINGS: 'browserlock_settings',
    LOCK_STATE: 'browserlock_lockstate',
} as const;

// ============================================
// Settings (chrome.storage.local - persists)
// ============================================

/**
 * Get settings from local storage
 */
export async function getSettings(): Promise<Settings> {
    try {
        const result = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
        if (result[STORAGE_KEYS.SETTINGS]) {
            const stored = result[STORAGE_KEYS.SETTINGS] as Partial<Settings>;
            return { ...DEFAULT_SETTINGS, ...stored };
        }
        return { ...DEFAULT_SETTINGS };
    } catch (error) {
        console.error('[Storage] Failed to get settings:', error);
        return { ...DEFAULT_SETTINGS };
    }
}

/**
 * Save settings to local storage
 */
export async function saveSettings(settings: Partial<Settings>): Promise<void> {
    try {
        const current = await getSettings();
        const updated = { ...current, ...settings };
        await chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: updated });
    } catch (error) {
        console.error('[Storage] Failed to save settings:', error);
        throw error;
    }
}

/**
 * Update a single setting
 */
export async function updateSetting<K extends keyof Settings>(
    key: K,
    value: Settings[K]
): Promise<void> {
    const current = await getSettings();
    current[key] = value;
    await saveSettings(current);
}

// ============================================
// Lock State (chrome.storage.session - per profile, clears on close)
// ============================================

/**
 * Get lock state from session storage
 */
export async function getLockState(): Promise<LockState> {
    try {
        const result = await chrome.storage.session.get(STORAGE_KEYS.LOCK_STATE);
        if (result[STORAGE_KEYS.LOCK_STATE]) {
            const stored = result[STORAGE_KEYS.LOCK_STATE] as Partial<LockState>;
            return { ...DEFAULT_LOCK_STATE, ...stored };
        }
        return { ...DEFAULT_LOCK_STATE };
    } catch (error) {
        console.error('[Storage] Failed to get lock state:', error);
        return { ...DEFAULT_LOCK_STATE };
    }
}

/**
 * Save lock state to session storage
 */
export async function saveLockState(state: Partial<LockState>): Promise<void> {
    try {
        const current = await getLockState();
        const updated = { ...current, ...state };
        await chrome.storage.session.set({ [STORAGE_KEYS.LOCK_STATE]: updated });
    } catch (error) {
        console.error('[Storage] Failed to save lock state:', error);
        throw error;
    }
}

/**
 * Reset lock state to defaults
 */
export async function resetLockState(): Promise<void> {
    try {
        await chrome.storage.session.set({ [STORAGE_KEYS.LOCK_STATE]: { ...DEFAULT_LOCK_STATE } });
    } catch (error) {
        console.error('[Storage] Failed to reset lock state:', error);
        throw error;
    }
}

// ============================================
// Storage Change Listeners
// ============================================

type StorageListener = (changes: { [key: string]: chrome.storage.StorageChange }) => void;

/**
 * Listen for settings changes
 */
export function onSettingsChange(callback: (newSettings: Settings) => void): () => void {
    const listener: StorageListener = (changes) => {
        if (changes[STORAGE_KEYS.SETTINGS]) {
            callback(changes[STORAGE_KEYS.SETTINGS].newValue as Settings);
        }
    };

    chrome.storage.local.onChanged.addListener(listener);
    return () => chrome.storage.local.onChanged.removeListener(listener);
}

/**
 * Listen for lock state changes
 */
export function onLockStateChange(callback: (newState: LockState) => void): () => void {
    const listener: StorageListener = (changes) => {
        if (changes[STORAGE_KEYS.LOCK_STATE]) {
            callback(changes[STORAGE_KEYS.LOCK_STATE].newValue as LockState);
        }
    };

    chrome.storage.session.onChanged.addListener(listener);
    return () => chrome.storage.session.onChanged.removeListener(listener);
}

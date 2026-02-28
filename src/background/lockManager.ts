// ============================================
// Browser Lock - Lock Manager
// ============================================
// Central module for all locking operations.
// Handles: lock, unlock, state verification, window management
//
// IMPORTANT: This module includes safeguards against the profile-switching
// issue where lock windows would open/close rapidly.
//
// NOTE: State persistence is handled by state.ts via chrome.storage.session.
// The lockScreenWindowId is set there and survives SW restarts.

import { getSettings, getLockState, saveLockState, resetLockState } from '../shared/storage';
import { verifyPassword, verifyRecoveryCode } from '../shared/crypto';
import { hideAllWindowsExceptLockScreen } from './windowUtils';
import { State, getLockScreenWindowId as getWindowId, setLockScreenWindowId } from './state';
import type { LockState } from '../shared/types';

// Use State module for lockScreenWindowId to avoid circular dependency
// The actual variable is in state.ts

// Mutex to prevent concurrent lock operations
let isLockOperationInProgress = false;
let isOpeningLockScreen = false;

// Timestamp of last lock screen open attempt (for rate limiting)
let lastLockScreenOpenTime = 0;
const LOCK_SCREEN_COOLDOWN_MS = 500; // Minimum time between lock screen open attempts

/**
 * Get the current lock screen window ID (in-memory, synchronous)
 * This is more reliable than storage during rapid operations
 * Re-exported from state.ts to maintain API compatibility
 */
export function getLockScreenWindowId(): number | null {
    return getWindowId();
}

/**
 * Lock the browser
 * @param trigger - What caused the lock (for logging/analytics)
 */
export async function lock(trigger: 'manual' | 'auto' | 'idle' | 'startup'): Promise<boolean> {
    console.log(`[LockManager] Lock requested (trigger: ${trigger})`);

    // Prevent concurrent lock operations
    if (isLockOperationInProgress) {
        console.log('[LockManager] Lock operation already in progress, skipping');
        return false;
    }

    isLockOperationInProgress = true;

    try {
        // Check if extension is active and password is set
        const settings = await getSettings();

        if (!settings.active) {
            console.log('[LockManager] Extension is disabled, skipping lock');
            return false;
        }

        if (!settings.passwordHash) {
            console.log('[LockManager] No password set, skipping lock');
            return false;
        }

        // Check if already locked
        const currentState = await getLockState();
        if (currentState.locked) {
            console.log('[LockManager] Already locked');
            // Ensure lock screen is visible (with rate limiting)
            await ensureLockScreenVisible();
            return true;
        }

        // CRITICAL: Pause window guard FIRST, before setting lock state
        // This prevents race condition where guard sees locked=true but no lock screen exists
        State.pauseGuard();

        try {
            // Fix 2: Open lock screen FIRST, THEN persist locked state.
            // If openLockScreen() fails, we never write locked=true,
            // preventing the soft-brick scenario where guard blocks all tabs
            // but no lock screen exists for the user to authenticate.
            await openLockScreen();

            // Lock screen is confirmed open — NOW safe to persist locked state
            await saveLockState({
                locked: true,
                lockedAt: Date.now(),
                failedAttempts: 0,
                hardLockedUntil: null,
            });

            // Minimize all other windows
            await hideAllWindowsExceptLockScreen();
        } catch (lockError) {
            // ROLLBACK: If anything failed, ensure we don't leave a partial lock state
            console.error('[LockManager] Lock setup failed, rolling back:', lockError);
            try {
                await resetLockState();
                await closeLockScreen();
            } catch {
                // Best-effort rollback
            }
            State.resumeGuard();
            return false;
        } finally {
            // Resume window guard after operations complete
            State.resumeGuard();
        }

        console.log(`[LockManager] Browser locked successfully (trigger: ${trigger})`);
        return true;
    } catch (error) {
        console.error('[LockManager] Lock failed:', error);
        State.resumeGuard(); // Make sure to resume on error
        return false;
    } finally {
        isLockOperationInProgress = false;
    }
}

/**
 * Attempt to unlock the browser
 * @param password - The password or recovery code to verify
 * @param isRecoveryCode - Whether this is a recovery code attempt
 */
export async function unlock(password: string, isRecoveryCode: boolean = false): Promise<{
    success: boolean;
    error?: string;
    remainingAttempts?: number;
}> {
    console.log(`[LockManager] Unlock attempt (recovery: ${isRecoveryCode})`);

    try {
        const settings = await getSettings();
        const lockState = await getLockState();

        // Check if actually locked
        if (!lockState.locked) {
            console.log('[LockManager] Not locked, nothing to unlock');
            return { success: true };
        }

        // Check if in hard lock (quarantine)
        if (lockState.hardLockedUntil && Date.now() < lockState.hardLockedUntil) {
            const remainingMinutes = Math.ceil((lockState.hardLockedUntil - Date.now()) / 60000);
            return {
                success: false,
                error: `Too many failed attempts. Try again in ${remainingMinutes} minute(s).`,
            };
        }

        // Verify password or recovery code
        let isValid = false;

        if (isRecoveryCode) {
            if (settings.recoveryCodeHash) {
                isValid = await verifyRecoveryCode(password, settings.recoveryCodeHash);
            }
        } else {
            if (settings.passwordHash) {
                isValid = await verifyPassword(password, settings.passwordHash);
            }
        }

        if (isValid) {
            // Unlock successful
            console.log('[LockManager] Password verified, unlocking...');

            // Pause window guard during unlock operations to prevent interference
            State.pauseGuard();

            // Reset lock state FIRST (so window guard doesn't block restore)
            await resetLockState();

            // CRITICAL: Restore windows or create new ones FIRST before closing lock screen
            // This ensures Chrome always has a visible window and prevents process termination
            const wasSameSession = await restoreAllWindows();

            // Now safe to close lock screen (restored/new window already exists)
            await closeLockScreen();

            // Clean up stray minimized windows only in cross-restart scenario.
            // In same-session, the user's intentionally-minimized windows are preserved.
            if (!wasSameSession) {
                await cleanupMinimizedWindows();
            }

            console.log('[LockManager] Unlocked successfully');
            return { success: true };
        } else {
            // Failed attempt
            const newAttempts = (lockState.failedAttempts || 0) + 1;
            console.log(`[LockManager] Wrong password, attempt ${newAttempts}`);

            // Check quarantine mode
            if (settings.quarantineMode.active) {
                const maxAttempts = settings.quarantineMode.maxAttempts;

                if (newAttempts >= maxAttempts) {
                    // Trigger quarantine
                    console.log('[LockManager] Max attempts exceeded, triggering quarantine');
                    await triggerQuarantine(settings.quarantineMode.hardLockDuration);

                    // Clear data if configured
                    if (settings.quarantineMode.clearHistory) {
                        await clearBrowsingData(settings.quarantineMode.clearOptions);
                    }

                    return {
                        success: false,
                        error: `Too many attempts! Locked for ${settings.quarantineMode.hardLockDuration} minutes.`,
                        remainingAttempts: 0,
                    };
                }

                // Update failed attempts
                await saveLockState({ failedAttempts: newAttempts });

                return {
                    success: false,
                    error: `Wrong ${isRecoveryCode ? 'recovery code' : 'password'}.`,
                    remainingAttempts: maxAttempts - newAttempts,
                };
            }

            // No quarantine mode - just update attempts
            await saveLockState({ failedAttempts: newAttempts });

            return {
                success: false,
                error: `Wrong ${isRecoveryCode ? 'recovery code' : 'password'}. Please try again.`,
            };
        }
    } catch (error) {
        console.error('[LockManager] Unlock failed:', error);
        return {
            success: false,
            error: 'An error occurred. Please try again.',
        };
    }
}

/**
 * Check if browser is currently locked
 */
export async function isLocked(): Promise<boolean> {
    try {
        const state = await getLockState();
        return state.locked;
    } catch (error) {
        console.error('[LockManager] Failed to check lock state:', error);
        return false;
    }
}

/**
 * Get current lock state
 */
export async function getState(): Promise<LockState> {
    return await getLockState();
}

// ============================================
// Internal Functions
// ============================================

/**
 * Open the lock screen window
 * Includes safeguards against rapid reopening
 */
async function openLockScreen(): Promise<void> {
    // Check if already opening
    if (isOpeningLockScreen) {
        console.log('[LockManager] Lock screen already being opened, skipping');
        return;
    }

    // Rate limiting - prevent opening too frequently
    const now = Date.now();
    if (now - lastLockScreenOpenTime < LOCK_SCREEN_COOLDOWN_MS) {
        console.log('[LockManager] Lock screen cooldown active, skipping');
        return;
    }

    isOpeningLockScreen = true;
    lastLockScreenOpenTime = now;

    const lockScreenUrl = chrome.runtime.getURL('lockscreen.html');

    try {
        // Check if a lock screen window already exists
        const existingWindowId = getWindowId();
        if (existingWindowId) {
            try {
                const existingWindow = await chrome.windows.get(existingWindowId);
                if (existingWindow) {
                    // Window exists, just focus it
                    console.log(`[LockManager] Lock screen already exists (window: ${existingWindowId}), focusing`);
                    await chrome.windows.update(existingWindowId, { focused: true });
                    return;
                }
            } catch {
                // Window doesn't exist anymore, clear the reference
                setLockScreenWindowId(null);
            }
        }

        // Create new lock screen window as a small centered popup
        // Get screen dimensions for centering
        const screenWidth = 1920; // Default fallback
        const screenHeight = 1080; // Default fallback
        const popupWidth = 550;
        const popupHeight = 550;

        const lockWindow = await chrome.windows.create({
            url: lockScreenUrl,
            type: 'popup',
            focused: true,
            width: popupWidth,
            height: popupHeight,
            left: Math.round((screenWidth - popupWidth) / 2),
            top: Math.round((screenHeight - popupHeight) / 2),
        });

        if (lockWindow && lockWindow.id) {
            setLockScreenWindowId(lockWindow.id);

            // Save to state for persistence
            await saveLockState({
                popup: {
                    windowId: lockWindow.id,
                    tabId: lockWindow.tabs?.[0]?.id ?? null,
                },
            });

            console.log(`[LockManager] Lock screen opened (window: ${lockWindow.id})`);
        }
    } catch (error) {
        console.error('[LockManager] Failed to open lock screen:', error);
        throw error;
    } finally {
        isOpeningLockScreen = false;
    }
}

/**
 * Close the lock screen window
 */
async function closeLockScreen(): Promise<void> {
    try {
        const state = await getLockState();
        const windowId = state.popup?.windowId || getWindowId();

        if (windowId) {
            try {
                await chrome.windows.remove(windowId);
                console.log(`[LockManager] Lock screen closed (window: ${windowId})`);
            } catch {
                // Window might already be closed
                console.log('[LockManager] Lock screen window already closed or inaccessible');
            }
        }

        setLockScreenWindowId(null);
    } catch (error) {
        console.error('[LockManager] Error closing lock screen:', error);
    }
}

/**
 * Ensure lock screen is visible (reopen if closed)
 * Includes rate limiting to prevent rapid open/close cycles
 * IMPORTANT: Pauses WindowGuard during operation to prevent interference
 *
 * This function both creates/focuses the lock screen AND hides all other
 * windows. This is critical for browser restart scenarios where Chrome's
 * default tab is visible before the lock screen appears.
 */
export async function ensureLockScreenVisible(): Promise<void> {
    // Rate limiting
    const now = Date.now();
    if (now - lastLockScreenOpenTime < LOCK_SCREEN_COOLDOWN_MS) {
        console.log('[LockManager] ensureLockScreenVisible: cooldown active');
        return;
    }

    // Pause window guard to prevent it from interfering with lock screen creation
    State.pauseGuard();

    try {
        // First check if we're actually locked
        const lockState = await getLockState();
        if (!lockState.locked) {
            console.log('[LockManager] Not locked, not showing lock screen');
            return;
        }

        // Check both storage and in-memory for the window ID
        const windowId = lockState.popup?.windowId || getWindowId();

        if (windowId) {
            try {
                // Check if window still exists
                const existingWindow = await chrome.windows.get(windowId);
                if (existingWindow) {
                    // Window exists, focus it and ensure background is hidden
                    await chrome.windows.update(windowId, { focused: true });
                    await hideAllWindowsExceptLockScreen();
                    return;
                }
            } catch {
                // Window doesn't exist, will reopen below
                console.log('[LockManager] Lock screen window missing, will reopen');
                // Clear the stale in-memory reference
                setLockScreenWindowId(null);
            }
        }

        // Reopen lock screen and hide everything else
        await openLockScreen();
        await hideAllWindowsExceptLockScreen();
    } catch (error) {
        console.error('[LockManager] Error ensuring lock screen visible:', error);
    } finally {
        // Always resume window guard after operation
        State.resumeGuard();
    }
}

/**
 * Trigger quarantine mode (hard lock)
 */
async function triggerQuarantine(durationMinutes: number): Promise<void> {
    const hardLockedUntil = Date.now() + (durationMinutes * 60 * 1000);

    await saveLockState({
        hardLockedUntil,
        failedAttempts: 0, // Reset counter
    });

    console.log(`[LockManager] Quarantine triggered, locked until ${new Date(hardLockedUntil).toLocaleTimeString()}`);
}

/**
 * Clear browsing data (quarantine action)
 */
async function clearBrowsingData(options: {
    cookies: boolean;
    passwords: boolean;
    downloads: boolean;
    formData: boolean;
    history: boolean;
}): Promise<void> {
    console.log('[LockManager] Clearing browsing data...');

    try {
        // Check permission
        const hasPermission = await chrome.permissions.contains({ permissions: ['browsingData'] });

        if (!hasPermission) {
            console.log('[LockManager] browsingData permission not granted, skipping clear');
            return;
        }

        const dataToRemove: chrome.browsingData.DataTypeSet = {
            cookies: options.cookies,
            passwords: options.passwords,
            downloads: options.downloads,
            formData: options.formData,
            history: options.history,
        };

        await chrome.browsingData.remove({ since: 0 }, dataToRemove);
        console.log('[LockManager] Browsing data cleared');
    } catch (error) {
        console.error('[LockManager] Failed to clear browsing data:', error);
    }
}

// ============================================
// Window Management for Lock/Unlock
// ============================================

// NOTE: hideAllWindowsExceptLockScreen is now imported from windowGuard.ts
// The imported version uses chrome.windows.update({state: 'minimized'}) instead of
// chrome.windows.remove(), which prevents Chrome from terminating the profile process.

/**
 * Restore browser windows after successful unlock.
 *
 * SMART RESTORATION LOGIC:
 * 1. First, check if there are force-minimized windows from the same session.
 *    If YES → restore them (the user gets their exact workspace back).
 * 2. If NO windows exist (browser was closed while locked and reopened),
 *    fall back to the startState setting:
 *    - 'restore': Restore any remaining minimized windows (fallback behavior)
 *    - 'new_tab': Open a fresh new tab page
 *    - 'url': Open a configured URL
 */
async function restoreAllWindows(): Promise<boolean> {
    // Pause window guard to prevent it from interfering with window operations
    State.pauseGuard();

    try {
        // STEP 1: Try to restore force-minimized windows (same-session scenario).
        // These are windows that hideAllWindowsExceptLockScreen() minimized
        // during the current lock session. They still have all the user's tabs.
        const forceMinimizedIds = State.getForceMinimizedWindowIds();
        let sameSessionWindowsExist = false;

        if (forceMinimizedIds.length > 0) {
            // Check if any of these windows actually still exist
            for (const winId of forceMinimizedIds) {
                try {
                    await chrome.windows.get(winId);
                    sameSessionWindowsExist = true;
                    break;
                } catch {
                    // Window no longer exists
                }
            }
        }

        if (sameSessionWindowsExist) {
            // SAME-SESSION: The user locked within this browser session.
            // Their minimized windows are still alive. Restore them.
            console.log('[LockManager] Same-session unlock: restoring force-minimized windows');
            await restoreMinimizedWindows();
            return true;
        }

        // STEP 2: No same-session windows exist. This means the browser was
        // closed while locked and reopened. Use the startState config.
        console.log('[LockManager] Cross-restart unlock: no same-session windows, using startState config');
        State.clearForceMinimizedWindowIds();

        const settings = await getSettings();
        const startState = settings.autoLock.startState;

        console.log(`[LockManager] Restoring with mode: ${startState}`);

        if (startState === 'restore') {
            // Try to restore any remaining minimized windows (fallback)
            await restoreMinimizedWindows();
        } else if (startState === 'url' && settings.autoLock.startUrl) {
            await chrome.windows.create({
                url: settings.autoLock.startUrl,
                focused: true,
                state: 'maximized',
            });
            console.log(`[LockManager] Opened configured URL: ${settings.autoLock.startUrl}`);
        } else {
            // 'new_tab' mode or fallback
            await chrome.windows.create({
                url: 'chrome://newtab',
                focused: true,
                state: 'maximized',
            });
            console.log('[LockManager] Opened new tab page');
        }

        return false;
    } catch (error) {
        console.error('[LockManager] Error restoring windows:', error);
        try {
            await chrome.tabs.create({});
        } catch {
            // Give up
        }
        return false;
    } finally {
        // Resume window guard after a short delay to let windows fully initialize
        setTimeout(() => State.resumeGuard(), 300);
    }
}

/**
 * Restore (un-minimize) only the windows WE force-minimized during lock (Fix 4).
 * Windows the user had intentionally minimized before locking are left alone.
 */
async function restoreMinimizedWindows(): Promise<void> {
    try {
        const forceMinimizedIds = State.getForceMinimizedWindowIds();
        let restoredCount = 0;
        let firstWindowId: number | null = null;

        if (forceMinimizedIds.length > 0) {
            // Restore only the specific windows we force-minimized
            for (const winId of forceMinimizedIds) {
                try {
                    const win = await chrome.windows.get(winId);
                    if (win && win.state === 'minimized') {
                        await chrome.windows.update(winId, { state: 'normal' });
                        restoredCount++;

                        if (!firstWindowId) {
                            firstWindowId = winId;
                        }

                        console.log(`[LockManager] Restored force-minimized window: ${winId}`);
                    }
                } catch {
                    // Window might no longer exist, skip
                    console.log(`[LockManager] Force-minimized window ${winId} no longer exists`);
                }
            }
        } else {
            // Fallback: no tracked IDs (e.g., session storage was lost).
            // Restore ALL minimized windows as before.
            const allWindows = await chrome.windows.getAll();
            for (const win of allWindows) {
                if (win.id && win.state === 'minimized') {
                    try {
                        await chrome.windows.update(win.id, { state: 'normal' });
                        restoredCount++;
                        if (!firstWindowId) firstWindowId = win.id;
                        console.log(`[LockManager] Restored minimized window (fallback): ${win.id}`);
                    } catch { /* Window gone */ }
                }
            }
        }

        // Clear the tracking list
        State.clearForceMinimizedWindowIds();

        // Focus the first restored window
        if (firstWindowId) {
            try {
                await chrome.windows.update(firstWindowId, { focused: true });
            } catch { /* Focus error */ }
        }

        if (restoredCount === 0) {
            console.log('[LockManager] No windows to restore, creating new tab');
            await chrome.windows.create({
                url: 'chrome://newtab',
                focused: true,
                state: 'maximized',
            });
        } else {
            console.log(`[LockManager] Restored ${restoredCount} window(s)`);
        }
    } catch (error) {
        console.error('[LockManager] Error restoring windows:', error);
        await chrome.windows.create({
            url: 'chrome://newtab',
            focused: true,
            state: 'maximized',
        });
    }
}


/**
 * Clean up minimized windows after unlock (for 'new_tab' and 'url' modes only)
 * During lock, windows are minimized (not closed) to keep the process alive.
 * When NOT using 'restore' mode, we close those old minimized windows since user gets a fresh start.
 * NOTE: This function should NOT be called in 'restore' mode - use restoreMinimizedWindows() instead.
 */
async function cleanupMinimizedWindows(): Promise<void> {
    try {
        const allWindows = await chrome.windows.getAll();

        for (const win of allWindows) {
            // Close any minimized windows (these were from before the lock)
            if (win.id && win.state === 'minimized') {
                try {
                    await chrome.windows.remove(win.id);
                    console.log(`[LockManager] Cleaned up minimized window: ${win.id}`);
                } catch {
                    // Window might already be gone, ignore
                }
            }
        }
    } catch (error) {
        console.error('[LockManager] Error cleaning up minimized windows:', error);
    }
}

// Export for use in background script
export const LockManager = {
    lock,
    unlock,
    isLocked,
    getState,
    ensureLockScreenVisible,
};

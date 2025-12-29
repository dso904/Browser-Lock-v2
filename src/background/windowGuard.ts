// ============================================
// Browser Lock - Window Guard
// ============================================
// Prevents users from opening new windows/tabs while locked.
// Enforces the lock by:
// 1. Intercepting new tab creation
// 2. Intercepting new window creation
// 3. Reopening lock screen if it's closed
//
// IMPORTANT: This module includes robust debouncing and rate limiting
// to prevent the profile-switching issue where events fire rapidly.

import { getLockState, saveLockState } from '../shared/storage';
import { LockManager } from './lockManager';
import { State, getLockScreenWindowId } from './state';

// Debounce state - use timestamps instead of boolean flags for robustness
let lastTabEventTime = 0;
let lastWindowCreatedTime = 0;
let lastWindowRemovedTime = 0;

// Minimum time between processing events (ms)
const DEBOUNCE_MS = 200;

// Track if we're currently processing to prevent re-entry
let isProcessingTabEvent = false;
let isProcessingWindowCreated = false;
let isProcessingWindowRemoved = false;

// NOTE: Pause state is now managed in state.ts to avoid circular dependency
// Export these for backwards compatibility with index.ts
export function pauseWindowGuard(): void {
    State.pauseGuard();
}

export function resumeWindowGuard(): void {
    State.resumeGuard();
}

/**
 * Register all window guard listeners
 */
export function registerWindowGuard(): void {
    console.log('[WindowGuard] Registering listeners...');

    // Tab creation listener
    chrome.tabs.onCreated.addListener(handleTabCreated);

    // Window creation listener
    chrome.windows.onCreated.addListener(handleWindowCreated);

    // Window removal listener (detect if lock screen is closed)
    chrome.windows.onRemoved.addListener(handleWindowRemoved);

    // Window focus change listener (prevent restoring minimized windows while locked)
    chrome.windows.onFocusChanged.addListener(handleWindowFocusChanged);

    console.log('[WindowGuard] Listeners registered');
}

/**
 * Unregister all window guard listeners
 */
export function unregisterWindowGuard(): void {
    chrome.tabs.onCreated.removeListener(handleTabCreated);
    chrome.windows.onCreated.removeListener(handleWindowCreated);
    chrome.windows.onRemoved.removeListener(handleWindowRemoved);
    chrome.windows.onFocusChanged.removeListener(handleWindowFocusChanged);
    console.log('[WindowGuard] Listeners unregistered');
}

/**
 * Handle new tab creation
 * Close tabs created in non-lock-screen windows while locked
 */
async function handleTabCreated(tab: chrome.tabs.Tab): Promise<void> {
    // Skip if window guard is paused (during lock/unlock operations)
    if (State.isGuardPaused()) {
        return;
    }

    const now = Date.now();

    // Debounce - skip if too soon after last event
    if (now - lastTabEventTime < DEBOUNCE_MS) {
        return;
    }

    // Prevent re-entry
    if (isProcessingTabEvent) {
        return;
    }

    lastTabEventTime = now;
    isProcessingTabEvent = true;

    try {
        const lockState = await getLockState();

        if (!lockState.locked) {
            return; // Not locked, allow tab
        }

        const lockWindowId = lockState.popup?.windowId || getLockScreenWindowId();

        // SAFETY: If locked but no lock window ID, lock is still being set up
        // Skip handling to prevent interference with lock initialization
        if (!lockWindowId) {
            console.log('[WindowGuard] Locked but no lock window ID yet, skipping tab handling');
            return;
        }

        // If tab is in the lock screen window, allow it
        if (tab.windowId === lockWindowId) {
            return;
        }

        // Close the unauthorized tab
        if (tab.id && tab.id > 0) {
            console.log(`[WindowGuard] Blocking new tab (id: ${tab.id}) while locked`);
            try {
                await chrome.tabs.remove(tab.id);
            } catch {
                // Tab might already be closed or protected
                // This is expected and not an error
            }
        }

        // Ensure lock screen is visible (rate-limited internally)
        await LockManager.ensureLockScreenVisible();
    } catch (error) {
        console.error('[WindowGuard] Error handling tab creation:', error);
    } finally {
        isProcessingTabEvent = false;
    }
}

/**
 * Handle new window creation
 * Show notification and focus lock screen
 */
async function handleWindowCreated(window: chrome.windows.Window): Promise<void> {
    // Skip if window guard is paused (during lock/unlock operations)
    if (State.isGuardPaused()) {
        return;
    }

    const now = Date.now();

    // Debounce
    if (now - lastWindowCreatedTime < DEBOUNCE_MS) {
        return;
    }

    // Prevent re-entry
    if (isProcessingWindowCreated) {
        return;
    }

    lastWindowCreatedTime = now;
    isProcessingWindowCreated = true;

    try {
        const lockState = await getLockState();

        if (!lockState.locked) {
            return; // Not locked, allow window
        }

        // Check both storage and in-memory for lock screen window ID
        const lockWindowId = lockState.popup?.windowId || getLockScreenWindowId();

        // SAFETY: If locked but no lock window ID, lock is still being set up
        // Skip handling to prevent interference with lock initialization
        if (!lockWindowId) {
            console.log('[WindowGuard] Locked but no lock window ID yet, skipping window handling');
            return;
        }

        // If this is the lock screen window, allow it
        if (window.id === lockWindowId) {
            return;
        }

        // If no ID or invalid window, skip
        if (!window.id || window.id <= 0) {
            return;
        }

        console.log(`[WindowGuard] New window detected while locked (id: ${window.id})`);

        // Show notification (non-blocking, ignore errors)
        chrome.notifications.create(`window-blocked-${now}`, {
            type: 'basic',
            iconUrl: chrome.runtime.getURL('icons/icon-48.png'),
            title: 'Browser Locked',
            message: 'The browser is locked. Please enter your password.',
        }).catch(() => {
            // Notification failed, not critical
        });

        // Focus the lock screen
        try {
            await chrome.windows.update(lockWindowId, { focused: true });
        } catch {
            // Lock screen might have been closed, reopen
            await LockManager.ensureLockScreenVisible();
        }
    } catch (error) {
        console.error('[WindowGuard] Error handling window creation:', error);
    } finally {
        isProcessingWindowCreated = false;
    }
}

/**
 * Handle window removal
 * EXIT STRATEGY: If the Lock Screen is closed by the user, we treat it as a "Quit" intent.
 * We immediately close all background/minimized windows to exit Chrome completely.
 */
async function handleWindowRemoved(windowId: number): Promise<void> {
    // Skip if window guard is paused (during lock/unlock operations)
    if (State.isGuardPaused()) {
        return;
    }

    const now = Date.now();

    // Debounce
    if (now - lastWindowRemovedTime < DEBOUNCE_MS) {
        return;
    }

    // Prevent re-entry
    if (isProcessingWindowRemoved) {
        return;
    }

    lastWindowRemovedTime = now;
    isProcessingWindowRemoved = true;

    try {
        const lockState = await getLockState();

        if (!lockState.locked) {
            return; // Not locked, nothing to do
        }

        // Check both storage and in-memory for lock screen window ID
        const lockWindowId = lockState.popup?.windowId || getLockScreenWindowId();

        // If we don't know the lock window ID, we can't make a decision
        if (!lockWindowId) {
            return;
        }

        // CRITICAL FIX: Check if the closed window was the Lock Screen
        if (lockWindowId === windowId) {
            console.log('[WindowGuard] Lock screen closed by user. Initiating Application Exit.');

            // 1. Clear the lock screen reference so we don't try to focus it
            State.setLockScreenWindowId(null);
            await saveLockState({ popup: null });

            // 2. FORCE EXIT: Close all other windows (the minimized session)
            // This ensures Chrome shuts down completely instead of reopening the lock screen
            try {
                const allWindows = await chrome.windows.getAll();
                for (const win of allWindows) {
                    if (win.id) {
                        try {
                            console.log(`[WindowGuard] Closing background window ${win.id} to exit...`);
                            await chrome.windows.remove(win.id);
                        } catch (e) {
                            // Ignore errors (window might already be closing)
                        }
                    }
                }
            } catch (error) {
                console.error('[WindowGuard] Error during exit sequence:', error);
            }

            return; // Stop here. Do NOT reopen the lock screen.
        }

    } catch (error) {
        console.error('[WindowGuard] Error handling window removal:', error);
    } finally {
        isProcessingWindowRemoved = false;
    }
}

/**
 * Handle window focus change
 * If user tries to focus/restore a non-lock-screen window while locked,
 * re-minimize it and focus the lock screen
 */
async function handleWindowFocusChanged(windowId: number): Promise<void> {
    // Skip if window guard is paused
    if (State.isGuardPaused()) {
        return;
    }

    // Skip if no window focused (windowId = -1 means no chrome window focused)
    if (windowId === chrome.windows.WINDOW_ID_NONE) {
        return;
    }

    try {
        const lockState = await getLockState();

        if (!lockState.locked) {
            return; // Not locked, allow focus change
        }

        const lockWindowId = lockState.popup?.windowId || getLockScreenWindowId();

        // SAFETY: If locked but no lock window ID, skip
        if (!lockWindowId) {
            return;
        }

        // If user focused the lock screen, that's fine
        if (windowId === lockWindowId) {
            return;
        }

        // User tried to focus a non-lock-screen window while locked
        // Re-minimize it and focus the lock screen
        console.log(`[WindowGuard] Blocking focus on window ${windowId} while locked`);

        try {
            // Re-minimize the window
            await chrome.windows.update(windowId, { state: 'minimized' });
        } catch {
            // Window might be gone
        }

        try {
            // Focus the lock screen
            await chrome.windows.update(lockWindowId, { focused: true });
        } catch {
            // Lock screen might be gone, try to reopen
            await LockManager.ensureLockScreenVisible();
        }
    } catch (error) {
        console.error('[WindowGuard] Error handling focus change:', error);
    }
}


export const WindowGuard = {
    register: registerWindowGuard,
    unregister: unregisterWindowGuard,
};

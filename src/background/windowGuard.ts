// ============================================
// Browser Lock - Window Guard (Hardened)
// ============================================
// Prevents users from opening new windows/tabs while locked.
// Enforces the lock by:
// 1. Immediately removing unauthorized tabs (no debounce)
// 2. Intercepting new window creation
// 3. Reopening lock screen if it's closed
// 4. Graceful shutdown cascade via isShuttingDown flag
//
// SECURITY FIXES:
// - Removed exploitable 200ms debounce on tab creation
// - Per-ID re-entry tracking replaces global boolean mutex
// - Shutdown flag prevents recursive onRemoved cascade

import { getLockState, saveLockState } from '../shared/storage';
import { LockManager } from './lockManager';
import { State, getLockScreenWindowId } from './state';

// ── Per-ID re-entry tracking ─────────────────
// Instead of global boolean mutexes, track which specific IDs are being processed.
// This prevents re-entry for the SAME event but allows concurrent handling of DIFFERENT events.
const tabsBeingRemoved = new Set<number>();
const windowsBeingProcessed = new Set<number>();

// Window creation event still gets a short debounce since chrome fires
// rapid creation events during profile switch. Reduced from 200ms to 50ms.
let lastWindowCreatedTime = 0;
const WINDOW_DEBOUNCE_MS = 50;

// NOTE: Pause state and shutdown flag are managed in state.ts

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

    chrome.tabs.onCreated.addListener(handleTabCreated);
    chrome.windows.onCreated.addListener(handleWindowCreated);
    chrome.windows.onRemoved.addListener(handleWindowRemoved);
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
 * Handle new tab creation — HARDENED (no debounce)
 *
 * Every single unauthorized tab gets removed immediately.
 * No debounce means an attacker cannot slip tabs through a timing window.
 */
async function handleTabCreated(tab: chrome.tabs.Tab): Promise<void> {
    // ── Shutdown check (Fix 3) — absolute first check ──
    if (State.isShuttingDown()) return;

    // Skip if window guard is paused (during lock/unlock operations)
    if (State.isGuardPaused()) return;

    // Skip if no valid tab ID
    if (!tab.id || tab.id <= 0) return;

    // Per-ID re-entry guard (Fix 2) — prevents double-processing the same tab
    if (tabsBeingRemoved.has(tab.id)) return;

    try {
        const lockState = await getLockState();

        if (!lockState.locked) return; // Not locked, allow tab

        const lockWindowId = lockState.popup?.windowId || getLockScreenWindowId();

        // If locked but no lock window ID, lock is still being set up — skip
        if (!lockWindowId) {
            console.log('[WindowGuard] Locked but no lock window ID yet, skipping tab handling');
            return;
        }

        // If tab is in the lock screen window, allow it
        if (tab.windowId === lockWindowId) return;

        // ── IMMEDIATELY remove the unauthorized tab ──
        tabsBeingRemoved.add(tab.id);
        console.log(`[WindowGuard] Blocking new tab (id: ${tab.id}) while locked`);

        try {
            await chrome.tabs.remove(tab.id);
        } catch {
            // Tab might already be closed or protected — expected
        } finally {
            tabsBeingRemoved.delete(tab.id);
        }

        // Ensure lock screen is visible (rate-limited internally by LockManager)
        await LockManager.ensureLockScreenVisible();
    } catch (error) {
        console.error('[WindowGuard] Error handling tab creation:', error);
    }
}

/**
 * Handle new window creation
 * Show notification and focus lock screen.
 * Keeps a short debounce (50ms) since Chrome fires rapid window events during profile switch.
 */
async function handleWindowCreated(window: chrome.windows.Window): Promise<void> {
    // ── Shutdown check (Fix 3) ──
    if (State.isShuttingDown()) return;

    if (State.isGuardPaused()) return;

    // Short debounce for window creation only (profile switch artifact)
    const now = Date.now();
    if (now - lastWindowCreatedTime < WINDOW_DEBOUNCE_MS) return;
    lastWindowCreatedTime = now;

    if (!window.id || window.id <= 0) return;

    // Per-ID re-entry guard
    if (windowsBeingProcessed.has(window.id)) return;
    windowsBeingProcessed.add(window.id);

    try {
        const lockState = await getLockState();

        if (!lockState.locked) return; // Not locked, allow window

        const lockWindowId = lockState.popup?.windowId || getLockScreenWindowId();

        if (!lockWindowId) {
            console.log('[WindowGuard] Locked but no lock window ID yet, skipping window handling');
            return;
        }

        // If this is the lock screen window, allow it
        if (window.id === lockWindowId) return;

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
        if (window.id) windowsBeingProcessed.delete(window.id);
    }
}

/**
 * Handle window removal — EXIT STRATEGY with cascade prevention (Fix 3)
 *
 * If the Lock Screen is closed by the user, we treat it as a "Quit" intent.
 * We set isShuttingDown=true BEFORE the removal loop so that subsequent
 * onRemoved events fired by our own chrome.windows.remove() calls
 * are immediately short-circuited.
 */
async function handleWindowRemoved(windowId: number): Promise<void> {
    // ── Shutdown check — ABSOLUTE FIRST CHECK (Fix 3) ──
    // If a shutdown is already in progress, this event was fired by our own
    // removal loop. Do NOT process it — immediately return.
    if (State.isShuttingDown()) return;

    // Skip if window guard is paused (during lock/unlock operations)
    if (State.isGuardPaused()) return;

    // Per-ID re-entry guard
    if (windowsBeingProcessed.has(windowId)) return;
    windowsBeingProcessed.add(windowId);

    try {
        const lockState = await getLockState();

        if (!lockState.locked) return; // Not locked, nothing to do

        const lockWindowId = lockState.popup?.windowId || getLockScreenWindowId();

        // If we don't know the lock window ID, we can't make a decision
        if (!lockWindowId) return;

        // Check if the closed window was the Lock Screen
        if (lockWindowId === windowId) {
            console.log('[WindowGuard] Lock screen closed by user. Initiating Application Exit.');

            // ── SET SHUTDOWN FLAG FIRST (Fix 3) ──
            // This prevents the recursive cascade: every chrome.windows.remove()
            // below fires another onRemoved event, which will hit the
            // isShuttingDown() check at the top and immediately return.
            State.setShuttingDown(true);

            // Clear the lock screen reference
            State.setLockScreenWindowId(null);
            await saveLockState({ popup: null });

            // FORCE EXIT: Close all other windows
            try {
                const allWindows = await chrome.windows.getAll();
                // Use Promise.all for parallel removal — faster exit
                const removePromises = allWindows
                    .filter(win => win.id && win.id !== windowId)
                    .map(win => {
                        console.log(`[WindowGuard] Closing background window ${win.id} to exit...`);
                        return chrome.windows.remove(win.id!).catch(() => {
                            // Ignore errors (window might already be closing)
                        });
                    });
                await Promise.all(removePromises);
            } catch (error) {
                console.error('[WindowGuard] Error during exit sequence:', error);
            }

            return; // Stop here. Do NOT reopen the lock screen.
        }

    } catch (error) {
        console.error('[WindowGuard] Error handling window removal:', error);
    } finally {
        windowsBeingProcessed.delete(windowId);
    }
}

/**
 * Handle window focus change
 * If user tries to focus/restore a non-lock-screen window while locked,
 * re-minimize it and focus the lock screen
 */
async function handleWindowFocusChanged(windowId: number): Promise<void> {
    // ── Shutdown check (Fix 3) ──
    if (State.isShuttingDown()) return;

    if (State.isGuardPaused()) return;

    // Skip if no window focused (windowId = -1)
    if (windowId === chrome.windows.WINDOW_ID_NONE) return;

    try {
        const lockState = await getLockState();

        if (!lockState.locked) return;

        const lockWindowId = lockState.popup?.windowId || getLockScreenWindowId();

        if (!lockWindowId) return;

        // If user focused the lock screen, that's fine
        if (windowId === lockWindowId) return;

        // User tried to focus a non-lock-screen window while locked
        console.log(`[WindowGuard] Blocking focus on window ${windowId} while locked`);

        try {
            await chrome.windows.update(windowId, { state: 'minimized' });
        } catch {
            // Window might be gone
        }

        try {
            await chrome.windows.update(lockWindowId, { focused: true });
        } catch {
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

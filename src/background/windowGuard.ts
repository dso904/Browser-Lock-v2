// ============================================
// Browser Lock - Window Guard (Hardened)
// ============================================
// Prevents users from opening new windows/tabs while locked.
//
// MV3 COMPLIANCE: Listeners are registered synchronously via register().
// Handlers await State.waitForReady() to ensure state is hydrated before
// processing — events are never lost, only delayed until state is ready.
//
// SECURITY:
// - No debounce on tab creation — every unauthorized tab removed immediately
// - Per-ID re-entry tracking replaces global boolean mutex
// - Shutdown flag prevents recursive onRemoved cascade

import { getLockState, saveLockState } from '../shared/storage';
import { LockManager } from './lockManager';
import { State, getLockScreenWindowId } from './state';

// ── Per-ID re-entry tracking ─────────────────
const tabsBeingRemoved = new Set<number>();
const windowsBeingProcessed = new Set<number>();

// Window creation event still gets a short debounce (50ms)
// to absorb Chrome's rapid profile-switch artifact events.
let lastWindowCreatedTime = 0;
const WINDOW_DEBOUNCE_MS = 50;

export function pauseWindowGuard(): void {
    State.pauseGuard();
}

export function resumeWindowGuard(): void {
    State.resumeGuard();
}

/**
 * Register all window guard listeners (SYNCHRONOUS).
 * Must be called at the top level of the SW script.
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
 * Handle new tab creation — HARDENED (no debounce, awaits state)
 */
async function handleTabCreated(tab: chrome.tabs.Tab): Promise<void> {
    // Ensure state is hydrated before processing (MV3 compliance)
    await State.waitForReady();

    if (State.isShuttingDown()) return;
    if (State.isGuardPaused()) return;
    if (!tab.id || tab.id <= 0) return;
    if (tabsBeingRemoved.has(tab.id)) return;

    try {
        const lockState = await getLockState();
        if (!lockState.locked) return;

        const lockWindowId = lockState.popup?.windowId || getLockScreenWindowId();

        if (!lockWindowId) {
            console.log('[WindowGuard] Locked but no lock window ID yet, skipping tab handling');
            return;
        }

        if (tab.windowId === lockWindowId) return;

        // Immediately remove the unauthorized tab
        tabsBeingRemoved.add(tab.id);
        console.log(`[WindowGuard] Blocking new tab (id: ${tab.id}) while locked`);

        try {
            await chrome.tabs.remove(tab.id);
        } catch {
            // Tab might already be closed — expected
        } finally {
            tabsBeingRemoved.delete(tab.id);
        }

        await LockManager.ensureLockScreenVisible();
    } catch (error) {
        console.error('[WindowGuard] Error handling tab creation:', error);
    }
}

/**
 * Handle new window creation — awaits state, short debounce for profile-switch
 */
async function handleWindowCreated(window: chrome.windows.Window): Promise<void> {
    await State.waitForReady();

    if (State.isShuttingDown()) return;
    if (State.isGuardPaused()) return;

    const now = Date.now();
    if (now - lastWindowCreatedTime < WINDOW_DEBOUNCE_MS) return;
    lastWindowCreatedTime = now;

    if (!window.id || window.id <= 0) return;
    if (windowsBeingProcessed.has(window.id)) return;
    windowsBeingProcessed.add(window.id);

    try {
        const lockState = await getLockState();
        if (!lockState.locked) return;

        const lockWindowId = lockState.popup?.windowId || getLockScreenWindowId();

        if (!lockWindowId) {
            console.log('[WindowGuard] Locked but no lock window ID yet, skipping window handling');
            return;
        }

        if (window.id === lockWindowId) return;

        console.log(`[WindowGuard] New window detected while locked (id: ${window.id})`);

        chrome.notifications.create(`window-blocked-${now}`, {
            type: 'basic',
            iconUrl: chrome.runtime.getURL('icons/icon-48.png'),
            title: 'Browser Locked',
            message: 'The browser is locked. Please enter your password.',
        }).catch(() => { });

        try {
            await chrome.windows.update(lockWindowId, { focused: true });
        } catch {
            await LockManager.ensureLockScreenVisible();
        }
    } catch (error) {
        console.error('[WindowGuard] Error handling window creation:', error);
    } finally {
        if (window.id) windowsBeingProcessed.delete(window.id);
    }
}

/**
 * Handle window removal — EXIT STRATEGY with cascade prevention
 */
async function handleWindowRemoved(windowId: number): Promise<void> {
    // Shutdown check FIRST — before awaiting anything
    // Use synchronous cache read since this is the critical fast path
    if (State.isShuttingDown()) return;

    await State.waitForReady();

    // Re-check after await (flag could have been set during wait)
    if (State.isShuttingDown()) return;
    if (State.isGuardPaused()) return;
    if (windowsBeingProcessed.has(windowId)) return;
    windowsBeingProcessed.add(windowId);

    try {
        const lockState = await getLockState();
        if (!lockState.locked) return;

        const lockWindowId = lockState.popup?.windowId || getLockScreenWindowId();
        if (!lockWindowId) return;

        if (lockWindowId === windowId) {
            console.log('[WindowGuard] Lock screen closed by user. Initiating Application Exit.');

            // Set shutdown flag BEFORE the removal loop
            State.setShuttingDown(true);

            State.setLockScreenWindowId(null);
            await saveLockState({ popup: null });

            try {
                const allWindows = await chrome.windows.getAll();
                const removePromises = allWindows
                    .filter(win => win.id && win.id !== windowId)
                    .map(win => {
                        console.log(`[WindowGuard] Closing background window ${win.id} to exit...`);
                        return chrome.windows.remove(win.id!).catch(() => { });
                    });
                await Promise.all(removePromises);
            } catch (error) {
                console.error('[WindowGuard] Error during exit sequence:', error);
            }

            return;
        }
    } catch (error) {
        console.error('[WindowGuard] Error handling window removal:', error);
    } finally {
        windowsBeingProcessed.delete(windowId);
    }
}

/**
 * Handle window focus change — re-minimize non-lock windows
 */
async function handleWindowFocusChanged(windowId: number): Promise<void> {
    await State.waitForReady();

    if (State.isShuttingDown()) return;
    if (State.isGuardPaused()) return;
    if (windowId === chrome.windows.WINDOW_ID_NONE) return;

    try {
        const lockState = await getLockState();
        if (!lockState.locked) return;

        const lockWindowId = lockState.popup?.windowId || getLockScreenWindowId();
        if (!lockWindowId) return;
        if (windowId === lockWindowId) return;

        console.log(`[WindowGuard] Blocking focus on window ${windowId} while locked`);

        try {
            await chrome.windows.update(windowId, { state: 'minimized' });
        } catch { /* Window gone */ }

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

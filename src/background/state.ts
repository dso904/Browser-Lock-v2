// ============================================
// Browser Lock - Shared State (Session-Persisted)
// ============================================
// This module holds shared state variables that are used by both
// LockManager and WindowGuard. State is persisted to chrome.storage.session
// so it survives service worker restarts within a browser session.
//
// ARCHITECTURE:
// - Local cache variables provide synchronous reads (hot path)
// - All writes go to both cache AND chrome.storage.session
// - State.initialize() rehydrates cache from storage + validates against live windows
//
// IMPORTANT: This file should NOT import from lockManager or windowGuard
// to prevent circular dependencies.

// ── Session Storage Key ──────────────────────
const SESSION_KEY = 'browserlock_sw_state';

// ── Local Cache (synchronous reads) ──────────
let lockScreenWindowId: number | null = null;
let isWindowGuardPaused = false;
let isShuttingDown = false;

// ── Session Storage Shape ────────────────────
interface SwState {
    lockScreenWindowId: number | null;
    isWindowGuardPaused: boolean;
    isShuttingDown: boolean;
}

/**
 * Persist the current cache to session storage (fire-and-forget).
 * We don't await this in hot paths to avoid blocking the event loop.
 */
function persistToSession(): void {
    const data: SwState = {
        lockScreenWindowId,
        isWindowGuardPaused,
        isShuttingDown,
    };
    chrome.storage.session.set({ [SESSION_KEY]: data }).catch((err) => {
        console.error('[State] Failed to persist to session:', err);
    });
}

/**
 * Shared state accessors
 * Both LockManager and WindowGuard import from this module
 * to ensure they always see the same values.
 *
 * Reads are synchronous (from cache).
 * Writes update cache AND persist to session storage.
 */
export const State = {
    // ── Initialization (call once at SW boot) ──

    /**
     * Rehydrate state from chrome.storage.session and validate
     * that the stored lock screen window still exists.
     * Must be called at the top of bootstrap() before any other module reads state.
     */
    async initialize(): Promise<void> {
        try {
            const result = await chrome.storage.session.get(SESSION_KEY);
            const stored = result[SESSION_KEY] as SwState | undefined;

            if (stored) {
                lockScreenWindowId = stored.lockScreenWindowId;
                isWindowGuardPaused = stored.isWindowGuardPaused;
                isShuttingDown = stored.isShuttingDown;

                console.log(`[State] Rehydrated from session: windowId=${lockScreenWindowId}, guardPaused=${isWindowGuardPaused}, shuttingDown=${isShuttingDown}`);

                // Validate that the stored window ID still exists
                if (lockScreenWindowId !== null) {
                    try {
                        await chrome.windows.get(lockScreenWindowId);
                        console.log(`[State] Lock screen window ${lockScreenWindowId} confirmed alive`);
                    } catch {
                        // Window no longer exists — clear it
                        console.log(`[State] Lock screen window ${lockScreenWindowId} no longer exists, clearing`);
                        lockScreenWindowId = null;
                        persistToSession();
                    }
                }

                // If we were shutting down but the SW restarted, clear the flag
                // (the shutdown either completed or was interrupted, either way reset)
                if (isShuttingDown) {
                    console.log('[State] Clearing stale shutdown flag from previous SW instance');
                    isShuttingDown = false;
                    persistToSession();
                }
            } else {
                console.log('[State] No session state found, using defaults');

                // Try to discover an existing lock screen via live windows
                await reconstructFromLiveWindows();
            }
        } catch (error) {
            console.error('[State] Failed to initialize from session:', error);
            // Try window reconstruction as fallback
            await reconstructFromLiveWindows();
        }
    },

    // ── Lock Screen Window ID ──

    getLockScreenWindowId: (): number | null => lockScreenWindowId,

    setLockScreenWindowId: (id: number | null): void => {
        lockScreenWindowId = id;
        console.log(`[State] Lock screen window ID set to: ${id}`);
        persistToSession();
    },

    // ── Guard Pause State ──

    isGuardPaused: (): boolean => isWindowGuardPaused,

    pauseGuard: (): void => {
        isWindowGuardPaused = true;
        console.log('[State] Window Guard PAUSED');
        persistToSession();
    },

    resumeGuard: (): void => {
        isWindowGuardPaused = false;
        console.log('[State] Window Guard RESUMED');
        persistToSession();
    },

    // ── Shutdown Flag ──

    isShuttingDown: (): boolean => isShuttingDown,

    setShuttingDown: (value: boolean): void => {
        isShuttingDown = value;
        console.log(`[State] Shutting down: ${value}`);
        persistToSession();
    },
};

/**
 * Attempt to discover an existing lock screen window by scanning all open windows.
 * Looks for a window whose tab URL matches the lock screen extension page.
 */
async function reconstructFromLiveWindows(): Promise<void> {
    try {
        const lockScreenUrl = chrome.runtime.getURL('lockscreen.html');
        const allWindows = await chrome.windows.getAll({ populate: true });

        for (const win of allWindows) {
            if (win.id && win.tabs) {
                for (const tab of win.tabs) {
                    if (tab.url?.startsWith(lockScreenUrl)) {
                        lockScreenWindowId = win.id;
                        console.log(`[State] Reconstructed lock screen window ID from live windows: ${win.id}`);
                        persistToSession();
                        return;
                    }
                }
            }
        }

        console.log('[State] No lock screen window found in live windows');
    } catch (error) {
        console.error('[State] Failed to reconstruct from live windows:', error);
    }
}

// Also export individual functions for convenience
export const getLockScreenWindowId = State.getLockScreenWindowId;
export const setLockScreenWindowId = State.setLockScreenWindowId;
export const isGuardPaused = State.isGuardPaused;
export const pauseGuard = State.pauseGuard;
export const resumeGuard = State.resumeGuard;

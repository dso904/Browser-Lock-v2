// ============================================
// Browser Lock - Shared State (Session-Persisted)
// ============================================
// State is persisted to chrome.storage.session so it survives
// service worker restarts within a browser session.
//
// ARCHITECTURE:
// - Local cache variables provide synchronous reads (hot path)
// - All writes go to both cache AND chrome.storage.session
// - State.initialize() rehydrates cache from storage + validates windows
// - State.waitForReady() lets event handlers await initialization
//
// IMPORTANT: This file should NOT import from lockManager or windowGuard
// to prevent circular dependencies.

// ── Session Storage Key ──────────────────────
const SESSION_KEY = 'browserlock_sw_state';

// ── Local Cache (synchronous reads) ──────────
let lockScreenWindowId: number | null = null;
let isWindowGuardPaused = false;
let isShuttingDown = false;

// ── Initialization Promise ───────────────────
// Event handlers await this before processing to ensure state is hydrated.
let initPromise: Promise<void> | null = null;

// ── Session Storage Shape ────────────────────
interface SwState {
    lockScreenWindowId: number | null;
    isWindowGuardPaused: boolean;
    isShuttingDown: boolean;
    /** Window IDs that we force-minimized during lock (Fix 4) */
    forceMinimizedWindowIds: number[];
}

/**
 * Persist the current cache to session storage (fire-and-forget).
 */
function persistToSession(): void {
    const data: SwState = {
        lockScreenWindowId,
        isWindowGuardPaused,
        isShuttingDown,
        forceMinimizedWindowIds: forceMinimizedWindowIds,
    };
    chrome.storage.session.set({ [SESSION_KEY]: data }).catch((err) => {
        console.error('[State] Failed to persist to session:', err);
    });
}

// ── Force-Minimized Window IDs (Fix 4) ──────
let forceMinimizedWindowIds: number[] = [];

/**
 * Core initialization logic.
 */
async function doInitialize(): Promise<void> {
    try {
        const result = await chrome.storage.session.get(SESSION_KEY);
        const stored = result[SESSION_KEY] as SwState | undefined;

        if (stored) {
            lockScreenWindowId = stored.lockScreenWindowId;
            isWindowGuardPaused = stored.isWindowGuardPaused;
            isShuttingDown = stored.isShuttingDown;
            forceMinimizedWindowIds = stored.forceMinimizedWindowIds || [];

            console.log(`[State] Rehydrated: windowId=${lockScreenWindowId}, guardPaused=${isWindowGuardPaused}, shuttingDown=${isShuttingDown}, minimized=${forceMinimizedWindowIds.length}`);

            // Validate that the stored window ID still exists
            if (lockScreenWindowId !== null) {
                try {
                    await chrome.windows.get(lockScreenWindowId);
                    console.log(`[State] Lock screen window ${lockScreenWindowId} confirmed alive`);
                } catch {
                    console.log(`[State] Lock screen window ${lockScreenWindowId} no longer exists, clearing`);
                    lockScreenWindowId = null;
                    persistToSession();
                }
            }

            // Clear stale shutdown flag from previous SW instance
            if (isShuttingDown) {
                console.log('[State] Clearing stale shutdown flag');
                isShuttingDown = false;
                persistToSession();
            }
        } else {
            console.log('[State] No session state found, using defaults');
            await reconstructFromLiveWindows();
        }
    } catch (error) {
        console.error('[State] Failed to initialize from session:', error);
        await reconstructFromLiveWindows();
    }
}

export const State = {
    /**
     * Start initialization. Idempotent — repeated calls return the same promise.
     * Call this at the top level of the SW (non-awaited) so it begins immediately.
     */
    initialize(): Promise<void> {
        if (!initPromise) {
            initPromise = doInitialize();
        }
        return initPromise;
    },

    /**
     * Await this in event handlers to ensure state is hydrated before processing.
     * If initialize() hasn't been called yet, resolves immediately (graceful fallback).
     */
    waitForReady(): Promise<void> {
        return initPromise || Promise.resolve();
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

    // ── Force-Minimized Window IDs (Fix 4) ──

    getForceMinimizedWindowIds: (): number[] => [...forceMinimizedWindowIds],

    setForceMinimizedWindowIds: (ids: number[]): void => {
        forceMinimizedWindowIds = ids;
        persistToSession();
    },

    clearForceMinimizedWindowIds: (): void => {
        forceMinimizedWindowIds = [];
        persistToSession();
    },
};

/**
 * Discover an existing lock screen window by scanning all open windows.
 * Only accepts windows with type === 'popup' to prevent spoofing (Fix 3).
 */
async function reconstructFromLiveWindows(): Promise<void> {
    try {
        const lockScreenUrl = chrome.runtime.getURL('lockscreen.html');
        const allWindows = await chrome.windows.getAll({ populate: true });

        for (const win of allWindows) {
            // Fix 3: MUST be a popup window, not a regular tab
            if (win.id && win.type === 'popup' && win.tabs) {
                for (const tab of win.tabs) {
                    if (tab.url?.startsWith(lockScreenUrl)) {
                        lockScreenWindowId = win.id;
                        console.log(`[State] Reconstructed lock screen window ID from live windows: ${win.id} (type: popup)`);
                        persistToSession();
                        return;
                    }
                }
            }
        }

        console.log('[State] No lock screen popup found in live windows');
    } catch (error) {
        console.error('[State] Failed to reconstruct from live windows:', error);
    }
}

// Convenience exports
export const getLockScreenWindowId = State.getLockScreenWindowId;
export const setLockScreenWindowId = State.setLockScreenWindowId;
export const isGuardPaused = State.isGuardPaused;
export const pauseGuard = State.pauseGuard;
export const resumeGuard = State.resumeGuard;

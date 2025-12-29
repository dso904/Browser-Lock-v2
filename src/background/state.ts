// ============================================
// Browser Lock - Shared State
// ============================================
// This module holds shared state variables that are used by both
// LockManager and WindowGuard. By centralizing state here, we avoid
// circular dependency issues where each module might see stale values.
//
// IMPORTANT: This file should NOT import from lockManager or windowGuard
// to prevent circular dependencies.

// Track the lock screen window ID
let lockScreenWindowId: number | null = null;

// Track if the window guard is paused
let isWindowGuardPaused = false;

/**
 * Shared state accessors
 * Both LockManager and WindowGuard import from this module
 * to ensure they always see the same values
 */
export const State = {
    // Lock Screen Window ID Accessors
    getLockScreenWindowId: (): number | null => lockScreenWindowId,
    setLockScreenWindowId: (id: number | null): void => {
        lockScreenWindowId = id;
        console.log(`[State] Lock screen window ID set to: ${id}`);
    },

    // Guard Pause Accessors
    isGuardPaused: (): boolean => isWindowGuardPaused,
    pauseGuard: (): void => {
        isWindowGuardPaused = true;
        console.log('[State] Window Guard PAUSED');
    },
    resumeGuard: (): void => {
        isWindowGuardPaused = false;
        console.log('[State] Window Guard RESUMED');
    },
};

// Also export individual functions for convenience
export const getLockScreenWindowId = State.getLockScreenWindowId;
export const setLockScreenWindowId = State.setLockScreenWindowId;
export const isGuardPaused = State.isGuardPaused;
export const pauseGuard = State.pauseGuard;
export const resumeGuard = State.resumeGuard;

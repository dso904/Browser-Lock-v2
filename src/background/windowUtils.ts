// ============================================
// Browser Lock - Window Utilities
// ============================================
// Utility functions for window management.
// This module exists to break the circular dependency between
// lockManager.ts and windowGuard.ts.
//
// IMPORTANT: This file should NOT import from lockManager or windowGuard
// to prevent circular dependencies.

import { getLockState } from '../shared/storage';
import { State } from './state';

/**
 * Minimize all windows except the lock screen (SAFE — keeps process alive).
 *
 * Fix 4: Records which window IDs we force-minimized so that on unlock,
 * only those specific windows are restored — not windows the user had
 * intentionally minimized before locking.
 */
export async function hideAllWindowsExceptLockScreen(): Promise<void> {
    try {
        const lockState = await getLockState();
        const lockWindowId = lockState.popup?.windowId || State.getLockScreenWindowId();

        if (!lockWindowId) {
            console.warn('[WindowUtils] No lock window ID available, skipping window hiding');
            return;
        }

        const allWindows = await chrome.windows.getAll();
        const forceMinimizedIds: number[] = [];

        for (const window of allWindows) {
            if (window.id && window.id !== lockWindowId) {
                // Fix 4: Only track windows that are NOT already minimized.
                // Windows that were already minimized before we locked are the user's
                // intentional arrangement and should not be restored on unlock.
                const wasAlreadyMinimized = window.state === 'minimized';

                try {
                    await chrome.windows.update(window.id, { state: 'minimized' });

                    if (!wasAlreadyMinimized) {
                        forceMinimizedIds.push(window.id);
                    }

                    console.log(`[WindowUtils] Minimized window: ${window.id} (tracked: ${!wasAlreadyMinimized})`);
                } catch {
                    // Window might have been closed, ignore
                }
            }
        }

        // Persist which windows WE minimized (Fix 4)
        State.setForceMinimizedWindowIds(forceMinimizedIds);
        console.log(`[WindowUtils] Tracked ${forceMinimizedIds.length} force-minimized window(s)`);

        // Focus the lock screen
        try {
            await chrome.windows.update(lockWindowId, { focused: true });
            console.log('[WindowUtils] Lock screen focused');
        } catch {
            console.warn('[WindowUtils] Could not focus lock screen');
        }

        console.log('[WindowUtils] All windows minimized except lock screen');
    } catch (error) {
        console.error('[WindowUtils] Error hiding windows:', error);
    }
}

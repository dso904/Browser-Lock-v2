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
 * Minimize all windows except the lock screen (SAFE - keeps process alive)
 * Use this when locking to hide existing content.
 * 
 * IMPORTANT: This uses minimize instead of close to prevent Chrome from
 * terminating the profile process when the last "normal" window is removed.
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

        for (const window of allWindows) {
            if (window.id && window.id !== lockWindowId) {
                try {
                    // MINIMIZE instead of CLOSE to preserve the Chrome process
                    // Closing the last normal window would terminate the profile
                    await chrome.windows.update(window.id, { state: 'minimized' });
                    console.log(`[WindowUtils] Minimized window: ${window.id}`);
                } catch {
                    // Window might have been closed, ignore
                }
            }
        }

        // Focus the lock screen to ensure it's visible and in front
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

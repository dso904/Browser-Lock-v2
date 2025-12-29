// ============================================
// Browser Lock - Idle Handler
// ============================================
// Monitors user activity and triggers auto-lock
// after configured idle period.

import { getSettings, onSettingsChange } from '../shared/storage';
import { LockManager } from './lockManager';

// Notification tracking
let pendingNotificationId: string | null = null;
let lockTimeout: ReturnType<typeof setTimeout> | null = null;

// Grace period before locking (seconds after notification)
const GRACE_PERIOD_SECONDS = 5;

/**
 * Register idle detection listeners
 */
export async function registerIdleHandler(): Promise<void> {
    const settings = await getSettings();

    if (!settings.idleMode.active) {
        console.log('[IdleHandler] Idle mode disabled, skipping registration');
        return;
    }

    // Set detection interval (in seconds)
    const intervalSeconds = settings.idleMode.duration * 60;
    chrome.idle.setDetectionInterval(intervalSeconds);

    // Register listener
    chrome.idle.onStateChanged.addListener(handleIdleStateChange);

    // Listen for settings changes
    onSettingsChange(handleSettingsChange);

    console.log(`[IdleHandler] Registered with ${settings.idleMode.duration} minute detection`);
}

/**
 * Unregister idle detection
 */
export function unregisterIdleHandler(): void {
    chrome.idle.onStateChanged.removeListener(handleIdleStateChange);
    clearPendingLock();
    console.log('[IdleHandler] Unregistered');
}

/**
 * Handle idle state changes
 * Note: Wrapped to handle async properly for chrome event listener
 */
function handleIdleStateChange(state: 'active' | 'idle' | 'locked'): void {
    handleIdleStateChangeAsync(state).catch(error => {
        console.error('[IdleHandler] Error handling state change:', error);
    });
}

/**
 * Async handler for idle state changes
 */
async function handleIdleStateChangeAsync(state: 'active' | 'idle' | 'locked'): Promise<void> {
    console.log(`[IdleHandler] State changed to: ${state}`);

    const settings = await getSettings();

    if (!settings.idleMode.active) {
        return;
    }

    // Check if already locked
    const isLocked = await LockManager.isLocked();
    if (isLocked) {
        return;
    }

    switch (state) {
        case 'idle':
            await handleIdle(settings.idleMode.notify);
            break;
        case 'active':
            handleActive();
            break;
        case 'locked':
            // System is locked (screensaver, etc.) - lock browser too
            await handleSystemLocked();
            break;
    }
}

/**
 * Handle idle state - show notification and schedule lock
 */
async function handleIdle(showNotification: boolean): Promise<void> {
    console.log('[IdleHandler] User idle, preparing to lock...');

    // Check if audio is playing (don't interrupt media)
    try {
        const audibleTabs = await chrome.tabs.query({ audible: true });
        if (audibleTabs.length > 0) {
            console.log('[IdleHandler] Audio playing, skipping idle lock');
            return;
        }
    } catch (error) {
        console.log('[IdleHandler] Could not check audio tabs:', error);
    }

    // Show notification if enabled
    if (showNotification) {
        try {
            pendingNotificationId = `idle-lock-${Date.now()}`;
            await chrome.notifications.create(pendingNotificationId, {
                type: 'basic',
                iconUrl: chrome.runtime.getURL('icons/icon-48.png'),
                title: 'Browser Lock',
                message: `Locking in ${GRACE_PERIOD_SECONDS} seconds due to inactivity...`,
                requireInteraction: false,
            });
        } catch (error) {
            console.log('[IdleHandler] Could not show notification:', error);
        }
    }

    // Schedule lock after grace period
    lockTimeout = setTimeout(async () => {
        console.log('[IdleHandler] Grace period expired, locking...');
        clearNotification();
        await LockManager.lock('idle');
    }, GRACE_PERIOD_SECONDS * 1000);
}

/**
 * Handle active state - cancel pending lock
 */
function handleActive(): void {
    console.log('[IdleHandler] User active, canceling pending lock');
    clearPendingLock();
}

/**
 * Handle system locked state - lock browser immediately
 */
async function handleSystemLocked(): Promise<void> {
    console.log('[IdleHandler] System locked, locking browser immediately');
    clearPendingLock();
    await LockManager.lock('idle');
}

/**
 * Handle settings changes
 */
async function handleSettingsChange(newSettings: typeof import('../shared/types').DEFAULT_SETTINGS): Promise<void> {
    console.log('[IdleHandler] Settings changed, updating...');

    if (newSettings.idleMode.active) {
        // Update detection interval
        const intervalSeconds = newSettings.idleMode.duration * 60;
        chrome.idle.setDetectionInterval(intervalSeconds);
        console.log(`[IdleHandler] Detection interval updated to ${newSettings.idleMode.duration} minutes`);
    } else {
        // Disable idle detection
        clearPendingLock();
        console.log('[IdleHandler] Idle mode disabled');
    }
}

/**
 * Clear any pending lock and notification
 */
function clearPendingLock(): void {
    if (lockTimeout) {
        clearTimeout(lockTimeout);
        lockTimeout = null;
    }
    clearNotification();
}

/**
 * Clear the notification if present
 */
function clearNotification(): void {
    if (pendingNotificationId) {
        try {
            chrome.notifications.clear(pendingNotificationId);
        } catch {
            // Notification might already be cleared
        }
        pendingNotificationId = null;
    }
}

export const IdleHandler = {
    register: registerIdleHandler,
    unregister: unregisterIdleHandler,
};

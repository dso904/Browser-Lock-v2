// ============================================
// Browser Lock - Background Service Worker
// ============================================
// Main entry point for the extension's background logic.
// Bootstraps all modules and registers event listeners.

import { getSettings, getLockState } from '../shared/storage';
import { LockManager } from './lockManager';
import { WindowGuard, pauseWindowGuard } from './windowGuard';
import { IdleHandler } from './idleHandler';
import { ContextMenu } from './contextMenu';
import { MessageHandler } from './messageHandler';
import { State } from './state';

console.log('[BrowserLock] Service Worker starting...');

// ============================================
// Bootstrap
// ============================================

async function bootstrap(): Promise<void> {
    console.log('[BrowserLock] Bootstrapping...');

    try {
        // CRITICAL: Rehydrate shared state from session storage FIRST
        // This recovers lockScreenWindowId, guard pause state, etc. after SW restart
        await State.initialize();

        // Load current state
        const settings = await getSettings();
        const lockState = await getLockState();

        console.log('[BrowserLock] Extension active:', settings.active);
        console.log('[BrowserLock] Password set:', !!settings.passwordHash);
        console.log('[BrowserLock] Currently locked:', lockState.locked);

        // Register modules that don't interfere with windows
        await ContextMenu.register();
        MessageHandler.register();

        // CRITICAL FIX: If locked, PAUSE the guard BEFORE registering it.
        // This prevents it from killing the startup tab while we prepare the lock screen.
        // The guard will be resumed inside ensureLockScreenVisible() after the lock screen is ready.
        if (lockState.locked) {
            console.log('[BrowserLock] Locked on startup - pausing guard for safe initialization');
            pauseWindowGuard();
        }

        // Now safe to register the WindowGuard
        WindowGuard.register();

        // Register idle handler if enabled
        if (settings.idleMode.active) {
            await IdleHandler.register();
        }

        // Register keyboard shortcut handler
        registerShortcutHandler();

        // If browser was locked before service worker restart, restore lock screen
        // Note: ensureLockScreenVisible() will resume the WindowGuard after completing
        if (lockState.locked) {
            console.log('[BrowserLock] Restoring lock from previous state');
            await LockManager.ensureLockScreenVisible();
        }

        console.log('[BrowserLock] Bootstrap complete');
    } catch (error) {
        console.error('[BrowserLock] Bootstrap failed:', error);
    }
}


// ============================================
// Keyboard Shortcut Handler
// ============================================

function registerShortcutHandler(): void {
    chrome.commands.onCommand.addListener(async (command) => {
        console.log(`[BrowserLock] Command received: ${command}`);

        if (command === 'lock_browser') {
            const settings = await getSettings();

            if (settings.shortcutLock.active) {
                await LockManager.lock('manual');
            } else {
                console.log('[BrowserLock] Shortcut disabled');
            }
        }
    });

    console.log('[BrowserLock] Shortcut handler registered');
}

// ============================================
// Extension Lifecycle Events
// ============================================

// On install
chrome.runtime.onInstalled.addListener((details) => {
    console.log(`[BrowserLock] onInstalled: ${details.reason}`);

    if (details.reason === 'install') {
        // First install - open options page
        chrome.runtime.openOptionsPage();
    } else if (details.reason === 'update') {
        // Update - could show changelog
        console.log(`[BrowserLock] Updated to v${chrome.runtime.getManifest().version}`);
    }
});

// On browser startup
chrome.runtime.onStartup.addListener(async () => {
    console.log('[BrowserLock] onStartup');

    const settings = await getSettings();

    if (settings.autoLock.active && settings.passwordHash) {
        console.log('[BrowserLock] Auto-lock on startup enabled');
        await LockManager.lock('startup');
    }
});

// Set uninstall URL (optional)
chrome.runtime.setUninstallURL('https://example.com/uninstall-feedback');

// ============================================
// Start Bootstrap
// ============================================

bootstrap();

// Export for potential debugging
export { LockManager, WindowGuard, IdleHandler };

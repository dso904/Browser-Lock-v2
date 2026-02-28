// ============================================
// Browser Lock - Background Service Worker
// ============================================
// Main entry point for the extension's background logic.
//
// MV3 COMPLIANCE (Fix 1):
// All Chrome event listeners are registered SYNCHRONOUSLY at the top level
// of this module — before any `await`. This ensures Chrome never discards
// a wake-up event because listeners weren't registered in the first tick.
//
// Event handlers that need state call `await State.waitForReady()` internally.

import { getSettings, getLockState } from '../shared/storage';
import { LockManager } from './lockManager';
import { WindowGuard } from './windowGuard';
import { IdleHandler } from './idleHandler';
import { ContextMenu } from './contextMenu';
import { MessageHandler } from './messageHandler';
import { State } from './state';

console.log('[BrowserLock] Service Worker starting...');

// ============================================
// PHASE 1: Synchronous listener registration
// ============================================
// MV3 requires all Chrome event listeners to be registered in the
// first synchronous execution of the script. Async initialization
// happens AFTER, and handlers await it internally.

// Start state rehydration immediately (non-blocking)
State.initialize();

// Register ALL Chrome event listeners synchronously
WindowGuard.register();        // tabs.onCreated, windows.onCreated/onRemoved/onFocusChanged
MessageHandler.register();     // runtime.onMessage
ContextMenu.registerListener(); // contextMenus.onClicked (menu creation is async, in bootstrap)

// Keyboard shortcut — registered inline here (synchronous)
chrome.commands.onCommand.addListener(async (command) => {
    await State.waitForReady();
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

// Extension lifecycle (already synchronous)
chrome.runtime.onInstalled.addListener((details) => {
    console.log(`[BrowserLock] onInstalled: ${details.reason}`);

    if (details.reason === 'install') {
        chrome.runtime.openOptionsPage();
    } else if (details.reason === 'update') {
        console.log(`[BrowserLock] Updated to v${chrome.runtime.getManifest().version}`);
    }
});

chrome.runtime.onStartup.addListener(async () => {
    console.log('[BrowserLock] onStartup');
    await State.waitForReady();

    const settings = await getSettings();
    if (settings.autoLock.active && settings.passwordHash) {
        console.log('[BrowserLock] Auto-lock on startup enabled');
        await LockManager.lock('startup');
    }
});

chrome.runtime.setUninstallURL('https://example.com/uninstall-feedback');

// ============================================
// PHASE 2: Async bootstrap
// ============================================
// Runs after listeners are registered. Handles state-dependent setup
// that doesn't need to be synchronous.

async function bootstrap(): Promise<void> {
    console.log('[BrowserLock] Bootstrapping...');

    try {
        // Wait for state to be fully rehydrated
        await State.waitForReady();

        const settings = await getSettings();
        const lockState = await getLockState();

        console.log('[BrowserLock] Extension active:', settings.active);
        console.log('[BrowserLock] Password set:', !!settings.passwordHash);
        console.log('[BrowserLock] Currently locked:', lockState.locked);

        // Create context menu items (the listener is already registered above)
        await ContextMenu.createMenuItems();

        // Register idle handler if enabled
        if (settings.idleMode.active) {
            await IdleHandler.register();
        }

        // If browser was locked before SW restart, restore lock screen
        if (lockState.locked) {
            console.log('[BrowserLock] Restoring lock from previous state');
            await LockManager.ensureLockScreenVisible();
        }

        console.log('[BrowserLock] Bootstrap complete');
    } catch (error) {
        console.error('[BrowserLock] Bootstrap failed:', error);
    }
}

bootstrap();

// Export for debugging
export { LockManager, WindowGuard, IdleHandler };

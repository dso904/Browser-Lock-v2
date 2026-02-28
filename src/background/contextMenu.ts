// ============================================
// Browser Lock - Context Menu
// ============================================
// Adds right-click menu item to lock the browser.
//
// MV3 COMPLIANCE: Listener registration is separated from menu creation.
// - registerContextMenuListener() — synchronous, called at top level
// - createContextMenuItems() — async, called in bootstrap

import { LockManager } from './lockManager';

const MENU_ID = 'browserlock-lock-now';

/**
 * Register the context menu click listener (SYNCHRONOUS).
 * Must be called at the top level of the SW script.
 */
export function registerContextMenuListener(): void {
    chrome.contextMenus.onClicked.addListener(handleMenuClick);
    console.log('[ContextMenu] Click listener registered');
}

/**
 * Create context menu items (ASYNC).
 * Called during bootstrap after listeners are registered.
 */
export async function createContextMenuItems(): Promise<void> {
    console.log('[ContextMenu] Creating menu items...');

    try {
        await chrome.contextMenus.removeAll();

        chrome.contextMenus.create({
            id: MENU_ID,
            title: '🔒 Lock Browser',
            contexts: ['all'],
        });

        console.log('[ContextMenu] Menu items created');
    } catch (error) {
        console.error('[ContextMenu] Menu creation failed:', error);
    }
}

/**
 * Handle context menu clicks
 */
async function handleMenuClick(
    info: chrome.contextMenus.OnClickData,
    _tab?: chrome.tabs.Tab
): Promise<void> {
    if (info.menuItemId === MENU_ID) {
        console.log('[ContextMenu] Lock menu clicked');
        await LockManager.lock('manual');
    }
}

export const ContextMenu = {
    registerListener: registerContextMenuListener,
    createMenuItems: createContextMenuItems,
};

// ============================================
// Browser Lock - Context Menu
// ============================================
// Adds right-click menu item to lock the browser.

import { LockManager } from './lockManager';

const MENU_ID = 'browserlock-lock-now';

/**
 * Register context menu items
 */
export async function registerContextMenu(): Promise<void> {
    console.log('[ContextMenu] Registering...');

    try {
        // Remove any existing menus first
        await chrome.contextMenus.removeAll();

        // Create "Lock Browser" menu item
        chrome.contextMenus.create({
            id: MENU_ID,
            title: '🔒 Lock Browser',
            contexts: ['all'], // Show on right-click anywhere
        });

        // Register click handler
        chrome.contextMenus.onClicked.addListener(handleMenuClick);

        console.log('[ContextMenu] Registered successfully');
    } catch (error) {
        console.error('[ContextMenu] Registration failed:', error);
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
    register: registerContextMenu,
};

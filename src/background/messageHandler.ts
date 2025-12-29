// ============================================
// Browser Lock - Message Handler
// ============================================
// Handles communication between UI (popup, options, lockscreen)
// and the background service worker.

import { LockManager } from './lockManager';
import { getSettings, saveSettings, getLockState } from '../shared/storage';
import type { Settings } from '../shared/types';

// Message types
export type MessageType =
    | { action: 'lock' }
    | { action: 'unlock'; password: string; isRecoveryCode?: boolean }
    | { action: 'getState' }
    | { action: 'getSettings' }
    | { action: 'saveSettings'; settings: Partial<Settings> }
    | { action: 'isLocked' };

// Response types
export type MessageResponse =
    | { success: boolean; error?: string; remainingAttempts?: number }
    | { state: Awaited<ReturnType<typeof getLockState>> }
    | { settings: Awaited<ReturnType<typeof getSettings>> }
    | { locked: boolean };

/**
 * Register message handler
 */
export function registerMessageHandler(): void {
    console.log('[MessageHandler] Registering...');

    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
        // Handle async responses
        handleMessage(message)
            .then(sendResponse)
            .catch((err: Error) => {
                console.error('[MessageHandler] Error:', err);
                sendResponse({ success: false, error: err.message });
            });

        // Return true to indicate async response
        return true;
    });

    console.log('[MessageHandler] Registered');
}

/**
 * Handle incoming messages
 */
async function handleMessage(
    message: MessageType
): Promise<MessageResponse> {
    console.log('[MessageHandler] Received:', message.action);

    switch (message.action) {
        case 'lock': {
            const lockResult = await LockManager.lock('manual');
            return { success: lockResult };
        }

        case 'unlock': {
            const unlockResult = await LockManager.unlock(
                message.password,
                message.isRecoveryCode || false
            );
            return unlockResult;
        }

        case 'getState': {
            const state = await getLockState();
            return { state };
        }

        case 'getSettings': {
            const settings = await getSettings();
            return { settings };
        }

        case 'saveSettings': {
            await saveSettings(message.settings);
            return { success: true };
        }

        case 'isLocked': {
            const locked = await LockManager.isLocked();
            return { locked };
        }

        default: {
            console.warn('[MessageHandler] Unknown action:', (message as { action: string }).action);
            return { success: false, error: 'Unknown action' };
        }
    }
}

/**
 * Helper function to send messages from UI to background
 * (To be used in popup, options, lockscreen)
 */
export async function sendMessage<T extends MessageType>(
    message: T
): Promise<MessageResponse> {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(message, (response) => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
            } else {
                resolve(response);
            }
        });
    });
}

export const MessageHandler = {
    register: registerMessageHandler,
    send: sendMessage,
};

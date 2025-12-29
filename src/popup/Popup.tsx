import { useState, useEffect } from 'react'

// Response types
type StateResponse = {
    state: {
        locked: boolean;
    };
};

type SettingsResponse = {
    settings: {
        active: boolean;
        passwordHash: string | null;
    };
};

export default function Popup() {
    const [isActive, setIsActive] = useState(false)
    const [hasPassword, setHasPassword] = useState(false)
    const [isLocked, setIsLocked] = useState(false)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function load() {
            try {
                const [stateRes, settingsRes] = await Promise.all([
                    chrome.runtime.sendMessage({ action: 'getState' }) as Promise<StateResponse>,
                    chrome.runtime.sendMessage({ action: 'getSettings' }) as Promise<SettingsResponse>,
                ]);

                if (stateRes?.state) {
                    setIsLocked(stateRes.state.locked);
                }

                if (settingsRes?.settings) {
                    setIsActive(settingsRes.settings.active);
                    setHasPassword(!!settingsRes.settings.passwordHash);
                }
            } catch (error) {
                console.error('Failed to load state:', error);
            }

            setLoading(false);
        }
        load();
    }, []);

    const handleLock = async () => {
        try {
            await chrome.runtime.sendMessage({ action: 'lock' });
            window.close();
        } catch (error) {
            console.error('Failed to lock:', error);
        }
    };

    const openSettings = () => {
        chrome.runtime.openOptionsPage();
        window.close();
    };

    if (loading) {
        return (
            <div className="popup-container flex items-center justify-center bg-slate-900">
                <div className="spinner"></div>
            </div>
        );
    }

    const needsSetup = !hasPassword;

    return (
        <div className="popup-container bg-slate-900 text-white p-4">
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                </div>
                <div>
                    <h1 className="text-lg font-bold">Browser Lock</h1>
                    <p className="text-xs text-slate-400">
                        {isLocked ? (
                            <span className="text-red-400">🔒 Locked</span>
                        ) : isActive ? (
                            <span className="text-green-400">✓ Active</span>
                        ) : (
                            <span className="text-yellow-400">⚠ Disabled</span>
                        )}
                    </p>
                </div>
            </div>

            {needsSetup ? (
                /* Setup prompt */
                <div className="text-center py-4">
                    <p className="text-slate-400 text-sm mb-4">
                        Set up a password to start protecting your browser
                    </p>
                    <button
                        onClick={openSettings}
                        className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-medium transition-colors"
                    >
                        Set Up Password
                    </button>
                </div>
            ) : (
                /* Main controls */
                <div className="space-y-3">
                    {!isLocked && (
                        <button
                            onClick={handleLock}
                            disabled={!isActive}
                            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-700 disabled:cursor-not-allowed rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                            Lock Now
                        </button>
                    )}

                    {isLocked && (
                        <div className="text-center py-2 text-slate-400 text-sm">
                            Browser is currently locked.
                            <br />
                            Enter your password in the lock screen.
                        </div>
                    )}

                    <button
                        onClick={openSettings}
                        className="w-full py-2 px-4 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Settings
                    </button>

                    {/* Quick info */}
                    <div className="text-xs text-slate-500 text-center pt-2 border-t border-slate-800">
                        <span className="flex items-center justify-center gap-1">
                            <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-400">Ctrl</kbd>
                            <span>+</span>
                            <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-400">M</kbd>
                            <span className="ml-1">to lock</span>
                        </span>
                    </div>
                </div>
            )}

            {/* Footer */}
            <p className="text-center text-xs text-slate-600 mt-4">
                v{chrome.runtime.getManifest().version}
            </p>
        </div>
    );
}

// ============================================
// Browser Lock - Options Page (Futuristic Design)
// ============================================

import { useState, useEffect } from 'react';
import { getSettings, saveSettings } from '../shared/storage';
import type { Settings } from '../shared/types';
import {
    PasswordSettings,
    GeneralSettings,
    IdleModeSettings,
    AutoLockSettings,
    ShortcutSettings,
    QuarantineSettings,
} from './sections';

// Icons as components
const SettingsIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
);

const PasswordIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
    </svg>
);

const CloseIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
);

type TabType = 'settings' | 'password';

export default function OptionsPage() {
    const [settings, setSettings] = useState<Settings | null>(null);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [activeTab, setActiveTab] = useState<TabType>('settings');

    // Show temporary message
    const showMessage = (type: 'success' | 'error', text: string) => {
        setMessage({ type, text });
        setTimeout(() => setMessage(null), 3000);
    };

    // Load settings on mount
    useEffect(() => {
        async function load() {
            try {
                const s = await getSettings();
                setSettings(s);
            } catch {
                console.error('Failed to load settings');
                showMessage('error', 'Failed to load settings');
            }
            setLoading(false);
        }
        load();
    }, []);

    // Save settings and update local state
    const handleSave = async (updates: Partial<Settings>) => {
        if (!settings) return;

        try {
            const updated = { ...settings, ...updates };

            // Deep merge for nested objects
            if (updates.idleMode) {
                updated.idleMode = { ...settings.idleMode, ...updates.idleMode };
            }
            if (updates.autoLock) {
                updated.autoLock = { ...settings.autoLock, ...updates.autoLock };
            }
            if (updates.shortcutLock) {
                updated.shortcutLock = { ...settings.shortcutLock, ...updates.shortcutLock };
            }
            if (updates.quarantineMode) {
                updated.quarantineMode = { ...settings.quarantineMode, ...updates.quarantineMode };
                if (updates.quarantineMode.clearOptions) {
                    updated.quarantineMode.clearOptions = {
                        ...settings.quarantineMode.clearOptions,
                        ...updates.quarantineMode.clearOptions,
                    };
                }
            }

            await saveSettings(updated);
            setSettings(updated);
        } catch (error) {
            console.error('Failed to save settings:', error);
            showMessage('error', 'Failed to save settings');
        }
    };

    // Toggle master switch
    const handleActiveToggle = async (active: boolean) => {
        await handleSave({ active });
        showMessage('success', active ? 'Browser Lock enabled' : 'Browser Lock disabled');
    };

    if (loading) {
        return (
            <div className="settings-layout" style={{ alignItems: 'center', justifyContent: 'center' }}>
                <div className="spinner" style={{ width: 40, height: 40 }}></div>
            </div>
        );
    }

    if (!settings) {
        return (
            <div className="settings-layout" style={{ alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                <p>Failed to load settings. Please refresh the page.</p>
            </div>
        );
    }

    const hasPassword = !!settings.passwordHash;

    return (
        <div className="settings-layout">
            {/* Sidebar */}
            <aside className="settings-sidebar">
                <nav className="sidebar-nav">
                    <button
                        className={`sidebar-item ${activeTab === 'settings' ? 'active' : ''}`}
                        onClick={() => setActiveTab('settings')}
                    >
                        <SettingsIcon />
                        <span>Settings</span>
                    </button>
                    <button
                        className={`sidebar-item ${activeTab === 'password' ? 'active' : ''}`}
                        onClick={() => setActiveTab('password')}
                    >
                        <PasswordIcon />
                        <span>Change Password</span>
                    </button>
                </nav>
                <div className="sidebar-version">
                    v{chrome.runtime.getManifest().version}
                </div>
            </aside>

            {/* Main Content */}
            <main className="settings-main">
                {/* Header */}
                <header className="settings-header">
                    <h1 className="settings-title">BrowserLock</h1>
                    <button
                        onClick={() => window.close()}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--color-text-secondary)',
                            cursor: 'pointer',
                            padding: '0.5rem',
                            borderRadius: '8px',
                            transition: 'all 0.2s'
                        }}
                    >
                        <CloseIcon />
                    </button>
                </header>

                {/* Content */}
                <div className="settings-content">
                    {/* Message Toast */}
                    {message && (
                        <div
                            style={{
                                marginBottom: '1rem',
                                padding: '1rem',
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                background: message.type === 'success'
                                    ? 'rgba(16, 185, 129, 0.15)'
                                    : 'rgba(239, 68, 68, 0.15)',
                                border: `1px solid ${message.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                                color: message.type === 'success' ? '#10b981' : '#f87171'
                            }}
                        >
                            {message.type === 'success' ? '✓' : '✕'}
                            <span>{message.text}</span>
                        </div>
                    )}

                    {activeTab === 'settings' && (
                        <>
                            {/* Master Toggle */}
                            <div className="section-card" style={{
                                background: 'linear-gradient(135deg, rgba(88, 101, 242, 0.1) 0%, rgba(124, 58, 237, 0.1) 100%)',
                                borderColor: 'rgba(88, 101, 242, 0.3)'
                            }}>
                                <div className="section-header">
                                    <div className="section-title">
                                        BrowserLock
                                        <span className="help-icon">?</span>
                                    </div>
                                    <button
                                        onClick={() => handleActiveToggle(!settings.active)}
                                        disabled={!hasPassword}
                                        className={`toggle-switch ${settings.active ? 'active' : ''}`}
                                        style={{ opacity: hasPassword ? 1 : 0.5 }}
                                    />
                                </div>
                                <p className="section-description">
                                    {settings.active
                                        ? hasPassword
                                            ? '✓ Protection active'
                                            : '⚠ Set a password to enable protection'
                                        : 'Protection disabled'}
                                </p>
                            </div>

                            {/* Only show other settings if password is set */}
                            {hasPassword && (
                                <>
                                    {/* Auto Lock */}
                                    <AutoLockSettings settings={settings} onSave={handleSave} />

                                    {/* Quarantine Mode */}
                                    <QuarantineSettings
                                        settings={settings}
                                        onSave={handleSave}
                                        onShowMessage={showMessage}
                                    />

                                    {/* Quick Lock / Keyboard Shortcut */}
                                    <ShortcutSettings settings={settings} onSave={handleSave} />

                                    {/* Idle Mode */}
                                    <IdleModeSettings settings={settings} onSave={handleSave} />

                                    {/* Appearance */}
                                    <GeneralSettings settings={settings} onSave={handleSave} />
                                </>
                            )}
                        </>
                    )}

                    {activeTab === 'password' && (
                        <PasswordSettings
                            settings={settings}
                            onSave={handleSave}
                            onShowMessage={showMessage}
                        />
                    )}
                </div>
            </main>
        </div>
    );
}

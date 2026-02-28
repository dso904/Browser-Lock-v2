// ============================================
// Browser Lock - Options Page (NEXUS PROTOCOL)
// ============================================

import { useState, useEffect } from 'react';
import { getSettings, saveSettings } from '../shared/storage';
import { hashPassword, generateRecoveryCode, normalizeRecoveryCode } from '../shared/crypto';
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

// Detect setup mode from URL
const isSetupMode = new URLSearchParams(window.location.search).has('setup');

export default function OptionsPage() {
    const [settings, setSettings] = useState<Settings | null>(null);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [activeTab, setActiveTab] = useState<TabType>('settings');

    // Setup mode state
    const [showSetup, setShowSetup] = useState(isSetupMode);
    const [setupPassword, setSetupPassword] = useState('');
    const [setupConfirm, setSetupConfirm] = useState('');
    const [setupSaving, setSetupSaving] = useState(false);
    const [setupError, setSetupError] = useState('');
    const [setupRecoveryCode, setSetupRecoveryCode] = useState<string | null>(null);

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
                // If password is already set, skip setup mode
                if (s.passwordHash && isSetupMode) {
                    setShowSetup(false);
                }
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

    // Setup mode: handle password creation
    const handleSetupSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSetupError('');

        if (setupPassword.length < 4) {
            setSetupError('Password must be at least 4 characters');
            return;
        }
        if (setupPassword !== setupConfirm) {
            setSetupError('Passwords do not match');
            return;
        }

        setSetupSaving(true);
        try {
            const code = generateRecoveryCode();
            const normalizedCode = normalizeRecoveryCode(code);
            const passwordHash = await hashPassword(setupPassword);
            const recoveryCodeHash = await hashPassword(normalizedCode);

            await saveSettings({
                passwordHash,
                recoveryCodeHash,
                active: true,
            });

            // Refresh settings in state
            const updated = await getSettings();
            setSettings(updated);

            setSetupRecoveryCode(code);
        } catch (error) {
            console.error('Failed to set password:', error);
            setSetupError('Failed to set password. Please try again.');
        } finally {
            setSetupSaving(false);
        }
    };

    // ── Loading state ──
    if (loading) {
        return (
            <div className="settings-layout" style={{ alignItems: 'center', justifyContent: 'center' }}>
                <div className="spinner" style={{ width: 40, height: 40 }}></div>
            </div>
        );
    }

    if (!settings) {
        return (
            <div className="settings-layout" style={{
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--nx-text)',
                fontFamily: 'var(--nx-font-body)',
            }}>
                <p>Failed to load settings. Please refresh the page.</p>
            </div>
        );
    }

    // ═══════════════════════════════════════════
    // SETUP MODE — First-time password creation
    // ═══════════════════════════════════════════
    if (showSetup) {
        return (
            <div style={{
                minHeight: '100vh',
                background: 'var(--nx-void)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden',
            }}>
                {/* Ambient orbs */}
                <div className="orb orb-1" />
                <div className="orb orb-2" />
                <div className="orb orb-3" />

                {/* Scan overlay */}
                <div className="scan-overlay" />

                {/* Main setup card */}
                <div style={{
                    position: 'relative',
                    zIndex: 2,
                    width: '100%',
                    maxWidth: '520px',
                    padding: '0 1.5rem',
                    animation: 'fade-in-up 0.6s ease both',
                }}>
                    {/* Recovery code modal (after password is set) */}
                    {setupRecoveryCode ? (
                        <div className="section-card" style={{
                            background: 'var(--nx-glass)',
                            backdropFilter: 'blur(20px)',
                            border: '1px solid var(--nx-glass-border)',
                            boxShadow: '0 0 60px rgba(0, 240, 255, 0.08)',
                            padding: '2.5rem 2rem',
                            textAlign: 'center',
                        }}>
                            {/* Success icon */}
                            <div style={{
                                width: 64,
                                height: 64,
                                margin: '0 auto 1.5rem',
                                borderRadius: '50%',
                                background: 'rgba(0, 212, 170, 0.1)',
                                border: '2px solid var(--nx-success)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 0 20px var(--nx-success-glow)',
                                animation: 'nx-breathe 3s ease-in-out infinite',
                            }}>
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--nx-success)" strokeWidth="2.5">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                            </div>

                            <h2 style={{
                                fontFamily: 'var(--nx-font-display)',
                                fontSize: '1.1rem',
                                fontWeight: 700,
                                letterSpacing: '0.12em',
                                textTransform: 'uppercase' as const,
                                color: 'var(--nx-success)',
                                textShadow: '0 0 12px var(--nx-success-glow)',
                                marginBottom: '0.75rem',
                            }}>
                                Protocol Activated
                            </h2>

                            <p style={{
                                color: 'var(--nx-text-dim)',
                                fontFamily: 'var(--nx-font-body)',
                                fontSize: '0.9375rem',
                                lineHeight: 1.6,
                                letterSpacing: '0.02em',
                                marginBottom: '1.5rem',
                            }}>
                                Save this recovery code in a safe place. You'll need it if you forget your password.
                            </p>

                            {/* Recovery code display */}
                            <div style={{
                                background: 'rgba(0, 240, 255, 0.04)',
                                padding: '1.25rem',
                                borderRadius: '12px',
                                border: '1px solid rgba(0, 240, 255, 0.15)',
                                boxShadow: '0 0 20px rgba(0, 240, 255, 0.05)',
                                marginBottom: '1.25rem',
                            }}>
                                <code style={{
                                    fontSize: '1.5rem',
                                    fontFamily: 'var(--nx-font-mono)',
                                    color: 'var(--nx-cyan)',
                                    letterSpacing: '0.15em',
                                    userSelect: 'all',
                                    textShadow: '0 0 10px var(--nx-cyan-glow)',
                                }}>
                                    {setupRecoveryCode}
                                </code>
                            </div>

                            <p style={{
                                fontSize: '0.8125rem',
                                fontFamily: 'var(--nx-font-body)',
                                color: 'var(--nx-error)',
                                textShadow: '0 0 6px var(--nx-error-glow)',
                                marginBottom: '1.5rem',
                                letterSpacing: '0.03em',
                            }}>
                                ⚠ This code will only be shown once
                            </p>

                            <button
                                className="nx-btn"
                                onClick={() => {
                                    setShowSetup(false);
                                    // Clean URL
                                    window.history.replaceState({}, '', window.location.pathname);
                                }}
                                style={{
                                    width: '100%',
                                    padding: '0.9rem',
                                    fontFamily: 'var(--nx-font-display)',
                                    fontSize: '0.8rem',
                                    fontWeight: 700,
                                    letterSpacing: '0.12em',
                                    textTransform: 'uppercase' as const,
                                    border: 'none',
                                    borderRadius: '10px',
                                    cursor: 'pointer',
                                    background: 'linear-gradient(135deg, var(--nx-cyan), var(--nx-magenta))',
                                    color: '#fff',
                                    transition: 'all 0.3s',
                                    boxShadow: '0 0 20px rgba(0, 240, 255, 0.15)',
                                }}
                            >
                                I've Saved My Recovery Code
                            </button>
                        </div>
                    ) : (
                        /* Password creation form */
                        <div className="section-card" style={{
                            background: 'var(--nx-glass)',
                            backdropFilter: 'blur(20px)',
                            border: '1px solid var(--nx-glass-border)',
                            boxShadow: '0 0 60px rgba(0, 240, 255, 0.08)',
                            padding: '2.5rem 2rem',
                        }}>
                            {/* Shield icon */}
                            <div style={{
                                width: 60,
                                height: 60,
                                margin: '0 auto 1.5rem',
                                borderRadius: '50%',
                                background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.08), rgba(180, 0, 255, 0.08))',
                                border: '2px solid rgba(0, 240, 255, 0.3)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 0 30px rgba(0, 240, 255, 0.1)',
                                animation: 'nx-breathe 3s ease-in-out infinite',
                            }}>
                                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--nx-cyan)" strokeWidth="2">
                                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                                </svg>
                            </div>

                            <h1 style={{
                                fontFamily: 'var(--nx-font-display)',
                                fontSize: '1.15rem',
                                fontWeight: 700,
                                letterSpacing: '0.12em',
                                textTransform: 'uppercase' as const,
                                textAlign: 'center',
                                background: 'linear-gradient(135deg, var(--nx-cyan), var(--nx-magenta))',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                marginBottom: '0.5rem',
                            }}>
                                Initialize Protocol
                            </h1>

                            <p style={{
                                textAlign: 'center',
                                color: 'var(--nx-text-dim)',
                                fontFamily: 'var(--nx-font-body)',
                                fontSize: '0.875rem',
                                letterSpacing: '0.02em',
                                lineHeight: 1.6,
                                marginBottom: '2rem',
                            }}>
                                Create a master password to activate browser protection.
                            </p>

                            <form onSubmit={handleSetupSubmit}>
                                <div style={{ marginBottom: '1rem' }}>
                                    <label style={{
                                        display: 'block',
                                        fontFamily: 'var(--nx-font-body)',
                                        fontSize: '0.8125rem',
                                        color: 'var(--nx-text-dim)',
                                        letterSpacing: '0.04em',
                                        marginBottom: '0.5rem',
                                    }}>
                                        Master Password
                                    </label>
                                    <input
                                        type="password"
                                        value={setupPassword}
                                        onChange={(e) => setSetupPassword(e.target.value)}
                                        placeholder="Minimum 4 characters"
                                        autoFocus
                                        style={{
                                            width: '100%',
                                            padding: '0.75rem 1rem',
                                            background: 'rgba(0, 240, 255, 0.03)',
                                            border: '1px solid var(--nx-border)',
                                            borderRadius: '8px',
                                            color: 'var(--nx-text-bright)',
                                            fontFamily: 'var(--nx-font-body)',
                                            fontSize: '0.9375rem',
                                            letterSpacing: '0.04em',
                                            outline: 'none',
                                            transition: 'all 0.3s',
                                            boxSizing: 'border-box',
                                        }}
                                        onFocus={(e) => {
                                            e.currentTarget.style.borderColor = 'var(--nx-cyan)';
                                            e.currentTarget.style.boxShadow = '0 0 12px var(--nx-cyan-glow)';
                                        }}
                                        onBlur={(e) => {
                                            e.currentTarget.style.borderColor = 'var(--nx-border)';
                                            e.currentTarget.style.boxShadow = 'none';
                                        }}
                                    />
                                </div>

                                <div style={{ marginBottom: '1.5rem' }}>
                                    <label style={{
                                        display: 'block',
                                        fontFamily: 'var(--nx-font-body)',
                                        fontSize: '0.8125rem',
                                        color: 'var(--nx-text-dim)',
                                        letterSpacing: '0.04em',
                                        marginBottom: '0.5rem',
                                    }}>
                                        Confirm Password
                                    </label>
                                    <input
                                        type="password"
                                        value={setupConfirm}
                                        onChange={(e) => setSetupConfirm(e.target.value)}
                                        placeholder="Re-enter your password"
                                        style={{
                                            width: '100%',
                                            padding: '0.75rem 1rem',
                                            background: 'rgba(0, 240, 255, 0.03)',
                                            border: '1px solid var(--nx-border)',
                                            borderRadius: '8px',
                                            color: 'var(--nx-text-bright)',
                                            fontFamily: 'var(--nx-font-body)',
                                            fontSize: '0.9375rem',
                                            letterSpacing: '0.04em',
                                            outline: 'none',
                                            transition: 'all 0.3s',
                                            boxSizing: 'border-box',
                                        }}
                                        onFocus={(e) => {
                                            e.currentTarget.style.borderColor = 'var(--nx-cyan)';
                                            e.currentTarget.style.boxShadow = '0 0 12px var(--nx-cyan-glow)';
                                        }}
                                        onBlur={(e) => {
                                            e.currentTarget.style.borderColor = 'var(--nx-border)';
                                            e.currentTarget.style.boxShadow = 'none';
                                        }}
                                    />
                                </div>

                                {setupError && (
                                    <div className="nx-alert nx-alert--error" style={{
                                        marginBottom: '1rem',
                                        animation: 'fade-in-up 0.3s ease both',
                                    }}>
                                        {setupError}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={setupSaving}
                                    style={{
                                        width: '100%',
                                        padding: '0.9rem',
                                        fontFamily: 'var(--nx-font-display)',
                                        fontSize: '0.8rem',
                                        fontWeight: 700,
                                        letterSpacing: '0.12em',
                                        textTransform: 'uppercase' as const,
                                        border: 'none',
                                        borderRadius: '10px',
                                        cursor: setupSaving ? 'wait' : 'pointer',
                                        background: setupSaving
                                            ? 'rgba(0, 240, 255, 0.15)'
                                            : 'linear-gradient(135deg, var(--nx-cyan), var(--nx-magenta))',
                                        color: '#fff',
                                        transition: 'all 0.3s',
                                        boxShadow: setupSaving ? 'none' : '0 0 20px rgba(0, 240, 255, 0.15)',
                                        opacity: setupSaving ? 0.7 : 1,
                                    }}
                                >
                                    {setupSaving ? 'Initializing...' : 'Activate Protocol'}
                                </button>
                            </form>

                            {/* HUD footer */}
                            <div style={{
                                marginTop: '1.5rem',
                                textAlign: 'center',
                                fontFamily: 'var(--nx-font-mono)',
                                fontSize: '0.6875rem',
                                color: 'var(--nx-text-muted)',
                                letterSpacing: '0.15em',
                                textTransform: 'uppercase' as const,
                            }}>
                                NEXUS PROTOCOL v{chrome.runtime.getManifest().version}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // ═══════════════════════════════════════════
    // NORMAL MODE — Standard settings page
    // ═══════════════════════════════════════════

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
                    NEXUS v{chrome.runtime.getManifest().version}
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
                            border: '1px solid var(--nx-border)',
                            color: 'var(--nx-text-dim)',
                            cursor: 'pointer',
                            padding: '0.4rem',
                            borderRadius: '8px',
                            transition: 'all 0.3s',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = 'var(--nx-error)';
                            e.currentTarget.style.color = 'var(--nx-error)';
                            e.currentTarget.style.boxShadow = '0 0 10px var(--nx-error-glow)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'var(--nx-border)';
                            e.currentTarget.style.color = 'var(--nx-text-dim)';
                            e.currentTarget.style.boxShadow = 'none';
                        }}
                    >
                        <CloseIcon />
                    </button>
                </header>

                {/* Content */}
                <div className="settings-content">
                    {/* Message Toast */}
                    {message && (
                        <div className={`nx-alert ${message.type === 'success' ? 'nx-alert--success' : 'nx-alert--error'}`}
                            style={{
                                marginBottom: '1rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                animation: 'fade-in-up 0.3s ease both',
                            }}
                        >
                            <span style={{
                                fontFamily: 'var(--nx-font-mono)',
                                fontSize: '1rem',
                            }}>
                                {message.type === 'success' ? '✓' : '✕'}
                            </span>
                            <span style={{ fontFamily: 'var(--nx-font-body)', letterSpacing: '0.03em' }}>
                                {message.text}
                            </span>
                        </div>
                    )}

                    {activeTab === 'settings' && (
                        <>
                            {/* Master Toggle */}
                            <div className="section-card" style={{
                                background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.06) 0%, rgba(180, 0, 255, 0.06) 50%, rgba(255, 45, 124, 0.03) 100%)',
                                borderColor: 'rgba(0, 240, 255, 0.15)',
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
                                            ? <>
                                                <span style={{ color: 'var(--nx-success)' }}>◆</span>
                                                {' '}Protection protocol active
                                            </>
                                            : <>
                                                <span style={{ color: 'var(--nx-warning)' }}>◆</span>
                                                {' '}Set a password to enable protection
                                            </>
                                        : <>
                                            <span style={{ color: 'var(--nx-text-muted)' }}>◆</span>
                                            {' '}Protection protocol disabled
                                        </>}
                                </p>
                            </div>

                            {/* Only show other settings if password is set */}
                            {hasPassword && (
                                <>
                                    <AutoLockSettings settings={settings} onSave={handleSave} />
                                    <QuarantineSettings
                                        settings={settings}
                                        onSave={handleSave}
                                        onShowMessage={showMessage}
                                    />
                                    <ShortcutSettings settings={settings} onSave={handleSave} />
                                    <IdleModeSettings settings={settings} onSave={handleSave} />
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

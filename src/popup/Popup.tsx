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
            <div className="popup-container" style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}>
                <div className="spinner" style={{ width: 28, height: 28 }}></div>
            </div>
        );
    }

    const needsSetup = !hasPassword;

    return (
        <div className="popup-container" style={{ padding: '1.25rem', position: 'relative' }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                marginBottom: '1.25rem',
                position: 'relative',
                zIndex: 1,
            }}>
                <div style={{
                    width: 40,
                    height: 40,
                    background: 'rgba(0, 240, 255, 0.08)',
                    border: '1.5px solid rgba(0, 240, 255, 0.2)',
                    borderRadius: 10,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 0 15px rgba(0, 240, 255, 0.08)',
                }}>
                    <svg style={{ width: 22, height: 22, color: 'var(--nx-cyan)', filter: 'drop-shadow(0 0 4px var(--nx-cyan-glow))' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                </div>
                <div>
                    <h1 style={{
                        fontFamily: 'var(--nx-font-display)',
                        fontSize: '0.9rem',
                        fontWeight: 700,
                        letterSpacing: '0.15em',
                        textTransform: 'uppercase' as const,
                        color: 'var(--nx-text-bright)',
                        margin: 0,
                    }}>Browser Lock</h1>
                    <p style={{
                        fontSize: '0.7rem',
                        fontFamily: 'var(--nx-font-mono)',
                        letterSpacing: '0.08em',
                        margin: 0,
                        marginTop: 2,
                    }}>
                        {isLocked ? (
                            <span style={{ color: 'var(--nx-error)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                <span className="nx-status-dot nx-status-dot--locked" />
                                LOCKED
                            </span>
                        ) : isActive ? (
                            <span style={{ color: 'var(--nx-success)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                <span className="nx-status-dot nx-status-dot--active" />
                                ACTIVE
                            </span>
                        ) : (
                            <span style={{ color: 'var(--nx-warning)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                <span className="nx-status-dot nx-status-dot--disabled" />
                                DISABLED
                            </span>
                        )}
                    </p>
                </div>
            </div>

            {needsSetup ? (
                /* Setup prompt */
                <div style={{ textAlign: 'center', padding: '0.75rem 0', position: 'relative', zIndex: 1 }}>
                    <p style={{
                        color: 'var(--nx-text-dim)',
                        fontFamily: 'var(--nx-font-body)',
                        fontSize: '0.8125rem',
                        marginBottom: '1rem',
                        letterSpacing: '0.03em',
                    }}>
                        Set up a password to initialize protection protocol
                    </p>
                    <button
                        onClick={openSettings}
                        style={{
                            width: '100%',
                            padding: '0.7rem',
                            background: 'var(--nx-grad-button)',
                            backgroundSize: '200% auto',
                            border: '1px solid rgba(0, 240, 255, 0.15)',
                            borderRadius: 10,
                            fontFamily: 'var(--nx-font-display)',
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            letterSpacing: '0.15em',
                            textTransform: 'uppercase' as const,
                            color: 'var(--nx-text-bright)',
                            cursor: 'pointer',
                            transition: 'all 0.3s var(--nx-ease)',
                        }}
                    >
                        Initialize Setup
                    </button>
                </div>
            ) : (
                /* Main controls */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', position: 'relative', zIndex: 1 }}>
                    {!isLocked && (
                        <button
                            onClick={handleLock}
                            disabled={!isActive}
                            className="nx-btn"
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                background: isActive ? 'var(--nx-grad-button)' : 'rgba(30, 15, 60, 0.5)',
                                backgroundSize: '200% auto',
                                border: isActive ? '1px solid rgba(0, 240, 255, 0.15)' : '1px solid var(--nx-border)',
                                color: isActive ? 'var(--nx-text-bright)' : 'var(--nx-text-muted)',
                                fontSize: '0.75rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem',
                                opacity: isActive ? 1 : 0.5,
                                cursor: isActive ? 'pointer' : 'not-allowed',
                            }}
                        >
                            <svg style={{ width: 18, height: 18 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                            Engage Lock
                        </button>
                    )}

                    {isLocked && (
                        <div style={{
                            textAlign: 'center',
                            padding: '0.5rem',
                            color: 'var(--nx-text-dim)',
                            fontFamily: 'var(--nx-font-body)',
                            fontSize: '0.8125rem',
                            letterSpacing: '0.03em',
                        }}>
                            Protocol active.
                            <br />
                            <span style={{ color: 'var(--nx-text-muted)', fontSize: '0.75rem' }}>
                                Authenticate via lock screen.
                            </span>
                        </div>
                    )}

                    <button
                        onClick={openSettings}
                        style={{
                            width: '100%',
                            padding: '0.6rem',
                            background: 'var(--nx-glass)',
                            backdropFilter: 'blur(10px)',
                            border: '1px solid var(--nx-glass-border)',
                            borderRadius: 10,
                            fontFamily: 'var(--nx-font-body)',
                            fontSize: '0.8125rem',
                            fontWeight: 600,
                            letterSpacing: '0.06em',
                            color: 'var(--nx-text-dim)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                            transition: 'all 0.3s',
                        }}
                    >
                        <svg style={{ width: 15, height: 15 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Control Panel
                    </button>

                    {/* Quick info — HUD keyboard shortcut */}
                    <div style={{
                        textAlign: 'center',
                        paddingTop: '0.625rem',
                        borderTop: '1px solid var(--nx-border)',
                        fontFamily: 'var(--nx-font-mono)',
                        fontSize: '0.6875rem',
                        color: 'var(--nx-text-muted)',
                        letterSpacing: '0.08em',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 4,
                    }}>
                        <span style={{
                            padding: '2px 6px',
                            background: 'rgba(0, 240, 255, 0.06)',
                            border: '1px solid rgba(0, 240, 255, 0.12)',
                            borderRadius: 4,
                            color: 'var(--nx-cyan)',
                            fontSize: '0.625rem',
                        }}>Ctrl</span>
                        <span>+</span>
                        <span style={{
                            padding: '2px 6px',
                            background: 'rgba(0, 240, 255, 0.06)',
                            border: '1px solid rgba(0, 240, 255, 0.12)',
                            borderRadius: 4,
                            color: 'var(--nx-cyan)',
                            fontSize: '0.625rem',
                        }}>M</span>
                        <span style={{ marginLeft: 4 }}>to lock</span>
                    </div>
                </div>
            )}

            {/* Footer */}
            <p style={{
                textAlign: 'center',
                fontFamily: 'var(--nx-font-mono)',
                fontSize: '0.5625rem',
                color: 'var(--nx-text-muted)',
                letterSpacing: '0.15em',
                textTransform: 'uppercase' as const,
                marginTop: '0.875rem',
                marginBottom: 0,
                position: 'relative',
                zIndex: 1,
                opacity: 0.6,
            }}>
                NEXUS v{chrome.runtime.getManifest().version}
            </p>
        </div>
    );
}

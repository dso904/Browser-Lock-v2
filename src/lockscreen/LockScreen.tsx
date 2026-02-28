import { useState, useEffect, useRef } from 'react'

// Message types for communication with background
type UnlockResponse = {
    success: boolean;
    error?: string;
    remainingAttempts?: number;
};

type StateResponse = {
    state: {
        locked: boolean;
        failedAttempts: number;
        hardLockedUntil: number | null;
    };
};

type SettingsResponse = {
    settings: {
        quarantineMode: {
            active: boolean;
            maxAttempts: number;
        };
    };
};

export default function LockScreen() {
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [error, setError] = useState('')
    const [shake, setShake] = useState(false)
    const [loading, setLoading] = useState(true)
    const [unlocking, setUnlocking] = useState(false)
    const [useRecoveryCode, setUseRecoveryCode] = useState(false)
    const [failedAttempts, setFailedAttempts] = useState(0)
    const [maxAttempts, setMaxAttempts] = useState<number | null>(null)
    const [hardLockedUntil, setHardLockedUntil] = useState<number | null>(null)

    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        async function load() {
            try {
                // Get current state from background
                const stateRes = await chrome.runtime.sendMessage({ action: 'getState' }) as StateResponse;
                const settingsRes = await chrome.runtime.sendMessage({ action: 'getSettings' }) as SettingsResponse;

                if (stateRes?.state) {
                    setFailedAttempts(stateRes.state.failedAttempts || 0);
                    setHardLockedUntil(stateRes.state.hardLockedUntil);
                }

                if (settingsRes?.settings?.quarantineMode?.active) {
                    setMaxAttempts(settingsRes.settings.quarantineMode.maxAttempts);
                }
            } catch (err) {
                console.error('Failed to load state:', err);
            }

            setLoading(false);
            setTimeout(() => inputRef.current?.focus(), 100);
        }
        load();
    }, []);

    const triggerShake = () => {
        setShake(true);
        setTimeout(() => setShake(false), 500);
    };

    const handleUnlock = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!password.trim()) return;

        setUnlocking(true);
        setError('');

        try {
            const response = await chrome.runtime.sendMessage({
                action: 'unlock',
                password: password,
                isRecoveryCode: useRecoveryCode,
            }) as UnlockResponse;

            if (response.success) {
                // Unlock successful - window will be closed by background
                setPassword('');
            } else {
                // Failed
                setError(response.error || 'Wrong password');

                if (response.remainingAttempts !== undefined) {
                    setFailedAttempts((maxAttempts || 5) - response.remainingAttempts);
                } else {
                    setFailedAttempts(prev => prev + 1);
                }

                triggerShake();
                setPassword('');
                inputRef.current?.focus();
            }
        } catch (err) {
            console.error('Unlock error:', err);
            setError('An error occurred. Please try again.');
        } finally {
            setUnlocking(false);
        }
    };

    // Check for hard lock (quarantine)
    const isHardLocked = hardLockedUntil && Date.now() < hardLockedUntil;
    const hardLockRemaining = isHardLocked
        ? Math.ceil((hardLockedUntil - Date.now()) / 60000)
        : 0;

    if (loading) {
        return (
            <div className="lockscreen-container">
                <div className="spinner" style={{ width: 40, height: 40 }}></div>
            </div>
        );
    }

    return (
        <div className="lockscreen-container">
            {/* Floating Ambient Orbs */}
            <div className="orb orb--cyan" style={{ width: 300, height: 300, top: '-5%', left: '10%' }} />
            <div className="orb orb--magenta" style={{ width: 250, height: 250, bottom: '5%', right: '5%' }} />
            <div className="orb orb--pink" style={{ width: 200, height: 200, top: '40%', right: '25%' }} />

            {/* Subtle Scan-line Overlay */}
            <div className="scan-overlay" />

            {/* Holographic Lock Emblem */}
            <div className="shield-icon" style={{ animationDelay: '0s' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    {/* Shield shape */}
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    {/* Keyhole */}
                    <circle cx="12" cy="10" r="2" fill="currentColor" />
                    <path d="M12 12v4" strokeWidth="2" strokeLinecap="round" />
                </svg>
            </div>

            {/* Title */}
            <h1 className="lock-title">
                <span className="white">This Browser </span>
                <span className="accent">Locked</span>
            </h1>

            {/* Error/Warning Messages */}
            {failedAttempts > 0 && !isHardLocked && (
                <div className="nx-alert nx-alert--error" style={{
                    marginBottom: '1.5rem',
                    maxWidth: 400,
                    width: '100%',
                    textAlign: 'center',
                    zIndex: 2,
                }}>
                    Failed attempts: {failedAttempts}
                    {maxAttempts && ` / ${maxAttempts}`}
                </div>
            )}

            {isHardLocked && (
                <div className="nx-alert nx-alert--error" style={{
                    marginBottom: '1.5rem',
                    maxWidth: 400,
                    width: '100%',
                    textAlign: 'center',
                    zIndex: 2,
                    fontWeight: 600,
                }}>
                    ⚠️ Too many failed attempts. Try again in {hardLockRemaining} minute(s).
                </div>
            )}

            {/* Password Section */}
            {!isHardLocked && (
                <div className="password-section">
                    <form onSubmit={handleUnlock} className={shake ? 'shake' : ''}>
                        {/* Label Row */}
                        <div className="password-label-row">
                            <label className="password-label">
                                {useRecoveryCode ? 'Recovery Code' : 'Your Browser Password'}
                            </label>
                            <button
                                type="button"
                                className="forgot-link"
                                onClick={() => {
                                    setUseRecoveryCode(!useRecoveryCode);
                                    setPassword('');
                                    setError('');
                                }}
                            >
                                {useRecoveryCode ? 'Use password' : 'Forgot your password?'}
                            </button>
                        </div>

                        {/* Input with Eye Toggle */}
                        <div style={{ position: 'relative' }}>
                            <input
                                ref={inputRef}
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="input-glow"
                                placeholder={useRecoveryCode ? 'XXXX-XXXX-XXXX' : ''}
                                autoFocus
                                disabled={unlocking}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="eye-toggle"
                            >
                                {showPassword ? (
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                                        <line x1="1" y1="1" x2="23" y2="23" />
                                    </svg>
                                ) : (
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                        <circle cx="12" cy="12" r="3" />
                                    </svg>
                                )}
                            </button>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div style={{
                                color: 'var(--nx-error)',
                                fontSize: '0.875rem',
                                textAlign: 'center',
                                marginTop: '0.75rem',
                                fontFamily: 'var(--nx-font-body)',
                                textShadow: '0 0 8px var(--nx-error-glow)',
                            }}>
                                {error}
                            </div>
                        )}

                        {/* Login Button */}
                        <button
                            type="submit"
                            disabled={unlocking || !password}
                            className="btn-login"
                        >
                            {unlocking ? (
                                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                                    <div className="spinner" style={{ width: 18, height: 18 }}></div>
                                    Authenticating...
                                </span>
                            ) : (
                                'Authenticate'
                            )}
                        </button>
                    </form>
                </div>
            )}

            {/* HUD Footer */}
            <div className="hud-footer">
                NEXUS PROTOCOL v{chrome.runtime.getManifest().version}
            </div>
        </div>
    );
}

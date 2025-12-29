// ============================================
// Password Settings Section (Futuristic Design)
// ============================================

import { useState } from 'react';
import { SectionCard, Button, TextInput } from '../components';
import { hashPassword, generateRecoveryCode, normalizeRecoveryCode, verifyPassword } from '../../shared/crypto';
import type { Settings } from '../../shared/types';

interface PasswordSettingsProps {
    settings: Settings;
    onSave: (updates: Partial<Settings>) => Promise<void>;
    onShowMessage: (type: 'success' | 'error', text: string) => void;
}

export function PasswordSettings({ settings, onSave, onShowMessage }: PasswordSettingsProps) {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [saving, setSaving] = useState(false);
    const [recoveryCode, setRecoveryCode] = useState<string | null>(null);

    const hasPassword = !!settings.passwordHash;

    const handleSetPassword = async (e: React.FormEvent) => {
        e.preventDefault();

        // If changing password, verify current password first
        if (hasPassword) {
            if (!currentPassword) {
                onShowMessage('error', 'Please enter your current password');
                return;
            }

            try {
                const isCurrentValid = await verifyPassword(currentPassword, settings.passwordHash!);
                if (!isCurrentValid) {
                    onShowMessage('error', 'Current password is incorrect');
                    return;
                }
            } catch (error) {
                console.error('Failed to verify current password:', error);
                onShowMessage('error', 'Failed to verify current password');
                return;
            }
        }

        // Validation
        if (newPassword.length < 4) {
            onShowMessage('error', 'Password must be at least 4 characters');
            return;
        }

        if (newPassword !== confirmPassword) {
            onShowMessage('error', 'Passwords do not match');
            return;
        }

        setSaving(true);
        try {
            // Generate new recovery code
            const code = generateRecoveryCode();
            const normalizedCode = normalizeRecoveryCode(code);

            // Hash password and recovery code
            const passwordHash = await hashPassword(newPassword);
            const recoveryCodeHash = await hashPassword(normalizedCode);

            // Save
            await onSave({
                passwordHash,
                recoveryCodeHash,
                active: true, // Enable protection when password is set
            });

            // Show recovery code
            setRecoveryCode(code);

            // Clear form
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');

            onShowMessage('success', hasPassword ? 'Password changed!' : 'Password set!');
        } catch (error) {
            console.error('Failed to set password:', error);
            onShowMessage('error', 'Failed to set password');
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <SectionCard
                title={hasPassword ? 'Change Password' : 'Set Password'}
            >
                <p style={{
                    color: 'var(--color-text-secondary)',
                    fontSize: '0.875rem',
                    marginBottom: '1.5rem'
                }}>
                    {hasPassword
                        ? 'Update your master password to keep your browser secure.'
                        : 'Create a password to start protecting your browser.'}
                </p>

                <form onSubmit={handleSetPassword}>
                    {hasPassword && (
                        <TextInput
                            label="Current Password"
                            type="password"
                            value={currentPassword}
                            onChange={setCurrentPassword}
                            placeholder="Enter current password"
                        />
                    )}

                    <TextInput
                        label="New Password"
                        type="password"
                        value={newPassword}
                        onChange={setNewPassword}
                        placeholder="Enter new password (min 4 characters)"
                    />

                    <TextInput
                        label="Confirm Password"
                        type="password"
                        value={confirmPassword}
                        onChange={setConfirmPassword}
                        placeholder="Confirm new password"
                    />

                    <div style={{ marginTop: '1rem' }}>
                        <Button type="submit" disabled={saving}>
                            {saving ? 'Saving...' : hasPassword ? 'Change Password' : 'Set Password'}
                        </Button>
                    </div>
                </form>
            </SectionCard>

            {/* Recovery Code Modal */}
            {recoveryCode && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0, 0, 0, 0.85)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 50,
                    padding: '1rem'
                }}>
                    <div style={{
                        background: 'var(--color-bg-card)',
                        borderRadius: '16px',
                        padding: '2rem',
                        maxWidth: '450px',
                        width: '100%',
                        border: '1px solid var(--color-border)'
                    }}>
                        <h2 style={{
                            fontSize: '1.25rem',
                            fontWeight: 700,
                            marginBottom: '1rem',
                            color: 'var(--color-success)'
                        }}>
                            ✓ Password {hasPassword ? 'Changed' : 'Set'} Successfully!
                        </h2>
                        <p style={{
                            color: 'var(--color-text-secondary)',
                            marginBottom: '1.5rem',
                            fontSize: '0.9375rem',
                            lineHeight: '1.6'
                        }}>
                            Save this recovery code in a safe place. You'll need it if you forget your password.
                        </p>
                        <div style={{
                            background: 'var(--color-bg-dark)',
                            padding: '1.5rem',
                            borderRadius: '12px',
                            textAlign: 'center',
                            marginBottom: '1.5rem',
                            border: '1px solid var(--color-border)'
                        }}>
                            <code style={{
                                fontSize: '1.5rem',
                                fontFamily: 'Monaco, Consolas, monospace',
                                color: '#fbbf24',
                                letterSpacing: '0.1em',
                                userSelect: 'all'
                            }}>
                                {recoveryCode}
                            </code>
                        </div>
                        <p style={{
                            fontSize: '0.875rem',
                            color: '#f87171',
                            marginBottom: '1.5rem',
                            textAlign: 'center'
                        }}>
                            ⚠️ This code will only be shown once!
                        </p>
                        <Button onClick={() => setRecoveryCode(null)}>
                            I've Saved My Recovery Code
                        </Button>
                    </div>
                </div>
            )}
        </>
    );
}

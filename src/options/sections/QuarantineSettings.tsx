// ============================================
// Quarantine Mode Settings Section (Futuristic Design)
// ============================================

import { useState } from 'react';
import { SectionCard, Slider, Checkbox, ToggleButtonGroup, NumberInput } from '../components';
import type { Settings } from '../../shared/types';

interface QuarantineSettingsProps {
    settings: Settings;
    onSave: (updates: Partial<Settings>) => Promise<void>;
    onShowMessage: (type: 'success' | 'error', text: string) => void;
}

export function QuarantineSettings({ settings, onSave, onShowMessage }: QuarantineSettingsProps) {
    const { quarantineMode } = settings;
    const [requestingPermission, setRequestingPermission] = useState(false);

    const handleToggle = async (active: boolean) => {
        if (active && quarantineMode.clearHistory) {
            // Need browsingData permission
            try {
                setRequestingPermission(true);
                const granted = await chrome.permissions.request({
                    permissions: ['browsingData'],
                });
                if (!granted) {
                    onShowMessage('error', 'Permission required to clear browsing data');
                    return;
                }
            } catch (error) {
                console.error('Failed to request permission:', error);
                onShowMessage('error', 'Failed to request permission');
                return;
            } finally {
                setRequestingPermission(false);
            }
        }

        await onSave({
            quarantineMode: { ...quarantineMode, active },
        });
    };

    const handleMaxAttemptsChange = async (maxAttempts: number) => {
        await onSave({
            quarantineMode: { ...quarantineMode, maxAttempts },
        });
    };

    const handleDurationChange = async (hardLockDuration: number) => {
        await onSave({
            quarantineMode: { ...quarantineMode, hardLockDuration },
        });
    };

    const handleClearHistoryToggle = async (value: string) => {
        const clearHistory = value === 'clear';

        if (clearHistory) {
            // Request browsingData permission
            try {
                setRequestingPermission(true);
                const granted = await chrome.permissions.request({
                    permissions: ['browsingData'],
                });
                if (!granted) {
                    onShowMessage('error', 'Permission required to clear browsing data');
                    return;
                }
            } catch (error) {
                console.error('Failed to request permission:', error);
                return;
            } finally {
                setRequestingPermission(false);
            }
        }

        await onSave({
            quarantineMode: { ...quarantineMode, clearHistory },
        });
    };

    const handleClearOptionChange = async (
        option: keyof typeof quarantineMode.clearOptions,
        checked: boolean
    ) => {
        await onSave({
            quarantineMode: {
                ...quarantineMode,
                clearOptions: {
                    ...quarantineMode.clearOptions,
                    [option]: checked,
                },
            },
        });
    };

    // Duration dot values for the slider
    const durationDots = [1, 5, 10, 15, 20, 25, 30];

    return (
        <SectionCard
            title="Quarantine Mode"
            toggle={{
                checked: quarantineMode.active,
                onChange: handleToggle,
                disabled: requestingPermission
            }}
        >
            {quarantineMode.active && (
                <>
                    {/* Locked Duration Title */}
                    <div style={{ marginBottom: '1.5rem' }}>
                        <h3 style={{
                            color: 'var(--color-text-primary)',
                            fontWeight: 600,
                            fontSize: '1rem',
                            marginBottom: '0.5rem'
                        }}>
                            Locked Duration ({quarantineMode.hardLockDuration} minutes)
                        </h3>
                        <p style={{
                            color: 'var(--color-text-secondary)',
                            fontSize: '0.875rem',
                            marginBottom: '1rem'
                        }}>
                            Your browser will be placed in quarantine mode for {quarantineMode.hardLockDuration} minutes after {quarantineMode.maxAttempts} attempts. During quarantine mode, no login attempts can be made.
                        </p>

                        {/* Dot Slider for Duration */}
                        <Slider
                            label=""
                            value={quarantineMode.hardLockDuration}
                            min={1}
                            max={30}
                            onChange={handleDurationChange}
                            showDots={true}
                            dotValues={durationDots}
                        />
                    </div>

                    {/* Two Column Layout for Max Attempts and Clear History */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                        {/* Maximum Attempts */}
                        <div>
                            <NumberInput
                                label="Maximum Attempts"
                                description="How many incorrect attempts should trigger quarantine mode for your browser?"
                                value={quarantineMode.maxAttempts}
                                min={3}
                                max={10}
                                onChange={handleMaxAttemptsChange}
                            />
                        </div>

                        {/* Clear History */}
                        <div>
                            <ToggleButtonGroup
                                label="Clear History"
                                description="Should your browser history be cleared when your browser enters quarantine mode after 5 incorrect attempts?"
                                options={[
                                    { value: 'clear', label: 'Clear' },
                                    { value: 'keep', label: "Don't Clear" }
                                ]}
                                value={quarantineMode.clearHistory ? 'clear' : 'keep'}
                                onChange={handleClearHistoryToggle}
                                disabled={requestingPermission}
                            />
                        </div>
                    </div>

                    {/* Clear Options (if clearing is enabled) */}
                    {quarantineMode.clearHistory && (
                        <div style={{
                            marginTop: '1.5rem',
                            paddingTop: '1.5rem',
                            borderTop: '1px solid var(--color-border)'
                        }}>
                            <p style={{
                                color: 'var(--color-text-secondary)',
                                fontSize: '0.875rem',
                                marginBottom: '1rem'
                            }}>
                                Data to clear:
                            </p>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                <Checkbox
                                    label="Cookies"
                                    checked={quarantineMode.clearOptions.cookies}
                                    onChange={(checked) => handleClearOptionChange('cookies', checked)}
                                />
                                <Checkbox
                                    label="Saved passwords"
                                    checked={quarantineMode.clearOptions.passwords}
                                    onChange={(checked) => handleClearOptionChange('passwords', checked)}
                                />
                                <Checkbox
                                    label="Download history"
                                    checked={quarantineMode.clearOptions.downloads}
                                    onChange={(checked) => handleClearOptionChange('downloads', checked)}
                                />
                                <Checkbox
                                    label="Form data"
                                    checked={quarantineMode.clearOptions.formData}
                                    onChange={(checked) => handleClearOptionChange('formData', checked)}
                                />
                                <Checkbox
                                    label="Browsing history"
                                    checked={quarantineMode.clearOptions.history}
                                    onChange={(checked) => handleClearOptionChange('history', checked)}
                                />
                            </div>

                            <div style={{
                                marginTop: '1rem',
                                padding: '0.75rem 1rem',
                                background: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                borderRadius: '8px',
                                color: '#fca5a5',
                                fontSize: '0.875rem'
                            }}>
                                ⚠️ <strong>Warning:</strong> Clearing data is irreversible.
                            </div>
                        </div>
                    )}
                </>
            )}
        </SectionCard>
    );
}

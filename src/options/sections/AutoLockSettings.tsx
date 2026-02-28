// ============================================
// Auto Lock Settings Section (NEXUS PROTOCOL)
// ============================================

import { SectionCard, Select, TextInput, YesNoToggle } from '../components';
import type { Settings } from '../../shared/types';

interface AutoLockSettingsProps {
    settings: Settings;
    onSave: (updates: Partial<Settings>) => Promise<void>;
}

export function AutoLockSettings({ settings, onSave }: AutoLockSettingsProps) {
    const { autoLock } = settings;

    const handleToggle = async (active: boolean) => {
        await onSave({
            autoLock: { ...autoLock, active },
        });
    };

    const handleBackgroundToggle = async (runInBackground: boolean) => {
        if (runInBackground) {
            // Request background permission
            try {
                const granted = await chrome.permissions.request({
                    permissions: ['background'],
                });
                if (!granted) {
                    console.log('Background permission denied');
                    return;
                }
            } catch (error) {
                console.error('Failed to request permission:', error);
                return;
            }
        }

        await onSave({
            autoLock: { ...autoLock, runInBackground },
        });
    };

    const handleStartStateChange = async (startState: string) => {
        await onSave({
            autoLock: { ...autoLock, startState: startState as 'new_tab' | 'restore' | 'url' },
        });
    };

    const handleStartUrlChange = async (startUrl: string) => {
        await onSave({
            autoLock: { ...autoLock, startUrl },
        });
    };

    const startStateOptions = [
        { value: 'url', label: 'Start with a URL' },
        { value: 'new_tab', label: 'Start with a new tab' },
        { value: 'restore', label: 'Restore with history' },
    ];

    return (
        <SectionCard
            title="Auto Lock"
            description="BrowserLock locks and secures your browser when it's first opened."
            toggle={{
                checked: autoLock.active,
                onChange: handleToggle
            }}
        >
            {autoLock.active && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                    {/* Left Column */}
                    <div>
                        <YesNoToggle
                            label="Run in the Background"
                            description="BrowserLock works in the background and can monitor your browser's updates and idle mode."
                            value={autoLock.runInBackground}
                            onChange={handleBackgroundToggle}
                        />
                    </div>

                    {/* Right Column */}
                    <div>
                        <Select
                            label="Start State"
                            value={autoLock.startState}
                            options={startStateOptions}
                            onChange={handleStartStateChange}
                        />
                        <p style={{
                            color: 'var(--nx-text-dim)',
                            fontFamily: 'var(--nx-font-body)',
                            fontSize: '0.8125rem',
                            letterSpacing: '0.02em',
                            marginTop: '-0.5rem'
                        }}>
                            In what state should the browser be started when auto lock is enabled.
                        </p>

                        {autoLock.startState === 'url' && (
                            <TextInput
                                label="URL to open"
                                type="url"
                                value={autoLock.startUrl}
                                placeholder="https://example.com"
                                onChange={handleStartUrlChange}
                            />
                        )}
                    </div>
                </div>
            )}
        </SectionCard>
    );
}

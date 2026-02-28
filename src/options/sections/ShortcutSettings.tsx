// ============================================
// Quick Lock / Shortcut Settings Section (NEXUS PROTOCOL)
// ============================================

import { SectionCard, ShortcutDisplay } from '../components';
import type { Settings } from '../../shared/types';

interface ShortcutSettingsProps {
    settings: Settings;
    onSave: (updates: Partial<Settings>) => Promise<void>;
}

export function ShortcutSettings({ settings, onSave }: ShortcutSettingsProps) {
    const { shortcutLock } = settings;

    const handleToggle = async (active: boolean) => {
        await onSave({
            shortcutLock: { ...shortcutLock, active },
        });
    };

    const openShortcutSettings = () => {
        // Open Chrome's extension shortcuts page
        chrome.tabs.create({
            url: 'chrome://extensions/shortcuts',
        });
    };

    return (
        <SectionCard
            title="Quick Lock"
            toggle={{
                checked: shortcutLock.active,
                onChange: handleToggle
            }}
        >
            {shortcutLock.active && (
                <div>
                    <h4 style={{
                        color: 'var(--nx-text-bright)',
                        fontFamily: 'var(--nx-font-body)',
                        fontWeight: 600,
                        fontSize: '1rem',
                        letterSpacing: '0.03em',
                        marginBottom: '0.5rem'
                    }}>
                        Combination
                    </h4>
                    <p style={{
                        color: 'var(--nx-text-dim)',
                        fontFamily: 'var(--nx-font-body)',
                        fontSize: '0.875rem',
                        letterSpacing: '0.02em',
                        marginBottom: '1rem'
                    }}>
                        The keyboard command you will use to lock your browser within 1 second if needed.
                    </p>

                    <ShortcutDisplay
                        keys={['Ctrl', 'M']}
                        onChangeClick={openShortcutSettings}
                    />
                </div>
            )}
        </SectionCard>
    );
}

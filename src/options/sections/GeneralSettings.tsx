// ============================================
// General Settings Section (Futuristic Design)
// ============================================

import { SectionCard, Select } from '../components';
import type { Settings } from '../../shared/types';

interface GeneralSettingsProps {
    settings: Settings;
    onSave: (updates: Partial<Settings>) => Promise<void>;
}

export function GeneralSettings({ settings, onSave }: GeneralSettingsProps) {
    const handleThemeChange = async (theme: string) => {
        await onSave({ theme: theme as 'light' | 'dark' | 'system' });

        // Apply theme immediately
        applyTheme(theme as 'light' | 'dark' | 'system');
    };

    const themeOptions = [
        { value: 'system', label: 'System default' },
        { value: 'dark', label: 'Dark mode' },
        { value: 'light', label: 'Light mode' },
    ];

    return (
        <SectionCard
            title="Appearance"
        >
            <Select
                label="Theme"
                value={settings.theme}
                options={themeOptions}
                onChange={handleThemeChange}
            />
        </SectionCard>
    );
}

/**
 * Apply theme to document
 */
function applyTheme(theme: 'light' | 'dark' | 'system') {
    const root = document.documentElement;

    if (theme === 'system') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        root.classList.toggle('dark', prefersDark);
    } else {
        root.classList.toggle('dark', theme === 'dark');
    }
}

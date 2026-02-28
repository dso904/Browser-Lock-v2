// ============================================
// Idle Mode Settings Section (NEXUS PROTOCOL)
// ============================================

import { SectionCard, ToggleSwitch, Slider } from '../components';
import type { Settings } from '../../shared/types';

interface IdleModeSettingsProps {
    settings: Settings;
    onSave: (updates: Partial<Settings>) => Promise<void>;
}

export function IdleModeSettings({ settings, onSave }: IdleModeSettingsProps) {
    const { idleMode } = settings;

    const handleToggle = async (active: boolean) => {
        await onSave({
            idleMode: { ...idleMode, active },
        });
    };

    const handleDurationChange = async (duration: number) => {
        await onSave({
            idleMode: { ...idleMode, duration },
        });
    };

    const handleNotifyToggle = async (notify: boolean) => {
        await onSave({
            idleMode: { ...idleMode, notify },
        });
    };

    return (
        <SectionCard
            title="Idle Mode"
            toggle={{
                checked: idleMode.active,
                onChange: handleToggle
            }}
        >
            {idleMode.active && (
                <>
                    <Slider
                        label="Lock after"
                        value={idleMode.duration}
                        min={1}
                        max={60}
                        step={1}
                        unit=" min"
                        onChange={handleDurationChange}
                    />

                    <ToggleSwitch
                        label="Show notification"
                        description="Warn before locking (5 second grace period)"
                        checked={idleMode.notify}
                        onChange={handleNotifyToggle}
                    />

                    <div style={{
                        marginTop: '1rem',
                        padding: '0.75rem 1rem',
                        background: 'rgba(0, 240, 255, 0.05)',
                        border: '1px solid rgba(0, 240, 255, 0.12)',
                        borderRadius: '10px',
                        color: 'var(--nx-text-dim)',
                        fontFamily: 'var(--nx-font-body)',
                        fontSize: '0.875rem',
                        letterSpacing: '0.02em',
                    }}>
                        💡 <strong>Tip:</strong> Idle lock won't trigger if audio/video is playing.
                    </div>
                </>
            )}
        </SectionCard>
    );
}

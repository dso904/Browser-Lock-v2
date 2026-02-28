// ============================================
// NEXUS PROTOCOL — Cinematic UI Components
// ============================================

import type { ReactNode } from 'react';

// ============================================
// Section Card
// ============================================

interface SectionCardProps {
    title: string;
    description?: string;
    icon?: string;
    children: ReactNode;
    toggle?: {
        checked: boolean;
        onChange: (checked: boolean) => void;
        disabled?: boolean;
    };
}

export function SectionCard({ title, description, children, toggle }: SectionCardProps) {
    return (
        <div className="section-card">
            <div className="section-header">
                <div className="section-title">
                    {title}
                    <span className="help-icon">?</span>
                </div>
                {toggle && (
                    <button
                        onClick={() => toggle.onChange(!toggle.checked)}
                        disabled={toggle.disabled}
                        className={`toggle-switch ${toggle.checked ? 'active' : ''}`}
                        style={{ opacity: toggle.disabled ? 0.5 : 1 }}
                    />
                )}
            </div>
            {description && (
                <p className="section-description">{description}</p>
            )}
            <div style={{ marginTop: '1rem' }}>
                {children}
            </div>
        </div>
    );
}

// ============================================
// Toggle Switch
// ============================================

interface ToggleSwitchProps {
    label: string;
    description?: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
    disabled?: boolean;
}

export function ToggleSwitch({ label, description, checked, onChange, disabled }: ToggleSwitchProps) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0' }}>
            <div>
                <span style={{
                    color: 'var(--nx-text)',
                    fontFamily: 'var(--nx-font-body)',
                    fontWeight: 600,
                    letterSpacing: '0.03em',
                }}>{label}</span>
                {description && (
                    <p style={{
                        color: 'var(--nx-text-dim)',
                        fontFamily: 'var(--nx-font-body)',
                        fontSize: '0.8125rem',
                        marginTop: '0.25rem',
                        letterSpacing: '0.02em',
                    }}>{description}</p>
                )}
            </div>
            <button
                onClick={() => onChange(!checked)}
                disabled={disabled}
                className={`toggle-switch ${checked ? 'active' : ''}`}
                style={{ opacity: disabled ? 0.5 : 1 }}
            />
        </div>
    );
}

// ============================================
// Yes/No Toggle Group
// ============================================

interface YesNoToggleProps {
    label: string;
    description?: string;
    value: boolean;
    onChange: (value: boolean) => void;
    disabled?: boolean;
}

export function YesNoToggle({ label, description, value, onChange, disabled }: YesNoToggleProps) {
    return (
        <div style={{ marginBottom: '1rem' }}>
            <div style={{ marginBottom: '0.75rem' }}>
                <span style={{
                    color: 'var(--nx-text)',
                    fontFamily: 'var(--nx-font-body)',
                    fontWeight: 600,
                    letterSpacing: '0.03em',
                }}>{label}</span>
                {description && (
                    <p style={{
                        color: 'var(--nx-text-dim)',
                        fontFamily: 'var(--nx-font-body)',
                        fontSize: '0.8125rem',
                        marginTop: '0.25rem',
                        letterSpacing: '0.02em',
                    }}>{description}</p>
                )}
            </div>
            <div className="toggle-group">
                <button
                    className={`toggle-btn ${value ? 'active' : ''}`}
                    onClick={() => !disabled && onChange(true)}
                    disabled={disabled}
                >
                    Yes
                </button>
                <button
                    className={`toggle-btn ${!value ? 'active' : ''}`}
                    onClick={() => !disabled && onChange(false)}
                    disabled={disabled}
                >
                    No
                </button>
            </div>
        </div>
    );
}

// ============================================
// Slider
// ============================================

interface SliderProps {
    label: string;
    value: number;
    min: number;
    max: number;
    step?: number;
    unit?: string;
    onChange: (value: number) => void;
    disabled?: boolean;
    showDots?: boolean;
    dotValues?: number[];
}

export function Slider({ label, value, min, max, step = 1, unit = '', onChange, disabled, showDots, dotValues }: SliderProps) {
    if (showDots && dotValues) {
        return (
            <div style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{
                        color: 'var(--nx-text)',
                        fontFamily: 'var(--nx-font-body)',
                        fontWeight: 600,
                        letterSpacing: '0.03em',
                    }}>{label}</span>
                    <span style={{
                        color: 'var(--nx-cyan)',
                        fontFamily: 'var(--nx-font-mono)',
                        textShadow: '0 0 6px var(--nx-cyan-glow)',
                    }}>
                        {value}{unit}
                    </span>
                </div>
                <div className="dot-slider">
                    <div className="dot-slider-track">
                        {dotValues.map((v) => (
                            <button
                                key={v}
                                className={`dot-slider-dot ${v === value ? 'active' : ''}`}
                                onClick={() => !disabled && onChange(v)}
                                disabled={disabled}
                            />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={{ padding: '0.5rem 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{
                    color: 'var(--nx-text)',
                    fontFamily: 'var(--nx-font-body)',
                    fontWeight: 600,
                    letterSpacing: '0.03em',
                }}>{label}</span>
                <span style={{
                    color: 'var(--nx-cyan)',
                    fontFamily: 'var(--nx-font-mono)',
                    textShadow: '0 0 6px var(--nx-cyan-glow)',
                }}>
                    {value}{unit}
                </span>
            </div>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
                disabled={disabled}
                style={{
                    width: '100%',
                    height: '4px',
                    background: 'linear-gradient(90deg, var(--nx-cyan), var(--nx-magenta))',
                    borderRadius: '2px',
                    appearance: 'none',
                    WebkitAppearance: 'none',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    opacity: disabled ? 0.5 : 1,
                    accentColor: 'var(--nx-cyan)',
                    boxShadow: '0 0 6px var(--nx-cyan-glow)',
                }}
            />
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.6875rem',
                color: 'var(--nx-text-muted)',
                fontFamily: 'var(--nx-font-mono)',
                marginTop: '0.375rem',
                letterSpacing: '0.05em',
            }}>
                <span>{min}{unit}</span>
                <span>{max}{unit}</span>
            </div>
        </div>
    );
}

// ============================================
// Select Dropdown
// ============================================

interface SelectOption {
    value: string;
    label: string;
}

interface SelectProps {
    label: string;
    value: string;
    options: SelectOption[];
    onChange: (value: string) => void;
    disabled?: boolean;
}

export function Select({ label, value, options, onChange, disabled }: SelectProps) {
    return (
        <div style={{ marginBottom: '1rem' }}>
            <label style={{
                display: 'block',
                color: 'var(--nx-text)',
                fontFamily: 'var(--nx-font-body)',
                fontWeight: 600,
                letterSpacing: '0.03em',
                marginBottom: '0.5rem',
            }}>
                {label}
            </label>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                disabled={disabled}
                className="select-modern"
            >
                {options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
        </div>
    );
}

// ============================================
// Text Input
// ============================================

interface TextInputProps {
    label: string;
    value: string;
    placeholder?: string;
    type?: 'text' | 'password' | 'url';
    onChange: (value: string) => void;
    disabled?: boolean;
}

export function TextInput({ label, value, placeholder, type = 'text', onChange, disabled }: TextInputProps) {
    return (
        <div style={{ marginBottom: '1rem' }}>
            <label style={{
                display: 'block',
                color: 'var(--nx-text)',
                fontFamily: 'var(--nx-font-body)',
                fontWeight: 600,
                letterSpacing: '0.03em',
                marginBottom: '0.5rem',
            }}>
                {label}
            </label>
            <input
                type={type}
                value={value}
                placeholder={placeholder}
                onChange={(e) => onChange(e.target.value)}
                disabled={disabled}
                style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    background: 'rgba(10, 0, 32, 0.6)',
                    border: '1px solid var(--nx-border)',
                    borderRadius: '10px',
                    color: 'var(--nx-text-bright)',
                    fontFamily: 'var(--nx-font-body)',
                    fontSize: '0.9375rem',
                    outline: 'none',
                    backdropFilter: 'blur(10px)',
                    transition: 'all 0.3s',
                    opacity: disabled ? 0.5 : 1,
                    letterSpacing: '0.02em',
                }}
                onFocus={(e) => {
                    e.target.style.borderColor = 'var(--nx-cyan)';
                    e.target.style.boxShadow = '0 0 12px var(--nx-cyan-glow)';
                }}
                onBlur={(e) => {
                    e.target.style.borderColor = 'var(--nx-border)';
                    e.target.style.boxShadow = 'none';
                }}
            />
        </div>
    );
}

// ============================================
// Number Input with Spinners
// ============================================

interface NumberInputProps {
    label: string;
    description?: string;
    value: number;
    min?: number;
    max?: number;
    onChange: (value: number) => void;
    disabled?: boolean;
}

export function NumberInput({ label, description, value, min = 0, max = 100, onChange, disabled }: NumberInputProps) {
    const increment = () => {
        if (value < max) onChange(value + 1);
    };

    const decrement = () => {
        if (value > min) onChange(value - 1);
    };

    return (
        <div style={{ marginBottom: '1rem' }}>
            <div style={{ marginBottom: '0.5rem' }}>
                <span style={{
                    color: 'var(--nx-text)',
                    fontFamily: 'var(--nx-font-body)',
                    fontWeight: 600,
                    letterSpacing: '0.03em',
                }}>{label}</span>
                {description && (
                    <p style={{
                        color: 'var(--nx-text-dim)',
                        fontFamily: 'var(--nx-font-body)',
                        fontSize: '0.8125rem',
                        marginTop: '0.25rem',
                        letterSpacing: '0.02em',
                    }}>{description}</p>
                )}
            </div>
            <div className="number-input" style={{ width: 'fit-content', minWidth: '120px' }}>
                <input
                    type="number"
                    value={value}
                    min={min}
                    max={max}
                    onChange={(e) => onChange(Math.max(min, Math.min(max, Number(e.target.value))))}
                    disabled={disabled}
                />
                <div className="number-input-btns">
                    <button className="number-input-btn" onClick={increment} disabled={disabled || value >= max}>▲</button>
                    <button className="number-input-btn" onClick={decrement} disabled={disabled || value <= min}>▼</button>
                </div>
            </div>
        </div>
    );
}

// ============================================
// Checkbox
// ============================================

interface CheckboxProps {
    label: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
    disabled?: boolean;
}

export function Checkbox({ label, checked, onChange, disabled }: CheckboxProps) {
    return (
        <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.375rem 0',
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.5 : 1,
        }}>
            <div style={{
                width: 20,
                height: 20,
                borderRadius: 5,
                border: `1.5px solid ${checked ? 'var(--nx-cyan)' : 'var(--nx-border)'}`,
                background: checked ? 'rgba(0, 240, 255, 0.12)' : 'rgba(10, 0, 32, 0.6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.3s',
                boxShadow: checked ? '0 0 8px var(--nx-cyan-glow)' : 'none',
                flexShrink: 0,
            }}>
                {checked && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--nx-cyan)" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12" />
                    </svg>
                )}
            </div>
            <input
                type="checkbox"
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
                disabled={disabled}
                style={{ display: 'none' }}
            />
            <span style={{
                color: 'var(--nx-text-dim)',
                fontFamily: 'var(--nx-font-body)',
                fontSize: '0.9375rem',
                letterSpacing: '0.02em',
            }}>{label}</span>
        </label>
    );
}

// ============================================
// Button
// ============================================

interface ButtonProps {
    children: ReactNode;
    variant?: 'primary' | 'secondary' | 'danger';
    onClick?: () => void;
    disabled?: boolean;
    type?: 'button' | 'submit';
}

export function Button({ children, variant = 'primary', onClick, disabled, type = 'button' }: ButtonProps) {
    const variants = {
        primary: {
            background: 'var(--nx-grad-primary)',
            color: 'var(--nx-text-bright)',
            border: '1px solid rgba(0, 240, 255, 0.2)',
            boxShadow: '0 0 15px rgba(0, 240, 255, 0.1)',
        },
        secondary: {
            background: 'var(--nx-glass)',
            color: 'var(--nx-text)',
            border: '1px solid var(--nx-glass-border)',
            boxShadow: 'none',
        },
        danger: {
            background: 'rgba(255, 51, 102, 0.1)',
            color: 'var(--nx-error)',
            border: '1px solid rgba(255, 51, 102, 0.2)',
            boxShadow: '0 0 10px var(--nx-error-glow)',
        }
    };

    const style = variants[variant];

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            style={{
                padding: '0.75rem 1.5rem',
                borderRadius: '10px',
                fontFamily: 'var(--nx-font-display)',
                fontWeight: 600,
                fontSize: '0.8rem',
                letterSpacing: '0.12em',
                textTransform: 'uppercase' as const,
                cursor: disabled ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s',
                opacity: disabled ? 0.4 : 1,
                backdropFilter: 'blur(10px)',
                ...style
            }}
        >
            {children}
        </button>
    );
}

// ============================================
// Toggle Button Group
// ============================================

interface ToggleButtonGroupProps {
    label: string;
    description?: string;
    options: { value: string; label: string }[];
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
}

export function ToggleButtonGroup({ label, description, options, value, onChange, disabled }: ToggleButtonGroupProps) {
    return (
        <div style={{ marginBottom: '1rem' }}>
            <div style={{ marginBottom: '0.5rem' }}>
                <span style={{
                    color: 'var(--nx-text)',
                    fontFamily: 'var(--nx-font-body)',
                    fontWeight: 600,
                    letterSpacing: '0.03em',
                }}>{label}</span>
                {description && (
                    <p style={{
                        color: 'var(--nx-text-dim)',
                        fontFamily: 'var(--nx-font-body)',
                        fontSize: '0.8125rem',
                        marginTop: '0.25rem',
                        letterSpacing: '0.02em',
                    }}>{description}</p>
                )}
            </div>
            <div className="toggle-group">
                {options.map((option) => (
                    <button
                        key={option.value}
                        className={`toggle-btn ${value === option.value ? 'active' : ''}`}
                        onClick={() => !disabled && onChange(option.value)}
                        disabled={disabled}
                    >
                        {option.label}
                    </button>
                ))}
            </div>
        </div>
    );
}

// ============================================
// Keyboard Shortcut Display
// ============================================

interface ShortcutDisplayProps {
    keys: string[];
    onChangeClick?: () => void;
}

export function ShortcutDisplay({ keys, onChangeClick }: ShortcutDisplayProps) {
    return (
        <div>
            <div className="shortcut-display">
                {keys.map((key, index) => (
                    <span key={index}>
                        <span className="shortcut-key">{key}</span>
                        {index < keys.length - 1 && <span className="shortcut-plus">+</span>}
                    </span>
                ))}
            </div>
            {onChangeClick && (
                <button className="change-shortcut-link" onClick={onChangeClick}>
                    Change Combination
                </button>
            )}
        </div>
    );
}

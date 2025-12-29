// ============================================
// Shared UI Components for Settings (Futuristic Design)
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
                <span style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>{label}</span>
                {description && (
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>{description}</p>
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
                <span style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>{label}</span>
                {description && (
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>{description}</p>
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
                    <span style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>{label}</span>
                    <span style={{ color: 'var(--color-primary)', fontFamily: 'Monaco, Consolas, monospace' }}>
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
                <span style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>{label}</span>
                <span style={{ color: 'var(--color-primary)', fontFamily: 'Monaco, Consolas, monospace' }}>
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
                    height: '6px',
                    background: 'var(--color-bg-input)',
                    borderRadius: '3px',
                    appearance: 'none',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    opacity: disabled ? 0.5 : 1,
                    accentColor: 'var(--color-primary)'
                }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
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
            <label style={{ display: 'block', color: 'var(--color-text-primary)', fontWeight: 500, marginBottom: '0.5rem' }}>
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
            <label style={{ display: 'block', color: 'var(--color-text-primary)', fontWeight: 500, marginBottom: '0.5rem' }}>
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
                    background: 'var(--color-bg-card)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                    color: 'var(--color-text-primary)',
                    fontSize: '0.9375rem',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                    opacity: disabled ? 0.5 : 1
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
                <span style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>{label}</span>
                {description && (
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>{description}</p>
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
            padding: '0.25rem 0',
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.5 : 1
        }}>
            <input
                type="checkbox"
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
                disabled={disabled}
                style={{
                    width: '18px',
                    height: '18px',
                    background: 'var(--color-bg-card)',
                    borderRadius: '4px',
                    accentColor: 'var(--color-primary)'
                }}
            />
            <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.9375rem' }}>{label}</span>
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
            background: 'var(--gradient-primary)',
            color: 'white',
            border: 'none'
        },
        secondary: {
            background: 'var(--color-bg-input)',
            color: 'var(--color-text-primary)',
            border: '1px solid var(--color-border)'
        },
        danger: {
            background: 'rgba(239, 68, 68, 0.2)',
            color: '#f87171',
            border: '1px solid rgba(239, 68, 68, 0.3)'
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
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.9375rem',
                cursor: disabled ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                opacity: disabled ? 0.5 : 1,
                ...style
            }}
        >
            {children}
        </button>
    );
}

// ============================================
// Toggle Button Group (Clear/Don't Clear style)
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
                <span style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>{label}</span>
                {description && (
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>{description}</p>
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

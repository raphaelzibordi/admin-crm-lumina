import type { ReactNode } from 'react';
import './ui.css';

// ── Badge ──────────────────────────────────────────────────────────────────
type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'neutral' | 'teal';

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
}

const variantClass: Record<BadgeVariant, string> = {
  success: 'badge-success',
  warning: 'badge-warning',
  danger:  'badge-danger',
  info:    'badge-info',
  purple:  'badge-purple',
  neutral: 'badge-neutral',
  teal:    'badge-teal',
};

export const Badge = ({ variant = 'neutral', children, className = '' }: BadgeProps) => (
  <span className={`badge ${variantClass[variant]} ${className}`}>{children}</span>
);

// ── Button ─────────────────────────────────────────────────────────────────
type ButtonVariant = 'primary' | 'outline' | 'danger';
type ButtonSize = 'sm' | 'md';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
}

const btnVariant: Record<ButtonVariant, string> = {
  primary: 'btn-p',
  outline: 'btn-o',
  danger:  'btn-d',
};

export const Button = ({ variant = 'outline', size = 'md', children, className = '', ...props }: ButtonProps) => (
  <button
    className={`btn ${btnVariant[variant]} ${size === 'sm' ? 'btn-sm' : ''} ${className}`}
    {...props}
  >
    {children}
  </button>
);

// ── Card ───────────────────────────────────────────────────────────────────
interface CardProps {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const Card = ({ children, className = '', style }: CardProps) => (
  <div className={`card ${className}`} style={style}>{children}</div>
);

interface CardHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export const CardHeader = ({ title, subtitle, action }: CardHeaderProps) => (
  <div className="card-hd">
    <div>
      <h3>{title}</h3>
      {subtitle && <p>{subtitle}</p>}
    </div>
    {action}
  </div>
);

// ── MetricCard ─────────────────────────────────────────────────────────────
interface MetricCardProps {
  label: string;
  value: string;
  delta?: string;
  deltaType?: 'up' | 'down' | 'neutral';
}

export const MetricCard = ({ label, value, delta, deltaType = 'neutral' }: MetricCardProps) => (
  <div className="metric">
    <div className="m-lbl">{label}</div>
    <div className={`m-val ${deltaType === 'down' ? 'color-danger' : deltaType === 'up' ? '' : ''}`}>{value}</div>
    {delta && <div className={`m-delta ${deltaType === 'up' ? 'up' : deltaType === 'down' ? 'down' : ''}`}>{delta}</div>}
  </div>
);

// ── Alert ──────────────────────────────────────────────────────────────────
type AlertVariant = 'danger' | 'warning' | 'info';

interface AlertProps {
  variant?: AlertVariant;
  children: ReactNode;
}

const alertClass: Record<AlertVariant, string> = {
  danger:  'a-danger',
  warning: 'a-warn',
  info:    'a-info',
};

const AlertIcon = (_: { variant: AlertVariant }) => (
  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="8" cy="8" r="6"/><path d="M8 5v4M8 11h.01"/>
  </svg>
);

export const Alert = ({ variant = 'info', children }: AlertProps) => (
  <div className={`alert ${alertClass[variant]}`}>
    <AlertIcon variant={variant} />
    <span>{children}</span>
  </div>
);

// ── Tabs ───────────────────────────────────────────────────────────────────
interface TabsProps {
  tabs: string[];
  active: number;
  onChange: (index: number) => void;
}

export const Tabs = ({ tabs, active, onChange }: TabsProps) => (
  <div className="tabs">
    {tabs.map((tab, i) => (
      <div
        key={tab}
        className={`tab ${i === active ? 'on' : ''}`}
        onClick={() => onChange(i)}
      >
        {tab}
      </div>
    ))}
  </div>
);

// ── Toggle ─────────────────────────────────────────────────────────────────
interface ToggleProps {
  on: boolean;
  onChange: (v: boolean) => void;
}

export const Toggle = ({ on, onChange }: ToggleProps) => (
  <div className={`toggle ${on ? 'on' : ''}`} onClick={() => onChange(!on)} />
);

// ── ProgressBar ────────────────────────────────────────────────────────────
interface ProgressBarProps {
  value: number; // 0-100
  color?: string;
}

export const ProgressBar = ({ value, color }: ProgressBarProps) => (
  <div className="prog">
    <div className="prog-fill" style={{ width: `${value}%`, ...(color ? { background: color } : {}) }} />
  </div>
);

// ── MiniBarChart ───────────────────────────────────────────────────────────
interface MiniBarChartProps {
  data: number[]; // heights as percentages
  labels?: string[];
  activeIndex?: number;
}

export const MiniBarChart = ({ data, labels, activeIndex }: MiniBarChartProps) => (
  <>
    <div className="chart">
      {data.map((h, i) => (
        <div key={i} className={`bar ${i === activeIndex ? 'hi' : ''}`} style={{ height: `${h}%` }} />
      ))}
    </div>
    {labels && (
      <div className="clbls">
        {labels.map((l, i) => (
          <span key={l} className={i === activeIndex ? 'cur' : ''}>{l}</span>
        ))}
      </div>
    )}
  </>
);

// ── HealthBar ──────────────────────────────────────────────────────────────
interface HealthBarProps {
  value: number; // 0-100
}

export const HealthBar = ({ value }: HealthBarProps) => {
  const cls = value >= 70 ? 'hi' : value >= 40 ? 'md' : 'lo';
  const color = value >= 70 ? '#166534' : value >= 40 ? '#92400e' : '#991b1b';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div className="hbar">
        <div className={`hfill ${cls}`} style={{ width: `${value}%` }} />
      </div>
      <span style={{ fontSize: '10.5px', color, fontWeight: 600 }}>{value}</span>
    </div>
  );
};

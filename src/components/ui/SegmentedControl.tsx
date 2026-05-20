import './SegmentedControl.css';

export interface Segment<T extends string = string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string = string> {
  segments: Segment<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: 'sm' | 'md';
  className?: string;
}

function SegmentedControl<T extends string = string>({
  segments,
  value,
  onChange,
  size = 'md',
  className = '',
}: SegmentedControlProps<T>) {
  const classes = ['sv-seg', `sv-seg--${size}`, className].filter(Boolean).join(' ');
  return (
    <div className={classes} role="tablist">
      {segments.map(seg => (
        <button
          key={seg.value}
          role="tab"
          aria-selected={seg.value === value}
          className={`sv-seg-btn${seg.value === value ? ' active' : ''}`}
          onClick={() => onChange(seg.value)}
          type="button"
        >
          {seg.label}
        </button>
      ))}
    </div>
  );
}

export default SegmentedControl;

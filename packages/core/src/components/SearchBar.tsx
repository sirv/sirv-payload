import { cx } from './cx.js';

export interface SearchBarProps {
  value: string;
  onChange(value: string): void;
  onClear?(): void;
  placeholder?: string;
  className?: string;
}

export function SearchBar({
  value,
  onChange,
  onClear,
  placeholder = 'Search this account...',
  className,
}: SearchBarProps) {
  return (
    <div className={cx('sirv-search', className)}>
      <input
        type="search"
        className="sirv-search__input"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Search Sirv assets"
      />
      {value ? (
        <button
          type="button"
          className="sirv-search__clear"
          onClick={() => (onClear ? onClear() : onChange(''))}
          aria-label="Clear search"
        >
          Clear
        </button>
      ) : null}
    </div>
  );
}

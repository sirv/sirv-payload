import type { BrowseType } from '@sirv/sirv-client';
import { cx } from './cx.js';

const LABELS: Record<BrowseType, string> = {
  image: 'Images',
  video: 'Videos',
  spin: '360 Spins',
  view: 'Views',
  model: '3D Models',
  file: 'Files',
};

export interface TypeFilterProps {
  allowed: BrowseType[];
  active: BrowseType[];
  onToggle(type: BrowseType): void;
  className?: string;
}

/** Type-filter chips. Render-guarded by the caller (hidden when only one type is allowed). */
export function TypeFilter({ allowed, active, onToggle, className }: TypeFilterProps) {
  return (
    <fieldset className={cx('sirv-type-filter', className)} aria-label="Filter by type">
      {allowed.map((type) => {
        const isActive = active.includes(type);
        return (
          <button
            key={type}
            type="button"
            className={cx('sirv-type-filter__chip', isActive && 'sirv-type-filter__chip--active')}
            aria-pressed={isActive}
            onClick={() => onToggle(type)}
          >
            {LABELS[type]}
          </button>
        );
      })}
    </fieldset>
  );
}

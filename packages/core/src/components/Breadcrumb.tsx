import { cx } from './cx.js';

export interface BreadcrumbProps {
  /** Absolute path, e.g. "/products/aw26". */
  path: string;
  onNavigate(path: string): void;
  className?: string;
}

/** Path breadcrumb; the last crumb is the current folder (not clickable). */
export function Breadcrumb({ path, onNavigate, className }: BreadcrumbProps) {
  const segments = path.split('/').filter(Boolean);
  const crumbs = [
    { name: 'Home', path: '/' },
    ...segments.map((seg, i) => ({ name: seg, path: `/${segments.slice(0, i + 1).join('/')}` })),
  ];

  return (
    <nav className={cx('sirv-breadcrumb', className)} aria-label="Folder path">
      {crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1;
        return (
          <span key={crumb.path} className="sirv-breadcrumb__crumb">
            <button
              type="button"
              className="sirv-breadcrumb__link"
              onClick={() => onNavigate(crumb.path)}
              disabled={isLast}
              aria-current={isLast ? 'page' : undefined}
            >
              {crumb.name}
            </button>
            {isLast ? null : <span className="sirv-breadcrumb__sep"> / </span>}
          </span>
        );
      })}
    </nav>
  );
}

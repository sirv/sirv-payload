'use client';

/**
 * Sidebar nav link to the Sirv settings view. Rendered in Payload's `afterNavLinks` slot. Uses
 * a plain anchor so it works without importing Payload's internal Link; the admin route is the
 * default `/admin` (adjust if the host customized `routes.admin`).
 */
export function SirvNavLink() {
  return (
    <a className="nav__link sirv-nav-link" href="/admin/sirv">
      Sirv
    </a>
  );
}

export default SirvNavLink;

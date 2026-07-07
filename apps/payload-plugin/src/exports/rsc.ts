/**
 * Server-components entry (the `@sirv/payload-plugin/rsc` subpath). Custom admin views that must
 * be React Server Components (they need `req`/`payload` and wrap Payload's `DefaultTemplate` for
 * the admin chrome) are re-exported here. This file has NO `'use client'` directive.
 */
export { SirvSettingsView } from '../views/SirvSettingsView.js';

import { DefaultTemplate } from '@payloadcms/next/templates';
import { Gutter } from '@payloadcms/ui';
import type { AdminViewServerProps } from 'payload';
import { SirvSettingsClient } from '../components/SirvSettingsClient.js';

/**
 * Server component for the Sirv settings admin view. Wraps the interactive client form in
 * Payload's `DefaultTemplate` so the view keeps the admin nav sidebar, header and footer. This
 * is a Server Component (it needs `req`/`payload` from `initPageResult`), so it ships under the
 * plugin's `./rsc` entry, not `./client`.
 */
export function SirvSettingsView({ initPageResult, params, searchParams }: AdminViewServerProps) {
  return (
    <DefaultTemplate
      i18n={initPageResult.req.i18n}
      locale={initPageResult.locale}
      params={params}
      payload={initPageResult.req.payload}
      permissions={initPageResult.permissions}
      req={initPageResult.req}
      searchParams={searchParams}
      user={initPageResult.req.user ?? undefined}
      visibleEntities={initPageResult.visibleEntities}
    >
      <Gutter>
        <SirvSettingsClient />
      </Gutter>
    </DefaultTemplate>
  );
}

export default SirvSettingsView;

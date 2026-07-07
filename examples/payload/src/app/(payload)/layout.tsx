import config from '@payload-config';
import { RootLayout, handleServerFunctions } from '@payloadcms/next/layouts';
import type { ServerFunctionClient } from 'payload';
import type { ReactNode } from 'react';
import { importMap } from './admin/importMap.js';
import './custom.scss';

type Args = { children: ReactNode };

// biome-ignore lint/complexity/useArrowFunction: the 'use server' directive requires a function body; an arrow drops it.
const serverFunction: ServerFunctionClient = async function (args) {
  'use server';
  return handleServerFunctions({ ...args, config, importMap });
};

const Layout = ({ children }: Args) => (
  <RootLayout config={config} importMap={importMap} serverFunction={serverFunction}>
    {children}
  </RootLayout>
);

export default Layout;

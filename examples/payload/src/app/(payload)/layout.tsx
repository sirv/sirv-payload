import config from '@payload-config';
import { RootLayout, handleServerFunctions } from '@payloadcms/next/layouts';
import type { ServerFunctionClient } from 'payload';
import type { ReactNode } from 'react';
import { importMap } from './admin/importMap.js';
import './custom.scss';

type Args = { children: ReactNode };

const serverFunction: ServerFunctionClient = async (args) =>
  handleServerFunctions({ ...args, config, importMap });

const Layout = ({ children }: Args) => (
  <RootLayout config={config} importMap={importMap} serverFunction={serverFunction}>
    {children}
  </RootLayout>
);

export default Layout;

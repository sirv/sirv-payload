import type { ReactNode } from 'react';

export const metadata = {
  title: 'Sirv + Payload example',
  description: 'Rendering Sirv-filled Payload fields with @sirv/react.',
};

export default function FrontendLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif', margin: 0, padding: '2rem' }}>
        {children}
      </body>
    </html>
  );
}

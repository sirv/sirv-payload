import type { FileEntry } from '@sirv/sirv-client';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { makeMockClient } from '../test-utils.js';
import { DamBrowser } from './DamBrowser.js';

const ROOT: FileEntry[] = [
  { filename: 'products', isDirectory: true, size: 0 },
  {
    filename: 'hero.jpg',
    isDirectory: false,
    size: 100,
    contentType: 'image/jpeg',
    meta: { width: 800, height: 600 },
  },
  { filename: 'notes.txt', isDirectory: false, size: 5, contentType: 'text/plain' },
];

describe('DamBrowser', () => {
  it('lists folders and supported assets, hiding unsupported files', async () => {
    const client = makeMockClient({
      listFolder: async () => ({ contents: ROOT, continuation: null }),
    });
    render(<DamBrowser client={client} alias="demo" onSelect={vi.fn()} />);

    await waitFor(() => expect(screen.getByText('products')).toBeTruthy());
    expect(screen.getByText('hero.jpg')).toBeTruthy();
    expect(screen.queryByText('notes.txt')).toBeNull();
  });

  it('navigates into a folder', async () => {
    const listFolder = vi.fn(async ({ dirname }: { dirname: string }) => {
      if (dirname === '/') return { contents: ROOT, continuation: null };
      return {
        contents: [
          { filename: 'shoe.jpg', isDirectory: false, size: 1, contentType: 'image/jpeg' },
        ] as FileEntry[],
        continuation: null,
      };
    });
    const client = makeMockClient({ listFolder });
    render(<DamBrowser client={client} alias="demo" onSelect={vi.fn()} />);

    await waitFor(() => expect(screen.getByText('products')).toBeTruthy());
    fireEvent.click(screen.getByText('products'));

    await waitFor(() => expect(screen.getByText('shoe.jpg')).toBeTruthy());
    expect(listFolder).toHaveBeenCalledWith({ dirname: '/products', continuation: undefined });
  });

  it('previews an asset and confirms the selection', async () => {
    const onSelect = vi.fn();
    const client = makeMockClient({
      listFolder: async () => ({ contents: ROOT, continuation: null }),
    });
    render(<DamBrowser client={client} alias="demo" onSelect={onSelect} />);

    await waitFor(() => expect(screen.getByText('hero.jpg')).toBeTruthy());
    fireEvent.click(screen.getByTitle('hero.jpg'));

    const confirm = await screen.findByRole('button', { name: 'Use this asset' });
    fireEvent.click(confirm);

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect.mock.calls[0]?.[0]).toMatchObject({ path: '/hero.jpg', type: 'image' });
  });

  it('hides the type filter when only one type is allowed', async () => {
    const client = makeMockClient({
      listFolder: async () => ({ contents: ROOT, continuation: null }),
    });
    render(<DamBrowser client={client} alias="demo" allowedTypes={['image']} onSelect={vi.fn()} />);

    await waitFor(() => expect(screen.getByText('hero.jpg')).toBeTruthy());
    expect(screen.queryByRole('group', { name: 'Filter by type' })).toBeNull();
  });
});

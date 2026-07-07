import config from '@payload-config';
import { getPayload } from 'payload';
import type { StoredMediaValue } from '../../lib/fromStoredMedia.js';
import { MediaBlock } from './MediaBlock.js';

export const dynamic = 'force-dynamic';

/**
 * Illustrative stored values (one per media type). These use the Sirv demo delivery domain; swap
 * in your own account's assets. They demonstrate that a stored `sirvMedia` value renders directly
 * through `@sirv/react` with no transformation beyond `fromStoredMedia`.
 */
const SAMPLES: StoredMediaValue[] = [
  { mediaType: 'image', sirvAlias: 'demo.sirv.com', sirvPath: '/example/beach.jpg', alt: 'Beach' },
  {
    mediaType: 'video',
    sirvAlias: 'demo.sirv.com',
    sirvPath: '/example/dance.mp4',
    controls: true,
  },
  { mediaType: 'spin', sirvAlias: 'demo.sirv.com', sirvPath: '/example/canon-eos.spin' },
  { mediaType: 'view', sirvAlias: 'demo.sirv.com', sirvPath: '/example/apartment.view' },
  { mediaType: 'model', sirvAlias: 'demo.sirv.com', sirvPath: '/example/chair.glb' },
];

interface PostRecord {
  id: string | number;
  title?: string;
  hero?: StoredMediaValue | null;
  gallery?: StoredMediaValue[] | null;
  spin?: StoredMediaValue | null;
  assetUrl?: string | null;
}

async function loadFirstPost(): Promise<PostRecord | null> {
  try {
    const payload = await getPayload({ config });
    const { docs } = await payload.find({ collection: 'posts', limit: 1, depth: 0 });
    return (docs[0] as PostRecord) ?? null;
  } catch {
    return null;
  }
}

export default async function Home() {
  const post = await loadFirstPost();

  return (
    <main style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gap: '2.5rem' }}>
      <header>
        <h1>Sirv + Payload</h1>
        <p>
          Media picked in the Payload admin with <code>@sirv/payload-plugin</code>, rendered here
          with <code>@sirv/react</code>. Manage the connection at{' '}
          <a href="/admin/sirv">/admin/sirv</a>.
        </p>
      </header>

      {post ? (
        <section>
          <h2>From your first post: {post.title}</h2>
          {post.hero ? (
            <figure>
              <MediaBlock value={post.hero} />
            </figure>
          ) : null}
          {post.gallery && post.gallery.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
              {post.gallery.map((item, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: sample list
                <MediaBlock key={i} value={item} />
              ))}
            </div>
          ) : null}
          {post.spin ? <MediaBlock value={post.spin} /> : null}
          {post.assetUrl ? (
            <p>
              Attachment: <a href={post.assetUrl}>{post.assetUrl}</a>
            </p>
          ) : null}
        </section>
      ) : (
        <section>
          <p style={{ color: '#888' }}>
            No posts yet. Create one in the admin, then reload. Meanwhile, here is every media type
            rendered from static sample values:
          </p>
        </section>
      )}

      <section>
        <h2>All media types (static samples)</h2>
        <div style={{ display: 'grid', gap: '2rem' }}>
          {SAMPLES.map((sample) => (
            <figure key={sample.sirvPath} style={{ margin: 0 }}>
              <figcaption style={{ fontWeight: 600, marginBottom: '0.5rem' }}>
                {sample.mediaType}
              </figcaption>
              <MediaBlock value={sample} />
            </figure>
          ))}
        </div>
      </section>
    </main>
  );
}

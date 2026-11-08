import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'PDRForge',
    short_name: 'PDRForge',
    description: 'CRM для PDR и кузовных мастерских',
    start_url: '/app',
    scope: '/',
    display: 'standalone',
    background_color: '#090b0e',
    theme_color: '#090b0e',
    lang: 'ru',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}

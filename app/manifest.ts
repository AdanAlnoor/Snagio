import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Snagio - Inspection Tracking System',
    short_name: 'Snagio',
    description: 'Photo-centric inspection and issue tracking for construction, property inspections, and quality control',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#f97316',
    orientation: 'any',
    icons: [
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    categories: ['productivity', 'business', 'utilities'],
    screenshots: [
      {
        src: '/screenshots/desktop.png',
        sizes: '1920x1080',
        type: 'image/png',
        form_factor: 'wide',
      },
      {
        src: '/screenshots/mobile.png',
        sizes: '1080x1920',
        type: 'image/png',
        form_factor: 'narrow',
      },
    ],
    shortcuts: [
      {
        name: 'New Snag',
        short_name: 'New',
        description: 'Create a new snag',
        url: '/projects',
        icons: [{ src: '/icons/new-snag.png', sizes: '96x96' }],
      },
      {
        name: 'Projects',
        short_name: 'Projects',
        description: 'View all projects',
        url: '/projects',
        icons: [{ src: '/icons/projects.png', sizes: '96x96' }],
      },
    ],
    prefer_related_applications: false,
  }
}
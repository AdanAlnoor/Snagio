'use client'

import { useEffect } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Register service worker (only in production)
    if (
      'serviceWorker' in navigator &&
      window.location.hostname !== 'localhost' &&
      process.env.NODE_ENV === 'production'
    ) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then(registration => {
            console.log('Service Worker registered:', registration)
          })
          .catch(error => {
            console.error('Service Worker registration failed:', error)
          })
      })
    }
  }, [])

  return <>{children}</>
}

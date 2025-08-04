// Enhanced Service Worker for Snagio PWA with advanced caching strategies
const CACHE_VERSION = 'v2';
const CACHE_NAMES = {
  static: `snagio-static-${CACHE_VERSION}`,
  images: `snagio-images-${CACHE_VERSION}`,
  api: `snagio-api-${CACHE_VERSION}`,
  offline: `snagio-offline-${CACHE_VERSION}`
};

// Essential files to cache immediately
const urlsToCache = [
  '/',
  '/manifest.json',
  '/icons/icon.svg',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/offline.html' // Create an offline fallback page
];

// Install event - cache essential files
self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_NAMES.static).then((cache) => {
        console.log('Caching static assets');
        return cache.addAll(urlsToCache);
      }),
      // Precache offline page
      caches.open(CACHE_NAMES.offline).then((cache) => {
        return cache.addAll(['/']);
      })
    ])
  );
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!Object.values(CACHE_NAMES).includes(cacheName)) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Take control of all pages under this SW's scope immediately
  self.clients.claim();
});

// Enhanced fetch strategies based on resource type
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests except for Supabase
  if (!url.origin.includes(self.location.origin) && !url.hostname.includes('supabase.co')) {
    return;
  }

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Apply different strategies based on request type
  if (request.destination === 'image' || url.pathname.includes('/storage/')) {
    // Images: Cache first, network fallback
    event.respondWith(cacheFirst(request, CACHE_NAMES.images));
  } else if (url.pathname.includes('/api/')) {
    // API calls: Network first, cache fallback with timeout
    event.respondWith(networkFirstWithTimeout(request, CACHE_NAMES.api, 3000));
  } else if (request.destination === 'document') {
    // HTML documents: Network first, offline page fallback
    event.respondWith(networkFirstWithOfflineFallback(request));
  } else {
    // Other assets: Stale while revalidate
    event.respondWith(staleWhileRevalidate(request, CACHE_NAMES.static));
  }
});

// Cache first strategy - ideal for images
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  
  if (cached) {
    return cached;
  }
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.error('Fetch failed:', error);
    return new Response('Image not available offline', { status: 503 });
  }
}

// Network first with timeout - ideal for API calls
async function networkFirstWithTimeout(request, cacheName, timeout = 3000) {
  const cache = await caches.open(cacheName);
  
  try {
    const networkPromise = fetch(request);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout')), timeout)
    );
    
    const response = await Promise.race([networkPromise, timeoutPromise]);
    
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }
    throw error;
  }
}

// Network first with offline fallback - ideal for HTML
async function networkFirstWithOfflineFallback(request) {
  try {
    return await fetch(request);
  } catch (error) {
    const cache = await caches.open(CACHE_NAMES.offline);
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }
    return cache.match('/');
  }
}

// Stale while revalidate - ideal for static assets
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  
  const fetchPromise = fetch(request).then(response => {
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  });
  
  return cached || fetchPromise;
}

// Handle background sync for offline data
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-snags') {
    event.waitUntil(syncSnags());
  }
});

async function syncSnags() {
  // This will be implemented when we add offline storage
  console.log('Syncing offline data...');
}
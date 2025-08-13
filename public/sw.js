const CACHE_VERSION = 'v1';
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `runtime-${CACHE_VERSION}`;

self.addEventListener('install', (event) => {
	self.skipWaiting();
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) =>
				Promise.all(
					keys
						.filter((key) => ![STATIC_CACHE, RUNTIME_CACHE].includes(key))
						.map((key) => caches.delete(key))
				)
			)
			.then(() => self.clients.claim())
	);
});

self.addEventListener('fetch', (event) => {
	const request = event.request;
	const url = new URL(request.url);

	if (request.method !== 'GET') return;

	// Navigation requests: network-first with cache fallback
	if (request.mode === 'navigate') {
		event.respondWith(
			fetch(request)
				.then((response) => {
					const responseCopy = response.clone();
					caches.open(RUNTIME_CACHE).then((cache) => cache.put(url.pathname || '/', responseCopy));
					return response;
				})
				.catch(async () => {
					const cache = await caches.open(RUNTIME_CACHE);
					const cached = (await cache.match(request)) || (await cache.match('/'));
					return cached || Response.error();
				})
		);
		return;
	}

	// Static assets: cache-first
	const isStaticAsset =
		url.pathname.startsWith('/_astro/') ||
		url.pathname.startsWith('/fonts/') ||
		/\.(?:js|css|woff2?|png|jpe?g|svg|gif|webp|ico)$/.test(url.pathname);

	if (isStaticAsset) {
		event.respondWith(
			caches.open(STATIC_CACHE).then(async (cache) => {
				const cached = await cache.match(request);
				if (cached) return cached;
				const response = await fetch(request);
				if (response && response.ok) cache.put(request, response.clone());
				return response;
			})
		);
		return;
	}

	// Everything else: network-first with runtime caching for same-origin
	event.respondWith(
		caches.open(RUNTIME_CACHE).then(async (cache) => {
			try {
				const response = await fetch(request);
				if (response && response.ok && url.origin === self.location.origin) {
					cache.put(request, response.clone());
				}
				return response;
			} catch (err) {
				const cached = await cache.match(request);
				return cached || Response.error();
			}
		})
	);
});



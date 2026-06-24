// D&G Açaí Berry — Service Worker
// Versão do cache: troque quando atualizar o site para forçar refresh nos clientes
const CACHE_NAME = 'dg-acai-v1';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// Instala: pré-carrega o shell do app
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(APP_SHELL).catch(function(){ /* tolerante a falha de algum asset */ });
    })
  );
  self.skipWaiting();
});

// Ativa: limpa caches antigos
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k){ return k !== CACHE_NAME; })
            .map(function(k){ return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

// Fetch:
// - Firebase/Firestore e WhatsApp SEMPRE pela rede (dados em tempo real, nunca cacheia)
// - Resto: network-first com fallback pro cache (funciona offline)
self.addEventListener('fetch', function(event) {
  var url = event.request.url;
  // Nunca interceptar chamadas de dados em tempo real
  if (url.indexOf('firestore.googleapis.com') !== -1 ||
      url.indexOf('firebase') !== -1 ||
      url.indexOf('googleapis.com') !== -1 ||
      url.indexOf('gstatic.com') !== -1 ||
      url.indexOf('wa.me') !== -1 ||
      event.request.method !== 'GET') {
    return; // deixa o navegador lidar diretamente
  }
  event.respondWith(
    fetch(event.request).then(function(response) {
      // Atualiza o cache com a versão fresca
      var copy = response.clone();
      caches.open(CACHE_NAME).then(function(cache){ cache.put(event.request, copy); }).catch(function(){});
      return response;
    }).catch(function() {
      // Offline: serve do cache
      return caches.match(event.request).then(function(cached){
        return cached || caches.match('./index.html');
      });
    })
  );
});

/*
  loader.js
  ---------
  Carga cada fragmento HTML (partials/*.html) y lo inyecta en el lugar
  exacto donde estaba en el index.html original, ANTES de que se ejecute
  app.js (por eso este script va cargado con "defer" y ANTES de app.js
  en el <head>: los scripts "defer" se ejecutan en orden).

  Usa XMLHttpRequest síncrono a propósito: así garantizamos que TODO
  el HTML ya está en el DOM cuando app.js arranca, sin tener que tocar
  ni entender las funciones de app.js.

  IMPORTANTE: por seguridad del navegador (CORS), esto NO funciona
  abriendo el archivo directo con doble click (file://). Debes
  servirlo con un servidor local, por ejemplo:
      python3 -m http.server 8000
  y abrir http://localhost:8000/
*/
(function () {
  var nodos = document.querySelectorAll('[data-include]');

  nodos.forEach(function (nodo) {
    var url = nodo.getAttribute('data-include');
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, false); // false = síncrono
    try {
      xhr.send(null);
    } catch (e) {
      console.error('No se pudo cargar el parcial: ' + url, e);
      return;
    }
    if (xhr.status === 200 || xhr.status === 0) {
      // outerHTML reemplaza el <div data-include="..."></div>
      // por el contenido real, sin dejar envolturas extra.
      nodo.outerHTML = xhr.responseText;
    } else {
      console.error('Error ' + xhr.status + ' cargando: ' + url);
    }
  });
})();

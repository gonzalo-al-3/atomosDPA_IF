// Flag de depuración: se activa con ?debug=1 en la URL. Se lee una sola vez al cargar.
export const DEBUG = new URLSearchParams(window.location.search).get('debug') === '1';

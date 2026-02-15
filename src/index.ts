import { Renderer } from './core/Renderer';

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register(new URL('./sw.js', import.meta.url));
}

const renderer = new Renderer();
renderer.start();

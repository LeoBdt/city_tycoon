import './style.css';
import { Game } from './core/Game.js';

// Entry point
window.addEventListener('DOMContentLoaded', () => {
  const game = new Game();
  // Expose for debugging if needed
  window.game = game;
});

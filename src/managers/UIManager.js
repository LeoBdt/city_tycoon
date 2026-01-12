import { LEVELS, TOOLS } from '../utils/constants.js';

export class UIManager {
    constructor(game) {
        this.game = game;
        this.elements = {
            score: document.getElementById('score'),
            money: document.getElementById('money'),
            fps: document.getElementById('fps-counter'),
            tools: document.querySelectorAll('.tool-btn'),
            panels: {
                main: document.getElementById('main-menu'),
                game: document.getElementById('game-ui'),
                settings: document.getElementById('settings-panel'),
                levels: document.getElementById('level-select-panel'),
                pause: document.getElementById('pause-menu'),
                victory: document.getElementById('level-complete')
            }
        };

        this.bindEvents();
    }

    bindEvents() {
        // Menu Buttons
        document.getElementById('btn-play')?.addEventListener('click', () => {
            this.showPanel('levels');
        });

        document.getElementById('btn-levels')?.addEventListener('click', () => this.showPanel('levels'));
        document.getElementById('close-levels')?.addEventListener('click', () => this.hidePanel('levels'));

        document.getElementById('btn-pause')?.addEventListener('click', () => this.game.togglePause());
        document.getElementById('btn-resume')?.addEventListener('click', () => this.game.togglePause());
        document.getElementById('btn-menu')?.addEventListener('click', () => window.location.reload());

        // Tool Selection
        this.elements.tools.forEach(btn => {
            const toolId = btn.dataset.tool?.toUpperCase();
            if (!toolId) return;

            btn.addEventListener('click', (e) => {
                this.game.setTool(toolId);
                this.elements.tools.forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
            });
        });

        // Level Selection Generation with LOCK logic
        this.generateLevelCards();
    }

    generateLevelCards() {
        const levelsContainer = document.getElementById('levels-container');
        if (!LEVELS || !levelsContainer) return;

        levelsContainer.innerHTML = '';
        LEVELS.forEach(level => {
            const card = document.createElement('div');
            card.className = 'level-card';

            const isUnlocked = level.unlocked || level.id === 1;

            if (!isUnlocked) {
                card.classList.add('locked');
            }

            card.innerHTML = `
                <div class="level-number">${level.id}</div>
                <div class="level-name" style="font-size: 0.75rem; margin-top:5px;">${level.name}</div>
                <div class="level-stars">${isUnlocked ? (level.stars > 0 ? '⭐'.repeat(level.stars) : 'PLAY') : '🔒'}</div>
            `;

            card.addEventListener('click', () => {
                if (!isUnlocked) {
                    // Show locked message
                    this.showFloatingText("Niveau verrouillé!", window.innerWidth / 2, window.innerHeight / 2, 'destruction');
                    return;
                }
                this.game.loadLevel(level.id);
                this.showGameUI();
            });
            levelsContainer.appendChild(card);
        });
    }

    showPanel(name) {
        Object.values(this.elements.panels).forEach(p => p?.classList.add('hidden'));
        this.elements.panels[name]?.classList.remove('hidden');

        // Refresh level cards when opening levels panel
        if (name === 'levels') {
            this.generateLevelCards();
        }
    }

    hidePanel(name) {
        this.elements.panels[name]?.classList.add('hidden');
        if (!this.game.state?.isRunning) {
            this.elements.panels.main?.classList.remove('hidden');
        }
    }

    showGameUI() {
        Object.values(this.elements.panels).forEach(p => p?.classList.add('hidden'));
        this.elements.panels.game?.classList.remove('hidden');
    }

    updateHUD(score, money, fps) {
        if (this.elements.score) this.elements.score.innerText = Math.floor(score);
        if (this.elements.money) this.elements.money.innerText = Math.floor(money) + "$";
        if (this.elements.fps) this.elements.fps.innerText = fps + " FPS";

        // Dim tools if not enough money
        this.elements.tools.forEach(btn => {
            const toolId = btn.dataset.tool?.toUpperCase();
            if (!toolId) return;
            const toolData = TOOLS[toolId];
            if (toolData && toolData.price > money) {
                btn.classList.add('disabled');
            } else {
                btn.classList.remove('disabled');
            }
        });
    }

    showFloatingText(text, x, y, type = 'points') {
        const el = document.createElement('div');
        el.className = `floating-text ${type}`;
        el.innerText = text;
        el.style.left = x + 'px';
        el.style.top = y + 'px';
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 1200);
    }

    togglePauseMenu(isPaused) {
        if (isPaused) {
            this.elements.panels.pause?.classList.remove('hidden');
        } else {
            this.elements.panels.pause?.classList.add('hidden');
        }
    }
}

import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

import { PhysicsWorld } from './PhysicsWorld.js';
import { UIManager } from '../managers/UIManager.js';
import { InputManager } from '../managers/InputManager.js';
import { SoundManager } from '../managers/SoundManager.js';
import { BuildingFactory } from '../entities/BuildingFactory.js';
import { CONFIG, TOOLS, LEVELS } from '../utils/constants.js';
import { THEMES } from '../utils/theme.js';

export class Game {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;

        this.physics = new PhysicsWorld();
        this.audio = new SoundManager();

        this.objects = [];

        this.state = {
            score: 0,
            money: CONFIG.STARTING_MONEY,
            level: 1,
            tool: 'BALL',
            isRunning: false,
            isPaused: false,
            elapsedTime: 0,
            voxelsDestroyed: 0,
            totalVoxels: 0
        };

        this.ui = new UIManager(this);
        this.clock = new THREE.Clock();

        this.init();
    }

    async init() {
        this.initThree();
        this.input = new InputManager(this.camera, this.renderer.domElement);
        this.input.on('onClick', () => this.handleLeftClick());
        this.animate();
    }

    initThree() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 300);
        this.camera.position.set(25, 20, 25);

        this.renderer = new THREE.WebGLRenderer({ antialias: false }); // Disable AA for perf
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(1); // Force low pixel ratio
        this.renderer.shadowMap.enabled = false; // Disable shadows for performance
        document.getElementById('app').appendChild(this.renderer.domElement);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.maxPolarAngle = Math.PI / 2 - 0.1;
        this.controls.minDistance = 10;
        this.controls.maxDistance = 60;

        // Simple lighting
        const ambient = new THREE.AmbientLight(0xffffff, 0.8);
        this.scene.add(ambient);
        const sun = new THREE.DirectionalLight(0xffffff, 0.5);
        sun.position.set(20, 40, 20);
        this.scene.add(sun);

        this.createGround();
        window.addEventListener('resize', () => this.onResize());
    }

    createGround() {
        const geo = new THREE.PlaneGeometry(150, 150);
        const mat = new THREE.MeshLambertMaterial({ color: 0x1a1a2e });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.rotation.x = -Math.PI / 2;
        this.scene.add(mesh);

        const groundShape = new CANNON.Box(new CANNON.Vec3(75, 5, 75));
        const groundBody = new CANNON.Body({ mass: 0, position: new CANNON.Vec3(0, -5, 0), shape: groundShape });
        this.physics.addBody(groundBody);
    }

    loadLevel(levelId) {
        this.audio.init();
        const levelData = LEVELS.find(l => l.id === levelId);
        if (!levelData) return;

        this.state.level = levelId;
        this.state.score = 0;
        this.state.money = levelData.budget;
        this.state.voxelsDestroyed = 0;
        this.state.totalVoxels = 0;
        this.state.elapsedTime = 0;
        this.state.isRunning = true;
        this.state.isPaused = false;

        this.clearWorld();
        this.applyTheme(THEMES[levelData.setup.type] || THEMES.MODERN);
        this.populateLevel(levelData);

        document.getElementById('current-level').innerText = levelData.name;
        document.getElementById('objective').innerText = levelData.objectiveDescription;
        document.getElementById('progress-fill').style.width = '0%';
    }

    applyTheme(theme) {
        this.scene.background = new THREE.Color(theme.sky);
        this.scene.fog = new THREE.Fog(theme.sky, 20, 80);
    }

    populateLevel(data) {
        for (let i = 0; i < data.setup.count; i++) {
            const x = (Math.random() - 0.5) * 30;
            const z = (Math.random() - 0.5) * 30;
            const types = ['HOUSE', 'BUILDING'];
            const type = types[Math.floor(Math.random() * types.length)];

            const voxels = BuildingFactory.generateBuilding(x, z, type, THEMES[data.setup.type], this.physics.world, this.scene);
            voxels.forEach(v => {
                this.objects.push(v);
                this.state.totalVoxels++;
            });
        }
    }

    clearWorld() {
        for (let i = this.objects.length - 1; i >= 0; i--) {
            const obj = this.objects[i];
            if (obj.body) this.physics.removeBody(obj.body);
            if (obj.mesh) this.scene.remove(obj.mesh);
        }
        this.objects = [];
    }

    handleLeftClick() {
        if (!this.state.isRunning || this.state.isPaused) return;

        const intersects = this.input.getRayIntersection(this.objects.map(o => o.mesh).filter(m => m));
        let hitPoint = intersects.length > 0 ? intersects[0].point : null;

        if (!hitPoint) {
            const raycaster = this.input.getRaycaster();
            const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
            const target = new THREE.Vector3();
            raycaster.ray.intersectPlane(plane, target);
            hitPoint = target;
        }

        if (hitPoint) this.useTool(this.state.tool, hitPoint);
    }

    useTool(toolId, position) {
        const tool = TOOLS[toolId];
        if (!tool) return;

        if (tool.price > 0 && this.state.money < tool.price) {
            return;
        }
        if (tool.price > 0) {
            this.state.money -= tool.price;
        }

        if (tool.type === 'destroy') {
            this.spawnProjectile(tool, this.camera.position, position);
        } else if (tool.type === 'build') {
            const x = Math.round(position.x);
            const z = Math.round(position.z);
            const newVoxels = BuildingFactory.generateBuilding(x, z, toolId, THEMES.MODERN, this.physics.world, this.scene);
            newVoxels.forEach(v => {
                this.objects.push(v);
                this.state.totalVoxels++;
            });
        }
    }

    spawnProjectile(tool, start, target) {
        const geo = new THREE.SphereGeometry(0.5, 6, 6);
        const mat = new THREE.MeshBasicMaterial({ color: 0xff3300 });
        const mesh = new THREE.Mesh(geo, mat);

        const dir = new THREE.Vector3().subVectors(target, start).normalize();
        const spawnPos = start.clone().add(dir.clone().multiplyScalar(2));
        mesh.position.copy(spawnPos);
        this.scene.add(mesh);

        const shape = new CANNON.Sphere(0.5);
        const body = new CANNON.Body({ mass: 2, shape, position: new CANNON.Vec3(spawnPos.x, spawnPos.y, spawnPos.z) });
        body.velocity.set(dir.x * 35, dir.y * 35, dir.z * 35);
        this.physics.addBody(body);

        const projectile = { mesh, body, type: 'projectile', tool, life: 5 };
        this.objects.push(projectile);

        this.audio.playShoot();

        let exploded = false;
        body.addEventListener('collide', () => {
            if (!exploded) {
                exploded = true;
                this.explode(body.position, tool.force, tool.radius);
                projectile.life = 0;
            }
        });
    }

    explode(pos, force, radius) {
        this.audio.playExplosion(0.4);
        const expPos = new CANNON.Vec3(pos.x, pos.y, pos.z);

        this.objects.forEach(obj => {
            if (obj.type === 'voxel' && obj.body) {
                const dist = obj.body.position.distanceTo(expPos);
                if (dist < radius) {
                    obj.body.wakeUp();
                    const impulse = new CANNON.Vec3(
                        obj.body.position.x - expPos.x,
                        obj.body.position.y - expPos.y + 2,
                        obj.body.position.z - expPos.z
                    );
                    impulse.normalize();
                    impulse.scale(force * (1 - dist / radius), impulse);
                    obj.body.applyImpulse(impulse, obj.body.position);

                    if (!obj.scored) {
                        this.state.money += 5;
                        this.addScore(10);
                        obj.scored = true;
                    }
                }
            }
        });

        const flash = document.getElementById('flash-overlay');
        if (flash) { flash.style.opacity = 0.2; setTimeout(() => flash.style.opacity = 0, 60); }
    }

    addScore(points) {
        this.state.score += points;
        this.state.voxelsDestroyed++;
        this.ui.updateHUD(this.state.score, this.state.money, 0);
        this.checkVictory();
    }

    checkVictory() {
        if (!this.state.isRunning) return;
        const levelData = LEVELS.find(l => l.id === this.state.level);
        if (!levelData?.winCondition) return;

        let won = false;
        const cond = levelData.winCondition;

        if (cond.type === 'SCORE' && this.state.score >= cond.value) won = true;
        if (cond.type === 'DESTRUCTION_COUNT' && Math.floor(this.state.voxelsDestroyed / 20) >= cond.value) won = true;

        const progress = cond.type === 'SCORE'
            ? Math.min(100, (this.state.score / cond.value) * 100)
            : Math.min(100, (Math.floor(this.state.voxelsDestroyed / 20) / cond.value) * 100);
        document.getElementById('progress-fill').style.width = `${progress}%`;

        if (won) this.winLevel();
    }

    winLevel() {
        this.state.isRunning = false;
        this.audio.playWin();

        if (this.state.level < LEVELS.length) LEVELS[this.state.level].unlocked = true;

        const mins = Math.floor(this.state.elapsedTime / 60);
        const secs = Math.floor(this.state.elapsedTime % 60);
        document.getElementById('final-score').innerText = this.state.score;
        document.getElementById('final-time').innerText = `${mins}:${secs.toString().padStart(2, '0')}`;
        document.getElementById('final-stars').innerText = '⭐⭐⭐';

        this.ui.showPanel('victory');

        document.getElementById('btn-next-level').onclick = () => {
            if (this.state.level < LEVELS.length) {
                this.loadLevel(this.state.level + 1);
                this.ui.showGameUI();
            }
        };
        document.getElementById('btn-replay').onclick = () => {
            this.loadLevel(this.state.level);
            this.ui.showGameUI();
        };
    }

    setTool(toolId) { this.state.tool = toolId; }
    togglePause() { this.state.isPaused = !this.state.isPaused; this.ui.togglePauseMenu(this.state.isPaused); }
    onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        const dt = Math.min(this.clock.getDelta(), 0.05);

        if (this.state.isRunning && !this.state.isPaused) {
            this.state.elapsedTime += dt;
            this.physics.step(dt);

            for (let i = this.objects.length - 1; i >= 0; i--) {
                const obj = this.objects[i];
                if (!obj.mesh || !obj.body) continue;

                obj.mesh.position.copy(obj.body.position);
                obj.mesh.quaternion.copy(obj.body.quaternion);

                // INSTANT CLEANUP: Scored voxels near ground = DELETE
                if (obj.type === 'voxel' && obj.scored && obj.body.position.y < 1.2) {
                    this.scene.remove(obj.mesh);
                    this.physics.removeBody(obj.body);
                    this.objects.splice(i, 1);
                    continue;
                }

                // Fallen voxels
                if (obj.type === 'voxel' && obj.body.position.y < -5) {
                    this.scene.remove(obj.mesh);
                    this.physics.removeBody(obj.body);
                    this.objects.splice(i, 1);
                    continue;
                }

                // Projectile timeout
                if (obj.type === 'projectile') {
                    obj.life -= dt;
                    if (obj.life <= 0) {
                        this.scene.remove(obj.mesh);
                        this.physics.removeBody(obj.body);
                        this.objects.splice(i, 1);
                    }
                }
            }
        }

        this.controls.update();
        this.renderer.render(this.scene, this.camera);
        this.ui.updateHUD(this.state.score, this.state.money, Math.round(1 / Math.max(dt, 0.001)));
    }
}

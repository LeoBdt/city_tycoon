import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

import { PhysicsWorld } from './PhysicsWorld.js';
import { UIManager } from '../managers/UIManager.js';
import { InputManager } from '../managers/InputManager.js';
import { SoundManager } from '../managers/SoundManager.js';
import { BuildingFactory } from '../entities/BuildingFactory.js';
import { ParticleSystem } from './ParticleSystem.js';
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
        this.particles = null;

        // Instanced Rendering
        this.maxInstances = 10000;
        this.instancedMesh = null;
        this.voxels = []; // Stores { body, color, active, etc. }
        this.dummy = new THREE.Object3D(); // Helper for matrix calc

        this.objects = []; // Non-voxel objects (projectiles, black holes)

        this.state = {
            score: 0,
            money: CONFIG.STARTING_MONEY,
            level: 1,
            tool: 'BALL',
            isRunning: false,
            isPaused: false,
            elapsedTime: 0,
            voxelsDestroyed: 0,
            totalVoxels: 0,
            comboCount: 0,
            comboTimer: 0,
            comboMultiplier: 1
        };

        this.ui = new UIManager(this);
        this.clock = new THREE.Clock();

        this.init();
    }

    async init() {
        this.initThree();
        this.particles = new ParticleSystem(this.scene);
        this.input = new InputManager(this.camera, this.renderer.domElement);
        this.input.on('onClick', () => this.handleLeftClick());
        this.animate();
    }

    initThree() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 300);
        this.camera.position.set(40, 40, 40);

        this.renderer = new THREE.WebGLRenderer({ antialias: false });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(1); // Performance
        this.renderer.shadowMap.enabled = false;
        document.getElementById('app').appendChild(this.renderer.domElement);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.maxPolarAngle = Math.PI / 2 - 0.1;
        this.controls.minDistance = 10;
        this.controls.maxDistance = 100;

        const ambient = new THREE.AmbientLight(0xffffff, 0.7);
        this.scene.add(ambient);
        const sun = new THREE.DirectionalLight(0xffffff, 0.6);
        sun.position.set(30, 50, 30);
        this.scene.add(sun);

        this.createGround();
        this.initInstancedMesh(); // NEW

        window.addEventListener('resize', () => this.onResize());
    }

    createGround() {
        const geo = new THREE.PlaneGeometry(200, 200);
        const mat = new THREE.MeshLambertMaterial({ color: 0x1a1a2e });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.rotation.x = -Math.PI / 2;
        this.scene.add(mesh);

        const groundShape = new CANNON.Box(new CANNON.Vec3(100, 5, 100));
        const groundBody = new CANNON.Body({ mass: 0, position: new CANNON.Vec3(0, -5, 0), shape: groundShape });
        this.physics.addBody(groundBody);
    }

    initInstancedMesh() {
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshLambertMaterial({ color: 0xffffff }); // Base color white to multiply with instance color
        this.instancedMesh = new THREE.InstancedMesh(geometry, material, this.maxInstances);
        this.instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        this.scene.add(this.instancedMesh);
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

        this.state.comboCount = 0;
        this.state.comboTimer = 0;
        this.state.comboMultiplier = 1;

        this.clearWorld();
        this.applyTheme(THEMES[levelData.setup.type] || THEMES.MODERN);
        this.populateLevel(levelData);

        document.getElementById('current-level').innerText = levelData.name;
        document.getElementById('objective').innerText = levelData.objectiveDescription;
        document.getElementById('progress-fill').style.width = '0%';
        this.updateComboUI();
    }

    applyTheme(theme) {
        this.scene.background = new THREE.Color(theme.sky);
        this.scene.fog = new THREE.Fog(theme.sky, 30, 90);
    }

    populateLevel(data) {
        // Safe Grid Spawning Logic
        const gridSize = 8;
        const usedPos = [];
        let count = 0;
        let attempts = 0;

        while (count < data.setup.count && attempts < 200) {
            attempts++;
            const gx = Math.floor((Math.random() * 10) - 5);
            const gz = Math.floor((Math.random() * 10) - 5);
            const key = `${gx},${gz}`;

            if (usedPos.includes(key)) continue;
            usedPos.push(key);
            count++;

            const realX = gx * gridSize;
            const realZ = gz * gridSize;

            let types = ['HOUSE', 'BUILDING'];
            if (data.setup.type === 'INDUSTRIAL') types = ['FACTORY', 'GAS_STATION'];
            else if (data.setup.type === 'MODERN') types = ['HOUSE', 'BUILDING', 'SKYSCRAPER'];
            else if (data.setup.type === 'ANCIENT') types = ['HOUSE', 'BUILDING'];

            const type = types[Math.floor(Math.random() * types.length)];

            // Generate Data
            const newVoxels = BuildingFactory.generateBuilding(realX, realZ, type, THEMES[data.setup.type], this.physics.world);

            // Add to our list
            newVoxels.forEach(v => {
                if (this.voxels.length < this.maxInstances) {
                    this.voxels.push(v);
                    this.state.totalVoxels++;

                    // Set initial color
                    const index = this.voxels.length - 1;
                    this.instancedMesh.setColorAt(index, v.color);
                }
            });
        }

        // Notify instance mesh that colors changed
        this.instancedMesh.instanceColor.needsUpdate = true;
    }

    clearWorld() {
        // Clear Physics
        for (let i = this.voxels.length - 1; i >= 0; i--) {
            if (this.voxels[i].body) this.physics.removeBody(this.voxels[i].body);
        }
        this.voxels = [];

        // Clear Objects
        for (let i = this.objects.length - 1; i >= 0; i--) {
            const obj = this.objects[i];
            if (obj.body) this.physics.removeBody(obj.body);
            if (obj.mesh) this.scene.remove(obj.mesh);
        }
        this.objects = [];

        // Reset Instance Mesh
        this.instancedMesh.count = 0; // Hide all

        // Clear particles
        if (this.particles) {
            this.particles.particles.forEach(p => this.scene.remove(p.mesh));
            this.particles.particles = [];
        }
    }

    handleLeftClick() {
        if (!this.state.isRunning || this.state.isPaused) return;

        // Raycasting against InstancedMesh
        const intersection = this.getInstancedIntersection();
        let hitPoint = null;

        if (intersection) {
            hitPoint = intersection.point;
        } else {
            // Plane fallback
            const raycaster = this.input.getRaycaster();
            const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
            const target = new THREE.Vector3();
            raycaster.ray.intersectPlane(plane, target);
            hitPoint = target;
        }

        if (hitPoint) this.useTool(this.state.tool, hitPoint);
    }

    getInstancedIntersection() {
        const raycaster = this.input.getRaycaster();
        const intersects = raycaster.intersectObject(this.instancedMesh);
        if (intersects.length > 0) {
            // Filter only active instances
            for (let i = 0; i < intersects.length; i++) {
                const instanceId = intersects[i].instanceId;
                if (this.voxels[instanceId] && this.voxels[instanceId].active) {
                    return intersects[i];
                }
            }
        }
        return null;
    }

    useTool(toolId, position) {
        const tool = TOOLS[toolId];
        if (!tool) return;

        if (tool.price > 0 && this.state.money < tool.price) return;
        if (tool.price > 0) this.state.money -= tool.price;

        if (tool.id === 'BLACK_HOLE') {
            this.spawnBlackHole(position, tool);
        } else if (tool.type === 'destroy') {
            this.spawnProjectile(tool, this.camera.position, position);
        } else if (tool.type === 'build') {
            // Building logic for instanced mesh? 
            // Currently complex to add dynamic buildings to full buffer.
            // Simplification: Can only build if buffer not full.
            const x = Math.round(position.x);
            const z = Math.round(position.z);

            // Check limit
            if (this.voxels.length + 100 > this.maxInstances) {
                this.ui.showFloatingText("Limite atteinte!", window.innerWidth / 2, window.innerHeight / 2, 'destruction');
                return;
            }

            const startIdx = this.voxels.length;
            const newVoxels = BuildingFactory.generateBuilding(x, z, toolId, THEMES.MODERN, this.physics.world);

            newVoxels.forEach(v => {
                this.voxels.push(v);
                this.instancedMesh.setColorAt(this.voxels.length - 1, v.color);
                this.state.totalVoxels++;
            });
            this.instancedMesh.instanceColor.needsUpdate = true;
            this.audio.playTone(400, 0.1, 'sine');
        }
    }

    spawnBlackHole(position, tool) {
        const geo = new THREE.SphereGeometry(2, 16, 16);
        const mat = new THREE.MeshBasicMaterial({ color: 0x000000 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(position);
        mesh.position.y = 5;
        this.scene.add(mesh);

        const ringGeo = new THREE.RingGeometry(3, 5, 32);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0x8800ff, side: THREE.DoubleSide });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = -Math.PI / 2;
        mesh.add(ring);

        const blackHole = {
            mesh,
            type: 'blackhole',
            life: tool.duration || 5,
            radius: tool.radius || 30,
            force: 150
        };
        this.objects.push(blackHole);
        this.audio.playTone(100, 1.0, 'sawtooth');
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
        body.velocity.set(dir.x * 40, dir.y * 40, dir.z * 40);
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
        if (Math.random() > 0.5) this.audio.playExplosion(0.5);
        if (radius > 10) this.particles.spawn(pos, 30, 'FIRE');
        else this.particles.spawn(pos, 10, 'SMOKE');

        const expPos = new CANNON.Vec3(pos.x, pos.y, pos.z);

        // Iterate over VOXELS (Instanced)
        for (let i = 0; i < this.voxels.length; i++) {
            const obj = this.voxels[i];
            if (!obj.active) continue;

            const dist = obj.body.position.distanceTo(expPos);
            if (dist < radius) {
                obj.body.wakeUp();
                const impulse = new CANNON.Vec3(
                    (obj.body.position.x - expPos.x),
                    (obj.body.position.y - expPos.y) + 3,
                    (obj.body.position.z - expPos.z)
                );
                impulse.normalize();
                impulse.scale(force * (1 - dist / radius), impulse);
                obj.body.applyImpulse(impulse, obj.body.position);

                if (!obj.scored) {
                    this.state.money += 1;
                    this.addScore(1);
                    obj.scored = true;

                    if (obj.isExplosive && !obj.hasExploded) {
                        obj.hasExploded = true;
                        setTimeout(() => {
                            if (obj.active) {
                                this.explode(obj.body.position, 40, 10);
                                this.particles.spawn(obj.body.position, 20, 'FIRE');
                            }
                        }, 150 + Math.random() * 200);
                    }
                }
            }
        }

        if (radius > 10) {
            const flash = document.getElementById('flash-overlay');
            if (flash) { flash.style.opacity = 0.3; setTimeout(() => flash.style.opacity = 0, 80); }
        }
    }

    addScore(points) {
        if (this.state.comboTimer > 0) {
            this.state.comboCount++;
        } else {
            this.state.comboCount = 1;
        }
        this.state.comboMultiplier = 1 + Math.floor(this.state.comboCount / 5);
        this.state.comboTimer = 2.0;
        this.state.score += points * this.state.comboMultiplier;
        this.state.voxelsDestroyed++;
        this.updateComboUI();
        this.ui.updateHUD(this.state.score, this.state.money, 0);
        this.checkVictory();
    }

    updateComboUI() {
        const comboEl = document.getElementById('combo-display');
        const valEl = document.getElementById('combo-value');
        if (comboEl && valEl) {
            if (this.state.comboTimer > 0 && this.state.comboMultiplier > 1) {
                comboEl.classList.remove('hidden');
                valEl.innerText = `x${this.state.comboMultiplier}`;
                comboEl.style.transform = `scale(${1 + this.state.comboMultiplier * 0.1})`;
            } else {
                comboEl.classList.add('hidden');
            }
        }
    }

    checkVictory() {
        if (!this.state.isRunning) return;
        const levelData = LEVELS.find(l => l.id === this.state.level);
        if (!levelData?.winCondition) return;

        let won = false;
        const cond = levelData.winCondition;
        if (cond.type === 'SCORE' && this.state.score >= cond.value) won = true;
        if (cond.type === 'DESTRUCTION_COUNT' && Math.floor(this.state.voxelsDestroyed / 60) >= cond.value) won = true;

        const progress = cond.type === 'SCORE'
            ? Math.min(100, (this.state.score / cond.value) * 100)
            : Math.min(100, (Math.floor(this.state.voxelsDestroyed / 60) / cond.value) * 100);
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
        document.getElementById('btn-next-level').onclick = () => { if (this.state.level < LEVELS.length) { this.loadLevel(this.state.level + 1); this.ui.showGameUI(); } };
        document.getElementById('btn-replay').onclick = () => { this.loadLevel(this.state.level); this.ui.showGameUI(); };
    }

    setTool(toolId) { this.state.tool = toolId; }
    togglePause() { this.state.isPaused = !this.state.isPaused; this.ui.togglePauseMenu(this.state.isPaused); }
    onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    // BLACK HOLE (Adapted for InstancedMesh)
    applyBlackHole(center, radius, force, dt) {
        const holePos = center;
        for (let i = 0; i < this.voxels.length; i++) {
            const obj = this.voxels[i];
            if (!obj.active || !obj.body) continue;

            const dist = obj.body.position.distanceTo(holePos);
            if (dist < radius) {
                obj.body.wakeUp();
                const dir = new CANNON.Vec3(holePos.x - obj.body.position.x, holePos.y - obj.body.position.y, holePos.z - obj.body.position.z);
                dir.normalize();
                const pull = force * (1 / (dist + 1));
                dir.scale(pull * dt, dir);
                obj.body.applyImpulse(dir, obj.body.position);
                if (dist < 2.0) {
                    if (!obj.scored) { this.addScore(5); obj.scored = true; }
                    obj.body.position.y = -100; // Kill logic will handle it
                }
            }
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        const dt = Math.min(this.clock.getDelta(), 0.05);

        if (this.state.isRunning && !this.state.isPaused) {
            this.state.elapsedTime += dt;
            this.physics.step(dt);
            this.particles.update(dt);

            if (this.state.comboTimer > 0) {
                this.state.comboTimer -= dt;
                if (this.state.comboTimer <= 0) {
                    this.state.comboTimer = 0;
                    this.state.comboCount = 0;
                    this.state.comboMultiplier = 1;
                    this.updateComboUI();
                }
            }

            // --- INSTANCED MESH UPDATE ---
            this.instancedMesh.count = this.voxels.length;
            let dirty = false;

            for (let i = 0; i < this.voxels.length; i++) {
                const voxel = this.voxels[i];
                if (!voxel.active) {
                    this.dummy.scale.set(0, 0, 0); // Hide
                    this.dummy.updateMatrix();
                    this.instancedMesh.setMatrixAt(i, this.dummy.matrix);
                    continue;
                }

                // Sync Physics -> Graphics
                this.dummy.position.copy(voxel.body.position);
                this.dummy.quaternion.copy(voxel.body.quaternion);
                this.dummy.scale.set(1, 1, 1);
                this.dummy.updateMatrix();

                this.instancedMesh.setMatrixAt(i, this.dummy.matrix);
                dirty = true;

                // Cleanup Logic
                // 1) Scored + Near ground
                if (voxel.scored && voxel.body.position.y < 1.0) {
                    voxel.active = false;
                    this.physics.removeBody(voxel.body);
                    this.dummy.scale.set(0, 0, 0);
                    this.dummy.updateMatrix();
                    this.instancedMesh.setMatrixAt(i, this.dummy.matrix);
                    continue;
                }
                // 2) Fell too low
                if (voxel.body.position.y < -5) {
                    voxel.active = false;
                    this.physics.removeBody(voxel.body);
                    this.dummy.scale.set(0, 0, 0);
                    this.dummy.updateMatrix();
                    this.instancedMesh.setMatrixAt(i, this.dummy.matrix);
                    continue;
                }
            }

            if (dirty) {
                this.instancedMesh.instanceMatrix.needsUpdate = true;
            }

            // Projectile / BlackHole Update
            for (let i = this.objects.length - 1; i >= 0; i--) {
                const obj = this.objects[i];
                if (!obj.mesh || !obj.body && obj.type !== 'blackhole') continue;

                if (obj.body) {
                    obj.mesh.position.copy(obj.body.position);
                    obj.mesh.quaternion.copy(obj.body.quaternion);
                }

                if (obj.type === 'blackhole') {
                    obj.life -= dt;
                    obj.mesh.children[0].rotation.z += dt * 5;
                    this.applyBlackHole(obj.mesh.position, obj.radius, obj.force, dt);
                    if (obj.life <= 0) {
                        this.scene.remove(obj.mesh);
                        this.objects.splice(i, 1);
                        continue;
                    }
                }
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

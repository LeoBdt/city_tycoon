import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

import { getPhysics } from './PhysicsWorld.js';
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

        this.physics = null;
        this.audio = new SoundManager();
        this.particles = null;

        // Instanced Rendering
        this.maxInstances = 15000;
        this.instancedMesh = null;
        this.voxels = [];
        this.dummy = new THREE.Object3D();

        this.objects = [];

        // FPS Counter
        this.lastFrameTime = performance.now();
        this.fpsSmooth = 60;

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
        // Init Rapier first (async WASM load)
        this.physics = await getPhysics();

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

        this.renderer = new THREE.WebGLRenderer({
            antialias: false,
            powerPreference: 'high-performance'
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(1);
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
        this.initInstancedMesh();

        window.addEventListener('resize', () => this.onResize());
    }

    createGround() {
        const geo = new THREE.PlaneGeometry(200, 200);
        const mat = new THREE.MeshLambertMaterial({ color: 0x1a1a2e });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.rotation.x = -Math.PI / 2;
        this.scene.add(mesh);

        this.physics.createGround();
    }

    initInstancedMesh() {
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshLambertMaterial({ color: 0xffffff });
        this.instancedMesh = new THREE.InstancedMesh(geometry, material, this.maxInstances);
        this.instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        this.scene.add(this.instancedMesh);
    }

    async loadLevel(levelId) {
        this.ui.showLoading();
        await new Promise(r => setTimeout(r, 50));

        this.audio.init();
        if (this.audio.ctx.state === 'running' && !this.audio.isPlayingMusic) {
            this.audio.startMusic();
        }

        const levelData = LEVELS.find(l => l.id === levelId);
        if (!levelData) {
            this.ui.hideLoading();
            return;
        }

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

        await this.populateLevel(levelData);

        document.getElementById('current-level').innerText = levelData.name;
        document.getElementById('objective').innerText = levelData.objectiveDescription;
        document.getElementById('progress-fill').style.width = '0%';
        this.updateComboUI();

        this.ui.hideLoading();
    }

    applyTheme(theme) {
        this.scene.background = new THREE.Color(theme.sky);
        this.scene.fog = new THREE.Fog(theme.sky, 30, 90);
    }

    async populateLevel(data) {
        const gridSize = 8;
        const usedPos = [];
        let count = 0;
        let attempts = 0;

        while (count < data.setup.count && attempts < 200) {
            attempts++;

            if (count % 2 === 0) await new Promise(r => setTimeout(r, 0));

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

            // No physics bodies created here - just visual data
            const newVoxels = BuildingFactory.generateBuilding(realX, realZ, type, THEMES[data.setup.type]);

            newVoxels.forEach(v => {
                if (this.voxels.length < this.maxInstances) {
                    this.voxels.push(v);
                    this.state.totalVoxels++;
                    const index = this.voxels.length - 1;
                    this.instancedMesh.setColorAt(index, v.color);

                    this.dummy.position.set(v.position.x, v.position.y, v.position.z);
                    this.dummy.quaternion.set(0, 0, 0, 1);
                    this.dummy.scale.set(1, 1, 1);
                    this.dummy.updateMatrix();
                    this.instancedMesh.setMatrixAt(index, this.dummy.matrix);
                }
            });

            this.instancedMesh.instanceColor.needsUpdate = true;
            this.instancedMesh.count = this.voxels.length;
            this.instancedMesh.instanceMatrix.needsUpdate = true;
        }
    }

    clearWorld() {
        // Remove all physics bodies
        for (let i = this.voxels.length - 1; i >= 0; i--) {
            if (this.voxels[i].body) {
                this.physics.removeBody(this.voxels[i].body);
            }
        }
        this.voxels = [];

        for (let i = this.objects.length - 1; i >= 0; i--) {
            const obj = this.objects[i];
            if (obj.body) this.physics.removeBody(obj.body);
            if (obj.mesh) this.scene.remove(obj.mesh);
        }
        this.objects = [];
        this.instancedMesh.count = 0;

        if (this.particles) {
            this.particles.particles.forEach(p => this.scene.remove(p.mesh));
            this.particles.particles = [];
        }
    }

    handleLeftClick() {
        if (this.audio && this.audio.ctx && this.audio.ctx.state === 'suspended') {
            this.audio.ctx.resume();
            this.audio.startMusic();
        } else if (this.audio && !this.audio.isPlayingMusic) {
            this.audio.startMusic();
        }

        if (!this.state.isRunning || this.state.isPaused) return;

        const intersection = this.getInstancedIntersection();
        let hitPoint = null;

        if (intersection) {
            hitPoint = intersection.point;
        } else {
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

        if (tool.price > 0 && this.state.money < tool.price) {
            this.audio.playError();
            this.ui.showFloatingText("Pas assez d'argent!", window.innerWidth / 2, window.innerHeight / 2, 'destruction');
            return;
        }
        if (tool.price > 0) this.state.money -= tool.price;

        if (tool.id === 'BLACK_HOLE') {
            this.spawnBlackHole(position, tool);
        } else if (tool.type === 'destroy') {
            this.spawnProjectile(tool, this.camera.position, position);
        } else if (tool.type === 'build') {
            const x = Math.round(position.x);
            const z = Math.round(position.z);

            if (this.voxels.length + 100 > this.maxInstances) {
                this.audio.playError();
                this.ui.showFloatingText("Limite atteinte!", window.innerWidth / 2, window.innerHeight / 2, 'destruction');
                return;
            }

            const newVoxels = BuildingFactory.generateBuilding(x, z, toolId, THEMES.MODERN);

            newVoxels.forEach(v => {
                this.voxels.push(v);
                const index = this.voxels.length - 1;
                this.instancedMesh.setColorAt(index, v.color);

                this.dummy.position.set(v.position.x, v.position.y, v.position.z);
                this.dummy.quaternion.set(0, 0, 0, 1);
                this.dummy.scale.set(1, 1, 1);
                this.dummy.updateMatrix();
                this.instancedMesh.setMatrixAt(index, this.dummy.matrix);

                this.state.totalVoxels++;
            });
            this.instancedMesh.instanceColor.needsUpdate = true;
            this.instancedMesh.instanceMatrix.needsUpdate = true;
            this.instancedMesh.count = this.voxels.length;
            this.audio.playBuild();
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

        // Create physics body for projectile
        const body = this.physics.createRigidBody(
            { x: spawnPos.x, y: spawnPos.y, z: spawnPos.z },
            true
        );
        this.physics.createBoxCollider(body, { x: 0.5, y: 0.5, z: 0.5 });
        this.physics.applyImpulse(body, { x: dir.x * 80, y: dir.y * 80, z: dir.z * 80 });

        const projectile = { mesh, body, type: 'projectile', tool, life: 5, exploded: false };
        this.objects.push(projectile);

        this.audio.playShoot();
    }

    explode(pos, force, radius) {
        if (Math.random() > 0.5) this.audio.playExplosion(0.5);
        if (radius > 10) this.particles.spawn(pos, 30, 'FIRE');
        else this.particles.spawn(pos, 10, 'SMOKE');

        const expPos = { x: pos.x, y: pos.y, z: pos.z };
        const affectedVoxels = []; // Track voxels that got physics

        for (let i = 0; i < this.voxels.length; i++) {
            const voxel = this.voxels[i];
            if (!voxel.active) continue;

            // Get voxel position (from physics or stored position)
            let voxelPos;
            if (voxel.hasPhysics && voxel.body) {
                voxelPos = this.physics.getPosition(voxel.body);
            } else {
                voxelPos = voxel.position;
            }

            const dx = voxelPos.x - expPos.x;
            const dy = voxelPos.y - expPos.y;
            const dz = voxelPos.z - expPos.z;
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

            if (dist < radius) {
                // Create physics body on-demand if not already created
                if (!voxel.hasPhysics) {
                    voxel.body = this.physics.createRigidBody(voxel.position, true);
                    this.physics.createBoxCollider(voxel.body, { x: 0.5, y: 0.5, z: 0.5 });
                    voxel.hasPhysics = true;
                    affectedVoxels.push(voxel);
                }

                // Apply explosion impulse
                this.physics.wakeUp(voxel.body);
                const strength = force * (1 - dist / radius);
                const impulse = {
                    x: (dx / (dist + 0.1)) * strength,
                    y: ((dy + 3) / (dist + 0.1)) * strength,
                    z: (dz / (dist + 0.1)) * strength
                };
                this.physics.applyImpulse(voxel.body, impulse);

                if (!voxel.scored) {
                    this.state.money += 3;
                    this.addScore(1);
                    voxel.scored = true;

                    if (voxel.isExplosive && !voxel.hasExploded) {
                        voxel.hasExploded = true;
                        setTimeout(() => {
                            if (voxel.active && voxel.body) {
                                const p = this.physics.getPosition(voxel.body);
                                this.explode(p, 40, 10);
                                this.particles.spawn(p, 20, 'FIRE');
                            }
                        }, 150 + Math.random() * 200);
                    }
                }
            }
        }

        // PROPAGATION VERTICALE : activer les voxels AU-DESSUS des voxels touchés
        // pour qu'ils s'effondrent naturellement
        this.propagatePhysicsUpward(affectedVoxels);

        if (radius > 10) {
            const flash = document.getElementById('flash-overlay');
            if (flash) { flash.style.opacity = 0.3; setTimeout(() => flash.style.opacity = 0, 80); }
        }
    }

    // Propage la physique vers les voxels au-dessus pour créer l'effondrement
    propagatePhysicsUpward(affectedVoxels) {
        const toActivate = new Set();
        const threshold = 1.5; // Distance XZ max pour considérer un voxel comme "au-dessus"

        for (const affected of affectedVoxels) {
            const basePos = affected.position;

            for (let i = 0; i < this.voxels.length; i++) {
                const voxel = this.voxels[i];
                if (!voxel.active || voxel.hasPhysics) continue;

                const vPos = voxel.position;

                // Vérifier si ce voxel est AU-DESSUS (y plus grand) et aligné en XZ
                if (vPos.y > basePos.y) {
                    const dxz = Math.sqrt(
                        (vPos.x - basePos.x) ** 2 +
                        (vPos.z - basePos.z) ** 2
                    );

                    if (dxz < threshold) {
                        toActivate.add(i);
                    }
                }
            }
        }

        // Activer tous les voxels marqués
        for (const idx of toActivate) {
            const voxel = this.voxels[idx];
            if (!voxel.hasPhysics) {
                voxel.body = this.physics.createRigidBody(voxel.position, true);
                this.physics.createBoxCollider(voxel.body, { x: 0.5, y: 0.5, z: 0.5 });
                voxel.hasPhysics = true;
            }
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
    togglePause() {
        this.state.isPaused = !this.state.isPaused;
        this.ui.togglePauseMenu(this.state.isPaused);
    }

    onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    applyBlackHole(center, radius, force, dt) {
        for (let i = 0; i < this.voxels.length; i++) {
            const voxel = this.voxels[i];
            if (!voxel.active) continue;

            let voxelPos;
            if (voxel.hasPhysics && voxel.body) {
                voxelPos = this.physics.getPosition(voxel.body);
            } else {
                voxelPos = voxel.position;
            }

            const dx = center.x - voxelPos.x;
            const dy = center.y - voxelPos.y;
            const dz = center.z - voxelPos.z;
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

            if (dist < radius) {
                // Create physics on-demand
                if (!voxel.hasPhysics) {
                    voxel.body = this.physics.createRigidBody(voxel.position, true);
                    this.physics.createBoxCollider(voxel.body, { x: 0.5, y: 0.5, z: 0.5 });
                    voxel.hasPhysics = true;
                }

                this.physics.wakeUp(voxel.body);
                const pull = force * (1 / (dist + 1)) * dt;
                const len = Math.sqrt(dx * dx + dy * dy + dz * dz) + 0.1;
                this.physics.applyImpulse(voxel.body, {
                    x: (dx / len) * pull,
                    y: (dy / len) * pull,
                    z: (dz / len) * pull
                });

                if (dist < 2.0) {
                    if (!voxel.scored) {
                        this.addScore(5);
                        voxel.scored = true;
                    }
                    voxel.position.y = -100;
                    if (voxel.body) {
                        this.physics.removeBody(voxel.body);
                        voxel.body = null;
                    }
                    voxel.active = false;
                }
            }
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        const dt = Math.min(this.clock.getDelta(), 0.05);

        if (this.state.isRunning && !this.state.isPaused) {
            this.state.elapsedTime += dt;
            this.physics.step();
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

            // Check projectile collisions
            for (let i = this.objects.length - 1; i >= 0; i--) {
                const obj = this.objects[i];
                if (obj.type === 'projectile' && obj.body && !obj.exploded) {
                    const pos = this.physics.getPosition(obj.body);

                    // Check if projectile hit ground or voxel
                    if (pos.y < 1.0) {
                        obj.exploded = true;
                        this.explode(pos, obj.tool.force, obj.tool.radius);
                        obj.life = 0;
                    } else {
                        // Check collision with voxels in radius
                        for (let j = 0; j < this.voxels.length; j++) {
                            const voxel = this.voxels[j];
                            if (!voxel.active) continue;

                            const vp = voxel.hasPhysics ? this.physics.getPosition(voxel.body) : voxel.position;
                            const dx = pos.x - vp.x;
                            const dy = pos.y - vp.y;
                            const dz = pos.z - vp.z;
                            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

                            if (dist < 1.5) {
                                obj.exploded = true;
                                this.explode(pos, obj.tool.force, obj.tool.radius);
                                obj.life = 0;
                                break;
                            }
                        }
                    }
                }
            }

            this.instancedMesh.count = this.voxels.length;
            let dirty = false;

            for (let i = 0; i < this.voxels.length; i++) {
                const voxel = this.voxels[i];
                if (!voxel.active) continue;

                // Only update if has physics and not sleeping
                if (voxel.hasPhysics && voxel.body) {
                    if (!this.physics.isSleeping(voxel.body)) {
                        const pos = this.physics.getPosition(voxel.body);
                        const rot = this.physics.getRotation(voxel.body);

                        this.dummy.position.set(pos.x, pos.y, pos.z);
                        this.dummy.quaternion.set(rot.x, rot.y, rot.z, rot.w);
                        this.dummy.scale.set(1, 1, 1);
                        this.dummy.updateMatrix();
                        this.instancedMesh.setMatrixAt(i, this.dummy.matrix);
                        dirty = true;

                        // Update stored position
                        voxel.position.x = pos.x;
                        voxel.position.y = pos.y;
                        voxel.position.z = pos.z;
                    }

                    // Remove if below ground
                    if (voxel.scored && voxel.position.y < 1.0) {
                        voxel.active = false;
                        this.physics.removeBody(voxel.body);
                        voxel.body = null;
                        this.dummy.scale.set(0, 0, 0);
                        this.dummy.updateMatrix();
                        this.instancedMesh.setMatrixAt(i, this.dummy.matrix);
                        dirty = true;
                        continue;
                    }

                    if (voxel.position.y < -5) {
                        voxel.active = false;
                        this.physics.removeBody(voxel.body);
                        voxel.body = null;
                        this.dummy.scale.set(0, 0, 0);
                        this.dummy.updateMatrix();
                        this.instancedMesh.setMatrixAt(i, this.dummy.matrix);
                        dirty = true;
                        continue;
                    }
                }
            }

            if (dirty) {
                this.instancedMesh.instanceMatrix.needsUpdate = true;
            }

            // Update other objects (projectiles, black holes)
            for (let i = this.objects.length - 1; i >= 0; i--) {
                const obj = this.objects[i];

                if (obj.type === 'projectile' && obj.body) {
                    const pos = this.physics.getPosition(obj.body);
                    obj.mesh.position.set(pos.x, pos.y, pos.z);

                    obj.life -= dt;
                    if (obj.life <= 0) {
                        this.scene.remove(obj.mesh);
                        this.physics.removeBody(obj.body);
                        this.objects.splice(i, 1);
                    }
                }

                if (obj.type === 'blackhole') {
                    obj.life -= dt;
                    obj.mesh.children[0].rotation.z += dt * 5;
                    this.applyBlackHole(obj.mesh.position, obj.radius, obj.force, dt);
                    if (obj.life <= 0) {
                        this.scene.remove(obj.mesh);
                        this.objects.splice(i, 1);
                    }
                }
            }
        }

        this.controls.update();
        this.renderer.render(this.scene, this.camera);

        // FPS calculation
        const now = performance.now();
        const realDt = (now - this.lastFrameTime) / 1000;
        this.lastFrameTime = now;
        const currentFps = 1 / Math.max(realDt, 0.001);
        this.fpsSmooth = this.fpsSmooth * 0.9 + currentFps * 0.1;

        this.ui.updateHUD(this.state.score, this.state.money, Math.round(this.fpsSmooth));
    }
}

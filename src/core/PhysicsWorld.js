import RAPIER from '@dimforge/rapier3d-compat';
import { CONFIG } from '../utils/constants.js';

export class PhysicsWorld {
    constructor() {
        this.world = null;
        this.initialized = false;
        this.bodies = new Map(); // handle -> body
        this.colliders = new Map(); // handle -> collider
    }

    async init() {
        await RAPIER.init();

        const gravity = { x: 0.0, y: CONFIG.GRAVITY, z: 0.0 };
        this.world = new RAPIER.World(gravity);

        // Optimizations
        this.world.timestep = 1 / 60;

        this.initialized = true;
        return this;
    }

    createRigidBody(position, isDynamic = true, userData = null) {
        if (!this.initialized) return null;

        let bodyDesc;
        if (isDynamic) {
            bodyDesc = RAPIER.RigidBodyDesc.dynamic()
                .setTranslation(position.x, position.y, position.z)
                .setCcdEnabled(false) // No CCD for perf
                .setCanSleep(true);
        } else {
            bodyDesc = RAPIER.RigidBodyDesc.fixed()
                .setTranslation(position.x, position.y, position.z);
        }

        const body = this.world.createRigidBody(bodyDesc);
        body.userData = userData;
        this.bodies.set(body.handle, body);
        return body;
    }

    createBoxCollider(body, halfExtents) {
        if (!this.initialized || !body) return null;

        const colliderDesc = RAPIER.ColliderDesc.cuboid(
            halfExtents.x,
            halfExtents.y,
            halfExtents.z
        )
            .setRestitution(0.1)
            .setFriction(0.5)
            .setDensity(1.0);

        const collider = this.world.createCollider(colliderDesc, body);
        this.colliders.set(collider.handle, collider);
        return collider;
    }

    removeBody(body) {
        if (!this.initialized || !body) return;

        try {
            this.bodies.delete(body.handle);
            this.world.removeRigidBody(body);
        } catch (e) {
            // Body already removed
        }
    }

    applyImpulse(body, impulse) {
        if (!body || !this.initialized) return;
        body.applyImpulse({ x: impulse.x, y: impulse.y, z: impulse.z }, true);
    }

    wakeUp(body) {
        if (!body || !this.initialized) return;
        body.wakeUp();
    }

    getPosition(body) {
        if (!body) return { x: 0, y: 0, z: 0 };
        return body.translation();
    }

    getRotation(body) {
        if (!body) return { x: 0, y: 0, z: 0, w: 1 };
        return body.rotation();
    }

    isSleeping(body) {
        if (!body) return true;
        return body.isSleeping();
    }

    step() {
        if (!this.initialized) return;
        this.world.step();
    }

    // Create ground
    createGround() {
        const body = this.createRigidBody({ x: 0, y: -5, z: 0 }, false);
        this.createBoxCollider(body, { x: 100, y: 5, z: 100 });
        return body;
    }
}

// Singleton
let physicsInstance = null;

export async function getPhysics() {
    if (!physicsInstance) {
        physicsInstance = new PhysicsWorld();
        await physicsInstance.init();
    }
    return physicsInstance;
}

import * as CANNON from 'cannon-es';
import { CONFIG } from '../utils/constants.js';

export class PhysicsWorld {
    constructor() {
        this.world = new CANNON.World();

        // Optimized broadphase
        this.world.broadphase = new CANNON.SAPBroadphase(this.world);
        this.world.broadphase.useBoundingBoxes = true;
        this.world.allowSleep = true;

        this.world.gravity.set(0, CONFIG.GRAVITY, 0);
        this.world.solver.iterations = 10;

        this.materials = {
            default: new CANNON.Material('default'),
            ground: new CANNON.Material('ground')
        };

        const contactMat = new CANNON.ContactMaterial(
            this.materials.default,
            this.materials.default,
            { friction: 0.5, restitution: 0.1 }
        );
        this.world.addContactMaterial(contactMat);
    }

    addBody(body) {
        this.world.addBody(body);
    }

    removeBody(body) {
        this.world.removeBody(body);
    }

    step(dt) {
        this.world.step(CONFIG.PHYSICS_STEPS, dt, 3);
    }
}

import * as CANNON from 'cannon-es';
import { CONFIG } from '../utils/constants.js';

export class PhysicsWorld {
    constructor() {
        this.world = new CANNON.World();

        // PROFESSIONAL OPTIMIZATION: SAP Broadphase (Sweep and Prune)
        // Checks collisions along axes instead of checking everything against everything.
        // Massive performance boost for many objects.
        this.world.broadphase = new CANNON.SAPBroadphase(this.world);

        // Tuning
        this.world.allowSleep = true;
        this.world.gravity.set(0, CONFIG.GRAVITY, 0);

        // Default solver settings for stability/performance balance
        this.world.solver.iterations = 10;
        this.world.solver.tolerance = 0.001;
    }

    addBody(body) {
        this.world.addBody(body);
    }

    removeBody(body) {
        this.world.removeBody(body);
    }

    step(dt) {
        // Fixed timestep for consistent simulation stability
        // Interpolation handled in Game loop if needed, but simple step is fine here
        this.world.step(CONFIG.PHYSICS_STEPS, dt, CONFIG.PHYSICS_SUBSTEPS);
    }
}

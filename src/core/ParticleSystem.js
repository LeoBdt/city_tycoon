import * as THREE from 'three';

export class ParticleSystem {
    constructor(scene) {
        this.scene = scene;
        this.particles = [];
        // Geometry shared for performance
        this.geo = new THREE.BoxGeometry(0.4, 0.4, 0.4); // Slightly bigger
        this.matFire = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
        this.matSmoke = new THREE.MeshBasicMaterial({ color: 0x555555 });
    }

    spawn(pos, count, type = 'FIRE') {
        const color = type === 'FIRE' ? 0xff4400 : 0xaaaaaa;

        for (let i = 0; i < count; i++) {
            const mat = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 1 });
            const mesh = new THREE.Mesh(this.geo, mat);

            // Random spread widened
            const spread = 2.5;
            mesh.position.set(
                pos.x + (Math.random() - 0.5) * spread,
                pos.y + (Math.random() - 0.5) * spread,
                pos.z + (Math.random() - 0.5) * spread
            );

            // Random aggressive velocity
            const velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 8,
                (Math.random() * 8) + 4, // Higher Upwards
                (Math.random() - 0.5) * 8
            );

            this.scene.add(mesh);
            this.particles.push({ mesh, velocity, life: 1.5 + Math.random() }); // Longer life
        }
    }

    update(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];

            p.life -= dt;

            // Move
            p.mesh.position.addScaledVector(p.velocity, dt);

            // Gravity/Drag
            if (p.velocity.y > 0) p.velocity.y -= dt * 2;

            // Fade & Shrink
            p.mesh.scale.setScalar(p.life);
            p.mesh.material.opacity = p.life;

            if (p.life <= 0) {
                this.scene.remove(p.mesh);
                p.mesh.material.dispose();
                this.particles.splice(i, 1);
            }
        }
    }
}

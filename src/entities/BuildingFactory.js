import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { CONFIG } from '../utils/constants.js';

/**
 * Procedurally generates buildings.
 */
export class BuildingFactory {
    static createVoxel(x, y, z, color, world, scene) {
        const size = CONFIG.VOXEL_SIZE;

        // 1. Mesh
        const geo = new THREE.BoxGeometry(size, size, size);
        const mat = new THREE.MeshStandardMaterial({
            color: color,
            roughness: 0.6,
            metalness: 0.1
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x, y, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        // 2. Physics Body
        const shape = new CANNON.Box(new CANNON.Vec3(size / 2, size / 2, size / 2));
        const body = new CANNON.Body({
            mass: 5, // Heavy stone
            position: new CANNON.Vec3(x, y, z),
            shape: shape,
        });

        // Sleep to save CPU until disturbed
        body.sleepSpeedLimit = CONFIG.SLEEP_SPEED_LIMIT;
        body.sleepTimeLimit = CONFIG.SLEEP_TIME_LIMIT;

        return { mesh, body, type: 'voxel', initialPos: new THREE.Vector3(x, y, z) };
    }

    static generateBuilding(startX, startZ, type, theme, world, scene) {
        const voxels = [];

        // Parameters based on Building Type
        let width = 4, depth = 4, height = 4;

        if (type === 'SKYSCRAPER') { height = 15; width = 5; depth = 5; }
        else if (type === 'FACTORY') { height = 6; width = 8; depth = 6; }
        else if (type === 'HOUSE') { height = 4; width = 5; depth = 5; }

        const colors = theme.palette;
        const windowColor = theme.window;

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                for (let z = 0; z < depth; z++) {

                    // Logic for hollow buildings, windows, etc.
                    const isEdge = x === 0 || x === width - 1 || z === 0 || z === depth - 1;
                    const isFloor = y === 0 || y % 4 === 0;

                    // Simple architectural variety
                    if (!isEdge && !isFloor && Math.random() > 0.1) continue; // Hollow inside

                    const realX = startX + (x * CONFIG.VOXEL_SIZE);
                    const realY = 0.5 + (y * CONFIG.VOXEL_SIZE);
                    const realZ = startZ + (z * CONFIG.VOXEL_SIZE);

                    let color = colors[Math.floor(Math.random() * colors.length)];
                    if (isEdge && y > 0 && Math.random() > 0.6) color = windowColor;

                    const voxel = this.createVoxel(realX, realY, realZ, color, world, scene);
                    voxels.push(voxel);

                    scene.add(voxel.mesh);
                    world.addBody(voxel.body);
                }
            }
        }

        return voxels;
    }
}

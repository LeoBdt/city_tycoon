import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { CONFIG } from '../utils/constants.js';

/**
 * Generates building data (physics bodies + visual info) 
 * but does NOT create individual Meshes anymore optimized for InstancedMesh.
 */
export class BuildingFactory {

    static generateBuilding(startX, startZ, type, theme, world) {
        const voxelsData = [];

        let width = 4, depth = 4, height = 4;
        let explosive = false;

        if (type === 'SKYSCRAPER') { height = 15; width = 5; depth = 5; }
        else if (type === 'FACTORY') { height = 6; width = 8; depth = 6; }
        else if (type === 'HOUSE') { height = 4; width = 5; depth = 5; }
        else if (type === 'GAS_STATION') {
            height = 3; width = 6; depth = 4;
            explosive = true;
        }

        const colors = theme.palette;
        const windowColor = theme.window;

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                for (let z = 0; z < depth; z++) {

                    const isEdge = x === 0 || x === width - 1 || z === 0 || z === depth - 1;
                    const isFloor = y === 0 || y % 4 === 0;

                    if (!isEdge && !isFloor && Math.random() > 0.1) continue;

                    const realX = startX + (x * CONFIG.VOXEL_SIZE);
                    const realY = 0.5 + (y * CONFIG.VOXEL_SIZE);
                    const realZ = startZ + (z * CONFIG.VOXEL_SIZE);

                    let colorHex = colors[Math.floor(Math.random() * colors.length)];

                    if (type === 'GAS_STATION') {
                        colorHex = (y % 2 === 0) ? 0xff0000 : 0xffffff;
                    }
                    else if (isEdge && y > 0 && Math.random() > 0.6) {
                        colorHex = windowColor;
                    }

                    const isVoxelExplosive = (type === 'GAS_STATION' && y === 0);

                    // Create Physics Body Only
                    const shape = new CANNON.Box(new CANNON.Vec3(CONFIG.VOXEL_SIZE / 2, CONFIG.VOXEL_SIZE / 2, CONFIG.VOXEL_SIZE / 2));
                    const body = new CANNON.Body({
                        mass: 5,
                        position: new CANNON.Vec3(realX, realY, realZ),
                        shape: shape,
                    });

                    body.sleepSpeedLimit = CONFIG.SLEEP_SPEED_LIMIT;
                    body.sleepTimeLimit = CONFIG.SLEEP_TIME_LIMIT;
                    world.addBody(body);

                    voxelsData.push({
                        body: body,
                        color: new THREE.Color(colorHex),
                        isExplosive: isVoxelExplosive,
                        type: 'voxel',
                        scored: false,
                        active: true // Used for InstancedMesh logic
                    });
                }
            }
        }

        return voxelsData;
    }
}

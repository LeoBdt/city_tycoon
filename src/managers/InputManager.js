import * as THREE from 'three';

export class InputManager {
    constructor(camera, domElement) {
        this.camera = camera;
        this.domElement = domElement;

        this.keys = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            up: false,
            down: false,
            shift: false
        };

        this.mouse = new THREE.Vector2();
        this.raycaster = new THREE.Raycaster();

        this.callbacks = {
            onClick: [],
            onRightClick: [],
            onMouseMove: []
        };

        this.init();
    }

    init() {
        window.addEventListener('keydown', (e) => this.onKeyDown(e));
        window.addEventListener('keyup', (e) => this.onKeyUp(e));
        this.domElement.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.domElement.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.domElement.addEventListener('contextmenu', (e) => e.preventDefault()); // Block context menu
    }

    onKeyDown(e) {
        switch (e.code) {
            case 'KeyW': case 'ArrowUp': this.keys.forward = true; break;
            case 'KeyS': case 'ArrowDown': this.keys.backward = true; break;
            case 'KeyA': case 'ArrowLeft': this.keys.left = true; break;
            case 'KeyD': case 'ArrowRight': this.keys.right = true; break;
            case 'Space': this.keys.up = true; break;
            case 'ShiftLeft': case 'ShiftRight': this.keys.shift = true; this.keys.down = true; break;
        }
    }

    onKeyUp(e) {
        switch (e.code) {
            case 'KeyW': case 'ArrowUp': this.keys.forward = false; break;
            case 'KeyS': case 'ArrowDown': this.keys.backward = false; break;
            case 'KeyA': case 'ArrowLeft': this.keys.left = false; break;
            case 'KeyD': case 'ArrowRight': this.keys.right = false; break;
            case 'Space': this.keys.up = false; break;
            case 'ShiftLeft': case 'ShiftRight': this.keys.shift = false; this.keys.down = false; break;
        }
    }

    onMouseMove(e) {
        // Normalised Device Coordinates (-1 to +1)
        this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

        this.trigger('onMouseMove', e);
    }

    onMouseDown(e) {
        if (e.button === 0) { // Left Click
            // Check if clicking on UI
            if (e.target.closest('.tool-btn') || e.target.closest('#settings-panel')) return;
            this.trigger('onClick', e);
        } else if (e.button === 2) { // Right Click
            this.trigger('onRightClick', e);
        }
    }

    on(event, callback) {
        if (this.callbacks[event]) this.callbacks[event].push(callback);
    }

    trigger(event, data) {
        this.callbacks[event].forEach(cb => cb(data));
    }

    getRayIntersection(objects) {
        this.raycaster.setFromCamera(this.mouse, this.camera);
        return this.raycaster.intersectObjects(objects, true); // Recursive = true
    }

    getRaycaster() {
        this.raycaster.setFromCamera(this.mouse, this.camera);
        return this.raycaster;
    }
}

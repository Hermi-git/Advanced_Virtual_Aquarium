import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { camera, renderer, composer } from './initScene.js';

export let orbitControls;

// Handles window resizing
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
}

// Initializes OrbitControls as the sole camera controller
export function initControls() {
    orbitControls = new OrbitControls(camera, renderer.domElement);
    orbitControls.enableDamping = true;
    orbitControls.dampingFactor = 0.05;
    orbitControls.screenSpacePanning = false;
    orbitControls.minDistance = 10;
    orbitControls.maxDistance = 200;
    orbitControls.maxPolarAngle = Math.PI; // Allow full vertical rotation

    window.addEventListener('resize', onWindowResize);
}

// Updates controls in the animation loop
export function updateControls() {
    orbitControls.update();
}

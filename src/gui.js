import { GUI } from 'lil-gui';
import { fishArray } from './loadModels.js';
import { lightingParams, ambientLight, directionalLight, spotLight, physics, world, bloomPass, bokehPass, scene } from './initScene.js';

export function setupGUI() {
    const gui = new GUI({ container: document.getElementById('gui-container') });

    const fishFolder = gui.addFolder('Fish Controls').close();
    fishArray.forEach((fish, index) => {
        const folder = fishFolder.addFolder(`Fish ${index + 1}`);
        folder.add(fish, 'speed', 0.1, 5, 0.1).name('Speed');
        folder.add(fish.model.scale, 'x', 0.1, 3, 0.1).name('Scale').onChange(v => fish.model.scale.setScalar(v));
    });

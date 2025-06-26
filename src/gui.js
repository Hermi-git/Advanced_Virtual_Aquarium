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

    const lightingFolder = gui.addFolder('Lighting');
    lightingFolder.addColor(lightingParams, 'ambientColor').name('Ambient Color').onChange(v => ambientLight.color.set(v));
    lightingFolder.add(lightingParams, 'ambientIntensity', 0, 2).name('Ambient Intensity').onChange(v => ambientLight.intensity = v);
    lightingFolder.addColor(lightingParams, 'directionalColor').name('Directional Color').onChange(v => directionalLight.color.set(v));
    lightingFolder.add(lightingParams, 'directionalIntensity', 0, 2).name('Directional Intensity').onChange(v => directionalLight.intensity = v);
    
    const spotLightFolder = lightingFolder.addFolder('Spotlight');
    spotLightFolder.addColor(lightingParams, 'spotlightColor').name('Color').onChange(v => spotLight.color.set(v));
    spotLightFolder.add(lightingParams, 'spotlightIntensity', 0, 5).name('Intensity').onChange(v => spotLight.intensity = v);
    spotLightFolder.add(spotLight.position, 'x', -50, 50).name('Pos X');
    spotLightFolder.add(spotLight.position, 'y', -50, 50).name('Pos Y');
    spotLightFolder.add(spotLight.position, 'z', -50, 50).name('Pos Z');
    spotLightFolder.add(lightingParams, 'angle', 0, Math.PI / 2).name('Angle').onChange(v => spotLight.angle = v);
    spotLightFolder.add(lightingParams, 'penumbra', 0, 1).name('Penumbra').onChange(v => spotLight.penumbra = v);

    const envFolder = gui.addFolder('Environment');
    const tankFolder = envFolder.addFolder('Tank Material');
    const postprocessingFolder = gui.addFolder('Post-processing');
    const bloomFolder = postprocessingFolder.addFolder('Bloom');
    bloomFolder.add(bloomPass, 'strength', 0, 3).name('Strength');
    bloomFolder.add(bloomPass, 'radius', 0, 1).name('Radius');
    bloomFolder.add(bloomPass, 'threshold', 0, 1).name('Threshold');

    const physicsFolder = gui.addFolder('Physics');
    physicsFolder.add(physics, 'gravity', -20, 0).name('Gravity').onChange(v => world.gravity.y = v);
    physicsFolder.add(physics, 'buoyancy', 0, 30).name('Buoyancy');

    const dofFolder = postprocessingFolder.addFolder('Depth of Field');
    dofFolder.add(bokehPass.uniforms.focus, 'value', 10, 100).name('Focus');
    dofFolder.add(bokehPass.uniforms.aperture, 'value', 0, 0.001).name('Aperture');
    dofFolder.add(bokehPass.uniforms.maxblur, 'value', 0, 0.02).name('Max Blur');

    const tankObject = scene.children.find(c => c.geometry && c.geometry.type === 'BoxGeometry');
    if (tankObject) {
        const tankMaterial = tankObject.material;
        tankFolder.add(tankMaterial, 'roughness', 0, 1).name('Roughness');
        tankFolder.add(tankMaterial, 'transmission', 0, 1).name('Transmission');
        tankFolder.add(tankMaterial, 'ior', 1, 2.33).name('IOR');
    }
}

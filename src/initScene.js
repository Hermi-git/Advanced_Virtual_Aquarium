import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js';
import * as CANNON from 'cannon-es';

export const lightingParams = {
    ambientColor: 0xffffff,
    ambientIntensity: 0.3,
    directionalColor: 0xffffff,
    directionalIntensity: 0.2,
    spotlightColor: 0xffffff,
    spotlightIntensity: 1,
    penumbra: 1.0,
    angle: Math.PI / 8,
};

export const physics = {
    gravity: -9.82,
    buoyancy: 15,
};

// Define tankSize here as a const, so it's initialized immediately on import
export const tankSize = new THREE.Vector3(42, 25, 55);

export let scene, camera, renderer, clock;
export let composer, bloomPass, bokehPass;
export let world;
export let ambientLight, directionalLight, spotLight, spotLightHelper;

// New materials for Cannon.js
export let wallMaterial;
export let fishMaterial;

export function initScene() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x001144);

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 5000);
    camera.position.set(0, 40, 70);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true; // Ensure shadows are enabled
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Softer shadows
    document.body.appendChild(renderer.domElement);

    ambientLight = new THREE.AmbientLight(lightingParams.ambientColor, lightingParams.ambientIntensity);
    scene.add(ambientLight);

    directionalLight = new THREE.DirectionalLight(lightingParams.directionalColor, lightingParams.directionalIntensity);
    directionalLight.position.set(0, 20, 10);
    directionalLight.castShadow = true; // Enable shadows for directional light
    directionalLight.shadow.mapSize.width = 1024; // Shadow map resolution
    directionalLight.shadow.mapSize.height = 1024;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 100;
    directionalLight.shadow.camera.left = -50; // Adjust shadow camera frustum
    directionalLight.shadow.camera.right = 50;
    directionalLight.shadow.camera.top = 50;
    directionalLight.shadow.camera.bottom = -50;
    scene.add(directionalLight);

    spotLight = new THREE.SpotLight(lightingParams.spotlightColor, lightingParams.spotlightIntensity);
    spotLight.position.set(0, 30, 0);
    spotLight.angle = lightingParams.angle;
    spotLight.penumbra = lightingParams.penumbra;
    spotLight.decay = 2;
    spotLight.distance = 100;
    spotLight.castShadow = true;
    spotLight.shadow.mapSize.width = 1024;
    spotLight.shadow.mapSize.height = 1024;
    spotLight.shadow.camera.near = 1;
    spotLight.shadow.camera.far = 60;
    spotLight.shadow.focus = 1; // More focused shadows
    scene.add(spotLight);

    spotLightHelper = new THREE.SpotLightHelper(spotLight);
    // scene.add(spotLightHelper); // Helper is distracting, hiding it.
     const tankGeometry = new THREE.BoxGeometry(tankSize.x, tankSize.y, tankSize.z);
    const tankMaterial = new THREE.MeshPhysicalMaterial({
        color: 0xadd8e6,
        metalness: 0,
        roughness: 0.1,
        transmission: 0.9,
        transparent: true,
        ior: 1.5
    });
    const tankCube = new THREE.Mesh(tankGeometry, tankMaterial);
    scene.add(tankCube);

    // Add a helper to visualize the tank boundaries
    const boxHelper = new THREE.BoxHelper(tankCube, 0xffff00); // Yellow
    scene.add(boxHelper);

    const wireframe = new THREE.LineSegments(new THREE.EdgesGeometry(tankGeometry), new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2, transparent: true, opacity: 0.5 }));
    tankCube.add(wireframe);

    clock = new THREE.Clock();
    
    composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    // --- Post-processing adjustments for clarity ---
    // UnrealBloomPass: Reduces overall bloom/blur
    // Parameters: strength, radius, threshold
    bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.2, 0.1, 0.98);
    // Original: (new THREE.Vector2(window.innerWidth, window.innerHeight), 0.6, 0.4, 0.95);
    // Changes:
    // strength: 0.6 -> 0.2 (Significantly reduces the intensity of the bloom)
    // radius: 0.4 -> 0.1 (Reduces how far the bloom spreads, making it tighter)
    // threshold: 0.95 -> 0.98 (Only the very brightest parts of the scene will bloom, much less overall blur)
    composer.addPass(bloomPass);

    // BokehPass: Reduces blur amount and adjusts focus for a clearer look
    // Parameters: focus, aperture, maxblur
    bokehPass = new BokehPass(scene, camera, {
        focus: 40.0, // Adjusted focus slightly, might need fine-tuning for your scene's "center"
        aperture: 0.00005, // Significantly reduced (smaller value = less blur)
        maxblur: 0.001,    // Significantly reduced (smaller value = less max blur)
        width: window.innerWidth,
        height: window.innerHeight
    });
    composer.addPass(bokehPass);
    
    world = new CANNON.World();
    world.gravity.set(0, physics.gravity, 0);
    world.broadphase = new CANNON.SAPBroadphase(world); // Good for performance with many objects
    world.solver.iterations = 10; // Increase iterations for better stability

    // --- Define Cannon.js Materials ---
    wallMaterial = new CANNON.Material("wallMaterial");
    fishMaterial = new CANNON.Material("fishMaterial");

    // Define contact behavior between fish and walls
    const fishWallContactMaterial = new CANNON.ContactMaterial(
        fishMaterial,
        wallMaterial,
        {
            friction: 0.0,    // No friction on walls
            restitution: 0.2  // Slight bounce off walls
        }
    );
    world.addContactMaterial(fishWallContactMaterial);

    // --- Create Six Static Cannon.js Plane Bodies for Tank Boundaries ---
    // The halfExtents of the tank for positioning planes
    const halfX = tankSize.x / 2;
    const halfY = tankSize.y / 2;
    const halfZ = tankSize.z / 2;

    // Floor
    const floorShape = new CANNON.Plane();
    const floorBody = new CANNON.Body({ mass: 0, material: wallMaterial });
    floorBody.addShape(floorShape);
    floorBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2); // Rotate to be flat
    floorBody.position.set(0, -halfY, 0); // Position at the bottom of the tank
    world.addBody(floorBody);

    // Ceiling
    const ceilingShape = new CANNON.Plane();
    const ceilingBody = new CANNON.Body({ mass: 0, material: wallMaterial });
    ceilingBody.addShape(ceilingShape);
    ceilingBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), Math.PI / 2); // Rotate to be flat
    ceilingBody.position.set(0, halfY, 0); // Position at the top of the tank
    world.addBody(ceilingBody);

    // Back Wall (-Z)
    const backWallShape = new CANNON.Plane();
    const backWallBody = new CANNON.Body({ mass: 0, material: wallMaterial });
    backWallBody.addShape(backWallShape);
    // No rotation needed for Z-plane facing +Z
    backWallBody.position.set(0, 0, -halfZ); // Position at the back of the tank
    world.addBody(backWallBody);

    // Front Wall (+Z)
    const frontWallShape = new CANNON.Plane();
    const frontWallBody = new CANNON.Body({ mass: 0, material: wallMaterial });
    frontWallBody.addShape(frontWallShape);
    frontWallBody.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), Math.PI); // Rotate to face outward
    frontWallBody.position.set(0, 0, halfZ); // Position at the front of the tank
    world.addBody(frontWallBody);

    // Left Wall (-X)
    const leftWallShape = new CANNON.Plane();
    const leftWallBody = new CANNON.Body({ mass: 0, material: wallMaterial });
    leftWallBody.addShape(leftWallShape);
    leftWallBody.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), Math.PI / 2); // Rotate to be vertical
    leftWallBody.position.set(-halfX, 0, 0); // Position at the left of the tank
    world.addBody(leftWallBody);

    // Right Wall (+X)
    const rightWallShape = new CANNON.Plane();
    const rightWallBody = new CANNON.Body({ mass: 0, material: wallMaterial });
    rightWallBody.addShape(rightWallShape);
    rightWallBody.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), -Math.PI / 2); // Rotate to be vertical
    rightWallBody.position.set(halfX, 0, 0); // Position at the right of the tank
    world.addBody(rightWallBody);

    // Window resize listener
    window.addEventListener('resize', onWindowResize, false);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
}
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
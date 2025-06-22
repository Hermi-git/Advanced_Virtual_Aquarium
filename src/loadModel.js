import * as THREE from 'three';
import { MathUtils } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { SkeletonUtils } from 'three/examples/jsm/utils/SkeletonUtils.js';  
import * as CANNON from 'cannon-es';

const FISH_GROUP = 2;
// Import materials and tankSize from initScene.js
import { scene, world, tankSize, fishMaterial, wallMaterial } from './initScene.js';

export let fishArray = [];
export let seaBed = null; // Still keep this for the seabed specifically

// --- New: Array for static scene elements ---
export let sceneElements = []; 

const fishToCreate = [
    { modelFile: './models/fish.glb', scale: 1.3, speed: 0.6, color: 0xffa500 },
    { modelFile: './models/fish.glb', scale: 1.3, speed: 0.7, color: 0x0000ff },
    { modelFile: './models/fish.glb', scale: 1.3, speed: 2, color: 0xff0000 },
    { modelFile: './models/CoralGrouper.glb', scale: 1.3, speed: 0.8, color: 0xff4500 },
    { modelFile: './models/CoralGrouper.glb', scale: 1.3, speed: 1.2, color: 0xda70d6 },
];

const otherModels = [
    { modelFile: './models/see_bed.glb', name: 'see_bed' } 
];


const tankElementsToCreate = [
    // Lotus Flowers (floating near surface)
    {
        modelFile: './models/lotus_flower.glb',
        name: 'lotus_a',
        scale: 2.0, 
        position: new THREE.Vector3(5, tankSize.y / 2 - 1, 10), 
        rotation: new THREE.Euler(-Math.PI / 2, 0, 0), 
        isCollider: false, 
        materialColor: 0xff69b4 
    },
    {
        modelFile: './models/lotus_flower.glb',
        name: 'lotus_b',
        scale: 1.5, 
        position: new THREE.Vector3(-8, tankSize.y / 2 - 0.8, -12), 
        rotation: new THREE.Euler(-Math.PI / 2, Math.PI / 3, 0),
        isCollider: false,
        materialColor: 0x8a2be2 
    },
    // Monster Plant (large, prominent)
    {
        modelFile: './models/monster_plant.glb',
        name: 'monster_plant_main',
        scale: 15, 
        position: new THREE.Vector3(0, -tankSize.y / 2 + 7, 0), 
        rotation: new THREE.Euler(0, Math.PI / 4, 0),
        isCollider: true, 
        colliderShape: 'box', 
        colliderScale: new THREE.Vector3(8, 14, 8),  
        materialColor: 0x8b0000 
    },
    // Trees (interpreting as large kelp or underwater forest elements)
    {
        modelFile: './models/Trees.glb', 
        name: 'kelp_cluster_a',
        scale: 12, // Increased scale
        position: new THREE.Vector3(18, -tankSize.y / 2, -20), 
        rotation: new THREE.Euler(0, Math.PI / 6, 0),
        isCollider: false, 
        materialColor: 0x2e8b57
    },
    {
        modelFile: './models/Trees.glb',
        name: 'kelp_cluster_b',
        scale: 10,
        position: new THREE.Vector3(-15, -tankSize.y / 2, 15),
        rotation: new THREE.Euler(0, -Math.PI / 5, 0),
        isCollider: false,
        materialColor: 0x3cb371 
    },
];



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


class SmoothEllipseCurve extends THREE.Curve {
    constructor(scaleFactor, yOffset, frequencies, radii, offsetX = 0, offsetZ = 0) {
        super();
        this.scaleFactor = scaleFactor;
        this.yOffset = yOffset;
        this.frequencies = frequencies;
        this.radii = radii;
        this.offsetX = offsetX;
        this.offsetZ = offsetZ;
    }
    getPoint(t, optionalTarget = new THREE.Vector3()) {
        const angle = 2 * Math.PI * t;
        const x = Math.sin(angle * this.frequencies.xz) * this.radii.x * this.scaleFactor + this.offsetX;
        const z = Math.cos(angle * this.frequencies.xz) * this.radii.z * this.scaleFactor + this.offsetZ;
        const y = Math.sin(angle * this.frequencies.y) * this.radii.y * 0.4 + this.yOffset;
        return optionalTarget.set(x, y, z);
    }
}

function applyPBRMaterial(model, materialProperties) {
    model.traverse(child => {
        if (child.isMesh) {
            const newMaterial = child.material.clone();

            if (materialProperties.color) {
                newMaterial.color.set(materialProperties.color);
            }
            newMaterial.metalness = materialProperties.metalness !== undefined ? materialProperties.metalness : 0.1;
            newMaterial.roughness = materialProperties.roughness !== undefined ? materialProperties.roughness : 0.5;
            newMaterial.clearcoat = materialProperties.clearcoat !== undefined ? materialProperties.clearcoat : 0.5;
            newMaterial.clearcoatRoughness = materialProperties.clearcoatRoughness !== undefined ? materialProperties.clearcoatRoughness : 0.5;
            
            
            newMaterial.transparent = false; 
            newMaterial.opacity = 1;         
            newMaterial.side = THREE.DoubleSide; 
            // --- END CRITICAL CHANGES ---

            child.material = newMaterial;

            child.castShadow = true;
            child.receiveShadow = true;
        }
    });
}


function createUniqueCurve(index) {
    const colliderMargin = 0.5;
    const safeTankX = tankSize.x / 2 - (2 + colliderMargin);
    const safeTankY = tankSize.y / 2 - (2 + colliderMargin);
    const safeTankZ = tankSize.z / 2 - (2 + colliderMargin);

    const baseRadiusX = MathUtils.randFloat(safeTankX * 0.3, safeTankX * 0.8);
    const baseRadiusZ = MathUtils.randFloat(safeTankZ * 0.3, safeTankZ * 0.8);
    const baseAmplitudeY = MathUtils.randFloat(safeTankY * 0.3, safeTankY * 0.7);

    const scaleFactor = MathUtils.randFloat(0.8, 1.0);
    const yOffset = MathUtils.randFloat(-safeTankY * 0.8, safeTankY * 0.8); 
    const xzFrequency = MathUtils.randFloat(0.7, 1.3);
    const yWaveFrequency = MathUtils.randFloat(0.8, 2.0);

    const offsetX = MathUtils.randFloat(-safeTankX * 0.2, safeTankX * 0.2);
    const offsetZ = MathUtils.randFloat(-safeTankZ * 0.2, safeTankZ * 0.2);

    return new SmoothEllipseCurve(
        scaleFactor, yOffset,
        { xz: xzFrequency, y: yWaveFrequency },
        { x: baseRadiusX, z: baseRadiusZ, y: baseAmplitudeY },
        offsetX, offsetZ
    );
}

function createFishFromConfig(modelsCache) {
    fishToCreate.forEach((fishConfig, i) => {
        const gltf = modelsCache[fishConfig.modelFile];
        if (!gltf) return;

        const model = SkeletonUtils.clone(gltf.scene);
        model.scale.setScalar(fishConfig.scale);
        model.userData.isFish = true;

        applyPBRMaterial(model, { color: fishConfig.color });

        const mixer = new THREE.AnimationMixer(model);
        if (gltf.animations.length) mixer.clipAction(gltf.animations[0]).play();

        const spineBones = [];
        model.traverse(obj => { if (obj.isBone && obj.name.toLowerCase().includes('spine')) spineBones.push(obj); });

        const curve = createUniqueCurve(i);
        const randomT = Math.random(); 
        const startPosition = curve.getPoint(randomT);

        const fishRadius = fishConfig.scale * 0.5;
        const fishShape = new CANNON.Sphere(fishRadius);

        const fishBody = new CANNON.Body({
            mass: 1,
            shape: fishShape,
            material: fishMaterial,
            collisionFilterGroup: FISH_GROUP,
            collisionFilterMask: -1 ^ FISH_GROUP // Collide with everything EXCEPT other fish
        });
        fishBody.position.copy(startPosition);
        world.addBody(fishBody);

        model.position.copy(startPosition);

        const fishSpeed = MathUtils.randFloat(0.5, 1.5);
        
        const fishData = { model, mixer, curve, t: randomT, speed: fishSpeed, spineBones, modelFile: fishConfig.modelFile, body: fishBody };
        model.userData.fish = fishData;
        fishArray.push(fishData);
        scene.add(model);
    });
}

function placeOtherModels(modelsCache) {
    otherModels.forEach(modelConfig => {
        const gltf = modelsCache[modelConfig.modelFile];
        if (!gltf) return;
        if (modelConfig.name === 'see_bed') {
            seaBed = gltf.scene.clone();
            seaBed.scale.set(10.2, 18, 10.2);
            seaBed.position.set(0, -14, -3.7);

            applyPBRMaterial(seaBed, { color: 0xc2b280 });

            const seaBedShape = new CANNON.Plane();
            const seaBedBody = new CANNON.Body({ mass: 0, material: wallMaterial });
            seaBedBody.addShape(seaBedShape);
            seaBedBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
            seaBedBody.position.set(seaBed.position.x, seaBed.position.y - 0.7, seaBed.position.z);
            world.addBody(seaBedBody);

            scene.add(seaBed);
        }
    });

    // --- New: Place tank elements ---
    tankElementsToCreate.forEach(elementConfig => {
        const gltf = modelsCache[elementConfig.modelFile];
        if (!gltf) {
            console.warn(`Model not found for ${elementConfig.name}: ${elementConfig.modelFile}`);
            return;
        }

        const model = gltf.scene.clone(); 
        model.name = elementConfig.name; 

        model.scale.setScalar(elementConfig.scale); 
        model.position.copy(elementConfig.position);

        if (elementConfig.rotation) {
            model.rotation.copy(elementConfig.rotation);
        }

        applyPBRMaterial(model, { color: elementConfig.materialColor });

        // --- DEBUGGING LOGS FOR EACH NEW MODEL ---
        console.groupCollapsed(`Adding Model: ${model.name}`);
        console.log('Model object:', model);
        console.log('Position:', model.position.toArray());
        console.log('Scale:', model.scale.toArray());
        console.log('Visible:', model.visible);
        console.log('Number of children:', model.children.length);

        model.traverse(child => {
            if (child.isMesh) {
                console.log(`  Mesh: ${child.name || 'Unnamed Mesh'}`);
                console.log(`    Mesh visible: ${child.visible}`);
                console.log(`    Material color: #${child.material.color.getHexString()}`);
                console.log(`    Material transparent: ${child.material.transparent}`);
                console.log(`    Material opacity: ${child.material.opacity}`);
                if (!child.geometry) {
                    console.warn(`    Mesh has no geometry!`);
                }
            }
        });
        console.groupEnd();
        // --- END DEBUGGING LOGS ---


        scene.add(model);
        sceneElements.push(model);

        // --- Add Cannon.js Body for collision if isCollider is true ---
        if (elementConfig.isCollider) {
            let shape;
            let body;
            const staticMaterial = wallMaterial; 

            switch (elementConfig.colliderShape) {
                case 'sphere':
                    shape = new CANNON.Sphere(elementConfig.colliderRadius || 1); 
                    body = new CANNON.Body({ mass: 0, material: staticMaterial });
                    body.addShape(shape);
                    break;
                case 'box':
                    const halfExtents = elementConfig.colliderScale ?
                        new CANNON.Vec3(elementConfig.colliderScale.x / 2, elementConfig.colliderScale.y / 2, elementConfig.colliderScale.z / 2) :
                        new CANNON.Vec3(model.scale.x * 0.5, model.scale.y * 0.5, model.scale.z * 0.5); 
                    shape = new CANNON.Box(halfExtents);
                    body = new CANNON.Body({ mass: 0, material: staticMaterial });
                    body.addShape(shape);
                    break;
                case 'mesh':
                    console.warn(`'mesh' collider not fully implemented for ${elementConfig.name}. Falling back to Sphere.`);
                    let boundingSphereRadius = 1; 
                    if (model.children && model.children.length > 0 && model.children[0].geometry) {
                        model.children[0].geometry.computeBoundingSphere();
                        boundingSphereRadius = model.children[0].geometry.boundingSphere.radius * model.scale.x;
                    }
                    shape = new CANNON.Sphere(boundingSphereRadius);
                    body = new CANNON.Body({ mass: 0, material: staticMaterial });
                    body.addShape(shape);
                    break;
                default:
                    console.warn(`Unknown collider shape for ${elementConfig.name}: ${elementConfig.colliderShape}. No collider added.`);
                    return; 
            }
            
            if (body) {
                body.position.copy(model.position);
                body.quaternion.copy(model.quaternion);
                world.addBody(body);
                model.userData.physicsBody = body;
            }
        }
    });
}

export async function loadAllModels() {
    const gltfLoader = new GLTFLoader();
    const modelsCache = {};

    const allModelConfigs = [...fishToCreate, ...otherModels, ...tankElementsToCreate];
    const uniqueModelFiles = [...new Set(allModelConfigs.map(c => c.modelFile))];

    await Promise.all(uniqueModelFiles.map(file =>
        gltfLoader.loadAsync(file).then(gltf => {
            modelsCache[file] = gltf;
            console.log(`Loaded: ${file}`); 
        }).catch(error => {
            console.error(`Error loading model ${file}:`, error);
        })
    ));

    createFishFromConfig(modelsCache);
    placeOtherModels(modelsCache); 
}
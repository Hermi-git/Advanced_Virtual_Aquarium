import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import {
    initScene, scene, camera, renderer, world,
    tankSize, composer, spotLightHelper,
    bloomPass, bokehPass, physics // Import physics from initScene
} from './src/initScene.js';
import { initControls, updateControls } from './src/controls.js';
import { loadAllModels, fishArray } from './src/loadModels.js';
import { setupGUI } from './src/gui.js';

let clock = new THREE.Clock();

async function main() {
    initScene();
    initControls();
    await loadAllModels();
    setupGUI();
    animate();
}

// Helper function to update movement for one fish
function updateFishMovement(fish, i, elapsedTime, delta, tankSize) {
    // Update animation mixer (already done in animate loop, but good to keep isolated if moving this)
    // fish.mixer.update(delta); // Already in animate() loop

    const pos = fish.body.position;
    const vel = fish.body.velocity;

    // --- Buoyancy Force ---
    // Make buoyancy scale with mass and slightly stronger than gravity to ensure upward tendency
    const buoyancyMagnitude = fish.body.mass * (Math.abs(physics.gravity) * 1.05); // 5% stronger than gravity
    const buoyancyForce = new CANNON.Vec3(0, buoyancyMagnitude, 0);
    fish.body.applyForce(buoyancyForce, pos);

    // --- Path Following ---
    // Increase path progress speed for more active movement
    fish.t = (fish.t + delta * fish.speed * 0.2) % 1; // Increased from 0.1 to 0.2

    const targetPos = fish.curve.getPoint(fish.t);
    // Add vertical wobble to the target position
    targetPos.y += Math.sin(elapsedTime * 2 + i * 0.5) * 0.5; // More pronounced vertical wobble (amplitude 0.5)

    // Calculate direction to target
    const dirToTarget = new CANNON.Vec3(
        targetPos.x - pos.x,
        targetPos.y - pos.y,
        targetPos.z - pos.z
    );
    dirToTarget.normalize();

    // Apply force towards the target, increased magnitude
    const pathFollowingForceMagnitude = fish.speed * 10; // Increased from 3 to 10 for more responsiveness
    const pathFollowingForce = dirToTarget.scale(pathFollowingForceMagnitude);
    fish.body.applyForce(pathFollowingForce, pos);

    // --- Damping for Smooth Motion ---
    // Reduce damping slightly to allow fish to carry more momentum
    fish.body.velocity.scale(0.96, vel); // Changed from 0.98 to 0.96

    // --- Nudge if Velocity is Too Low ---
    // This is a backup to prevent getting completely stuck if physics issues occur.
    // Ensure it's not fighting against other forces.
    const minVelocityThreshold = 0.1; // Slightly increased threshold
    if (vel.length() < minVelocityThreshold) {
        // Apply a small impulse in a random direction to unstuck
        const nudgeImpulse = new CANNON.Vec3(
            (Math.random() - 0.5) * 0.5, // Small random x
            (Math.random() - 0.5) * 0.5, // Small random y
            (Math.random() - 0.5) * 0.5  // Small random z
        );
        fish.body.applyImpulse(nudgeImpulse, pos);
    }
    
    // Sync 3D model position with physics body
    fish.model.position.copy(pos);

    // Smoothly rotate fish to look along swimming direction
    // Look a bit further ahead on the curve for smoother turns
    const lookAheadFactor = 0.05; // Look 5% of the curve ahead
    const lookTarget = fish.curve.getPoint((fish.t + lookAheadFactor) % 1);
    
    const tempMatrix = new THREE.Matrix4();
    tempMatrix.lookAt(fish.model.position, lookTarget, fish.model.up);
    const lookQuat = new THREE.Quaternion().setFromRotationMatrix(tempMatrix);
    
    // Increased slerp factor for more responsive turning
    fish.model.quaternion.slerp(lookQuat, 0.1); // Increased from 0.05 to 0.1
}

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    const elapsedTime = clock.getElapsedTime();

    // Step physics world
    world.step(1 / 60, delta, 3); // Keep this fixed timestep

    // Update controls (orbit or camera)
    updateControls();

    // Update each fish's animation and movement
    fishArray.forEach((fish, i) => {
        fish.mixer.update(delta); // Mixer update needs to happen per frame
        updateFishMovement(fish, i, elapsedTime, delta, tankSize);
    });

    // Update spotlight helper if enabled
    if (spotLightHelper) spotLightHelper.update();

    // Render with post-processing
    composer.render(delta);
}

main();
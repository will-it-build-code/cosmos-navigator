/**
 * CameraController - Camera navigation and controls
 * Implements free flight, focus mode, and smooth transitions
 *
 * NEGATIVE SPACE: This class asserts that camera and container are valid,
 * that focus targets have valid radius, and that transition parameters are finite.
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import gsap from 'gsap';
import { SceneManager } from '../engine/Scene';
import {
  invariant,
  assertPositive,
  assertFinite,
  postcondition
} from '../utils/invariant';

/** Valid camera modes */
const VALID_CAMERA_MODES = ['free', 'orbit', 'follow', 'cinematic'] as const;

export type CameraMode = 'free' | 'orbit' | 'follow' | 'cinematic';

export interface FocusTarget {
  object: THREE.Object3D;
  name: string;
  radius: number;
}

export class CameraController {
  private camera: THREE.PerspectiveCamera;
  private container: HTMLElement;
  private sceneManager: SceneManager;
  private orbitControls: OrbitControls;

  private mode: CameraMode = 'free'; // Default to free roam mode
  private focusTarget: FocusTarget | null = null;

  // Free flight settings - gamified smooth movement
  private velocity = new THREE.Vector3();
  private moveSpeed = 100; // Base speed
  private boostMultiplier = 5; // Shift to go faster
  private crawlMultiplier = 0.2; // Ctrl to go slower (precision)
  private damping = 0.95; // Higher = more momentum/drift
  private acceleration = 8; // How quickly we reach target speed

  // Angular velocity for smooth rotation (6DOF - no gimbal lock)
  private angularVelocity = new THREE.Vector3(); // pitch, yaw, roll rates
  private rotationDamping = 0.92; // How quickly rotation slows down
  private rotationAcceleration = 3.0; // How quickly we reach target rotation speed

  // Input state
  private keys: Set<string> = new Set();
  private isMouseDown = false;
  private rightMouseDown = false;
  private lastMousePosition = { x: 0, y: 0 };

  // Smooth zoom/movement
  private targetZoom = 1;
  private currentZoom = 1;
  private scrollVelocity = 0;

  /**
   * Create a new CameraController
   *
   * POSTCONDITIONS:
   * - OrbitControls is initialized
   * - Event listeners are set up
   */
  constructor(
    camera: THREE.PerspectiveCamera,
    container: HTMLElement,
    sceneManager: SceneManager
  ) {
    this.camera = camera;
    this.container = container;
    this.sceneManager = sceneManager;

    // Initialize OrbitControls
    this.orbitControls = new OrbitControls(camera, container);

    // POSTCONDITION: OrbitControls created
    postcondition(
      this.orbitControls !== null,
      'OrbitControls must be initialized'
    );

    this.configureOrbitControls();

    // Set up event listeners
    this.setupEventListeners();
  }

  private configureOrbitControls(): void {
    this.orbitControls.enableDamping = true;
    this.orbitControls.dampingFactor = 0.05;
    this.orbitControls.enablePan = true;
    this.orbitControls.panSpeed = 0.8;
    this.orbitControls.rotateSpeed = 0.5;
    this.orbitControls.zoomSpeed = 1.2;
    this.orbitControls.minDistance = 0.1;
    this.orbitControls.maxDistance = Infinity; // No artificial boundaries

    // Start with a good view of the solar system
    this.orbitControls.target.set(0, 0, 0);

    // Start in free mode - disable orbit controls initially
    this.orbitControls.enabled = false;
  }

  private setupEventListeners(): void {
    // Keyboard events
    window.addEventListener('keydown', this.onKeyDown.bind(this));
    window.addEventListener('keyup', this.onKeyUp.bind(this));

    // Mouse events
    this.container.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.container.addEventListener('mouseup', this.onMouseUp.bind(this));
    this.container.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.container.addEventListener('wheel', this.onWheel.bind(this), { passive: false });
    this.container.addEventListener('dblclick', this.onDoubleClick.bind(this));
    this.container.addEventListener('contextmenu', (e) => e.preventDefault());

    // Touch events for mobile (if needed)
    this.container.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
  }

  private onKeyDown(event: KeyboardEvent): void {
    this.keys.add(event.code);

    // Toggle modes and shortcuts
    switch (event.code) {
      case 'KeyF':
        // Toggle between free roam and orbit mode
        if (this.mode === 'free') {
          this.setMode('orbit');
          console.log('Switched to orbit mode');
        } else {
          this.setMode('free');
          console.log('Switched to free roam mode');
        }
        break;
      case 'Escape':
        // Clear focus and return to free roam
        this.clearFocus();
        this.setMode('free');
        break;
      case 'Space':
        // Prevent default only in free mode (for up movement)
        if (this.mode === 'free') {
          event.preventDefault();
        }
        break;
    }
  }

  private onKeyUp(event: KeyboardEvent): void {
    this.keys.delete(event.code);
  }

  private onMouseDown(event: MouseEvent): void {
    if (event.button === 0) {
      // Left click - for dragging to look around
      this.isMouseDown = true;
      this.lastMousePosition = { x: event.clientX, y: event.clientY };
    } else if (event.button === 2) {
      // Right click
      this.rightMouseDown = true;
      this.lastMousePosition = { x: event.clientX, y: event.clientY };
    }
  }

  private onMouseUp(event: MouseEvent): void {
    if (event.button === 0) {
      this.isMouseDown = false;
    } else if (event.button === 2) {
      this.rightMouseDown = false;
    }
  }

  private onMouseMove(event: MouseEvent): void {
    const deltaX = event.clientX - this.lastMousePosition.x;
    const deltaY = event.clientY - this.lastMousePosition.y;

    if (this.mode === 'free' && this.isMouseDown) {
      // Click and drag to rotate view - 6DOF quaternion rotation
      const sensitivity = 0.003;

      // Apply rotation directly to camera quaternion (no limits!)
      // Rotate around camera's local Y axis (yaw) and local X axis (pitch)
      const yawQuat = new THREE.Quaternion();
      const pitchQuat = new THREE.Quaternion();

      // Yaw: rotate around camera's local up vector
      const localUp = new THREE.Vector3(0, 1, 0).applyQuaternion(this.camera.quaternion);
      yawQuat.setFromAxisAngle(localUp, -deltaX * sensitivity);

      // Pitch: rotate around camera's local right vector
      const localRight = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
      pitchQuat.setFromAxisAngle(localRight, -deltaY * sensitivity);

      // Apply rotations
      this.camera.quaternion.premultiply(yawQuat);
      this.camera.quaternion.premultiply(pitchQuat);
      this.camera.quaternion.normalize();
    }

    this.lastMousePosition = { x: event.clientX, y: event.clientY };
  }

  private onWheel(event: WheelEvent): void {
    if (this.mode === 'free') {
      event.preventDefault();
      // Scroll to move forward/backward
      // Negative deltaY = scroll up = move forward
      // Positive deltaY = scroll down = move backward
      const scrollAmount = -event.deltaY * 0.5; // Adjust sensitivity
      this.scrollVelocity += scrollAmount;
    }
    // OrbitControls handles wheel for orbit mode (don't prevent default)
  }

  private onDoubleClick(event: MouseEvent): void {
    // Raycast to find clicked object
    const rect = this.container.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );

    const intersects = this.sceneManager.raycast(mouse, this.camera);

    if (intersects.length > 0) {
      // Find the celestial body
      let target = intersects[0].object;
      while (target.parent && !target.userData.isCelestialBody) {
        target = target.parent;
      }

      if (target.userData.isCelestialBody) {
        this.focusOn({
          object: target,
          name: target.userData.name || 'Unknown',
          radius: target.userData.radius || 1
        });
      }
    }
  }

  private onTouchStart(_event: TouchEvent): void {
    // Handle touch for mobile
  }

  update(delta: number): void {
    if (this.mode === 'orbit') {
      // Update orbit controls
      this.orbitControls.update();

      // If we have a focus target, follow it
      if (this.focusTarget) {
        const targetPosition = new THREE.Vector3();
        this.focusTarget.object.getWorldPosition(targetPosition);
        this.orbitControls.target.lerp(targetPosition, 0.1);
      }
    } else if (this.mode === 'free') {
      this.updateFreeRoamMode(delta);
    } else if (this.mode === 'follow' && this.focusTarget) {
      this.updateFollowMode(delta);
    }

    // Smooth zoom interpolation
    this.currentZoom = THREE.MathUtils.lerp(this.currentZoom, this.targetZoom, 0.1);
  }

  private updateFreeRoamMode(_delta: number): void {
    const delta = _delta || 1/60;

    // Get camera's local axes (all movement is relative to camera orientation)
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(this.camera.quaternion);

    // === 6DOF ROTATION (Arrow keys + R/F for roll) ===
    const rotationSpeed = 2.0;
    const targetAngularVelocity = new THREE.Vector3(0, 0, 0);

    // Arrow Up/Down: Pitch (rotate around local X axis)
    if (this.keys.has('ArrowUp')) targetAngularVelocity.x = rotationSpeed;
    if (this.keys.has('ArrowDown')) targetAngularVelocity.x = -rotationSpeed;

    // Arrow Left/Right: Yaw (rotate around local Y axis)
    if (this.keys.has('ArrowLeft')) targetAngularVelocity.y = rotationSpeed;
    if (this.keys.has('ArrowRight')) targetAngularVelocity.y = -rotationSpeed;

    // Z/C: Roll (rotate around local Z axis) - barrel roll!
    if (this.keys.has('KeyZ')) targetAngularVelocity.z = rotationSpeed;
    if (this.keys.has('KeyC')) targetAngularVelocity.z = -rotationSpeed;

    // Smooth angular velocity
    const rotAccelFactor = 1 - Math.exp(-this.rotationAcceleration * delta);
    this.angularVelocity.lerp(targetAngularVelocity, rotAccelFactor);

    // Apply damping when no rotation input
    if (targetAngularVelocity.lengthSq() < 0.01) {
      this.angularVelocity.multiplyScalar(this.rotationDamping);
    }

    // Apply angular velocity as quaternion rotation
    if (this.angularVelocity.lengthSq() > 0.0001) {
      const pitchQuat = new THREE.Quaternion().setFromAxisAngle(right, this.angularVelocity.x * delta);
      const yawQuat = new THREE.Quaternion().setFromAxisAngle(up, this.angularVelocity.y * delta);
      const rollQuat = new THREE.Quaternion().setFromAxisAngle(forward, this.angularVelocity.z * delta);

      // Apply rotations to camera
      this.camera.quaternion.premultiply(pitchQuat);
      this.camera.quaternion.premultiply(yawQuat);
      this.camera.quaternion.premultiply(rollQuat);
      this.camera.quaternion.normalize();
    }

    // === 6DOF TRANSLATION (WASD + Q/E, all relative to camera) ===
    // Calculate speed multiplier
    let speedMultiplier = 1;
    if (this.keys.has('ShiftLeft') || this.keys.has('ShiftRight')) {
      speedMultiplier = this.boostMultiplier;
    } else if (this.keys.has('ControlLeft') || this.keys.has('ControlRight')) {
      speedMultiplier = this.crawlMultiplier;
    }

    const targetSpeed = this.moveSpeed * speedMultiplier;
    const targetVelocity = new THREE.Vector3();

    // Recalculate directions after rotation
    forward.set(0, 0, -1).applyQuaternion(this.camera.quaternion);
    right.set(1, 0, 0).applyQuaternion(this.camera.quaternion);
    up.set(0, 1, 0).applyQuaternion(this.camera.quaternion);

    // W/S: Move forward/backward (camera's forward direction)
    if (this.keys.has('KeyW')) targetVelocity.add(forward.clone().multiplyScalar(targetSpeed));
    if (this.keys.has('KeyS')) targetVelocity.sub(forward.clone().multiplyScalar(targetSpeed));

    // A/D: Strafe left/right (camera's right direction)
    if (this.keys.has('KeyD')) targetVelocity.add(right.clone().multiplyScalar(targetSpeed));
    if (this.keys.has('KeyA')) targetVelocity.sub(right.clone().multiplyScalar(targetSpeed));

    // E/Space: Move up, Q: Move down (camera's up direction - true 6DOF!)
    if (this.keys.has('KeyE') || this.keys.has('Space')) targetVelocity.add(up.clone().multiplyScalar(targetSpeed));
    if (this.keys.has('KeyQ')) targetVelocity.sub(up.clone().multiplyScalar(targetSpeed));

    // Apply scroll velocity to forward movement
    if (Math.abs(this.scrollVelocity) > 0.1) {
      targetVelocity.add(forward.clone().multiplyScalar(this.scrollVelocity * 2));
      this.scrollVelocity *= 0.9;
    } else {
      this.scrollVelocity = 0;
    }

    // Smooth acceleration towards target velocity
    const accelerationFactor = 1 - Math.exp(-this.acceleration * delta);
    this.velocity.lerp(targetVelocity, accelerationFactor);

    // Apply damping when no input (drift in space)
    if (targetVelocity.lengthSq() < 0.01) {
      this.velocity.multiplyScalar(this.damping);
    }

    // Apply velocity to position - NO BOUNDARIES!
    this.camera.position.add(this.velocity.clone().multiplyScalar(delta));

    // Stop completely if velocity is very small
    if (this.velocity.lengthSq() < 0.0001) {
      this.velocity.set(0, 0, 0);
    }
    if (this.angularVelocity.lengthSq() < 0.0001) {
      this.angularVelocity.set(0, 0, 0);
    }
  }

  private updateFollowMode(_delta: number): void {
    if (!this.focusTarget) return;

    const targetPosition = new THREE.Vector3();
    this.focusTarget.object.getWorldPosition(targetPosition);

    // Calculate offset based on object radius
    const distance = this.focusTarget.radius * 3;
    const offset = new THREE.Vector3(distance, distance * 0.3, distance);

    // Smoothly follow
    const targetCameraPosition = targetPosition.clone().add(offset);
    this.camera.position.lerp(targetCameraPosition, 0.05);
    this.camera.lookAt(targetPosition);
  }

  /**
   * Set the camera mode
   *
   * PRECONDITIONS:
   * - mode must be a valid camera mode
   */
  setMode(mode: CameraMode): void {
    // PRECONDITION
    invariant(
      VALID_CAMERA_MODES.includes(mode),
      'Camera mode must be valid',
      { mode, valid: VALID_CAMERA_MODES }
    );

    this.mode = mode;

    if (mode === 'orbit') {
      this.orbitControls.enabled = true;
    } else if (mode === 'free') {
      this.orbitControls.enabled = false;
      // Reset velocities when entering free mode
      this.velocity.set(0, 0, 0);
      this.angularVelocity.set(0, 0, 0);
      this.scrollVelocity = 0;
    } else {
      this.orbitControls.enabled = false;
    }
  }

  getMode(): CameraMode {
    return this.mode;
  }

  /**
   * Focus on a celestial body
   *
   * PRECONDITIONS:
   * - target.radius must be positive
   *
   * INVARIANTS:
   * - Calculated positions must be finite
   */
  focusOn(target: FocusTarget): void {
    // PRECONDITION
    assertPositive(target.radius, `Focus target ${target.name} radius`);

    this.focusTarget = target;
    this.mode = 'orbit';
    this.orbitControls.enabled = true;

    // Calculate ideal camera position
    const targetPosition = new THREE.Vector3();
    target.object.getWorldPosition(targetPosition);

    // INVARIANT: Target position must be finite
    assertFinite(targetPosition.x, `Focus target ${target.name} position x`);
    assertFinite(targetPosition.y, `Focus target ${target.name} position y`);
    assertFinite(targetPosition.z, `Focus target ${target.name} position z`);

    // Use a minimum distance so tiny objects are still visible
    // With new scales: small planets ~1-2 units, large planets ~20 units
    const minViewDistance = 10;
    const distance = Math.max(target.radius * 4, minViewDistance);
    const offset = new THREE.Vector3(1, 0.5, 1).normalize().multiplyScalar(distance);
    const newCameraPosition = targetPosition.clone().add(offset);

    console.log(`Focusing on ${target.name}: position=${targetPosition.toArray()}, radius=${target.radius}, distance=${distance}`);

    // Animate to new position
    gsap.to(this.camera.position, {
      x: newCameraPosition.x,
      y: newCameraPosition.y,
      z: newCameraPosition.z,
      duration: 2,
      ease: 'power3.inOut'
    });

    gsap.to(this.orbitControls.target, {
      x: targetPosition.x,
      y: targetPosition.y,
      z: targetPosition.z,
      duration: 2,
      ease: 'power3.inOut'
    });

    // Update min/max distance based on object size
    this.orbitControls.minDistance = Math.max(target.radius * 1.2, 1);
    this.orbitControls.maxDistance = Math.max(target.radius * 200, 1000);
  }

  /**
   * Follow a celestial body - camera follows it as it moves through space
   *
   * PRECONDITIONS:
   * - target.radius must be positive
   */
  followTarget(target: FocusTarget): void {
    // PRECONDITION
    assertPositive(target.radius, `Follow target ${target.name} radius`);

    this.focusTarget = target;
    this.mode = 'follow';
    this.orbitControls.enabled = false;

    // Calculate initial camera position behind and above the target
    const targetPosition = new THREE.Vector3();
    target.object.getWorldPosition(targetPosition);

    const minViewDistance = 10;
    const distance = Math.max(target.radius * 5, minViewDistance);
    const offset = new THREE.Vector3(distance, distance * 0.4, distance);
    const newCameraPosition = targetPosition.clone().add(offset);

    console.log(`Following ${target.name}: distance=${distance}`);

    // Animate to follow position
    gsap.to(this.camera.position, {
      x: newCameraPosition.x,
      y: newCameraPosition.y,
      z: newCameraPosition.z,
      duration: 2,
      ease: 'power3.inOut'
    });
  }

  clearFocus(): void {
    this.focusTarget = null;
    this.orbitControls.minDistance = 0.1;
    this.orbitControls.maxDistance = Infinity; // No artificial boundaries
  }

  getFocusTarget(): FocusTarget | null {
    return this.focusTarget;
  }

  // Instant jump to view
  jumpTo(position: THREE.Vector3, target: THREE.Vector3): void {
    this.camera.position.copy(position);
    this.orbitControls.target.copy(target);
    this.camera.lookAt(target);
  }

  /**
   * Smooth transition to view
   *
   * PRECONDITIONS:
   * - position components must be finite
   * - target components must be finite
   * - duration must be positive
   */
  async transitionTo(
    position: THREE.Vector3,
    target: THREE.Vector3,
    duration: number = 2
  ): Promise<void> {
    // PRECONDITIONS
    assertFinite(position.x, 'CameraController transition position x');
    assertFinite(position.y, 'CameraController transition position y');
    assertFinite(position.z, 'CameraController transition position z');
    assertFinite(target.x, 'CameraController transition target x');
    assertFinite(target.y, 'CameraController transition target y');
    assertFinite(target.z, 'CameraController transition target z');
    assertPositive(duration, 'CameraController transition duration');

    return new Promise((resolve) => {
      gsap.to(this.camera.position, {
        x: position.x,
        y: position.y,
        z: position.z,
        duration,
        ease: 'power3.inOut'
      });

      gsap.to(this.orbitControls.target, {
        x: target.x,
        y: target.y,
        z: target.z,
        duration,
        ease: 'power3.inOut',
        onComplete: resolve
      });
    });
  }

  // Get camera info
  getDistanceToTarget(): number {
    return this.camera.position.distanceTo(this.orbitControls.target);
  }

  getTarget(): THREE.Vector3 {
    return this.orbitControls.target.clone();
  }

  dispose(): void {
    this.orbitControls.dispose();
    window.removeEventListener('keydown', this.onKeyDown.bind(this));
    window.removeEventListener('keyup', this.onKeyUp.bind(this));
  }
}

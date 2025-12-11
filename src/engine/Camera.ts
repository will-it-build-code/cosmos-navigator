/**
 * CameraManager - Camera setup and management
 * Handles perspective camera with dynamic near/far planes for extreme scale
 *
 * NEGATIVE SPACE: This class asserts that container has valid dimensions,
 * that camera parameters are valid, and that clipping plane updates are finite.
 */

import * as THREE from 'three';
import {
  invariant,
  assertPositive,
  assertFinite,
  assertBounds,
  postcondition
} from '../utils/invariant';

/** Maximum FOV in degrees */
const MAX_FOV = 120;
/** Minimum FOV in degrees */
const MIN_FOV = 10;

export class CameraManager {
  private camera: THREE.PerspectiveCamera;
  private container: HTMLElement;

  // Camera settings
  private readonly FOV = 60;
  private readonly NEAR = 0.1;
  private readonly FAR = 1000000;

  /**
   * Create a new CameraManager
   *
   * PRECONDITIONS:
   * - container must have positive dimensions
   *
   * POSTCONDITIONS:
   * - Camera is created with valid aspect ratio
   */
  constructor(container: HTMLElement) {
    // PRECONDITIONS
    assertPositive(container.clientWidth, 'Camera container width');
    assertPositive(container.clientHeight, 'Camera container height');

    this.container = container;

    const aspect = container.clientWidth / container.clientHeight;
    assertFinite(aspect, 'Camera aspect ratio');
    assertPositive(aspect, 'Camera aspect ratio');

    this.camera = new THREE.PerspectiveCamera(
      this.FOV,
      aspect,
      this.NEAR,
      this.FAR
    );

    // POSTCONDITION: Camera created
    postcondition(
      this.camera !== null,
      'Camera must be created'
    );

    // Initial camera position - looking at the inner solar system from above
    // With SCALE_FACTOR = 100, Earth is at ~100 units from Sun
    // Position camera to see Mercury through Mars
    this.camera.position.set(0, 300, 400);
    this.camera.lookAt(0, 0, 0);
  }

  getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  /**
   * Resize the camera viewport
   *
   * PRECONDITIONS:
   * - width and height must be positive
   */
  resize(width: number, height: number): void {
    assertPositive(width, 'Camera resize width');
    assertPositive(height, 'Camera resize height');

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  /**
   * Update near/far planes dynamically based on camera position
   * This helps with z-fighting at extreme scales
   *
   * PRECONDITIONS:
   * - distanceToNearestObject must be finite and non-negative
   *
   * INVARIANTS:
   * - nearPlane must be positive
   * - farPlane must be greater than nearPlane
   */
  updateClippingPlanes(distanceToNearestObject: number): void {
    // PRECONDITION
    assertFinite(distanceToNearestObject, 'Distance to nearest object');

    // Adjust near plane based on distance
    const nearPlane = Math.max(0.0001, distanceToNearestObject * 0.001);
    const farPlane = Math.max(this.FAR, distanceToNearestObject * 10000);

    // INVARIANT: Far must exceed near
    invariant(
      farPlane > nearPlane,
      'Far plane must exceed near plane',
      { nearPlane, farPlane, distanceToNearestObject }
    );

    if (this.camera.near !== nearPlane || this.camera.far !== farPlane) {
      this.camera.near = nearPlane;
      this.camera.far = farPlane;
      this.camera.updateProjectionMatrix();
    }
  }

  /**
   * Set camera field of view
   *
   * PRECONDITIONS:
   * - fov must be within valid range
   */
  setFOV(fov: number): void {
    assertBounds(fov, MIN_FOV, MAX_FOV, 'Camera FOV');

    this.camera.fov = fov;
    this.camera.updateProjectionMatrix();
  }

  update(_delta: number): void {
    // Any per-frame camera updates can go here
    // For example, automatic adjustments, smooth transitions, etc.
  }

  // Get world direction the camera is looking
  getViewDirection(): THREE.Vector3 {
    const direction = new THREE.Vector3();
    this.camera.getWorldDirection(direction);
    return direction;
  }

  // Get distance to a point
  getDistanceTo(point: THREE.Vector3): number {
    return this.camera.position.distanceTo(point);
  }

  /**
   * Smoothly transition to a new position and target
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
    assertFinite(position.x, 'Transition position x');
    assertFinite(position.y, 'Transition position y');
    assertFinite(position.z, 'Transition position z');
    assertFinite(target.x, 'Transition target x');
    assertFinite(target.y, 'Transition target y');
    assertFinite(target.z, 'Transition target z');
    assertPositive(duration, 'Transition duration');

    return new Promise((resolve) => {
      const startPosition = this.camera.position.clone();
      const startTarget = new THREE.Vector3();
      this.camera.getWorldDirection(startTarget);
      startTarget.multiplyScalar(100).add(this.camera.position);

      let elapsed = 0;

      const animate = () => {
        elapsed += 1 / 60;
        const t = Math.min(elapsed / duration, 1);

        // INVARIANT: t must be in [0, 1]
        assertBounds(t, 0, 1, 'Transition interpolation factor');

        // Smooth easing
        const eased = 1 - Math.pow(1 - t, 3);

        // Interpolate position
        this.camera.position.lerpVectors(startPosition, position, eased);

        // Interpolate look target
        const currentTarget = new THREE.Vector3().lerpVectors(
          startTarget,
          target,
          eased
        );
        this.camera.lookAt(currentTarget);

        if (t < 1) {
          requestAnimationFrame(animate);
        } else {
          resolve();
        }
      };

      animate();
    });
  }
}

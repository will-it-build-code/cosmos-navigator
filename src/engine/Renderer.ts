/**
 * Renderer - WebGL rendering configuration
 * Handles high-quality rendering with HDR, shadows, and optimal settings
 *
 * NEGATIVE SPACE: This class asserts that the container is valid,
 * that dimensions are positive, and that WebGL context is available.
 */

import * as THREE from 'three';
import {
  invariant,
  assertPositive,
  assertNonNegative,
  assertDefined,
  postcondition
} from '../utils/invariant';

export class Renderer {
  private renderer: THREE.WebGLRenderer;
  private container: HTMLElement;

  /**
   * Create a new Renderer
   *
   * PRECONDITIONS:
   * - container must have positive dimensions
   *
   * POSTCONDITIONS:
   * - WebGL renderer is created and configured
   * - Canvas is added to container
   */
  constructor(container: HTMLElement) {
    // PRECONDITIONS
    assertPositive(container.clientWidth, 'Container width');
    assertPositive(container.clientHeight, 'Container height');

    this.container = container;

    // Create WebGL renderer with optimal settings
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
      logarithmicDepthBuffer: true // Critical for solar system scale
    });

    // POSTCONDITION: Renderer created
    postcondition(
      this.renderer !== null,
      'WebGL renderer must be created'
    );

    // Configure renderer
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Enable HDR tone mapping for realistic lighting
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;

    // Enable high-quality shadows
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Color management
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    // Set background color
    this.renderer.setClearColor(0x000000, 1);

    // Add canvas to container
    container.appendChild(this.renderer.domElement);

    // POSTCONDITION: Canvas added to container
    postcondition(
      container.contains(this.renderer.domElement),
      'Canvas must be added to container'
    );

    // Enable automatic clearing
    this.renderer.autoClear = true;
  }

  getRenderer(): THREE.WebGLRenderer {
    return this.renderer;
  }

  getDomElement(): HTMLCanvasElement {
    return this.renderer.domElement;
  }

  render(scene: THREE.Scene, camera: THREE.Camera): void {
    this.renderer.render(scene, camera);
  }

  /**
   * Resize the renderer
   *
   * PRECONDITIONS:
   * - width and height must be positive
   */
  resize(width: number, height: number): void {
    assertPositive(width, 'Renderer resize width');
    assertPositive(height, 'Renderer resize height');

    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  /**
   * Set tone mapping exposure
   *
   * PRECONDITIONS:
   * - exposure must be non-negative
   */
  setToneMappingExposure(exposure: number): void {
    assertNonNegative(exposure, 'Tone mapping exposure');
    this.renderer.toneMappingExposure = exposure;
  }

  getInfo(): THREE.WebGLInfo {
    return this.renderer.info;
  }

  dispose(): void {
    this.renderer.dispose();
    this.container.removeChild(this.renderer.domElement);
  }
}

/**
 * CosmosApp - Main application controller
 * Coordinates all systems: rendering, simulation, UI, and input
 *
 * NEGATIVE SPACE: This class asserts that all subsystems initialize correctly
 * and that state transitions (start/stop) are valid. The render loop asserts
 * that timing values are sane.
 */

import * as THREE from 'three';
import { Renderer } from './Renderer';
import { SceneManager } from './Scene';
import { CameraManager } from './Camera';
import { PostProcessingManager } from './PostProcessing';
import { TimeController } from '../systems/TimeController';
import { CameraController } from '../controls/CameraController';
import { SolarSystemBuilder } from '../bodies/SolarSystemBuilder';
import { UIManager } from '../ui/UIManager';
import {
  invariant,
  assertDefined,
  assertInstanceOf,
  assertPositive,
  assertNonNegative,
  assertFinite,
  postcondition,
  precondition
} from '../utils/invariant';

export type ProgressCallback = (progress: number, message: string) => void;

/** Maximum expected bodies in the solar system (for loop bounds) */
const MAX_CELESTIAL_BODIES = 200;

/** Maximum expected frame delta time in seconds (sanity check) */
const MAX_DELTA_TIME = 1.0;

export class CosmosApp {
  private container: HTMLElement;
  private renderer: Renderer;
  private sceneManager: SceneManager;
  private cameraManager: CameraManager;
  private postProcessing: PostProcessingManager;
  private timeController: TimeController;
  private cameraController: CameraController;
  private solarSystem: SolarSystemBuilder;
  private uiManager: UIManager;

  private clock: THREE.Clock;
  private isRunning: boolean = false;
  private isInitialized: boolean = false;
  private frameId: number = 0;

  // Performance monitoring
  private fpsCounter = { frames: 0, lastTime: 0, fps: 0 };

  /**
   * Create a new CosmosApp instance
   *
   * PRECONDITIONS:
   * - container must be an HTMLElement
   * - container must have non-zero dimensions
   *
   * POSTCONDITIONS:
   * - All subsystems are created
   */
  constructor(container: HTMLElement) {
    // PRECONDITIONS
    assertInstanceOf(container, HTMLElement, 'container');
    invariant(
      container.clientWidth > 0 && container.clientHeight > 0,
      'Container must have non-zero dimensions',
      { width: container.clientWidth, height: container.clientHeight }
    );

    this.container = container;
    this.clock = new THREE.Clock();

    // Initialize core systems
    this.renderer = new Renderer(container);
    postcondition(
      this.renderer !== null,
      'Renderer must be created'
    );

    this.sceneManager = new SceneManager();
    postcondition(
      this.sceneManager !== null,
      'SceneManager must be created'
    );

    this.cameraManager = new CameraManager(container);
    postcondition(
      this.cameraManager !== null,
      'CameraManager must be created'
    );

    this.postProcessing = new PostProcessingManager(
      this.renderer.getRenderer(),
      this.sceneManager.getScene(),
      this.cameraManager.getCamera()
    );
    postcondition(
      this.postProcessing !== null,
      'PostProcessingManager must be created'
    );

    this.timeController = new TimeController();
    postcondition(
      this.timeController !== null,
      'TimeController must be created'
    );

    this.cameraController = new CameraController(
      this.cameraManager.getCamera(),
      container,
      this.sceneManager
    );
    postcondition(
      this.cameraController !== null,
      'CameraController must be created'
    );

    this.solarSystem = new SolarSystemBuilder(this.sceneManager.getScene());
    postcondition(
      this.solarSystem !== null,
      'SolarSystemBuilder must be created'
    );

    this.uiManager = new UIManager(
      this.timeController,
      this.cameraController,
      this.solarSystem
    );
    postcondition(
      this.uiManager !== null,
      'UIManager must be created'
    );

    // Handle window resize
    window.addEventListener('resize', this.onResize.bind(this));
  }

  /**
   * Initialize the application
   *
   * PRECONDITIONS:
   * - Must not already be initialized
   * - Must not be running
   *
   * POSTCONDITIONS:
   * - Scene is ready with celestial bodies
   * - Post-processing is configured
   * - UI is initialized
   * - isInitialized is true
   */
  async init(onProgress?: ProgressCallback): Promise<void> {
    // PRECONDITIONS
    precondition(
      !this.isInitialized,
      'Cannot initialize: already initialized'
    );
    precondition(
      !this.isRunning,
      'Cannot initialize while running'
    );

    onProgress?.(0, 'Setting up scene...');

    // Initialize scene with starfield
    await this.sceneManager.init();
    onProgress?.(0.2, 'Loading celestial bodies...');

    // Build the solar system
    await this.solarSystem.build(onProgress);

    // Assert solar system was built with expected bounds
    const bodies = this.solarSystem.getAllBodies();
    invariant(
      bodies.length > 0,
      'Solar system must have at least one body (the Sun)'
    );
    invariant(
      bodies.length <= MAX_CELESTIAL_BODIES,
      'Solar system body count exceeds expected maximum',
      { count: bodies.length, max: MAX_CELESTIAL_BODIES }
    );

    onProgress?.(0.8, 'Setting up post-processing...');

    // Initialize post-processing effects
    this.postProcessing.init();
    onProgress?.(0.9, 'Initializing UI...');

    // Initialize UI
    this.uiManager.init();

    // Set scene references for UI hover detection and labels
    this.uiManager.setSceneReferences(
      this.cameraManager.getCamera(),
      this.sceneManager.getScene()
    );

    this.isInitialized = true;
    onProgress?.(1.0, 'Complete!');

    // POSTCONDITION
    postcondition(
      this.isInitialized,
      'Must be initialized after init()'
    );
  }

  /**
   * Start the render loop
   *
   * PRECONDITIONS:
   * - Must be initialized
   * - Must not already be running
   *
   * POSTCONDITIONS:
   * - isRunning is true
   * - Animation frame is scheduled
   */
  start(): void {
    // PRECONDITIONS
    precondition(
      this.isInitialized,
      'Cannot start: not initialized. Call init() first.'
    );
    // Allow start() to be called when already running (idempotent)
    if (this.isRunning) return;

    this.isRunning = true;
    this.clock.start();
    this.fpsCounter.lastTime = performance.now();
    this.animate();

    // POSTCONDITIONS
    postcondition(
      this.isRunning,
      'Must be running after start()'
    );
  }

  /**
   * Stop the render loop
   *
   * POSTCONDITIONS:
   * - isRunning is false
   * - Animation frame is cancelled
   */
  stop(): void {
    this.isRunning = false;
    if (this.frameId !== 0) {
      cancelAnimationFrame(this.frameId);
      this.frameId = 0;
    }

    // POSTCONDITION
    postcondition(
      !this.isRunning,
      'Must not be running after stop()'
    );
  }

  /**
   * Main animation loop
   *
   * INVARIANTS:
   * - delta must be finite and non-negative
   * - Julian date must be valid
   * - Time scale must be finite
   */
  private animate(): void {
    if (!this.isRunning) return;

    this.frameId = requestAnimationFrame(this.animate.bind(this));

    const delta = this.clock.getDelta();

    // INVARIANT: delta must be sane
    assertFinite(delta, 'Frame delta time');
    assertNonNegative(delta, 'Frame delta time');
    invariant(
      delta <= MAX_DELTA_TIME,
      'Frame delta time exceeds maximum',
      { delta, max: MAX_DELTA_TIME }
    );

    // Update time simulation
    this.timeController.update(delta);
    const julianDate = this.timeController.getJulianDate();
    const timeScale = this.timeController.getTimeScale();

    // INVARIANT: time values must be valid
    assertFinite(julianDate, 'Julian date');
    assertFinite(timeScale, 'Time scale');

    // Update all celestial bodies with Julian Date and time scale
    this.solarSystem.update(julianDate, delta, timeScale);

    // Update camera controls
    this.cameraController.update(delta);

    // Update skybox to follow camera (stars stay around you no matter where you go)
    this.sceneManager.updateSkybox(this.cameraManager.getCamera().position);

    // Update camera manager (for any automatic behaviors)
    this.cameraManager.update(delta);

    // Render the scene with post-processing
    this.postProcessing.render();

    // Update UI
    this.uiManager.update(delta);

    // Update FPS counter
    this.updateFPS();
  }

  /**
   * Update FPS counter
   *
   * INVARIANTS:
   * - fps must be non-negative
   */
  private updateFPS(): void {
    this.fpsCounter.frames++;
    const now = performance.now();

    if (now - this.fpsCounter.lastTime >= 1000) {
      this.fpsCounter.fps = this.fpsCounter.frames;
      this.fpsCounter.frames = 0;
      this.fpsCounter.lastTime = now;

      // INVARIANT: FPS must be non-negative
      assertNonNegative(this.fpsCounter.fps, 'FPS');

      // Update UI with FPS if in debug mode
      if (import.meta.env.DEV) {
        this.uiManager.setFPS(this.fpsCounter.fps);
      }
    }
  }

  /**
   * Handle window resize
   *
   * INVARIANTS:
   * - dimensions must be positive
   */
  private onResize(): void {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    // Only resize if dimensions are valid
    // (window may be minimized, resulting in 0x0)
    if (width > 0 && height > 0) {
      assertPositive(width, 'Container width');
      assertPositive(height, 'Container height');

      this.renderer.resize(width, height);
      this.cameraManager.resize(width, height);
      this.postProcessing.resize(width, height);
    }
  }

  // Public API with assertions

  getTimeController(): TimeController {
    return assertDefined(this.timeController, 'TimeController');
  }

  getCameraController(): CameraController {
    return assertDefined(this.cameraController, 'CameraController');
  }

  getSolarSystem(): SolarSystemBuilder {
    return assertDefined(this.solarSystem, 'SolarSystem');
  }

  getScene(): THREE.Scene {
    return assertDefined(this.sceneManager.getScene(), 'Scene');
  }

  getCamera(): THREE.PerspectiveCamera {
    return assertDefined(this.cameraManager.getCamera(), 'Camera');
  }

  getFPS(): number {
    assertNonNegative(this.fpsCounter.fps, 'FPS');
    return this.fpsCounter.fps;
  }

  isAppRunning(): boolean {
    return this.isRunning;
  }

  isAppInitialized(): boolean {
    return this.isInitialized;
  }
}

/**
 * PostProcessingManager - Visual effects and post-processing
 * Handles bloom, anti-aliasing, and other effects
 *
 * NEGATIVE SPACE: This class asserts that effect parameters are valid,
 * that the composer is initialized, and that resize dimensions are positive.
 */

import * as THREE from 'three';
import {
  EffectComposer,
  RenderPass,
  EffectPass,
  BloomEffect,
  SMAAEffect,
  SMAAPreset,
  BlendFunction,
  KernelSize,
  ToneMappingEffect,
  ToneMappingMode
} from 'postprocessing';
import {
  invariant,
  assertPositive,
  assertNonNegative,
  assertBounds,
  postcondition
} from '../utils/invariant';

/** Valid quality presets */
const VALID_QUALITY_PRESETS = ['low', 'medium', 'high', 'ultra'] as const;

export class PostProcessingManager {
  private composer: EffectComposer;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.Camera;

  private bloomEffect: BloomEffect | null = null;
  private smaaEffect: SMAAEffect | null = null;

  // Effect settings
  private bloomSettings = {
    intensity: 1.5,
    luminanceThreshold: 0.4,
    luminanceSmoothing: 0.3,
    kernelSize: KernelSize.LARGE
  };

  /**
   * Create a new PostProcessingManager
   *
   * POSTCONDITIONS:
   * - Composer is created
   */
  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera
  ) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.composer = new EffectComposer(renderer);

    // POSTCONDITION: Composer created
    postcondition(
      this.composer !== null,
      'Effect composer must be created'
    );
  }

  /**
   * Initialize post-processing effects
   *
   * POSTCONDITIONS:
   * - Bloom effect is created
   * - SMAA effect is created
   * - Effects pass is added to composer
   */
  init(): void {
    // Clear any existing passes
    this.composer.removeAllPasses();

    // Render pass
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    // Bloom effect - essential for sun glow and atmosphere
    this.bloomEffect = new BloomEffect({
      intensity: this.bloomSettings.intensity,
      luminanceThreshold: this.bloomSettings.luminanceThreshold,
      luminanceSmoothing: this.bloomSettings.luminanceSmoothing,
      kernelSize: this.bloomSettings.kernelSize,
      blendFunction: BlendFunction.ADD,
      mipmapBlur: true
    });

    // POSTCONDITION: Bloom effect created
    postcondition(
      this.bloomEffect !== null,
      'Bloom effect must be created'
    );

    // Tone mapping
    const toneMappingEffect = new ToneMappingEffect({
      mode: ToneMappingMode.ACES_FILMIC,
      resolution: 256,
      whitePoint: 4.0,
      middleGrey: 0.6,
      minLuminance: 0.01,
      averageLuminance: 1.0,
      adaptationRate: 1.0
    });

    // SMAA anti-aliasing
    this.smaaEffect = new SMAAEffect({
      preset: SMAAPreset.HIGH
    });

    // POSTCONDITION: SMAA effect created
    postcondition(
      this.smaaEffect !== null,
      'SMAA effect must be created'
    );

    // Add effects pass
    const effectsPass = new EffectPass(
      this.camera,
      this.bloomEffect,
      toneMappingEffect,
      this.smaaEffect
    );

    this.composer.addPass(effectsPass);
  }

  render(): void {
    this.composer.render();
  }

  /**
   * Resize post-processing
   *
   * PRECONDITIONS:
   * - width and height must be positive
   */
  resize(width: number, height: number): void {
    assertPositive(width, 'PostProcessing resize width');
    assertPositive(height, 'PostProcessing resize height');

    this.composer.setSize(width, height);
  }

  /**
   * Set bloom intensity
   *
   * PRECONDITIONS:
   * - intensity must be non-negative
   */
  setBloomIntensity(intensity: number): void {
    assertNonNegative(intensity, 'Bloom intensity');

    if (this.bloomEffect) {
      this.bloomEffect.intensity = intensity;
    }
  }

  /**
   * Set bloom threshold
   *
   * PRECONDITIONS:
   * - threshold must be between 0 and 1
   */
  setBloomThreshold(threshold: number): void {
    assertBounds(threshold, 0, 1, 'Bloom threshold');

    if (this.bloomEffect) {
      this.bloomEffect.luminanceMaterial.threshold = threshold;
    }
  }

  // Enable/disable effects
  setBloomEnabled(enabled: boolean): void {
    if (this.bloomEffect) {
      this.bloomEffect.blendMode.opacity.value = enabled ? 1 : 0;
    }
  }

  /**
   * Set quality preset
   *
   * PRECONDITIONS:
   * - preset must be a valid quality preset
   */
  setQualityPreset(preset: 'low' | 'medium' | 'high' | 'ultra'): void {
    // PRECONDITION
    invariant(
      VALID_QUALITY_PRESETS.includes(preset),
      'Quality preset must be valid',
      { preset, valid: VALID_QUALITY_PRESETS }
    );

    if (!this.bloomEffect) return;

    switch (preset) {
      case 'low':
        this.bloomEffect.kernelSize = KernelSize.SMALL;
        this.bloomEffect.intensity = 1.0;
        if (this.smaaEffect) {
          // SMAA will use lower quality
        }
        break;

      case 'medium':
        this.bloomEffect.kernelSize = KernelSize.MEDIUM;
        this.bloomEffect.intensity = 1.3;
        break;

      case 'high':
        this.bloomEffect.kernelSize = KernelSize.LARGE;
        this.bloomEffect.intensity = 1.5;
        break;

      case 'ultra':
        this.bloomEffect.kernelSize = KernelSize.HUGE;
        this.bloomEffect.intensity = 1.8;
        break;
    }
  }

  getComposer(): EffectComposer {
    return this.composer;
  }

  dispose(): void {
    this.composer.dispose();
  }
}

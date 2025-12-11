/**
 * TextureLoader - Centralized texture loading and caching
 * Handles loading of NASA textures with progress tracking
 *
 * NEGATIVE SPACE: This class asserts that URLs are valid strings,
 * that canvas contexts are available, and that progress values are valid.
 */

import * as THREE from 'three';
import {
  invariant,
  assertDefined,
  assertBounds,
  postcondition
} from '../utils/invariant';

export interface TextureSet {
  diffuse?: THREE.Texture;
  normal?: THREE.Texture;
  specular?: THREE.Texture;
  emissive?: THREE.Texture;
  clouds?: THREE.Texture;
  night?: THREE.Texture;
  ring?: THREE.Texture;
  ringAlpha?: THREE.Texture;
}

export class TextureLoader {
  private loader: THREE.TextureLoader;
  private cache: Map<string, THREE.Texture> = new Map();
  private loadingProgress: Map<string, number> = new Map();

  /**
   * Create a new TextureLoader
   *
   * POSTCONDITIONS:
   * - THREE.TextureLoader is created
   */
  constructor() {
    this.loader = new THREE.TextureLoader();

    // POSTCONDITION: Loader created
    postcondition(
      this.loader !== null,
      'THREE.TextureLoader must be created'
    );
  }

  /**
   * Load a texture from URL
   *
   * PRECONDITIONS:
   * - url must be a non-empty string
   *
   * POSTCONDITIONS:
   * - Texture is cached on successful load
   */
  async load(url: string): Promise<THREE.Texture> {
    // PRECONDITION
    invariant(
      typeof url === 'string' && url.length > 0,
      'Texture URL must be a non-empty string'
    );

    // Check cache first
    if (this.cache.has(url)) {
      return assertDefined(this.cache.get(url), `Cached texture for ${url}`);
    }

    return new Promise((resolve, reject) => {
      this.loader.load(
        url,
        (texture) => {
          // Configure texture
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.generateMipmaps = true;
          texture.minFilter = THREE.LinearMipmapLinearFilter;
          texture.magFilter = THREE.LinearFilter;
          texture.anisotropy = 16;

          // Cache it
          this.cache.set(url, texture);
          this.loadingProgress.set(url, 100);

          resolve(texture);
        },
        (progress) => {
          if (progress.lengthComputable) {
            const percent = (progress.loaded / progress.total) * 100;
            // Progress should be in valid range
            assertBounds(percent, 0, 100, `Loading progress for ${url}`);
            this.loadingProgress.set(url, percent);
          }
        },
        (error) => {
          console.warn(`Failed to load texture: ${url}`, error);
          reject(error);
        }
      );
    });
  }

  async loadWithFallback(url: string, fallbackColor: number = 0x888888): Promise<THREE.Texture> {
    try {
      return await this.load(url);
    } catch {
      // Create a fallback solid color texture
      return this.createSolidColorTexture(fallbackColor);
    }
  }

  /**
   * Create a solid color texture
   *
   * POSTCONDITIONS:
   * - Canvas context is available
   * - Texture is created
   */
  createSolidColorTexture(color: number): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = assertDefined(
      canvas.getContext('2d'),
      'Canvas 2D context must be available for solid color texture'
    );

    const r = ((color >> 16) & 0xff);
    const g = ((color >> 8) & 0xff);
    const b = (color & 0xff);
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(0, 0, 64, 64);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  /**
   * Create a procedural planet texture
   *
   * POSTCONDITIONS:
   * - Canvas context is available
   * - Texture is created
   */
  createProceduralPlanetTexture(options: {
    baseColor: THREE.Color;
    noiseScale?: number;
    hasOceans?: boolean;
    oceanColor?: THREE.Color;
  }): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = assertDefined(
      canvas.getContext('2d'),
      'Canvas 2D context must be available for procedural planet texture'
    );

    const { baseColor, noiseScale = 20, hasOceans = false, oceanColor } = options;

    // Fill with base color
    ctx.fillStyle = `#${baseColor.getHexString()}`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Add procedural noise
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const i = (y * canvas.width + x) * 4;

        // Simple noise
        const noise = (Math.sin(x / noiseScale) * Math.cos(y / noiseScale) + 1) / 2;
        const variation = (Math.random() - 0.5) * 20;

        data[i] = Math.min(255, Math.max(0, data[i] + variation + noise * 30));
        data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + variation + noise * 30));
        data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + variation + noise * 30));

        // Add oceans if specified
        if (hasOceans && oceanColor && noise < 0.4) {
          const blend = 1 - (noise / 0.4);
          data[i] = data[i] * (1 - blend) + oceanColor.r * 255 * blend;
          data[i + 1] = data[i + 1] * (1 - blend) + oceanColor.g * 255 * blend;
          data[i + 2] = data[i + 2] * (1 - blend) + oceanColor.b * 255 * blend;
        }
      }
    }

    ctx.putImageData(imageData, 0, 0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;

    return texture;
  }

  /**
   * Get overall loading progress
   *
   * POSTCONDITIONS:
   * - Result is between 0 and 100
   */
  getLoadingProgress(): number {
    if (this.loadingProgress.size === 0) return 100;

    let total = 0;
    this.loadingProgress.forEach((progress) => {
      total += progress;
    });
    const result = total / this.loadingProgress.size;

    // POSTCONDITION: Result should be in valid range
    assertBounds(result, 0, 100, 'Overall loading progress');
    return result;
  }

  getCachedTexture(url: string): THREE.Texture | undefined {
    return this.cache.get(url);
  }

  dispose(): void {
    this.cache.forEach((texture) => texture.dispose());
    this.cache.clear();
  }
}

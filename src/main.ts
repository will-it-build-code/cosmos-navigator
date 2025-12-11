/**
 * Cosmos Navigator - Main Entry Point
 * A stunning, scientifically accurate 3D Solar System explorer
 *
 * NEGATIVE SPACE: This file asserts that all required DOM elements exist
 * and that Three.js loaded correctly. Silent failures are replaced with
 * loud crashes that tell us exactly what went wrong.
 */

import * as THREE from 'three';
import { CosmosApp } from './engine/CosmosApp';
import {
  invariant,
  assertHTMLElement,
  assertBounds,
  postcondition
} from './utils/invariant';

// DOM element references - initialized when DOM is ready
let loadingScreen: HTMLElement;
let loadingBar: HTMLElement;
let loadingText: HTMLElement;

/**
 * Initialize DOM element references
 * 
 * PRECONDITIONS:
 * - DOM must be ready
 * 
 * POSTCONDITIONS:
 * - All loading screen elements are assigned
 */
function initDOMElements(): void {
  loadingScreen = assertHTMLElement(
    document.getElementById('loading-screen'),
    '#loading-screen'
  );
  loadingBar = assertHTMLElement(
    document.getElementById('loading-bar'),
    '#loading-bar'
  );
  loadingText = assertHTMLElement(
    document.getElementById('loading-text'),
    '#loading-text'
  );
}

/**
 * Update loading progress display
 *
 * PRECONDITIONS:
 * - progress must be between 0 and 100
 * - text must be non-empty
 *
 * POSTCONDITIONS:
 * - loading bar width is updated
 * - loading text content is updated
 */
function updateLoadingProgress(progress: number, text: string): void {
  // PRECONDITIONS
  assertBounds(progress, 0, 100, 'Loading progress');
  invariant(
    text.length > 0,
    'Loading text must not be empty',
    { text }
  );

  // Update UI
  loadingBar.style.width = `${progress}%`;
  loadingText.textContent = text;
}

/**
 * Hide loading screen with fade out animation
 *
 * POSTCONDITIONS:
 * - Loading screen has 'hidden' class
 */
function hideLoadingScreen(): void {
  // Add hidden class for CSS transition
  loadingScreen.classList.add('hidden');

  // After transition, fully hide
  setTimeout(() => {
    loadingScreen.style.display = 'none';
  }, 500);

  // POSTCONDITION
  postcondition(
    loadingScreen.classList.contains('hidden'),
    'Loading screen must have hidden class'
  );
}

/**
 * Main initialization function
 *
 * PRECONDITIONS:
 * - DOM must be ready
 * - Three.js must be loaded
 * - Canvas container must exist
 *
 * POSTCONDITIONS:
 * - Application is running
 * - Loading screen is hidden
 */
async function init(): Promise<void> {
  // PRECONDITION: Verify Three.js loaded
  invariant(
    typeof THREE.REVISION === 'string' && THREE.REVISION.length > 0,
    'Three.js must be loaded and have a valid revision',
    { revision: THREE.REVISION }
  );

  updateLoadingProgress(10, 'Initializing renderer...');

  // PRECONDITION: Canvas container must exist
  const container = assertHTMLElement(
    document.getElementById('canvas-container'),
    '#canvas-container'
  );

  // PRECONDITION: Container must have dimensions
  invariant(
    container.clientWidth > 0,
    'Canvas container must have non-zero width',
    { width: container.clientWidth }
  );
  invariant(
    container.clientHeight > 0,
    'Canvas container must have non-zero height',
    { height: container.clientHeight }
  );

  updateLoadingProgress(20, 'Creating scene...');

  // Initialize the main application
  const app = new CosmosApp(container);

  // POSTCONDITION: App must be created
  postcondition(
    app !== null && app !== undefined,
    'CosmosApp must be created'
  );

  updateLoadingProgress(40, 'Loading textures...');

  // Initialize the application with progress callback
  await app.init((progress, message) => {
    // Clamp progress to handle floating-point precision errors (e.g., 1.0000000000000002)
    const clampedProgress = Math.max(0, Math.min(1, progress));

    // Validate callback parameters
    assertBounds(clampedProgress, 0, 1, 'Init progress');
    invariant(
      message.length > 0,
      'Init progress message must not be empty'
    );

    const totalProgress = 40 + (clampedProgress * 50);
    updateLoadingProgress(totalProgress, message);
  });

  updateLoadingProgress(95, 'Starting simulation...');

  // Start the render loop
  app.start();

  updateLoadingProgress(100, 'Ready!');

  // Hide loading screen after a brief delay
  setTimeout(() => {
    hideLoadingScreen();
  }, 500);

  // Expose app to window for debugging in development
  if (import.meta.env.DEV) {
    (window as unknown as { cosmosApp: CosmosApp }).cosmosApp = app;
  }
}

/**
 * Error handler for initialization failures
 *
 * Unlike other errors, initialization errors ARE expected operating errors
 * (browser incompatibility, WebGL not supported, etc.) so we handle them
 * gracefully with user feedback rather than crashing.
 */
function handleInitError(error: unknown): void {
  console.error('Failed to initialize Cosmos Navigator:', error);

  // Show error state in UI (only if DOM elements are available)
  if (loadingText && loadingBar) {
    loadingText.textContent = 'Failed to initialize. Please refresh.';
    loadingBar.style.background = '#ff4444';
  }

  // Log detailed error for debugging
  if (error instanceof Error) {
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
  }
}

/**
 * Start the application when DOM is ready
 *
 * INVARIANT: init() must only be called once, after DOM is ready
 */
function startApp(): void {
  // Initialize DOM references FIRST (DOM is guaranteed ready here)
  initDOMElements();
  
  // Then start the app
  init().catch(handleInitError);
}

// Entry point: wait for DOM if needed
if (document.readyState === 'loading') {
  // DOM not ready, wait for it
  document.addEventListener('DOMContentLoaded', startApp);
} else {
  // DOM already ready
  startApp();
}

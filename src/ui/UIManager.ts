/**
 * UIManager - Manages all UI elements
 * Handles info panels, controls, search, and overlays
 *
 * NEGATIVE SPACE: This class asserts that required DOM elements exist,
 * that UI components are created, and that scene references are valid.
 */

import * as THREE from 'three';
import { TimeController } from '../systems/TimeController';
import { CameraController } from '../controls/CameraController';
import { SolarSystemBuilder } from '../bodies/SolarSystemBuilder';
import { InfoPanel } from './InfoPanel';
import { TimeControlsUI } from './TimeControlsUI';
import { SearchBar } from './SearchBar';
import { SettingsPanel } from './SettingsPanel';
import { NavigationDropdown } from './NavigationDropdown';
import {
  invariant,
  assertDefined,
  postcondition
} from '../utils/invariant';

export class UIManager {
  private timeController: TimeController;
  private cameraController: CameraController;
  private solarSystem: SolarSystemBuilder;

  private infoPanel: InfoPanel;
  private timeControls: TimeControlsUI;
  private searchBar: SearchBar;
  private settingsPanel: SettingsPanel;
  private navigationDropdown: NavigationDropdown;

  private uiContainer: HTMLElement;
  private fpsDisplay: HTMLElement | null = null;
  private hoverTooltip: HTMLElement | null = null;
  private modeIndicator: HTMLElement | null = null;

  // For hover detection
  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private mouse: THREE.Vector2 = new THREE.Vector2();
  private camera: THREE.PerspectiveCamera | null = null;
  private scene: THREE.Scene | null = null;

  // Labels
  private labelsContainer: HTMLElement | null = null;
  private showPermanentLabels: boolean = false;
  private labelElements: Map<string, HTMLElement> = new Map();

  // Camera position caching for label optimization
  private lastCameraPosition: THREE.Vector3 = new THREE.Vector3();
  private lastCameraQuaternion: THREE.Quaternion = new THREE.Quaternion();
  private labelUpdateThreshold: number = 0.5; // Only update if camera moved more than this

  /**
   * Create a new UIManager
   *
   * PRECONDITIONS:
   * - #ui-overlay element must exist in DOM
   *
   * POSTCONDITIONS:
   * - All UI components are created
   */
  constructor(
    timeController: TimeController,
    cameraController: CameraController,
    solarSystem: SolarSystemBuilder
  ) {
    this.timeController = timeController;
    this.cameraController = cameraController;
    this.solarSystem = solarSystem;

    this.uiContainer = assertDefined(
      document.getElementById('ui-overlay'),
      '#ui-overlay element must exist'
    );

    // Create UI components
    this.infoPanel = new InfoPanel();
    this.timeControls = new TimeControlsUI(timeController);
    this.searchBar = new SearchBar(solarSystem, cameraController);
    this.settingsPanel = new SettingsPanel();
    this.navigationDropdown = new NavigationDropdown(solarSystem, cameraController);

    // POSTCONDITION: All components created
    postcondition(
      this.infoPanel !== null && this.timeControls !== null &&
      this.searchBar !== null && this.settingsPanel !== null &&
      this.navigationDropdown !== null,
      'All UI components must be created'
    );
  }

  init(): void {
    // Create main UI container elements
    this.createUIStructure();

    // Initialize sub-components
    this.infoPanel.init(this.uiContainer);
    this.timeControls.init(this.uiContainer);
    this.searchBar.init(this.uiContainer);
    this.settingsPanel.init(this.uiContainer);
    this.navigationDropdown.init(this.uiContainer);

    // Set up keyboard shortcuts
    this.setupKeyboardShortcuts();

    // Create FPS display for debug mode
    if (import.meta.env.DEV) {
      this.createFPSDisplay();
    }

    // Create hover tooltip
    this.createHoverTooltip();

    // Create camera mode indicator
    this.createModeIndicator();

    // Create labels container
    this.createLabelsContainer();

    // Set up hover detection
    this.setupHoverDetection();

    // Listen for label toggle setting
    this.settingsPanel.onSettingChange('showLabels', (value) => {
      this.showPermanentLabels = value as boolean;
      this.updateLabelsVisibility();
    });

    // Listen for orbit lines toggle
    this.settingsPanel.onSettingChange('showOrbitLines', (value) => {
      this.solarSystem.setOrbitLinesVisible(value as boolean);
    });

    // Listen for asteroid belt toggle
    this.settingsPanel.onSettingChange('showAsteroidBelt', (value) => {
      this.setAsteroidBeltVisible(value as boolean);
    });

    // Listen for atmospheres toggle
    this.settingsPanel.onSettingChange('showAtmospheres', (value) => {
      this.setAtmospheresVisible(value as boolean);
    });

    // Listen for moons toggle
    this.settingsPanel.onSettingChange('showMoons', (value) => {
      this.solarSystem.setMoonsVisible(value as boolean);
    });
  }

  private setAsteroidBeltVisible(visible: boolean): void {
    if (!this.scene) return;
    const asteroidBelt = this.scene.getObjectByName('asteroid_belt');
    if (asteroidBelt) {
      asteroidBelt.visible = visible;
    }
  }

  private setAtmospheresVisible(visible: boolean): void {
    const bodies = this.solarSystem.getAllBodies();
    for (const body of bodies) {
      const group = body.getGroup();
      if (group) {
        // Find atmosphere meshes in the group
        group.traverse((child) => {
          if (child.name.includes('atmosphere') || child.name.includes('clouds')) {
            child.visible = visible;
          }
        });
      }
    }
  }

  private createUIStructure(): void {
    // Add base styles
    const style = document.createElement('style');
    style.textContent = `
      .cosmos-panel {
        background: rgba(10, 15, 30, 0.85);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(100, 150, 255, 0.2);
        border-radius: 8px;
        color: #e0e8ff;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 13px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
      }

      .cosmos-button {
        background: rgba(60, 100, 180, 0.4);
        border: 1px solid rgba(100, 150, 255, 0.3);
        border-radius: 4px;
        color: #e0e8ff;
        padding: 6px 12px;
        cursor: pointer;
        font-size: 12px;
        transition: all 0.2s ease;
      }

      .cosmos-button:hover {
        background: rgba(80, 130, 220, 0.5);
        border-color: rgba(100, 150, 255, 0.5);
      }

      .cosmos-button:active {
        background: rgba(100, 150, 255, 0.6);
      }

      .cosmos-button.active {
        background: rgba(100, 150, 255, 0.5);
        border-color: rgba(150, 200, 255, 0.6);
      }

      .cosmos-input {
        background: rgba(0, 10, 30, 0.6);
        border: 1px solid rgba(100, 150, 255, 0.3);
        border-radius: 4px;
        color: #e0e8ff;
        padding: 8px 12px;
        font-size: 13px;
        outline: none;
        transition: border-color 0.2s ease;
      }

      .cosmos-input:focus {
        border-color: rgba(100, 150, 255, 0.6);
      }

      .cosmos-input::placeholder {
        color: rgba(150, 170, 200, 0.5);
      }

      .cosmos-label {
        color: rgba(180, 200, 255, 0.8);
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 4px;
      }

      .cosmos-slider {
        -webkit-appearance: none;
        width: 100%;
        height: 4px;
        background: rgba(60, 100, 180, 0.3);
        border-radius: 2px;
        outline: none;
      }

      .cosmos-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 14px;
        height: 14px;
        background: rgba(100, 150, 255, 0.8);
        border-radius: 50%;
        cursor: pointer;
        transition: transform 0.2s ease;
      }

      .cosmos-slider::-webkit-slider-thumb:hover {
        transform: scale(1.2);
      }

      .cosmos-divider {
        height: 1px;
        background: linear-gradient(90deg,
          transparent,
          rgba(100, 150, 255, 0.3) 20%,
          rgba(100, 150, 255, 0.3) 80%,
          transparent
        );
        margin: 12px 0;
      }

      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }

      .cosmos-fade-in {
        animation: fadeIn 0.3s ease-out;
      }
    `;
    document.head.appendChild(style);
  }

  private createFPSDisplay(): void {
    this.fpsDisplay = document.createElement('div');
    this.fpsDisplay.style.cssText = `
      position: absolute;
      top: 10px;
      right: 10px;
      background: rgba(0, 0, 0, 0.7);
      color: #00ff00;
      padding: 4px 8px;
      font-family: monospace;
      font-size: 12px;
      border-radius: 4px;
      z-index: 1000;
    `;
    this.uiContainer.appendChild(this.fpsDisplay);
  }

  private setupKeyboardShortcuts(): void {
    window.addEventListener('keydown', (e) => {
      // Cmd/Ctrl + K for search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        this.searchBar.focus();
      }

      // Space for play/pause
      if (e.code === 'Space' && !this.searchBar.isFocused()) {
        e.preventDefault();
        this.timeController.togglePause();
      }

      // I for info panel toggle
      if (e.key === 'i' && !this.searchBar.isFocused()) {
        this.infoPanel.toggle();
      }

      // O for orbit lines toggle
      if (e.key === 'o' && !this.searchBar.isFocused()) {
        this.settingsPanel.toggleOrbitLines();
      }

      // Number keys for time speed
      if (!this.searchBar.isFocused()) {
        const num = parseInt(e.key);
        if (num >= 1 && num <= 7) {
          const speeds = [1, 10, 100, 1000, 10000, 100000, 1000000];
          this.timeController.setTimeScale(speeds[num - 1]);
        }
      }
    });
  }

  private createHoverTooltip(): void {
    this.hoverTooltip = document.createElement('div');
    this.hoverTooltip.id = 'hover-tooltip';
    this.hoverTooltip.style.cssText = `
      position: absolute;
      background: rgba(10, 15, 30, 0.9);
      backdrop-filter: blur(8px);
      border: 1px solid rgba(100, 150, 255, 0.3);
      border-radius: 6px;
      color: #e0e8ff;
      padding: 8px 12px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      font-weight: 500;
      pointer-events: none;
      display: none;
      z-index: 1001;
      white-space: nowrap;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
    `;
    this.uiContainer.appendChild(this.hoverTooltip);
  }

  private createModeIndicator(): void {
    this.modeIndicator = document.createElement('div');
    this.modeIndicator.id = 'mode-indicator';
    this.modeIndicator.style.cssText = `
      position: absolute;
      top: 20px;
      left: 20px;
      background: rgba(10, 15, 30, 0.85);
      backdrop-filter: blur(8px);
      border: 1px solid rgba(100, 150, 255, 0.3);
      border-radius: 6px;
      color: #e0e8ff;
      padding: 8px 14px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 12px;
      z-index: 100;
      display: flex;
      align-items: center;
      gap: 8px;
    `;
    this.modeIndicator.innerHTML = `
      <span style="color: rgba(150, 200, 255, 0.8);">Mode:</span>
      <span id="mode-name" style="font-weight: 500; color: #88ccff;">Free Roam</span>
      <span style="color: rgba(150, 170, 200, 0.6); font-size: 11px;">(F to toggle)</span>
    `;
    this.uiContainer.appendChild(this.modeIndicator);
  }

  private updateModeIndicator(): void {
    if (!this.modeIndicator) return;
    const modeNameEl = this.modeIndicator.querySelector('#mode-name');
    if (modeNameEl) {
      const mode = this.cameraController.getMode();
      const target = this.cameraController.getFocusTarget();

      let modeName = 'Free Roam';
      let color = '#88ccff';

      if (mode === 'orbit') {
        modeName = target ? `Orbiting ${target.name}` : 'Orbit Mode';
        color = '#ffcc88';
      } else if (mode === 'follow') {
        modeName = target ? `Following ${target.name}` : 'Follow Mode';
        color = '#88ff88';
      }

      modeNameEl.textContent = modeName;
      (modeNameEl as HTMLElement).style.color = color;
    }
  }

  private createLabelsContainer(): void {
    this.labelsContainer = document.createElement('div');
    this.labelsContainer.id = 'labels-container';
    this.labelsContainer.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 100;
    `;
    this.uiContainer.appendChild(this.labelsContainer);
  }

  private setupHoverDetection(): void {
    const canvas = document.getElementById('cosmos-canvas') || document.querySelector('canvas');
    if (!canvas) return;

    canvas.addEventListener('mousemove', (event: Event) => {
      const e = event as MouseEvent;
      if (!this.camera || !this.scene) return;

      const rect = canvas.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.camera);

      // Get all celestial body meshes
      const bodies = this.solarSystem.getAllBodies();
      const meshes: THREE.Object3D[] = [];
      bodies.forEach(body => {
        const group = body.getGroup();
        if (group) meshes.push(group);
      });

      const intersects = this.raycaster.intersectObjects(meshes, true);

      if (intersects.length > 0) {
        // Find the celestial body
        let target = intersects[0].object;
        while (target.parent && !target.userData.isCelestialBody) {
          target = target.parent;
        }

        if (target.userData.isCelestialBody && this.hoverTooltip) {
          this.hoverTooltip.textContent = target.userData.name;
          this.hoverTooltip.style.display = 'block';
          this.hoverTooltip.style.left = `${e.clientX + 15}px`;
          this.hoverTooltip.style.top = `${e.clientY + 15}px`;
        }
      } else {
        if (this.hoverTooltip) {
          this.hoverTooltip.style.display = 'none';
        }
      }
    });

    canvas.addEventListener('mouseleave', () => {
      if (this.hoverTooltip) {
        this.hoverTooltip.style.display = 'none';
      }
    });
  }

  private updateLabelsVisibility(): void {
    if (this.labelsContainer) {
      this.labelsContainer.style.display = this.showPermanentLabels ? 'block' : 'none';
    }
  }

  private createLabel(name: string): HTMLElement {
    const label = document.createElement('div');
    label.className = 'cosmos-body-label';
    label.textContent = name;
    label.style.cssText = `
      position: absolute;
      color: rgba(200, 220, 255, 0.9);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 11px;
      text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8), 0 0 10px rgba(0, 0, 0, 0.5);
      white-space: nowrap;
      transform: translateX(-50%);
      pointer-events: none;
    `;
    return label;
  }

  private shouldUpdateLabels(): boolean {
    if (!this.camera) return false;

    // Check if camera has moved significantly
    const positionDelta = this.camera.position.distanceTo(this.lastCameraPosition);
    const rotationDelta = this.camera.quaternion.angleTo(this.lastCameraQuaternion);

    return positionDelta > this.labelUpdateThreshold || rotationDelta > 0.01;
  }

  private updateLabelPositions(): void {
    if (!this.camera || !this.labelsContainer || !this.showPermanentLabels) return;

    // Skip update if camera hasn't moved enough
    if (!this.shouldUpdateLabels()) return;

    // Cache camera state
    this.lastCameraPosition.copy(this.camera.position);
    this.lastCameraQuaternion.copy(this.camera.quaternion);

    const bodies = this.solarSystem.getAllBodies();
    const containerRect = this.labelsContainer.getBoundingClientRect();

    bodies.forEach(body => {
      const group = body.getGroup();
      if (!group) return;

      const name = body.name;

      // Get or create label element
      let label = this.labelElements.get(name);
      if (!label) {
        label = this.createLabel(name);
        this.labelsContainer!.appendChild(label);
        this.labelElements.set(name, label);
      }

      // Hide label if body is not visible
      if (!group.visible) {
        label.style.display = 'none';
        return;
      }

      // Project 3D position to screen
      const position = new THREE.Vector3();
      group.getWorldPosition(position);

      // Offset label slightly above the object
      const radius = group.userData.radius || 1;
      position.y += radius * 1.5;

      // Project to screen coordinates (camera is checked at function start)
      const projected = position.clone().project(this.camera!);

      // Check if in front of camera
      if (projected.z > 1) {
        label.style.display = 'none';
        return;
      }

      const x = (projected.x * 0.5 + 0.5) * containerRect.width;
      const y = (-projected.y * 0.5 + 0.5) * containerRect.height;

      label.style.left = `${x}px`;
      label.style.top = `${y}px`;
      label.style.display = 'block';
    });
  }

  // Set camera and scene references for raycasting
  setSceneReferences(camera: THREE.PerspectiveCamera, scene: THREE.Scene): void {
    this.camera = camera;
    this.scene = scene;
  }

  update(_delta: number): void {
    // Update any animated UI elements
    this.timeControls.update();

    // Update camera mode indicator
    this.updateModeIndicator();

    // Update label positions if enabled
    if (this.showPermanentLabels) {
      this.updateLabelPositions();
    }
  }

  setFPS(fps: number): void {
    if (this.fpsDisplay) {
      this.fpsDisplay.textContent = `${fps} FPS`;
      this.fpsDisplay.style.color = fps >= 55 ? '#00ff00' : fps >= 30 ? '#ffff00' : '#ff0000';
    }
  }

  showObjectInfo(objectName: string): void {
    const body = this.solarSystem.getBodyByName(objectName);
    if (body) {
      this.infoPanel.show(body);
    }
  }

  hideObjectInfo(): void {
    this.infoPanel.hide();
  }
}

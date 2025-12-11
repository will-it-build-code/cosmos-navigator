/**
 * TimeControlsUI - Time control interface
 * Play/pause, speed controls, date display
 */

import { TimeController } from '../systems/TimeController';

export class TimeControlsUI {
  private timeController: TimeController;
  private container: HTMLElement | null = null;
  private panel: HTMLElement | null = null;
  private dateDisplay: HTMLElement | null = null;
  private speedDisplay: HTMLElement | null = null;

  private readonly speedPresets = [
    { label: '1×', value: 1 },
    { label: '10×', value: 10 },
    { label: '100×', value: 100 },
    { label: '1K×', value: 1000 },
    { label: '10K×', value: 10000 },
    { label: '100K×', value: 100000 },
    { label: '1M×', value: 1000000 }
  ];

  constructor(timeController: TimeController) {
    this.timeController = timeController;
  }

  init(container: HTMLElement): void {
    this.container = container;
    this.createPanel();

    // Listen for time updates
    this.timeController.addListener((state) => {
      this.updateDisplay(state);
    });
  }

  private createPanel(): void {
    this.panel = document.createElement('div');
    this.panel.className = 'cosmos-panel';
    this.panel.id = 'time-controls';
    this.panel.style.cssText = `
      position: absolute;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      padding: 12px 16px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      min-width: 400px;
    `;

    this.panel.innerHTML = `
      <div style="display: flex; align-items: center; gap: 16px; width: 100%;">
        <!-- Playback controls -->
        <div style="display: flex; gap: 6px;">
          <button class="cosmos-button" id="time-reverse" title="Reverse">
            ⏪
          </button>
          <button class="cosmos-button" id="time-play" title="Play/Pause">
            ⏸️
          </button>
          <button class="cosmos-button" id="time-forward" title="Forward">
            ⏩
          </button>
        </div>

        <!-- Date display -->
        <div id="date-display" style="flex: 1; text-align: center; font-size: 15px; color: #fff;">
          Loading...
        </div>

        <!-- Speed display -->
        <div style="display: flex; align-items: center; gap: 8px;">
          <span class="cosmos-label" style="margin: 0;">Speed:</span>
          <span id="speed-display" style="color: #fff; font-weight: 500; min-width: 50px;">1×</span>
        </div>

        <!-- Now button -->
        <button class="cosmos-button" id="time-now" title="Jump to Now">
          Now
        </button>
      </div>

      <!-- Speed presets -->
      <div style="display: flex; gap: 4px;">
        ${this.speedPresets.map((preset, index) => `
          <button class="cosmos-button speed-preset" data-speed="${preset.value}" data-index="${index}">
            ${preset.label}
          </button>
        `).join('')}
      </div>
    `;

    this.container?.appendChild(this.panel);

    // Store references
    this.dateDisplay = this.panel.querySelector('#date-display');
    this.speedDisplay = this.panel.querySelector('#speed-display');

    // Set up event handlers
    this.setupEventHandlers();

    // Initial update
    this.updateDisplay(this.timeController.getState());
  }

  private setupEventHandlers(): void {
    if (!this.panel) return;

    // Play/Pause
    this.panel.querySelector('#time-play')?.addEventListener('click', () => {
      this.timeController.togglePause();
    });

    // Reverse
    this.panel.querySelector('#time-reverse')?.addEventListener('click', () => {
      this.timeController.reverse();
    });

    // Forward
    this.panel.querySelector('#time-forward')?.addEventListener('click', () => {
      this.timeController.forward();
    });

    // Now
    this.panel.querySelector('#time-now')?.addEventListener('click', () => {
      this.timeController.jumpToNow();
    });

    // Speed presets
    this.panel.querySelectorAll('.speed-preset').forEach((button) => {
      button.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const speed = parseInt(target.dataset.speed || '1');
        this.timeController.setTimeScale(speed);
      });
    });
  }

  private updateDisplay(state: import('../systems/TimeController').TimeState): void {
    if (this.dateDisplay) {
      this.dateDisplay.textContent = this.timeController.formatDate();
    }

    if (this.speedDisplay) {
      const speed = Math.abs(state.timeScale);
      let label = `${speed}×`;
      if (speed >= 1000000) label = `${(speed / 1000000).toFixed(0)}M×`;
      else if (speed >= 1000) label = `${(speed / 1000).toFixed(0)}K×`;

      if (state.isPaused) label = 'Paused';
      if (state.isReversed && !state.isPaused) label = '-' + label;

      this.speedDisplay.textContent = label;
    }

    // Update play button
    const playButton = this.panel?.querySelector('#time-play');
    if (playButton) {
      playButton.textContent = state.isPaused ? '▶️' : '⏸️';
    }

    // Update speed preset buttons
    const speed = Math.abs(state.timeScale);
    this.panel?.querySelectorAll('.speed-preset').forEach((button) => {
      const btn = button as HTMLElement;
      const btnSpeed = parseInt(btn.dataset.speed || '0');
      btn.classList.toggle('active', btnSpeed === speed);
    });
  }

  update(): void {
    // Called every frame - can be used for animations
  }
}

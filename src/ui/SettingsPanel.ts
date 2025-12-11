/**
 * SettingsPanel - Application settings and visual options
 */

export class SettingsPanel {
  private container: HTMLElement | null = null;
  private panel: HTMLElement | null = null;
  private isOpen: boolean = false;

  // Settings state
  private settings = {
    showOrbitLines: true,
    showLabels: true,
    showAtmospheres: true,
    showAsteroidBelt: true,
    showMoons: true,
    realisticScale: false,
    qualityPreset: 'high' as 'low' | 'medium' | 'high' | 'ultra'
  };

  private listeners: Map<string, (value: boolean | string) => void> = new Map();

  init(container: HTMLElement): void {
    this.container = container;
    this.createToggleButton();
    this.createPanel();
  }

  private createToggleButton(): void {
    const button = document.createElement('button');
    button.className = 'cosmos-button';
    button.id = 'settings-toggle';
    button.innerHTML = '⚙️';
    button.title = 'Settings';
    button.style.cssText = `
      position: absolute;
      top: 20px;
      right: 20px;
      padding: 8px 12px;
      font-size: 16px;
    `;

    button.addEventListener('click', () => this.toggle());
    this.container?.appendChild(button);
  }

  private createPanel(): void {
    this.panel = document.createElement('div');
    this.panel.className = 'cosmos-panel cosmos-fade-in';
    this.panel.id = 'settings-panel';
    this.panel.style.cssText = `
      position: absolute;
      top: 70px;
      right: 20px;
      width: 260px;
      padding: 16px;
      display: none;
    `;

    this.panel.innerHTML = `
      <h3 style="margin: 0 0 16px 0; font-size: 16px; font-weight: 500; color: #fff;">
        Settings
      </h3>

      <div class="cosmos-divider"></div>

      <div class="cosmos-label" style="margin-bottom: 12px;">Display</div>

      ${this.createToggle('showOrbitLines', 'Orbit Lines', this.settings.showOrbitLines)}
      ${this.createToggle('showLabels', 'Labels', this.settings.showLabels)}
      ${this.createToggle('showAtmospheres', 'Atmospheres', this.settings.showAtmospheres)}
      ${this.createToggle('showAsteroidBelt', 'Asteroid Belt', this.settings.showAsteroidBelt)}
      ${this.createToggle('showMoons', 'Moons', this.settings.showMoons)}

      <div class="cosmos-divider"></div>

      <div class="cosmos-label" style="margin-bottom: 12px;">Scale Mode</div>
      ${this.createToggle('realisticScale', 'Realistic Scale', this.settings.realisticScale)}
      <p style="font-size: 11px; color: rgba(150, 170, 200, 0.6); margin: 4px 0 0 0;">
        When off, planet sizes are exaggerated for visibility
      </p>

      <div class="cosmos-divider"></div>

      <div class="cosmos-label" style="margin-bottom: 12px;">Quality</div>
      <div style="display: flex; gap: 6px; flex-wrap: wrap;">
        ${['low', 'medium', 'high', 'ultra'].map(preset => `
          <button
            class="cosmos-button quality-preset ${this.settings.qualityPreset === preset ? 'active' : ''}"
            data-preset="${preset}"
            style="flex: 1; text-transform: capitalize;"
          >
            ${preset}
          </button>
        `).join('')}
      </div>

      <div class="cosmos-divider"></div>

      <div class="cosmos-label" style="margin-bottom: 8px;">Keyboard Shortcuts</div>
      <div style="font-size: 12px; color: rgba(150, 170, 200, 0.8); line-height: 1.8;">
        <div><kbd style="background: rgba(60, 100, 180, 0.3); padding: 2px 6px; border-radius: 3px;">⌘K</kbd> Search</div>
        <div><kbd style="background: rgba(60, 100, 180, 0.3); padding: 2px 6px; border-radius: 3px;">Space</kbd> Play/Pause</div>
        <div><kbd style="background: rgba(60, 100, 180, 0.3); padding: 2px 6px; border-radius: 3px;">O</kbd> Toggle Orbits</div>
        <div><kbd style="background: rgba(60, 100, 180, 0.3); padding: 2px 6px; border-radius: 3px;">I</kbd> Toggle Info</div>
        <div><kbd style="background: rgba(60, 100, 180, 0.3); padding: 2px 6px; border-radius: 3px;">1-7</kbd> Time Speed</div>
        <div><kbd style="background: rgba(60, 100, 180, 0.3); padding: 2px 6px; border-radius: 3px;">Esc</kbd> Clear Selection</div>
        <div style="margin-top: 8px; border-top: 1px solid rgba(100, 150, 255, 0.2); padding-top: 8px;">
          <div><kbd style="background: rgba(60, 100, 180, 0.3); padding: 2px 6px; border-radius: 3px;">↑↓←→</kbd> Look Around</div>
          <div><kbd style="background: rgba(60, 100, 180, 0.3); padding: 2px 6px; border-radius: 3px;">Z/X</kbd> Move Fwd/Back</div>
          <div><kbd style="background: rgba(60, 100, 180, 0.3); padding: 2px 6px; border-radius: 3px;">WASD</kbd> Move</div>
          <div><kbd style="background: rgba(60, 100, 180, 0.3); padding: 2px 6px; border-radius: 3px;">Shift</kbd> Speed Boost</div>
        </div>
      </div>
    `;

    this.container?.appendChild(this.panel);
    this.setupEventHandlers();
  }

  private createToggle(key: string, label: string, initialValue: boolean): string {
    return `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
        <span style="color: rgba(200, 210, 230, 0.9);">${label}</span>
        <label class="toggle-switch" style="position: relative; display: inline-block; width: 40px; height: 20px;">
          <input
            type="checkbox"
            data-setting="${key}"
            ${initialValue ? 'checked' : ''}
            style="opacity: 0; width: 0; height: 0;"
          />
          <span style="
            position: absolute;
            cursor: pointer;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: ${initialValue ? 'rgba(100, 150, 255, 0.6)' : 'rgba(60, 100, 180, 0.3)'};
            border-radius: 20px;
            transition: 0.3s;
          ">
            <span style="
              position: absolute;
              height: 16px;
              width: 16px;
              left: ${initialValue ? '22px' : '2px'};
              bottom: 2px;
              background: white;
              border-radius: 50%;
              transition: 0.3s;
            "></span>
          </span>
        </label>
      </div>
    `;
  }

  private setupEventHandlers(): void {
    if (!this.panel) return;

    // Toggle switches
    this.panel.querySelectorAll('input[type="checkbox"]').forEach((input) => {
      input.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        const key = target.dataset.setting as keyof typeof this.settings;
        if (key) {
          (this.settings as unknown as Record<string, boolean | string>)[key] = target.checked;
          this.notifyListeners(key, target.checked);

          // Update toggle visual
          const slider = target.nextElementSibling as HTMLElement;
          if (slider) {
            slider.style.background = target.checked
              ? 'rgba(100, 150, 255, 0.6)'
              : 'rgba(60, 100, 180, 0.3)';
            const knob = slider.querySelector('span') as HTMLElement;
            if (knob) {
              knob.style.left = target.checked ? '22px' : '2px';
            }
          }
        }
      });
    });

    // Quality presets
    this.panel.querySelectorAll('.quality-preset').forEach((button) => {
      button.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const preset = target.dataset.preset as typeof this.settings.qualityPreset;
        if (preset) {
          this.settings.qualityPreset = preset;
          this.notifyListeners('qualityPreset', preset);

          // Update active state
          this.panel?.querySelectorAll('.quality-preset').forEach((btn) => {
            btn.classList.toggle('active', btn === target);
          });
        }
      });
    });
  }

  private notifyListeners(key: string, value: boolean | string): void {
    const listener = this.listeners.get(key);
    if (listener) {
      listener(value);
    }
  }

  toggle(): void {
    this.isOpen = !this.isOpen;
    if (this.panel) {
      this.panel.style.display = this.isOpen ? 'block' : 'none';
    }
  }

  close(): void {
    this.isOpen = false;
    if (this.panel) {
      this.panel.style.display = 'none';
    }
  }

  // Public methods for programmatic setting changes
  toggleOrbitLines(): void {
    this.settings.showOrbitLines = !this.settings.showOrbitLines;
    this.notifyListeners('showOrbitLines', this.settings.showOrbitLines);
    this.updateToggleUI('showOrbitLines', this.settings.showOrbitLines);
  }

  private updateToggleUI(key: string, value: boolean): void {
    const input = this.panel?.querySelector(`input[data-setting="${key}"]`) as HTMLInputElement;
    if (input) {
      input.checked = value;
      input.dispatchEvent(new Event('change'));
    }
  }

  onSettingChange(key: string, callback: (value: boolean | string) => void): void {
    this.listeners.set(key, callback);
  }

  getSetting<K extends keyof typeof this.settings>(key: K): typeof this.settings[K] {
    return this.settings[key];
  }
}

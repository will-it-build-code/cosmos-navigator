/**
 * InfoPanel - Displays information about selected celestial bodies
 */

import { CelestialBody } from '../bodies/CelestialBody';
import { PLANET_PHYSICAL_DATA, DWARF_PLANET_PHYSICAL_DATA, SUN_DATA, MOON_PHYSICAL_DATA } from '../data/PhysicalData';

export class InfoPanel {
  private container: HTMLElement | null = null;
  private panel: HTMLElement | null = null;
  private isVisible: boolean = false;
  private currentBody: CelestialBody | null = null;

  init(container: HTMLElement): void {
    this.container = container;
    this.createPanel();
  }

  private createPanel(): void {
    this.panel = document.createElement('div');
    this.panel.className = 'cosmos-panel cosmos-fade-in';
    this.panel.id = 'info-panel';
    this.panel.style.cssText = `
      position: absolute;
      top: 20px;
      left: 20px;
      width: 320px;
      max-height: calc(100vh - 40px);
      overflow-y: auto;
      padding: 16px;
      display: none;
    `;

    this.container?.appendChild(this.panel);
  }

  show(body: CelestialBody): void {
    if (!this.panel) return;

    this.currentBody = body;
    this.isVisible = true;

    // Get physical data
    const physicalData = this.getPhysicalData(body.name);

    // Build content
    this.panel.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <h2 style="margin: 0; font-size: 20px; font-weight: 500; color: #fff;">
          ${body.name}
        </h2>
        <button class="cosmos-button" id="info-close" style="padding: 4px 8px;">
          ✕
        </button>
      </div>

      <div class="cosmos-label">${this.getTypeLabel(body.type)}</div>

      <div class="cosmos-divider"></div>

      ${physicalData ? this.renderPhysicalData(physicalData) : this.renderBasicData(body)}

      ${physicalData?.description ? `
        <div class="cosmos-divider"></div>
        <div style="line-height: 1.6; color: rgba(200, 210, 230, 0.9);">
          ${physicalData.description}
        </div>
      ` : ''}

      <div class="cosmos-divider"></div>

      <div style="display: flex; gap: 8px;">
        <a href="https://en.wikipedia.org/wiki/${encodeURIComponent(body.name)}"
           target="_blank"
           class="cosmos-button"
           style="text-decoration: none; flex: 1; text-align: center;">
          Wikipedia
        </a>
        <a href="https://solarsystem.nasa.gov/search/?q=${encodeURIComponent(body.name)}"
           target="_blank"
           class="cosmos-button"
           style="text-decoration: none; flex: 1; text-align: center;">
          NASA
        </a>
      </div>
    `;

    // Add close button handler
    this.panel.querySelector('#info-close')?.addEventListener('click', () => this.hide());

    this.panel.style.display = 'block';
  }

  private getTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      star: '⭐ Star',
      planet: '🪐 Planet',
      dwarf_planet: '🌑 Dwarf Planet',
      moon: '🌙 Natural Satellite',
      asteroid: '☄️ Asteroid',
      comet: '💫 Comet',
      spacecraft: '🛰️ Spacecraft'
    };
    return labels[type] || type;
  }

  private getPhysicalData(name: string): typeof SUN_DATA | null {
    if (name === 'Sun') return SUN_DATA;
    if (PLANET_PHYSICAL_DATA[name.toLowerCase()]) return PLANET_PHYSICAL_DATA[name.toLowerCase()];
    if (DWARF_PLANET_PHYSICAL_DATA[name.toLowerCase()]) return DWARF_PLANET_PHYSICAL_DATA[name.toLowerCase()];

    // Check moon data
    for (const planet in MOON_PHYSICAL_DATA) {
      const moons = MOON_PHYSICAL_DATA[planet];
      for (const moonName in moons) {
        if (moonName.toLowerCase() === name.toLowerCase()) {
          return moons[moonName];
        }
      }
    }

    return null;
  }

  private renderPhysicalData(data: typeof SUN_DATA): string {
    return `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
        ${this.renderDataItem('Radius', this.formatNumber(data.radius) + ' km')}
        ${this.renderDataItem('Mass', this.formatScientific(data.mass) + ' kg')}
        ${this.renderDataItem('Density', data.density.toFixed(3) + ' g/cm³')}
        ${this.renderDataItem('Gravity', data.gravity.toFixed(2) + ' m/s²')}
        ${this.renderDataItem('Escape Vel.', data.escapeVelocity.toFixed(2) + ' km/s')}
        ${this.renderDataItem('Temperature', data.meanTemperature + ' K')}
        ${this.renderDataItem('Day Length', this.formatRotation(data.rotationPeriod))}
        ${this.renderDataItem('Axial Tilt', data.axialTilt.toFixed(2) + '°')}
        ${data.numberOfMoons !== undefined ? this.renderDataItem('Moons', data.numberOfMoons.toString()) : ''}
        ${data.hasRings !== undefined ? this.renderDataItem('Rings', data.hasRings ? 'Yes' : 'No') : ''}
      </div>

      ${data.atmosphereComposition ? `
        <div style="margin-top: 12px;">
          <div class="cosmos-label">Atmosphere</div>
          <div style="color: rgba(200, 210, 230, 0.9); margin-top: 4px;">
            ${data.atmosphereComposition.join(', ')}
          </div>
        </div>
      ` : ''}

      ${data.discoveryYear ? `
        <div style="margin-top: 12px;">
          <div class="cosmos-label">Discovery</div>
          <div style="color: rgba(200, 210, 230, 0.9); margin-top: 4px;">
            ${data.discoveryYear} by ${data.discoveredBy}
          </div>
        </div>
      ` : ''}
    `;
  }

  private renderBasicData(body: CelestialBody): string {
    return `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
        ${this.renderDataItem('Radius', this.formatNumber(body.radius) + ' km')}
        ${body.mass ? this.renderDataItem('Mass', this.formatScientific(body.mass) + ' kg') : ''}
        ${this.renderDataItem('Rotation', this.formatRotation(body.rotationPeriod))}
        ${this.renderDataItem('Axial Tilt', body.axialTilt.toFixed(2) + '°')}
      </div>
    `;
  }

  private renderDataItem(label: string, value: string): string {
    return `
      <div>
        <div class="cosmos-label">${label}</div>
        <div style="color: #fff; font-size: 14px;">${value}</div>
      </div>
    `;
  }

  private formatNumber(num: number): string {
    return num.toLocaleString('en-US', { maximumFractionDigits: 1 });
  }

  private formatScientific(num: number): string {
    if (num === 0) return '0';
    const exponent = Math.floor(Math.log10(Math.abs(num)));
    const mantissa = num / Math.pow(10, exponent);
    return `${mantissa.toFixed(2)}×10^${exponent}`;
  }

  private formatRotation(hours: number): string {
    if (Math.abs(hours) < 24) {
      return `${Math.abs(hours).toFixed(1)} hours${hours < 0 ? ' (retrograde)' : ''}`;
    }
    const days = Math.abs(hours) / 24;
    if (days < 365) {
      return `${days.toFixed(1)} days${hours < 0 ? ' (retrograde)' : ''}`;
    }
    const years = days / 365.25;
    return `${years.toFixed(2)} years${hours < 0 ? ' (retrograde)' : ''}`;
  }

  hide(): void {
    if (this.panel) {
      this.panel.style.display = 'none';
    }
    this.isVisible = false;
    this.currentBody = null;
  }

  toggle(): void {
    if (this.isVisible) {
      this.hide();
    } else if (this.currentBody) {
      this.show(this.currentBody);
    }
  }

  isShowing(): boolean {
    return this.isVisible;
  }
}

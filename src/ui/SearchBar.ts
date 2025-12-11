/**
 * SearchBar - Object search with autocomplete
 */

import { SolarSystemBuilder } from '../bodies/SolarSystemBuilder';
import { CameraController } from '../controls/CameraController';

export class SearchBar {
  private solarSystem: SolarSystemBuilder;
  private cameraController: CameraController;
  private container: HTMLElement | null = null;
  private panel: HTMLElement | null = null;
  private input: HTMLInputElement | null = null;
  private results: HTMLElement | null = null;
  private _isFocused: boolean = false;

  private searchableItems: { name: string; type: string }[] = [];

  constructor(solarSystem: SolarSystemBuilder, cameraController: CameraController) {
    this.solarSystem = solarSystem;
    this.cameraController = cameraController;
  }

  init(container: HTMLElement): void {
    this.container = container;
    this.createPanel();
    this.populateSearchItems();
  }

  private createPanel(): void {
    this.panel = document.createElement('div');
    this.panel.className = 'cosmos-panel';
    this.panel.id = 'search-bar';
    this.panel.style.cssText = `
      position: absolute;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      padding: 8px;
      width: 300px;
    `;

    this.panel.innerHTML = `
      <div style="position: relative;">
        <input
          type="text"
          id="search-input"
          class="cosmos-input"
          placeholder="Search celestial bodies... (⌘K)"
          style="width: 100%; box-sizing: border-box; padding-right: 32px;"
        />
        <span style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); color: rgba(150, 170, 200, 0.5); pointer-events: none;">
          🔍
        </span>
      </div>
      <div id="search-results" style="
        display: none;
        max-height: 300px;
        overflow-y: auto;
        margin-top: 8px;
        border-radius: 4px;
        background: rgba(0, 10, 30, 0.8);
      "></div>
    `;

    this.container?.appendChild(this.panel);

    // Store references
    this.input = this.panel.querySelector('#search-input');
    this.results = this.panel.querySelector('#search-results');

    // Set up event handlers
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    if (!this.input || !this.results) return;

    this.input.addEventListener('focus', () => {
      this._isFocused = true;
      if (this.input?.value) {
        this.search(this.input.value);
      }
    });

    this.input.addEventListener('blur', () => {
      // Delay to allow click on results
      setTimeout(() => {
        this._isFocused = false;
        this.hideResults();
      }, 200);
    });

    this.input.addEventListener('input', (e) => {
      const query = (e.target as HTMLInputElement).value;
      this.search(query);
    });

    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.input?.blur();
        this.hideResults();
      } else if (e.key === 'Enter') {
        const firstResult = this.results?.querySelector('.search-result-item') as HTMLElement;
        if (firstResult) {
          firstResult.click();
        }
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        this.navigateResults(e.key === 'ArrowDown' ? 1 : -1);
      }
    });
  }

  private populateSearchItems(): void {
    // Add all celestial bodies to searchable items
    setTimeout(() => {
      const bodies = this.solarSystem.getAllBodies();
      this.searchableItems = bodies.map(body => ({
        name: body.name,
        type: body.type
      }));
    }, 1000);
  }

  private search(query: string): void {
    if (!query.trim()) {
      this.hideResults();
      return;
    }

    const lowerQuery = query.toLowerCase();
    const matches = this.searchableItems.filter(item =>
      item.name.toLowerCase().includes(lowerQuery)
    ).slice(0, 10);

    this.showResults(matches);
  }

  private showResults(items: { name: string; type: string }[]): void {
    if (!this.results) return;

    if (items.length === 0) {
      this.results.innerHTML = `
        <div style="padding: 12px; text-align: center; color: rgba(150, 170, 200, 0.5);">
          No results found
        </div>
      `;
    } else {
      this.results.innerHTML = items.map((item, index) => `
        <div
          class="search-result-item"
          data-name="${item.name}"
          data-index="${index}"
          style="
            padding: 10px 12px;
            cursor: pointer;
            border-bottom: 1px solid rgba(100, 150, 255, 0.1);
            display: flex;
            justify-content: space-between;
            align-items: center;
            transition: background 0.2s ease;
          "
        >
          <span style="color: #fff;">${item.name}</span>
          <span style="font-size: 11px; color: rgba(150, 170, 200, 0.7); text-transform: uppercase;">
            ${this.getTypeIcon(item.type)} ${item.type.replace('_', ' ')}
          </span>
        </div>
      `).join('');

      // Add hover effects and click handlers
      this.results.querySelectorAll('.search-result-item').forEach((el) => {
        const element = el as HTMLElement;

        element.addEventListener('mouseenter', () => {
          element.style.background = 'rgba(100, 150, 255, 0.2)';
        });

        element.addEventListener('mouseleave', () => {
          element.style.background = 'transparent';
        });

        element.addEventListener('click', () => {
          const name = element.dataset.name;
          if (name) {
            this.selectResult(name);
          }
        });
      });
    }

    this.results.style.display = 'block';
  }

  private hideResults(): void {
    if (this.results) {
      this.results.style.display = 'none';
    }
  }

  private navigateResults(direction: number): void {
    const items = this.results?.querySelectorAll('.search-result-item');
    if (!items?.length) return;

    const currentIndex = Array.from(items).findIndex(
      item => item.classList.contains('selected')
    );

    let newIndex = currentIndex + direction;
    if (newIndex < 0) newIndex = items.length - 1;
    if (newIndex >= items.length) newIndex = 0;

    items.forEach((item, i) => {
      const el = item as HTMLElement;
      if (i === newIndex) {
        el.classList.add('selected');
        el.style.background = 'rgba(100, 150, 255, 0.3)';
      } else {
        el.classList.remove('selected');
        el.style.background = 'transparent';
      }
    });
  }

  private selectResult(name: string): void {
    const body = this.solarSystem.getBodyByName(name);
    if (body) {
      this.cameraController.focusOn({
        object: body.getGroup(),
        name: body.name,
        radius: body.getScaledRadius()
      });
    }

    // Clear and hide
    if (this.input) {
      this.input.value = '';
      this.input.blur();
    }
    this.hideResults();
  }

  private getTypeIcon(type: string): string {
    const icons: Record<string, string> = {
      star: '⭐',
      planet: '🪐',
      dwarf_planet: '🌑',
      moon: '🌙',
      asteroid: '☄️',
      comet: '💫',
      spacecraft: '🛰️'
    };
    return icons[type] || '•';
  }

  focus(): void {
    this.input?.focus();
  }

  isFocused(): boolean {
    return this._isFocused;
  }
}

/**
 * NavigationDropdown - Quick jump to celestial bodies
 * Provides a dropdown menu to instantly navigate to any object in the solar system
 */

import * as THREE from 'three';
import { SolarSystemBuilder } from '../bodies/SolarSystemBuilder';
import { CameraController, FocusTarget } from '../controls/CameraController';

interface BodyCategory {
  name: string;
  bodies: string[];
}

export class NavigationDropdown {
  private solarSystem: SolarSystemBuilder;
  private cameraController: CameraController;
  private container: HTMLElement | null = null;
  private dropdown: HTMLElement | null = null;
  private isOpen: boolean = false;

  constructor(solarSystem: SolarSystemBuilder, cameraController: CameraController) {
    this.solarSystem = solarSystem;
    this.cameraController = cameraController;
  }

  init(parent: HTMLElement): void {
    this.container = document.createElement('div');
    this.container.id = 'navigation-dropdown';
    this.container.style.cssText = `
      position: absolute;
      top: 20px;
      right: 70px;
      z-index: 200;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    // Create the button
    const button = document.createElement('button');
    button.className = 'cosmos-button nav-dropdown-btn';
    button.innerHTML = `
      <span style="display: flex; align-items: center; gap: 8px;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
          <path d="M2 12h20"/>
        </svg>
        <span>Navigate to...</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-left: 4px;">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </span>
    `;
    button.style.cssText = `
      padding: 10px 16px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      background: rgba(10, 15, 30, 0.9);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(100, 150, 255, 0.3);
      border-radius: 8px;
      color: #e0e8ff;
      transition: all 0.2s ease;
    `;

    button.addEventListener('mouseenter', () => {
      button.style.background = 'rgba(60, 100, 180, 0.5)';
      button.style.borderColor = 'rgba(100, 150, 255, 0.5)';
    });

    button.addEventListener('mouseleave', () => {
      if (!this.isOpen) {
        button.style.background = 'rgba(10, 15, 30, 0.9)';
        button.style.borderColor = 'rgba(100, 150, 255, 0.3)';
      }
    });

    button.addEventListener('click', () => this.toggleDropdown());

    this.container.appendChild(button);

    // Create dropdown menu
    this.dropdown = document.createElement('div');
    this.dropdown.className = 'nav-dropdown-menu';
    this.dropdown.style.cssText = `
      position: absolute;
      top: calc(100% + 8px);
      right: 0;
      background: rgba(10, 15, 30, 0.95);
      backdrop-filter: blur(15px);
      border: 1px solid rgba(100, 150, 255, 0.3);
      border-radius: 12px;
      padding: 12px;
      min-width: 280px;
      max-height: 70vh;
      overflow-y: auto;
      display: none;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
    `;

    this.populateDropdown();
    this.container.appendChild(this.dropdown);

    parent.appendChild(this.container);

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (this.container && !this.container.contains(e.target as Node)) {
        this.closeDropdown();
      }
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.closeDropdown();
      }
    });
  }

  private populateDropdown(): void {
    if (!this.dropdown) return;

    // Organize bodies into categories
    const categories: BodyCategory[] = [
      { name: 'Star', bodies: ['Sun'] },
      { name: 'Inner Planets', bodies: ['Mercury', 'Venus', 'Earth', 'Mars'] },
      { name: 'Outer Planets', bodies: ['Jupiter', 'Saturn', 'Uranus', 'Neptune'] },
      { name: 'Dwarf Planets', bodies: ['Pluto', 'Ceres', 'Eris', 'Makemake', 'Haumea'] },
      { name: 'Major Moons', bodies: ['Moon', 'Io', 'Europa', 'Ganymede', 'Callisto', 'Titan', 'Triton', 'Charon'] },
      { name: 'Mars Moons', bodies: ['Phobos', 'Deimos'] },
    ];

    // Get all available bodies
    const allBodies = this.solarSystem.getAllBodies();
    const availableNames = new Set(allBodies.map(b => b.name));

    categories.forEach((category, index) => {
      // Filter to only bodies that exist
      const existingBodies = category.bodies.filter(name => availableNames.has(name));
      if (existingBodies.length === 0) return;

      // Category header
      const header = document.createElement('div');
      header.style.cssText = `
        color: rgba(150, 180, 255, 0.7);
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 1px;
        padding: 8px 12px 4px;
        ${index > 0 ? 'margin-top: 8px; border-top: 1px solid rgba(100, 150, 255, 0.15);' : ''}
      `;
      header.textContent = category.name;
      this.dropdown!.appendChild(header);

      // Body items
      existingBodies.forEach(name => {
        const item = this.createBodyItem(name);
        this.dropdown!.appendChild(item);
      });
    });
  }

  private createBodyItem(name: string): HTMLElement {
    const item = document.createElement('div');
    item.className = 'nav-dropdown-item';
    item.style.cssText = `
      display: flex;
      align-items: center;
      gap: 10px;
      width: 100%;
      padding: 8px 12px;
      background: transparent;
      border: none;
      border-radius: 6px;
      color: #e0e8ff;
      font-size: 14px;
      text-align: left;
      transition: background 0.15s ease;
    `;

    // Get body color/icon based on name
    const color = this.getBodyColor(name);

    item.innerHTML = `
      <span style="
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: ${color};
        box-shadow: 0 0 8px ${color}88;
        flex-shrink: 0;
      "></span>
      <span style="flex: 1;">${name}</span>
      <div style="display: flex; gap: 4px;">
        <button class="nav-focus-btn" title="Focus on ${name}" style="
          background: rgba(60, 100, 180, 0.4);
          border: 1px solid rgba(100, 150, 255, 0.3);
          border-radius: 4px;
          color: #e0e8ff;
          padding: 4px 8px;
          font-size: 11px;
          cursor: pointer;
          transition: all 0.15s ease;
        ">Focus</button>
        <button class="nav-follow-btn" title="Follow ${name}" style="
          background: rgba(60, 150, 100, 0.4);
          border: 1px solid rgba(100, 255, 150, 0.3);
          border-radius: 4px;
          color: #e0e8ff;
          padding: 4px 8px;
          font-size: 11px;
          cursor: pointer;
          transition: all 0.15s ease;
        ">Follow</button>
      </div>
    `;

    const focusBtn = item.querySelector('.nav-focus-btn') as HTMLButtonElement;
    const followBtn = item.querySelector('.nav-follow-btn') as HTMLButtonElement;

    // Focus button events
    focusBtn.addEventListener('mouseenter', () => {
      focusBtn.style.background = 'rgba(80, 130, 220, 0.6)';
    });
    focusBtn.addEventListener('mouseleave', () => {
      focusBtn.style.background = 'rgba(60, 100, 180, 0.4)';
    });
    focusBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.navigateTo(name, 'orbit');
      this.closeDropdown();
    });

    // Follow button events
    followBtn.addEventListener('mouseenter', () => {
      followBtn.style.background = 'rgba(80, 180, 120, 0.6)';
    });
    followBtn.addEventListener('mouseleave', () => {
      followBtn.style.background = 'rgba(60, 150, 100, 0.4)';
    });
    followBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.navigateTo(name, 'follow');
      this.closeDropdown();
    });

    item.addEventListener('mouseenter', () => {
      item.style.background = 'rgba(100, 150, 255, 0.1)';
    });

    item.addEventListener('mouseleave', () => {
      item.style.background = 'transparent';
    });

    return item;
  }

  private getBodyColor(name: string): string {
    const colors: Record<string, string> = {
      'Sun': '#ffdd44',
      'Mercury': '#b5b5b5',
      'Venus': '#e6c87a',
      'Earth': '#6b93d6',
      'Mars': '#c1440e',
      'Jupiter': '#d8ca9d',
      'Saturn': '#f4d59e',
      'Uranus': '#d1e7e7',
      'Neptune': '#5b5ddf',
      'Pluto': '#e0c8a8',
      'Moon': '#c4c4c4',
      'Io': '#ffe135',
      'Europa': '#b8a894',
      'Ganymede': '#928b7f',
      'Callisto': '#6e6659',
      'Titan': '#e2a95c',
      'Triton': '#c0d8e8',
      'Charon': '#908880',
      'Phobos': '#8b8680',
      'Deimos': '#9c9589',
      'Ceres': '#8f8880',
      'Eris': '#f0f0f0',
      'Makemake': '#d9c4a9',
      'Haumea': '#c8c8c8',
    };
    return colors[name] || '#888888';
  }

  private navigateTo(name: string, mode: 'orbit' | 'follow' = 'orbit'): void {
    const body = this.solarSystem.getBodyByName(name);
    if (!body) {
      console.warn(`Body not found: ${name}`);
      return;
    }

    const group = body.getGroup();
    if (!group) {
      console.warn(`Body group not found: ${name}`);
      return;
    }

    // Get radius for proper framing
    const radius = group.userData.radius || 1;

    // Create focus target
    const focusTarget: FocusTarget = {
      object: group,
      name: name,
      radius: radius
    };

    if (mode === 'follow') {
      // Set follow mode - camera follows the body as it moves
      this.cameraController.followTarget(focusTarget);
      console.log(`Following ${name}`);
    } else {
      // Focus/orbit mode - camera orbits around the body
      this.cameraController.focusOn(focusTarget);
      console.log(`Focusing on ${name}`);
    }
  }

  private toggleDropdown(): void {
    if (this.isOpen) {
      this.closeDropdown();
    } else {
      this.openDropdown();
    }
  }

  private openDropdown(): void {
    if (!this.dropdown) return;
    this.dropdown.style.display = 'block';
    this.isOpen = true;

    // Animate in
    this.dropdown.style.opacity = '0';
    this.dropdown.style.transform = 'translateY(-10px)';
    requestAnimationFrame(() => {
      if (this.dropdown) {
        this.dropdown.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
        this.dropdown.style.opacity = '1';
        this.dropdown.style.transform = 'translateY(0)';
      }
    });
  }

  private closeDropdown(): void {
    if (!this.dropdown) return;
    this.dropdown.style.display = 'none';
    this.isOpen = false;
  }
}

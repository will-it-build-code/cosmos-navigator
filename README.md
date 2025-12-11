# Cosmos Navigator

A stunning, scientifically accurate 3D Solar System explorer built as a macOS Electron desktop application.

![Cosmos Navigator](https://img.shields.io/badge/Platform-macOS-blue)
![Electron](https://img.shields.io/badge/Electron-28.x-47848F)
![Three.js](https://img.shields.io/badge/Three.js-0.160-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6)

## Features

### Celestial Bodies
- **The Sun** - Animated procedural surface with granulation, corona, and bloom effects
- **8 Planets** - Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, Neptune
- **Dwarf Planets** - Pluto (with Charon), Ceres, and more
- **27+ Moons** - Including all Galilean moons, Titan, Triton, and Luna
- **Saturn's Rings** - Beautiful ring system with Cassini Division and proper shadows
- **Asteroid Belt** - 2,000 instanced asteroids

### Scientific Accuracy
- **NASA JPL Orbital Data** - Accurate Keplerian orbital elements
- **Real Physical Properties** - Radius, mass, temperature, atmosphere composition
- **Proper Axial Tilts** - Including Uranus at 97.77°
- **Accurate Rotation Periods** - Real day lengths for all bodies

### Visual Effects
- **Atmospheric Scattering** - Rayleigh scattering for Earth, Mars, gas giants
- **Procedural Starfield** - 15,000 stars with Milky Way band
- **Post-Processing** - Bloom, SMAA, ACES tone mapping
- **Day/Night Lighting** - Dynamic sun lighting with shadows

### Navigation
- **Orbit Controls** - Rotate, pan, zoom around the solar system
- **Focus Mode** - Double-click any body to fly to it
- **Free Flight** - WASD movement with mouse look
- **Smooth Transitions** - GSAP-powered cinematic camera moves

### Time Control
- **Real-Time Simulation** - Planets move in real-time
- **Time Acceleration** - 1x to 1,000,000x speed
- **Reverse Time** - Watch orbits go backwards
- **Date Picker** - Jump to any date

### User Interface
- **Search Bar** - Find any celestial body instantly (⌘K)
- **Info Panel** - Detailed physical and orbital data
- **Settings** - Toggle orbits, atmospheres, quality presets
- **Educational Content** - Descriptions from NASA data

## Installation

### Prerequisites
- Node.js 18+ (or 20+)
- npm 9+
- macOS 10.15 Catalina or later

### Setup
```bash
# Clone the repository
cd solar-system

# Install dependencies
npm install

# Start development server
npm run electron:dev

# Or build for production
npm run electron:build
```

## Controls

| Action | Control |
|--------|---------|
| Rotate View | Click + Drag |
| Pan | Right-click + Drag |
| Zoom | Scroll wheel |
| Focus on Object | Double-click |
| Search | ⌘K |
| Play/Pause Time | Space |
| Toggle Orbit Lines | O |
| Toggle Info Panel | I |
| Time Speed | 1-7 keys |
| Clear Focus | Escape |

## Project Structure

```
src/
├── main.ts              # Application entry point
├── engine/              # Core rendering engine
│   ├── CosmosApp.ts     # Main application controller
│   ├── Renderer.ts      # WebGL renderer setup
│   ├── Scene.ts         # Scene management, starfield
│   ├── Camera.ts        # Camera management
│   └── PostProcessing.ts # Bloom, AA, tone mapping
├── bodies/              # Celestial body classes
│   ├── CelestialBody.ts # Base class
│   ├── Sun.ts           # Star with procedural surface
│   ├── Planet.ts        # Planet with atmosphere
│   ├── Moon.ts          # Natural satellites
│   ├── RingSystem.ts    # Saturn/Uranus rings
│   ├── OrbitalMechanics.ts # Kepler equation solver
│   └── SolarSystemBuilder.ts # Assembles everything
├── controls/            # Input handling
│   └── CameraController.ts # Orbit & free-flight
├── systems/             # Simulation systems
│   └── TimeController.ts # Julian date, time scale
├── ui/                  # User interface
│   ├── UIManager.ts     # UI coordinator
│   ├── InfoPanel.ts     # Object information
│   ├── SearchBar.ts     # Search with autocomplete
│   ├── TimeControlsUI.ts # Time speed controls
│   └── SettingsPanel.ts # Visual settings
└── data/                # Astronomical data
    ├── OrbitalData.ts   # NASA JPL orbital elements
    └── PhysicalData.ts  # Physical properties
```

## Tech Stack

- **Electron** - Native macOS desktop app
- **Vite** - Fast development and bundling
- **Three.js** - 3D rendering engine
- **TypeScript** - Type-safe development
- **PostProcessing** - Visual effects
- **GSAP** - Smooth animations

## Data Sources

- **Orbital Elements**: [NASA JPL Horizons](https://ssd.jpl.nasa.gov/horizons/)
- **Physical Data**: [NASA Planetary Fact Sheets](https://nssdc.gsfc.nasa.gov/planetary/factsheet/)
- **Textures**: [Solar System Scope](https://www.solarsystemscope.com/textures/)

## Performance

- **Target**: 60 FPS at 1080p
- **Optimization**: Instanced rendering, LOD-ready
- **GPU**: Requires Metal-compatible GPU

## Future Enhancements

- [ ] Comet tail particle effects
- [ ] Spacecraft trajectory visualization
- [ ] Guided tours
- [ ] Mini-map overview
- [ ] Audio ambiance
- [ ] VR support

## License

MIT License - See LICENSE file for details.

## Credits

- NASA/JPL for astronomical data
- Solar System Scope for planet textures
- Three.js community for rendering excellence
- Electron team for the desktop framework

---

**Cosmos Navigator** - Explore the wonders of our solar system from your desktop.

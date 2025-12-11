/**
 * PhysicalData - Physical properties of celestial bodies
 * Source: NASA Planetary Fact Sheets
 * https://nssdc.gsfc.nasa.gov/planetary/factsheet/
 */

export interface PhysicalProperties {
  name: string;
  type: 'star' | 'planet' | 'dwarf_planet' | 'moon' | 'asteroid' | 'comet';
  radius: number; // km
  mass: number; // kg (in scientific notation as number)
  density: number; // g/cm³
  gravity: number; // m/s²
  escapeVelocity: number; // km/s
  rotationPeriod: number; // hours (negative = retrograde)
  axialTilt: number; // degrees
  meanTemperature: number; // K
  atmosphereComposition?: string[];
  numberOfMoons?: number;
  hasRings?: boolean;
  discoveryYear?: number;
  discoveredBy?: string;
  description: string;
}

export const SUN_DATA: PhysicalProperties = {
  name: 'Sun',
  type: 'star',
  radius: 696340,
  mass: 1.989e30,
  density: 1.408,
  gravity: 274.0,
  escapeVelocity: 617.7,
  rotationPeriod: 609.12, // ~25.4 days at equator
  axialTilt: 7.25,
  meanTemperature: 5778, // Surface temperature
  description: 'The Sun is a G-type main-sequence star (G2V) at the center of our solar system. It contains 99.86% of the total mass of the Solar System. The Sun\'s core reaches temperatures of about 15 million Kelvin, where nuclear fusion converts hydrogen to helium, releasing tremendous energy.'
};

export const PLANET_PHYSICAL_DATA: Record<string, PhysicalProperties> = {
  mercury: {
    name: 'Mercury',
    type: 'planet',
    radius: 2439.7,
    mass: 3.3011e23,
    density: 5.427,
    gravity: 3.7,
    escapeVelocity: 4.25,
    rotationPeriod: 1407.6, // ~58.6 days
    axialTilt: 0.034,
    meanTemperature: 440, // Day side, varies greatly
    numberOfMoons: 0,
    hasRings: false,
    description: 'Mercury is the smallest planet in our solar system and closest to the Sun. Despite its proximity to the Sun, it\'s not the hottest planet - that\'s Venus. Mercury has a 3:2 spin-orbit resonance, rotating three times for every two orbits around the Sun.'
  },
  venus: {
    name: 'Venus',
    type: 'planet',
    radius: 6051.8,
    mass: 4.8675e24,
    density: 5.243,
    gravity: 8.87,
    escapeVelocity: 10.36,
    rotationPeriod: -5832.5, // Retrograde, ~243 days
    axialTilt: 177.4, // Essentially upside down
    meanTemperature: 737,
    atmosphereComposition: ['CO2 (96.5%)', 'N2 (3.5%)', 'SO2', 'Ar'],
    numberOfMoons: 0,
    hasRings: false,
    description: 'Venus is the hottest planet in our solar system due to its thick atmosphere of carbon dioxide that traps heat. It rotates backwards (retrograde) and so slowly that a day on Venus is longer than its year. Venus is often called Earth\'s "sister planet" due to similar size.'
  },
  earth: {
    name: 'Earth',
    type: 'planet',
    radius: 6371,
    mass: 5.97237e24,
    density: 5.514,
    gravity: 9.807,
    escapeVelocity: 11.186,
    rotationPeriod: 23.9345,
    axialTilt: 23.4393,
    meanTemperature: 288,
    atmosphereComposition: ['N2 (78%)', 'O2 (21%)', 'Ar (0.9%)', 'CO2 (0.04%)'],
    numberOfMoons: 1,
    hasRings: false,
    description: 'Earth is the third planet from the Sun and the only astronomical object known to harbor life. About 71% of Earth\'s surface is covered with water. Earth\'s atmosphere and magnetic field protect life from harmful solar radiation.'
  },
  mars: {
    name: 'Mars',
    type: 'planet',
    radius: 3389.5,
    mass: 6.4171e23,
    density: 3.933,
    gravity: 3.721,
    escapeVelocity: 5.027,
    rotationPeriod: 24.6229,
    axialTilt: 25.19,
    meanTemperature: 210,
    atmosphereComposition: ['CO2 (95.3%)', 'N2 (2.7%)', 'Ar (1.6%)', 'O2 (0.13%)'],
    numberOfMoons: 2,
    hasRings: false,
    description: 'Mars is the "Red Planet", colored by iron oxide (rust) on its surface. It has the largest volcano (Olympus Mons) and longest canyon (Valles Marineris) in the solar system. Mars has two small moons, Phobos and Deimos.'
  },
  jupiter: {
    name: 'Jupiter',
    type: 'planet',
    radius: 69911,
    mass: 1.8982e27,
    density: 1.326,
    gravity: 24.79,
    escapeVelocity: 59.5,
    rotationPeriod: 9.925, // Fastest rotating planet
    axialTilt: 3.13,
    meanTemperature: 165,
    atmosphereComposition: ['H2 (89%)', 'He (10%)', 'CH4', 'NH3', 'H2O'],
    numberOfMoons: 95,
    hasRings: true,
    description: 'Jupiter is the largest planet in our solar system - more massive than all other planets combined. The Great Red Spot is a storm larger than Earth that has raged for centuries. Jupiter\'s four largest moons (Io, Europa, Ganymede, Callisto) were discovered by Galileo in 1610.'
  },
  saturn: {
    name: 'Saturn',
    type: 'planet',
    radius: 58232,
    mass: 5.6834e26,
    density: 0.687, // Less dense than water!
    gravity: 10.44,
    escapeVelocity: 35.5,
    rotationPeriod: 10.656,
    axialTilt: 26.73,
    meanTemperature: 134,
    atmosphereComposition: ['H2 (96%)', 'He (3%)', 'CH4', 'NH3'],
    numberOfMoons: 146,
    hasRings: true,
    description: 'Saturn is famous for its spectacular ring system, composed of ice particles, rocky debris, and dust. Saturn is so light that it would float in water (if there were a bathtub big enough). Titan, Saturn\'s largest moon, has a thick atmosphere and liquid hydrocarbon lakes.'
  },
  uranus: {
    name: 'Uranus',
    type: 'planet',
    radius: 25362,
    mass: 8.6810e25,
    density: 1.271,
    gravity: 8.87,
    escapeVelocity: 21.3,
    rotationPeriod: -17.24, // Retrograde
    axialTilt: 97.77, // Rolls on its side!
    meanTemperature: 76,
    atmosphereComposition: ['H2 (83%)', 'He (15%)', 'CH4 (2%)'],
    numberOfMoons: 27,
    hasRings: true,
    discoveryYear: 1781,
    discoveredBy: 'William Herschel',
    description: 'Uranus rotates on its side, likely due to a collision early in its history. This gives it extreme seasons - each pole gets around 42 years of continuous sunlight followed by 42 years of darkness. Its blue-green color comes from methane in its atmosphere.'
  },
  neptune: {
    name: 'Neptune',
    type: 'planet',
    radius: 24622,
    mass: 1.02413e26,
    density: 1.638,
    gravity: 11.15,
    escapeVelocity: 23.5,
    rotationPeriod: 16.11,
    axialTilt: 28.32,
    meanTemperature: 72,
    atmosphereComposition: ['H2 (80%)', 'He (19%)', 'CH4 (1%)'],
    numberOfMoons: 16,
    hasRings: true,
    discoveryYear: 1846,
    discoveredBy: 'Johann Galle (based on predictions by Adams and Le Verrier)',
    description: 'Neptune was the first planet found through mathematical prediction rather than observation. It has the strongest winds in the solar system, reaching 2,100 km/h. Triton, its largest moon, orbits backwards and may be a captured Kuiper Belt object.'
  }
};

export const DWARF_PLANET_PHYSICAL_DATA: Record<string, PhysicalProperties> = {
  pluto: {
    name: 'Pluto',
    type: 'dwarf_planet',
    radius: 1188.3,
    mass: 1.303e22,
    density: 1.854,
    gravity: 0.62,
    escapeVelocity: 1.21,
    rotationPeriod: -153.2928, // Retrograde
    axialTilt: 122.53,
    meanTemperature: 44,
    atmosphereComposition: ['N2', 'CH4', 'CO'],
    numberOfMoons: 5,
    hasRings: false,
    discoveryYear: 1930,
    discoveredBy: 'Clyde Tombaugh',
    description: 'Pluto was reclassified from planet to dwarf planet in 2006. The New Horizons spacecraft revealed a complex world with nitrogen ice glaciers, water ice mountains, and a heart-shaped region called Tombaugh Regio. Pluto and its largest moon Charon are tidally locked.'
  },
  ceres: {
    name: 'Ceres',
    type: 'dwarf_planet',
    radius: 469.73,
    mass: 9.3835e20,
    density: 2.162,
    gravity: 0.28,
    escapeVelocity: 0.51,
    rotationPeriod: 9.074,
    axialTilt: 4.0,
    meanTemperature: 168,
    numberOfMoons: 0,
    hasRings: false,
    discoveryYear: 1801,
    discoveredBy: 'Giuseppe Piazzi',
    description: 'Ceres is the largest object in the asteroid belt and the only dwarf planet in the inner solar system. The Dawn spacecraft discovered bright spots in craters that are sodium carbonate deposits, suggesting past subsurface water activity.'
  },
  eris: {
    name: 'Eris',
    type: 'dwarf_planet',
    radius: 1163,
    mass: 1.6466e22,
    density: 2.52,
    gravity: 0.82,
    escapeVelocity: 1.38,
    rotationPeriod: 25.9,
    axialTilt: 78,
    meanTemperature: 42,
    numberOfMoons: 1,
    hasRings: false,
    discoveryYear: 2005,
    discoveredBy: 'Mike Brown, Chad Trujillo, David Rabinowitz',
    description: 'Eris is the most massive known dwarf planet, slightly more massive than Pluto. Its discovery was a key factor in the reclassification of Pluto. Eris is named after the Greek goddess of strife and discord.'
  },
  makemake: {
    name: 'Makemake',
    type: 'dwarf_planet',
    radius: 715,
    mass: 3.1e21,
    density: 1.7,
    gravity: 0.5,
    escapeVelocity: 0.84,
    rotationPeriod: 22.48,
    axialTilt: 0,
    meanTemperature: 40,
    numberOfMoons: 1,
    hasRings: false,
    discoveryYear: 2005,
    discoveredBy: 'Mike Brown, Chad Trujillo, David Rabinowitz',
    description: 'Makemake is named after the creator deity of the Rapa Nui people of Easter Island. It has a reddish-brown surface and appears to lack a significant atmosphere. A small moon, MK2, was discovered in 2016.'
  },
  haumea: {
    name: 'Haumea',
    type: 'dwarf_planet',
    radius: 816, // Equatorial radius (it\'s elongated)
    mass: 4.006e21,
    density: 2.6,
    gravity: 0.63,
    escapeVelocity: 0.91,
    rotationPeriod: 3.9155, // Very fast!
    axialTilt: 126,
    meanTemperature: 32,
    numberOfMoons: 2,
    hasRings: true,
    discoveryYear: 2004,
    discoveredBy: 'Mike Brown and team',
    description: 'Haumea has an extremely elongated shape due to its rapid rotation - it spins once every 4 hours. It\'s the fastest rotating large body in our solar system. Haumea has two moons (Hi\'iaka and Namaka) and a ring system discovered in 2017.'
  }
};

export const MOON_PHYSICAL_DATA: Record<string, Record<string, PhysicalProperties>> = {
  earth: {
    moon: {
      name: 'Moon',
      type: 'moon',
      radius: 1737.4,
      mass: 7.342e22,
      density: 3.344,
      gravity: 1.62,
      escapeVelocity: 2.38,
      rotationPeriod: 655.7, // Tidally locked
      axialTilt: 6.68,
      meanTemperature: 250,
      numberOfMoons: 0,
      hasRings: false,
      description: 'Earth\'s Moon is the fifth largest satellite in the solar system and the only celestial body humans have visited. The Moon stabilizes Earth\'s axial tilt and creates tides. It\'s slowly moving away from Earth at about 3.8 cm per year.'
    }
  },
  jupiter: {
    io: {
      name: 'Io',
      type: 'moon',
      radius: 1821.6,
      mass: 8.9319e22,
      density: 3.528,
      gravity: 1.796,
      escapeVelocity: 2.558,
      rotationPeriod: 42.456, // Tidally locked
      axialTilt: 0,
      meanTemperature: 130,
      description: 'Io is the most volcanically active body in the solar system, with over 400 active volcanoes. Tidal heating from Jupiter causes this activity. Io\'s surface is constantly being reshaped by volcanic eruptions.'
    },
    europa: {
      name: 'Europa',
      type: 'moon',
      radius: 1560.8,
      mass: 4.7998e22,
      density: 3.013,
      gravity: 1.314,
      escapeVelocity: 2.025,
      rotationPeriod: 85.2, // Tidally locked
      axialTilt: 0.1,
      meanTemperature: 102,
      description: 'Europa has a smooth icy surface with a subsurface ocean that may contain more water than all of Earth\'s oceans combined. This ocean makes Europa one of the most promising places to search for extraterrestrial life.'
    },
    ganymede: {
      name: 'Ganymede',
      type: 'moon',
      radius: 2634.1,
      mass: 1.4819e23,
      density: 1.936,
      gravity: 1.428,
      escapeVelocity: 2.741,
      rotationPeriod: 171.7, // Tidally locked
      axialTilt: 0.33,
      meanTemperature: 110,
      description: 'Ganymede is the largest moon in the solar system - larger than Mercury. It\'s the only moon known to have its own magnetic field. Ganymede likely has a subsurface saltwater ocean.'
    },
    callisto: {
      name: 'Callisto',
      type: 'moon',
      radius: 2410.3,
      mass: 1.0759e23,
      density: 1.834,
      gravity: 1.235,
      escapeVelocity: 2.440,
      rotationPeriod: 400.5, // Tidally locked
      axialTilt: 0,
      meanTemperature: 134,
      description: 'Callisto is the most heavily cratered body in the solar system, indicating an ancient, geologically inactive surface. Unlike the other Galilean moons, Callisto has no orbital resonance with its neighbors.'
    }
  },
  saturn: {
    titan: {
      name: 'Titan',
      type: 'moon',
      radius: 2574.7,
      mass: 1.3452e23,
      density: 1.880,
      gravity: 1.352,
      escapeVelocity: 2.639,
      rotationPeriod: 382.7, // Tidally locked
      axialTilt: 0,
      meanTemperature: 94,
      atmosphereComposition: ['N2 (94%)', 'CH4 (5%)', 'H2'],
      description: 'Titan is the only moon with a thick atmosphere (denser than Earth\'s). It has lakes and seas of liquid methane and ethane, and a methane cycle similar to Earth\'s water cycle. The Huygens probe landed on Titan in 2005.'
    },
    enceladus: {
      name: 'Enceladus',
      type: 'moon',
      radius: 252.1,
      mass: 1.08e20,
      density: 1.609,
      gravity: 0.113,
      escapeVelocity: 0.239,
      rotationPeriod: 32.9, // Tidally locked
      axialTilt: 0,
      meanTemperature: 75,
      description: 'Enceladus has geysers of water ice erupting from its south pole, fed by a global subsurface ocean. The Cassini spacecraft flew through these plumes and detected organic molecules, making Enceladus a prime target in the search for life.'
    }
  },
  neptune: {
    triton: {
      name: 'Triton',
      type: 'moon',
      radius: 1353.4,
      mass: 2.14e22,
      density: 2.061,
      gravity: 0.779,
      escapeVelocity: 1.455,
      rotationPeriod: -141.0, // Retrograde orbit
      axialTilt: 0,
      meanTemperature: 38,
      atmosphereComposition: ['N2', 'CH4'],
      description: 'Triton is the only large moon with a retrograde orbit, suggesting it was captured from the Kuiper Belt. It has active nitrogen geysers and is slowly spiraling toward Neptune. In billions of years, it will be torn apart to form a ring system.'
    }
  }
};

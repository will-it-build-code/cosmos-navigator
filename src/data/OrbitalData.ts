/**
 * OrbitalData - Accurate orbital elements from NASA JPL
 * Source: https://ssd.jpl.nasa.gov/planets/approx_pos.html
 * Epoch: J2000.0 (January 1, 2000, 12:00 TT)
 */

import { OrbitalElements } from '../bodies/OrbitalMechanics';

// All angles in degrees, distances in AU
export const PLANET_ORBITAL_DATA: Record<string, OrbitalElements> = {
  mercury: {
    semiMajorAxis: 0.38709927,
    eccentricity: 0.20563593,
    inclination: 7.00497902,
    longitudeOfAscendingNode: 48.33076593,
    argumentOfPerihelion: 29.12703035,
    meanAnomaly: 174.79252722,
    meanMotion: 4.09233445
  },
  venus: {
    semiMajorAxis: 0.72333566,
    eccentricity: 0.00677672,
    inclination: 3.39467605,
    longitudeOfAscendingNode: 76.67984255,
    argumentOfPerihelion: 54.92262463,
    meanAnomaly: 50.37663232,
    meanMotion: 1.60213034
  },
  earth: {
    semiMajorAxis: 1.00000261,
    eccentricity: 0.01671123,
    inclination: 0.00001531,
    longitudeOfAscendingNode: -11.26064,
    argumentOfPerihelion: 102.93768193,
    meanAnomaly: 100.46457166,
    meanMotion: 0.98560028
  },
  mars: {
    semiMajorAxis: 1.52371034,
    eccentricity: 0.09339410,
    inclination: 1.84969142,
    longitudeOfAscendingNode: 49.55953891,
    argumentOfPerihelion: -73.5031685,
    meanAnomaly: -4.55343205,
    meanMotion: 0.52402068
  },
  jupiter: {
    semiMajorAxis: 5.20288700,
    eccentricity: 0.04838624,
    inclination: 1.30439695,
    longitudeOfAscendingNode: 100.47390909,
    argumentOfPerihelion: -85.74542926,
    meanAnomaly: 34.39644051,
    meanMotion: 0.08308529
  },
  saturn: {
    semiMajorAxis: 9.53667594,
    eccentricity: 0.05386179,
    inclination: 2.48599187,
    longitudeOfAscendingNode: 113.66242448,
    argumentOfPerihelion: -21.06328634,
    meanAnomaly: 49.95424423,
    meanMotion: 0.03349791
  },
  uranus: {
    semiMajorAxis: 19.18916464,
    eccentricity: 0.04725744,
    inclination: 0.77263783,
    longitudeOfAscendingNode: 74.01692503,
    argumentOfPerihelion: 96.93735127,
    meanAnomaly: 313.23810451,
    meanMotion: 0.01176904
  },
  neptune: {
    semiMajorAxis: 30.06992276,
    eccentricity: 0.00859048,
    inclination: 1.77004347,
    longitudeOfAscendingNode: 131.78422574,
    argumentOfPerihelion: -86.81499898,
    meanAnomaly: -55.12002969,
    meanMotion: 0.00606020
  }
};

// Dwarf planets orbital data
export const DWARF_PLANET_ORBITAL_DATA: Record<string, OrbitalElements> = {
  pluto: {
    semiMajorAxis: 39.48211675,
    eccentricity: 0.24882730,
    inclination: 17.14001206,
    longitudeOfAscendingNode: 110.30393684,
    argumentOfPerihelion: 113.76329806,
    meanAnomaly: 14.53,
    meanMotion: 0.00397
  },
  ceres: {
    semiMajorAxis: 2.7675,
    eccentricity: 0.0760,
    inclination: 10.593,
    longitudeOfAscendingNode: 80.327,
    argumentOfPerihelion: 73.597,
    meanAnomaly: 77.37,
    meanMotion: 0.214
  },
  eris: {
    semiMajorAxis: 67.781,
    eccentricity: 0.44068,
    inclination: 44.040,
    longitudeOfAscendingNode: 35.951,
    argumentOfPerihelion: 151.639,
    meanAnomaly: 205.989,
    meanMotion: 0.00176
  },
  makemake: {
    semiMajorAxis: 45.436,
    eccentricity: 0.16126,
    inclination: 28.983,
    longitudeOfAscendingNode: 79.382,
    argumentOfPerihelion: 297.240,
    meanAnomaly: 165.514,
    meanMotion: 0.00322
  },
  haumea: {
    semiMajorAxis: 43.218,
    eccentricity: 0.19642,
    inclination: 28.213,
    longitudeOfAscendingNode: 122.103,
    argumentOfPerihelion: 239.041,
    meanAnomaly: 218.205,
    meanMotion: 0.00347
  }
};

// Major moons orbital data (relative to parent planet)
// Note: These are simplified - real moon orbits are more complex
export const MOON_ORBITAL_DATA: Record<string, Record<string, OrbitalElements>> = {
  earth: {
    moon: {
      semiMajorAxis: 0.00257, // AU (384,400 km)
      eccentricity: 0.0549,
      inclination: 5.145,
      longitudeOfAscendingNode: 125.08,
      argumentOfPerihelion: 318.15,
      meanAnomaly: 115.3654,
      meanMotion: 13.176358 // degrees per day
    }
  },
  mars: {
    phobos: {
      semiMajorAxis: 0.0000628, // 9,376 km
      eccentricity: 0.0151,
      inclination: 1.093,
      longitudeOfAscendingNode: 164.931,
      argumentOfPerihelion: 150.247,
      meanAnomaly: 91.059,
      meanMotion: 1128.8444 // Very fast orbit
    },
    deimos: {
      semiMajorAxis: 0.000157, // 23,460 km
      eccentricity: 0.00033,
      inclination: 0.93,
      longitudeOfAscendingNode: 339.600,
      argumentOfPerihelion: 290.496,
      meanAnomaly: 325.329,
      meanMotion: 285.1618
    }
  },
  jupiter: {
    io: {
      semiMajorAxis: 0.00282, // 421,700 km
      eccentricity: 0.0041,
      inclination: 0.036,
      longitudeOfAscendingNode: 43.977,
      argumentOfPerihelion: 84.129,
      meanAnomaly: 342.021,
      meanMotion: 203.4889
    },
    europa: {
      semiMajorAxis: 0.00449, // 671,034 km
      eccentricity: 0.0094,
      inclination: 0.466,
      longitudeOfAscendingNode: 219.106,
      argumentOfPerihelion: 88.97,
      meanAnomaly: 171.016,
      meanMotion: 101.3747
    },
    ganymede: {
      semiMajorAxis: 0.00716, // 1,070,412 km
      eccentricity: 0.0013,
      inclination: 0.177,
      longitudeOfAscendingNode: 63.552,
      argumentOfPerihelion: 192.417,
      meanAnomaly: 317.54,
      meanMotion: 50.3176
    },
    callisto: {
      semiMajorAxis: 0.01259, // 1,882,709 km
      eccentricity: 0.0074,
      inclination: 0.192,
      longitudeOfAscendingNode: 298.848,
      argumentOfPerihelion: 52.643,
      meanAnomaly: 181.408,
      meanMotion: 21.5710
    }
  },
  saturn: {
    titan: {
      semiMajorAxis: 0.00817, // 1,221,870 km
      eccentricity: 0.0288,
      inclination: 0.348,
      longitudeOfAscendingNode: 169.237,
      argumentOfPerihelion: 180.532,
      meanAnomaly: 120.0,
      meanMotion: 22.5769
    },
    enceladus: {
      semiMajorAxis: 0.00159, // 237,948 km
      eccentricity: 0.0047,
      inclination: 0.019,
      longitudeOfAscendingNode: 169.5,
      argumentOfPerihelion: 93.2,
      meanAnomaly: 200.0,
      meanMotion: 262.7318
    },
    mimas: {
      semiMajorAxis: 0.00124, // 185,539 km
      eccentricity: 0.0196,
      inclination: 1.574,
      longitudeOfAscendingNode: 169.5,
      argumentOfPerihelion: 332.5,
      meanAnomaly: 14.0,
      meanMotion: 381.9945
    },
    tethys: {
      semiMajorAxis: 0.00197, // 294,619 km
      eccentricity: 0.0001,
      inclination: 1.091,
      longitudeOfAscendingNode: 169.5,
      argumentOfPerihelion: 259.8,
      meanAnomaly: 243.0,
      meanMotion: 190.6979
    },
    dione: {
      semiMajorAxis: 0.00252, // 377,396 km
      eccentricity: 0.0022,
      inclination: 0.028,
      longitudeOfAscendingNode: 169.5,
      argumentOfPerihelion: 168.8,
      meanAnomaly: 70.0,
      meanMotion: 131.5349
    },
    rhea: {
      semiMajorAxis: 0.00352, // 527,108 km
      eccentricity: 0.0013,
      inclination: 0.345,
      longitudeOfAscendingNode: 169.5,
      argumentOfPerihelion: 241.4,
      meanAnomaly: 79.0,
      meanMotion: 79.6900
    },
    iapetus: {
      semiMajorAxis: 0.02381, // 3,560,820 km
      eccentricity: 0.0276,
      inclination: 15.47,
      longitudeOfAscendingNode: 81.1,
      argumentOfPerihelion: 275.9,
      meanAnomaly: 201.0,
      meanMotion: 4.5379
    }
  },
  uranus: {
    miranda: {
      semiMajorAxis: 0.000867, // 129,390 km
      eccentricity: 0.0013,
      inclination: 4.232,
      longitudeOfAscendingNode: 169.0,
      argumentOfPerihelion: 68.3,
      meanAnomaly: 311.0,
      meanMotion: 254.6906
    },
    ariel: {
      semiMajorAxis: 0.00128, // 191,020 km
      eccentricity: 0.0012,
      inclination: 0.260,
      longitudeOfAscendingNode: 169.0,
      argumentOfPerihelion: 115.9,
      meanAnomaly: 39.0,
      meanMotion: 142.8356
    },
    umbriel: {
      semiMajorAxis: 0.00178, // 266,300 km
      eccentricity: 0.0039,
      inclination: 0.205,
      longitudeOfAscendingNode: 169.0,
      argumentOfPerihelion: 84.7,
      meanAnomaly: 12.0,
      meanMotion: 86.8688
    },
    titania: {
      semiMajorAxis: 0.00292, // 435,910 km
      eccentricity: 0.0011,
      inclination: 0.340,
      longitudeOfAscendingNode: 169.0,
      argumentOfPerihelion: 284.4,
      meanAnomaly: 24.0,
      meanMotion: 41.3514
    },
    oberon: {
      semiMajorAxis: 0.00390, // 583,520 km
      eccentricity: 0.0014,
      inclination: 0.058,
      longitudeOfAscendingNode: 169.0,
      argumentOfPerihelion: 104.4,
      meanAnomaly: 283.0,
      meanMotion: 26.7394
    }
  },
  neptune: {
    triton: {
      semiMajorAxis: 0.00237, // 354,759 km
      eccentricity: 0.000016,
      inclination: 156.885, // Retrograde orbit!
      longitudeOfAscendingNode: 177.608,
      argumentOfPerihelion: 344.046,
      meanAnomaly: 264.775,
      meanMotion: 61.2572
    }
  },
  pluto: {
    charon: {
      semiMajorAxis: 0.000129, // 19,591 km
      eccentricity: 0.0002,
      inclination: 0.001,
      longitudeOfAscendingNode: 223.046,
      argumentOfPerihelion: 0.0,
      meanAnomaly: 0.0,
      meanMotion: 56.3625
    }
  }
};

// Comet orbital data
export const COMET_ORBITAL_DATA: Record<string, OrbitalElements> = {
  halley: {
    semiMajorAxis: 17.834,
    eccentricity: 0.96714,
    inclination: 162.26,
    longitudeOfAscendingNode: 58.42,
    argumentOfPerihelion: 111.33,
    meanAnomaly: 38.38, // As of J2000
    meanMotion: 0.01297 // ~75 year period
  }
};

// Spacecraft trajectory data (simplified)
export const SPACECRAFT_DATA = {
  voyager1: {
    name: 'Voyager 1',
    launchDate: 2443391.5, // September 5, 1977
    currentDistance: 157, // AU from Sun (approximate)
    direction: { ra: 257.8, dec: 12.0 } // Right ascension and declination
  },
  voyager2: {
    name: 'Voyager 2',
    launchDate: 2443375.5, // August 20, 1977
    currentDistance: 131, // AU from Sun (approximate)
    direction: { ra: 296.0, dec: -55.0 }
  },
  newHorizons: {
    name: 'New Horizons',
    launchDate: 2453755.5, // January 19, 2006
    currentDistance: 58, // AU from Sun (approximate)
    direction: { ra: 292.5, dec: -21.0 }
  }
};

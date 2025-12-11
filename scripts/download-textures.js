#!/usr/bin/env node

/**
 * Texture Downloader for Cosmos Navigator
 * Downloads planet textures from NASA and other public sources
 * 
 * Usage: node scripts/download-textures.js
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ASSETS_DIR = path.join(__dirname, '..', 'assets', 'textures');

// Texture sources - using multiple reliable sources
// Solar System Scope textures (CC license)
const TEXTURE_BASE = 'https://www.solarsystemscope.com/textures/download';

const TEXTURES = {
  'sun/2k_sun.jpg': `${TEXTURE_BASE}/2k_sun.jpg`,
  'mercury/2k_mercury.jpg': `${TEXTURE_BASE}/2k_mercury.jpg`,
  'venus/2k_venus_surface.jpg': `${TEXTURE_BASE}/2k_venus_surface.jpg`,
  'venus/2k_venus_atmosphere.jpg': `${TEXTURE_BASE}/2k_venus_atmosphere.jpg`,
  'earth/2k_earth_daymap.jpg': `${TEXTURE_BASE}/2k_earth_daymap.jpg`,
  'earth/2k_earth_nightmap.jpg': `${TEXTURE_BASE}/2k_earth_nightmap.jpg`,
  'earth/2k_earth_clouds.jpg': `${TEXTURE_BASE}/2k_earth_clouds.jpg`,
  'earth/2k_earth_normal_map.png': `${TEXTURE_BASE}/2k_earth_normal_map.png`,
  'earth/2k_earth_specular_map.png': `${TEXTURE_BASE}/2k_earth_specular_map.png`,
  'moons/2k_moon.jpg': `${TEXTURE_BASE}/2k_moon.jpg`,
  'mars/2k_mars.jpg': `${TEXTURE_BASE}/2k_mars.jpg`,
  'jupiter/2k_jupiter.jpg': `${TEXTURE_BASE}/2k_jupiter.jpg`,
  'saturn/2k_saturn.jpg': `${TEXTURE_BASE}/2k_saturn.jpg`,
  'saturn/2k_saturn_ring_alpha.png': `${TEXTURE_BASE}/2k_saturn_ring_alpha.png`,
  'uranus/2k_uranus.jpg': `${TEXTURE_BASE}/2k_uranus.jpg`,
  'neptune/2k_neptune.jpg': `${TEXTURE_BASE}/2k_neptune.jpg`,
  'pluto/2k_pluto.jpg': 'https://upload.wikimedia.org/wikipedia/commons/e/ef/Pluto_in_True_Color_-_High-Res.jpg',
  'skybox/2k_stars_milky_way.jpg': `${TEXTURE_BASE}/2k_stars_milky_way.jpg`,
};

// Higher resolution alternatives (8K) - optional
const TEXTURES_8K = {
  'earth/8k_earth_daymap.jpg': `${TEXTURE_BASE}/8k_earth_daymap.jpg`,
  'earth/8k_earth_nightmap.jpg': `${TEXTURE_BASE}/8k_earth_nightmap.jpg`,
  'earth/8k_earth_clouds.jpg': `${TEXTURE_BASE}/8k_earth_clouds.jpg`,
  'sun/8k_sun.jpg': `${TEXTURE_BASE}/8k_sun.jpg`,
  'mars/8k_mars.jpg': `${TEXTURE_BASE}/8k_mars.jpg`,
  'jupiter/8k_jupiter.jpg': `${TEXTURE_BASE}/8k_jupiter.jpg`,
  'moon/8k_moon.jpg': `${TEXTURE_BASE}/8k_moon.jpg`,
};

function ensureDir(filepath) {
  const dir = path.dirname(filepath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`📁 Created directory: ${dir}`);
  }
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    ensureDir(dest);
    
    if (fs.existsSync(dest)) {
      console.log(`⏭️  Skipping (exists): ${path.basename(dest)}`);
      resolve();
      return;
    }

    const file = fs.createWriteStream(dest);
    const protocol = url.startsWith('https') ? https : http;

    console.log(`⬇️  Downloading: ${path.basename(dest)}`);

    const request = protocol.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) CosmosNavigator/1.0',
        'Accept': 'image/*,*/*',
        'Referer': 'https://www.solarsystemscope.com/'
      }
    }, (response) => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        const redirectUrl = response.headers.location;
        console.log(`   ↪️  Redirecting to: ${redirectUrl}`);
        downloadFile(redirectUrl, dest).then(resolve).catch(reject);
        return;
      }

      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode} for ${url}`));
        return;
      }

      const totalSize = parseInt(response.headers['content-length'], 10);
      let downloadedSize = 0;

      response.on('data', (chunk) => {
        downloadedSize += chunk.length;
        if (totalSize) {
          const percent = ((downloadedSize / totalSize) * 100).toFixed(1);
          process.stdout.write(`\r   📊 ${percent}%`);
        }
      });

      response.pipe(file);

      file.on('finish', () => {
        file.close();
        console.log(`\r   ✅ Complete: ${path.basename(dest)}`);
        resolve();
      });
    });

    request.on('error', (err) => {
      fs.unlink(dest, () => {}); // Delete partial file
      reject(err);
    });

    file.on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });

    // Timeout after 30 seconds
    request.setTimeout(30000, () => {
      request.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

async function downloadAll(highRes = false) {
  console.log('🌌 Cosmos Navigator Texture Downloader\n');
  console.log(`📂 Target directory: ${ASSETS_DIR}\n`);

  const textures = highRes ? { ...TEXTURES, ...TEXTURES_8K } : TEXTURES;
  const entries = Object.entries(textures);
  
  let success = 0;
  let failed = 0;

  for (const [localPath, url] of entries) {
    const dest = path.join(ASSETS_DIR, localPath);
    try {
      await downloadFile(url, dest);
      success++;
    } catch (err) {
      console.error(`   ❌ Failed: ${err.message}`);
      failed++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`✅ Downloaded: ${success}/${entries.length}`);
  if (failed > 0) {
    console.log(`❌ Failed: ${failed}`);
    console.log('\n⚠️  Some textures failed to download.');
    console.log('   The app will use fallback colors for missing textures.');
  }
  console.log('\n🚀 Run `npm run electron:dev` to start the app!');
}

// Parse command line args
const args = process.argv.slice(2);
const highRes = args.includes('--8k') || args.includes('--high');

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Cosmos Navigator Texture Downloader

Usage: node scripts/download-textures.js [options]

Options:
  --8k, --high    Also download 8K high-resolution textures
  --help, -h      Show this help message

Textures are downloaded from solarsystemscope.com (CC BY 4.0 license).
`);
  process.exit(0);
}

downloadAll(highRes).catch(console.error);

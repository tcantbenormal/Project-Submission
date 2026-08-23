/**
 * Database Seed Script
 * Imports GeoJSON data from AOI Vector Data into PostGIS-enabled PostgreSQL.
 * 
 * Usage: node scripts/seedData.js
 * 
 * This script:
 * 1. Creates PostGIS extension
 * 2. Creates all tables (users, cities, boundaries, buildings, solar_pvs)
 * 3. Creates spatial indexes
 * 4. Imports all GeoJSON features with geometry
 */

const fs = require('fs');
const path = require('path');
const db = require('../config/db');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// City definitions with their data file paths
const CITIES = [
  {
    name: 'Islamabad',
    province: 'Islamabad Capital Territory',
    code: 'ISLD',
    files: {
      buildings: path.join(__dirname, '..', '..', 'AOI Vector Data', 'ISLD', 'Islamabad_Buildings_all_stats.geojson'),
      solarPV: path.join(__dirname, '..', '..', 'AOI Vector Data', 'ISLD', 'Islamabad_solarPV.geojson'),
      boundary: path.join(__dirname, '..', '..', 'AOI Vector Data', 'ISLD', 'Islamabad_boundary.geojson'),
    },
  },
  {
    name: 'Karachi',
    province: 'Sindh',
    code: 'KHI',
    files: {
      buildings: path.join(__dirname, '..', '..', 'AOI Vector Data', 'KHI', 'Karachi_building_all_stats_.geojson'),
      solarPV: path.join(__dirname, '..', '..', 'AOI Vector Data', 'KHI', 'karachi_solarPV.geojson'),
      boundary: path.join(__dirname, '..', '..', 'AOI Vector Data', 'KHI', 'karachi_boundary.geojson'),
    },
  },
  {
    name: 'Lahore',
    province: 'Punjab',
    code: 'LHR',
    files: {
      buildings: path.join(__dirname, '..', '..', 'AOI Vector Data', 'LHR', 'Lahore_buildings_all_stats.geojson'),
      solarPV: path.join(__dirname, '..', '..', 'AOI Vector Data', 'LHR', 'Lahore_solarPV.geojson'),
      boundary: path.join(__dirname, '..', '..', 'AOI Vector Data', 'LHR', 'Lahore_Boundary.geojson'),
    },
  },
];

async function createTables() {
  console.log('Creating PostGIS extension and tables...');

  await db.query('CREATE EXTENSION IF NOT EXISTS postgis');

  // Users table
  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Cities table
  await db.query(`
    DROP TABLE IF EXISTS solar_pvs CASCADE;
    DROP TABLE IF EXISTS buildings CASCADE;
    DROP TABLE IF EXISTS boundaries CASCADE;
    DROP TABLE IF EXISTS cities CASCADE;
  `);

  await db.query(`
    CREATE TABLE cities (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      province VARCHAR(100) NOT NULL,
      code VARCHAR(10) NOT NULL
    )
  `);

  // Boundaries table
  await db.query(`
    CREATE TABLE boundaries (
      id SERIAL PRIMARY KEY,
      city_id INTEGER REFERENCES cities(id),
      fid INTEGER,
      class VARCHAR(255),
      boundary_area_sqm DOUBLE PRECISION,
      geom GEOMETRY(Geometry, 4326)
    )
  `);

  // Buildings table
  await db.query(`
    CREATE TABLE buildings (
      id SERIAL PRIMARY KEY,
      city_id INTEGER REFERENCES cities(id),
      fid INTEGER,
      class VARCHAR(255),
      solarpv_area_sqm DOUBLE PRECISION DEFAULT 0,
      rooftop_area_sqm DOUBLE PRECISION DEFAULT 0,
      geom GEOMETRY(Geometry, 4326)
    )
  `);

  // Solar PVs table
  await db.query(`
    CREATE TABLE solar_pvs (
      id SERIAL PRIMARY KEY,
      city_id INTEGER REFERENCES cities(id),
      fid INTEGER,
      class VARCHAR(255),
      solarpv_area_sqm DOUBLE PRECISION DEFAULT 0,
      geom GEOMETRY(Geometry, 4326)
    )
  `);

  console.log('Tables created successfully.');
}

async function createIndexes() {
  console.log('Creating spatial indexes...');

  await db.query('CREATE INDEX IF NOT EXISTS idx_boundaries_geom ON boundaries USING GIST(geom)');
  await db.query('CREATE INDEX IF NOT EXISTS idx_buildings_geom ON buildings USING GIST(geom)');
  await db.query('CREATE INDEX IF NOT EXISTS idx_solar_pvs_geom ON solar_pvs USING GIST(geom)');
  await db.query('CREATE INDEX IF NOT EXISTS idx_buildings_city ON buildings(city_id)');
  await db.query('CREATE INDEX IF NOT EXISTS idx_solar_pvs_city ON solar_pvs(city_id)');
  await db.query('CREATE INDEX IF NOT EXISTS idx_boundaries_city ON boundaries(city_id)');

  console.log('Spatial indexes created.');
}

function readGeoJSON(filePath) {
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw);
}

async function seedCity(city) {
  console.log(`\nSeeding ${city.name} (${city.code})...`);

  // Insert city
  const cityResult = await db.query(
    'INSERT INTO cities (name, province, code) VALUES ($1, $2, $3) RETURNING id',
    [city.name, city.province, city.code]
  );
  const cityId = cityResult.rows[0].id;
  console.log(`  City ID: ${cityId}`);

  // Import boundary
  console.log(`  Importing boundary...`);
  const boundaryData = readGeoJSON(city.files.boundary);
  for (const feature of boundaryData.features) {
    const props = feature.properties;
    const geojsonStr = JSON.stringify(feature.geometry);

    // Handle different property name casing across files
    const boundaryArea = props['Boundary_Area(sqm)'] || props['boundary_area_sqm'] || 0;

    await db.query(
      `INSERT INTO boundaries (city_id, fid, class, boundary_area_sqm, geom) 
       VALUES ($1, $2, $3, $4, ST_SetSRID(ST_GeomFromGeoJSON($5), 4326))`,
      [cityId, props.FID || 0, props.class || '', boundaryArea, geojsonStr]
    );
  }
  console.log(`  Boundary: ${boundaryData.features.length} features imported.`);

  // Import buildings
  console.log(`  Importing buildings...`);
  const buildingsData = readGeoJSON(city.files.buildings);
  let buildingCount = 0;

  for (const feature of buildingsData.features) {
    const props = feature.properties;
    const geojsonStr = JSON.stringify(feature.geometry);

    const solarArea = props['SolarPV_Area(sqm)'] || props['solarpv_area_sqm'] || 0;
    const rooftopArea = props['Rooftop_Area(sqm)'] || props['rooftop_area_sqm'] || 0;

    await db.query(
      `INSERT INTO buildings (city_id, fid, class, solarpv_area_sqm, rooftop_area_sqm, geom) 
       VALUES ($1, $2, $3, $4, $5, ST_SetSRID(ST_GeomFromGeoJSON($6), 4326))`,
      [cityId, props.FID || 0, props.class || '', solarArea, rooftopArea, geojsonStr]
    );
    buildingCount++;
  }
  console.log(`  Buildings: ${buildingCount} features imported.`);

  // Import solar PVs
  console.log(`  Importing solar PVs...`);
  const solarData = readGeoJSON(city.files.solarPV);
  let solarCount = 0;

  for (const feature of solarData.features) {
    const props = feature.properties;
    const geojsonStr = JSON.stringify(feature.geometry);

    const solarArea = props['SolarPV_Area(sqm)'] || props['solarpv_area_sqm'] || 0;

    await db.query(
      `INSERT INTO solar_pvs (city_id, fid, class, solarpv_area_sqm, geom) 
       VALUES ($1, $2, $3, $4, ST_SetSRID(ST_GeomFromGeoJSON($5), 4326))`,
      [cityId, props.FID || 0, props.class || '', solarArea, geojsonStr]
    );
    solarCount++;
  }
  console.log(`  Solar PVs: ${solarCount} features imported.`);
}

async function seed() {
  try {
    console.log('=== Solar Gigawatts Database Seed ===\n');

    await createTables();

    for (const city of CITIES) {
      await seedCity(city);
    }

    await createIndexes();

    // Verify counts
    const citiesCount = await db.query('SELECT COUNT(*) FROM cities');
    const buildingsCount = await db.query('SELECT COUNT(*) FROM buildings');
    const solarCount = await db.query('SELECT COUNT(*) FROM solar_pvs');
    const boundariesCount = await db.query('SELECT COUNT(*) FROM boundaries');

    console.log('\n=== Seed Complete ===');
    console.log(`Cities: ${citiesCount.rows[0].count}`);
    console.log(`Buildings: ${buildingsCount.rows[0].count}`);
    console.log(`Solar PVs: ${solarCount.rows[0].count}`);
    console.log(`Boundaries: ${boundariesCount.rows[0].count}`);

    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  }
}

seed();

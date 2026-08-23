const db = require('../config/db');

/**
 * Get aggregate summary statistics for selected cities.
 * GET /api/stats/summary?city_ids=1,2,3
 */
exports.getSummary = async (req, res) => {
  try {
    const cityIds = req.query.city_ids
      ? req.query.city_ids.split(',').map(Number)
      : null;

    let cityFilter = '';
    let params = [];

    if (cityIds && cityIds.length > 0) {
      cityFilter = 'WHERE city_id = ANY($1)';
      params = [cityIds];
    }

    // Buildings summary
    const buildingsQuery = `
      SELECT 
        COUNT(*) AS total_buildings,
        COUNT(*) FILTER (WHERE solarpv_area_sqm > 0) AS total_solar_systems,
        COALESCE(ROUND(SUM(solarpv_area_sqm)::numeric, 2), 0) AS total_solar_area_sqm,
        COALESCE(ROUND(SUM(rooftop_area_sqm)::numeric, 2), 0) AS total_rooftop_area_sqm,
        COALESCE(SUM(FLOOR(solarpv_area_sqm / 2.58)), 0) AS total_panels,
        COALESCE(SUM(FLOOR(solarpv_area_sqm / 2.58)) * 580, 0) AS total_installed_capacity_w
      FROM buildings
      ${cityFilter}
    `;

    // Solar PV summary
    const solarQuery = `
      SELECT 
        COUNT(*) AS total_solar_features,
        COALESCE(ROUND(SUM(solarpv_area_sqm)::numeric, 2), 0) AS total_solarpv_area_sqm,
        COALESCE(SUM(FLOOR(solarpv_area_sqm / 2.58)), 0) AS total_solarpv_panels,
        COALESCE(SUM(FLOOR(solarpv_area_sqm / 2.58)) * 580, 0) AS total_solarpv_capacity_w
      FROM solar_pvs
      ${cityFilter}
    `;

    // Boundary summary
    const boundaryQuery = `
      SELECT 
        COALESCE(ROUND(SUM(boundary_area_sqm)::numeric, 2), 0) AS total_aoi_area_sqm
      FROM boundaries
      ${cityFilter}
    `;

    const [buildingsResult, solarResult, boundaryResult] = await Promise.all([
      db.query(buildingsQuery, params),
      db.query(solarQuery, params),
      db.query(boundaryQuery, params),
    ]);

    const buildings = buildingsResult.rows[0];
    const solar = solarResult.rows[0];
    const boundary = boundaryResult.rows[0];

    res.json({
      summary: {
        total_buildings: parseInt(buildings.total_buildings),
        total_solar_systems: parseInt(buildings.total_solar_systems),
        total_rooftop_area_sqm: parseFloat(buildings.total_rooftop_area_sqm),
        total_solar_area_sqm: parseFloat(buildings.total_solar_area_sqm),
        total_panels: parseInt(buildings.total_panels),
        total_installed_capacity_w: parseInt(buildings.total_installed_capacity_w),
        total_installed_capacity_kw: parseFloat((parseInt(buildings.total_installed_capacity_w) / 1000).toFixed(2)),
        total_aoi_area_sqm: parseFloat(boundary.total_aoi_area_sqm),
      },
    });
  } catch (err) {
    console.error('getSummary error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

/**
 * Get summary statistics for selected building features (by IDs).
 * POST /api/stats/selection
 * Body: { building_ids: [1, 2, 3], solar_ids: [1, 2, 3] }
 */
exports.getSelectionStats = async (req, res) => {
  try {
    const { building_ids = [], solar_ids = [] } = req.body;

    let buildingsResult = { rows: [{ total_buildings: 0, total_solar_systems: 0, total_solar_area_sqm: 0, total_rooftop_area_sqm: 0, total_panels: 0, total_installed_capacity_w: 0 }] };
    let solarResult = { rows: [{ total_solar_features: 0, total_solarpv_area_sqm: 0, total_solarpv_panels: 0, total_solarpv_capacity_w: 0 }] };

    if (building_ids.length > 0) {
      const buildingsQuery = `
        SELECT 
          COUNT(*) AS total_buildings,
          COUNT(*) FILTER (WHERE solarpv_area_sqm > 0) AS total_solar_systems,
          COALESCE(ROUND(SUM(solarpv_area_sqm)::numeric, 2), 0) AS total_solar_area_sqm,
          COALESCE(ROUND(SUM(rooftop_area_sqm)::numeric, 2), 0) AS total_rooftop_area_sqm,
          COALESCE(SUM(FLOOR(solarpv_area_sqm / 2.58)), 0) AS total_panels,
          COALESCE(SUM(FLOOR(solarpv_area_sqm / 2.58)) * 580, 0) AS total_installed_capacity_w
        FROM buildings
        WHERE id = ANY($1)
      `;
      buildingsResult = await db.query(buildingsQuery, [building_ids]);
    }

    if (solar_ids.length > 0) {
      const solarQuery = `
        SELECT 
          COUNT(*) AS total_solar_features,
          COALESCE(ROUND(SUM(solarpv_area_sqm)::numeric, 2), 0) AS total_solarpv_area_sqm,
          COALESCE(SUM(FLOOR(solarpv_area_sqm / 2.58)), 0) AS total_solarpv_panels,
          COALESCE(SUM(FLOOR(solarpv_area_sqm / 2.58)) * 580, 0) AS total_solarpv_capacity_w
        FROM solar_pvs
        WHERE id = ANY($1)
      `;
      solarResult = await db.query(solarQuery, [solar_ids]);
    }

    const buildings = buildingsResult.rows[0];
    const solar = solarResult.rows[0];

    res.json({
      selection: {
        total_buildings: parseInt(buildings.total_buildings),
        total_solar_systems: parseInt(buildings.total_solar_systems),
        total_rooftop_area_sqm: parseFloat(buildings.total_rooftop_area_sqm),
        total_solar_area_sqm: parseFloat(buildings.total_solar_area_sqm),
        total_panels: parseInt(buildings.total_panels),
        total_installed_capacity_w: parseInt(buildings.total_installed_capacity_w),
        total_installed_capacity_kw: parseFloat((parseInt(buildings.total_installed_capacity_w) / 1000).toFixed(2)),
      },
    });
  } catch (err) {
    console.error('getSelectionStats error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

/**
 * Spatial query: find buildings within a given polygon (for drag-select).
 * POST /api/stats/spatial-select
 * Body: { polygon: GeoJSON polygon geometry, city_ids: [1,2] }
 */
exports.spatialSelect = async (req, res) => {
  try {
    const { polygon, city_ids = [] } = req.body;

    if (!polygon) {
      return res.status(400).json({ error: 'Polygon geometry is required.' });
    }

    let cityFilter = '';
    let params = [JSON.stringify(polygon)];

    if (city_ids.length > 0) {
      cityFilter = 'AND city_id = ANY($2)';
      params.push(city_ids);
    }

    // Find buildings within polygon
    const buildingsQuery = `
      SELECT 
        id, fid, class,
        ROUND(solarpv_area_sqm::numeric, 2) AS solarpv_area_sqm,
        ROUND(rooftop_area_sqm::numeric, 2) AS rooftop_area_sqm,
        FLOOR(solarpv_area_sqm / 2.58) AS no_of_panels,
        FLOOR(solarpv_area_sqm / 2.58) * 580 AS installed_capacity_w
      FROM buildings
      WHERE ST_Intersects(geom, ST_SetSRID(ST_GeomFromGeoJSON($1), 4326))
      ${cityFilter}
    `;

    // Find solar PVs within polygon
    const solarQuery = `
      SELECT 
        id, fid, class,
        ROUND(solarpv_area_sqm::numeric, 2) AS solarpv_area_sqm,
        FLOOR(solarpv_area_sqm / 2.58) AS no_of_panels,
        FLOOR(solarpv_area_sqm / 2.58) * 580 AS installed_capacity_w
      FROM solar_pvs
      WHERE ST_Intersects(geom, ST_SetSRID(ST_GeomFromGeoJSON($1), 4326))
      ${cityFilter}
    `;

    const [buildingsResult, solarResult] = await Promise.all([
      db.query(buildingsQuery, params),
      db.query(solarQuery, params),
    ]);

    // Calculate totals
    const buildings = buildingsResult.rows;
    const solars = solarResult.rows;

    const totalRooftopArea = buildings.reduce((sum, b) => sum + parseFloat(b.rooftop_area_sqm || 0), 0);
    const totalSolarArea = buildings.reduce((sum, b) => sum + parseFloat(b.solarpv_area_sqm || 0), 0);
    const totalPanels = buildings.reduce((sum, b) => sum + parseInt(b.no_of_panels || 0), 0);
    const totalCapacity = buildings.reduce((sum, b) => sum + parseInt(b.installed_capacity_w || 0), 0);
    const totalSolarSystems = buildings.filter(b => parseFloat(b.solarpv_area_sqm || 0) > 0).length;

    res.json({
      selected_buildings: buildings.map(b => b.id),
      selected_solar: solars.map(s => s.id),
      building_details: buildings,
      solar_details: solars,
      summary: {
        total_buildings: buildings.length,
        total_solar_systems: totalSolarSystems,
        total_rooftop_area_sqm: Math.round(totalRooftopArea * 100) / 100,
        total_solar_area_sqm: Math.round(totalSolarArea * 100) / 100,
        total_panels: totalPanels,
        total_installed_capacity_w: totalCapacity,
        total_installed_capacity_kw: Math.round((totalCapacity / 1000) * 100) / 100,
      },
    });
  } catch (err) {
    console.error('spatialSelect error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

/**
 * Get zonal stats for a polygon using rasterstats (Python script).
 * POST /api/stats/zonal
 * Body: { polygon: GeoJSON polygon geometry, city_ids: [1,2] }
 */
exports.getZonalStats = async (req, res) => {
  try {
    const { polygon, city_ids = [] } = req.body;
    if (!polygon) {
      return res.status(400).json({ error: 'Polygon geometry is required.' });
    }

    const { spawn, execSync } = require('child_process');
    const path = require('path');
    
    // Virtual env python path for local dev, or python3 for docker
    let pythonExecutable = 'python3';
    try {
      execSync('python3 --version');
    } catch (e) {
      pythonExecutable = path.resolve(__dirname, '../../.venv/Scripts/python.exe');
    }

    const scriptPath = path.resolve(__dirname, '../scripts/get_zonal_stats.py');

    const pyProcess = spawn(pythonExecutable, [scriptPath]);
    
    let dataString = '';
    let errorString = '';

    pyProcess.stdout.on('data', (data) => {
      dataString += data.toString();
    });

    pyProcess.stderr.on('data', (data) => {
      errorString += data.toString();
    });

    pyProcess.on('close', (code) => {
      if (code !== 0) {
        console.error('Python script error:', errorString);
        return res.status(500).json({ error: 'Failed to compute zonal stats.' });
      }
      try {
        const result = JSON.parse(dataString);
        if (result.success) {
          res.json({ stats: result.stats });
        } else {
          res.status(500).json({ error: result.error });
        }
      } catch (err) {
        console.error('Failed to parse python output:', err, dataString);
        res.status(500).json({ error: 'Invalid output from zonal stats script.' });
      }
    });

    // Send data to python script
    pyProcess.stdin.write(JSON.stringify({ geojson: polygon, city_ids }));
    pyProcess.stdin.end();
  } catch (err) {
    console.error('getZonalStats error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

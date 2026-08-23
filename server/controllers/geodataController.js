const db = require('../config/db');

/**
 * Get all cities with province info.
 * GET /api/geodata/cities
 */
exports.getCities = async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, name, province, code FROM cities ORDER BY name'
    );
    res.json({ cities: result.rows });
  } catch (err) {
    console.error('getCities error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

/**
 * Get boundary GeoJSON for given city IDs.
 * GET /api/geodata/boundaries?city_ids=1,2,3
 */
exports.getBoundaries = async (req, res) => {
  try {
    const cityIds = req.query.city_ids
      ? req.query.city_ids.split(',').map(Number)
      : null;

    let queryText;
    let params;

    if (cityIds && cityIds.length > 0) {
      queryText = `
        SELECT json_build_object(
          'type', 'FeatureCollection',
          'features', COALESCE(json_agg(
            json_build_object(
              'type', 'Feature',
              'properties', json_build_object(
                'id', b.id,
                'city_id', b.city_id,
                'city_name', c.name,
                'province', c.province,
                'boundary_area_sqm', b.boundary_area_sqm
              ),
              'geometry', ST_AsGeoJSON(b.geom)::json
            )
          ), '[]'::json)
        ) AS geojson
        FROM boundaries b
        JOIN cities c ON b.city_id = c.id
        WHERE b.city_id = ANY($1)
      `;
      params = [cityIds];
    } else {
      queryText = `
        SELECT json_build_object(
          'type', 'FeatureCollection',
          'features', COALESCE(json_agg(
            json_build_object(
              'type', 'Feature',
              'properties', json_build_object(
                'id', b.id,
                'city_id', b.city_id,
                'city_name', c.name,
                'province', c.province,
                'boundary_area_sqm', b.boundary_area_sqm
              ),
              'geometry', ST_AsGeoJSON(b.geom)::json
            )
          ), '[]'::json)
        ) AS geojson
        FROM boundaries b
        JOIN cities c ON b.city_id = c.id
      `;
      params = [];
    }

    const result = await db.query(queryText, params);
    res.json(result.rows[0].geojson);
  } catch (err) {
    console.error('getBoundaries error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

/**
 * Get buildings GeoJSON for given city IDs, with calculated fields.
 * GET /api/geodata/buildings?city_ids=1,2,3
 */
exports.getBuildings = async (req, res) => {
  try {
    const cityIds = req.query.city_ids
      ? req.query.city_ids.split(',').map(Number)
      : null;

    let whereClause = '';
    let params = [];

    if (cityIds && cityIds.length > 0) {
      whereClause = 'WHERE bl.city_id = ANY($1)';
      params = [cityIds];
    }

    const queryText = `
      SELECT json_build_object(
        'type', 'FeatureCollection',
        'features', COALESCE(json_agg(
          json_build_object(
            'type', 'Feature',
            'properties', json_build_object(
              'id', bl.id,
              'city_id', bl.city_id,
              'city_name', c.name,
              'fid', bl.fid,
              'class', bl.class,
              'solarpv_area_sqm', ROUND(bl.solarpv_area_sqm::numeric, 2),
              'rooftop_area_sqm', ROUND(bl.rooftop_area_sqm::numeric, 2),
              'no_of_panels', FLOOR(bl.solarpv_area_sqm / 2.58),
              'installed_capacity_w', FLOOR(bl.solarpv_area_sqm / 2.58) * 580
            ),
            'geometry', ST_AsGeoJSON(bl.geom)::json
          )
        ), '[]'::json)
      ) AS geojson
      FROM buildings bl
      JOIN cities c ON bl.city_id = c.id
      ${whereClause}
    `;

    const result = await db.query(queryText, params);
    res.json(result.rows[0].geojson);
  } catch (err) {
    console.error('getBuildings error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

/**
 * Get solar PV GeoJSON for given city IDs, with calculated fields.
 * GET /api/geodata/solarpv?city_ids=1,2,3
 */
exports.getSolarPV = async (req, res) => {
  try {
    const cityIds = req.query.city_ids
      ? req.query.city_ids.split(',').map(Number)
      : null;

    let whereClause = '';
    let params = [];

    if (cityIds && cityIds.length > 0) {
      whereClause = 'WHERE sp.city_id = ANY($1)';
      params = [cityIds];
    }

    const queryText = `
      SELECT json_build_object(
        'type', 'FeatureCollection',
        'features', COALESCE(json_agg(
          json_build_object(
            'type', 'Feature',
            'properties', json_build_object(
              'id', sp.id,
              'city_id', sp.city_id,
              'city_name', c.name,
              'fid', sp.fid,
              'class', sp.class,
              'solarpv_area_sqm', ROUND(sp.solarpv_area_sqm::numeric, 2),
              'no_of_panels', FLOOR(sp.solarpv_area_sqm / 2.58),
              'installed_capacity_w', FLOOR(sp.solarpv_area_sqm / 2.58) * 580
            ),
            'geometry', ST_AsGeoJSON(sp.geom)::json
          )
        ), '[]'::json)
      ) AS geojson
      FROM solar_pvs sp
      JOIN cities c ON sp.city_id = c.id
      ${whereClause}
    `;

    const result = await db.query(queryText, params);
    res.json(result.rows[0].geojson);
  } catch (err) {
    console.error('getSolarPV error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

/**
 * Get combined extent (bounding box) for given city IDs.
 * GET /api/geodata/extent?city_ids=1,2,3
 */
exports.getExtent = async (req, res) => {
  try {
    const cityIds = req.query.city_ids
      ? req.query.city_ids.split(',').map(Number)
      : null;

    let whereClause = '';
    let params = [];

    if (cityIds && cityIds.length > 0) {
      whereClause = 'WHERE city_id = ANY($1)';
      params = [cityIds];
    }

    const queryText = `
      SELECT 
        ST_XMin(ST_Extent(geom)) AS min_lng,
        ST_YMin(ST_Extent(geom)) AS min_lat,
        ST_XMax(ST_Extent(geom)) AS max_lng,
        ST_YMax(ST_Extent(geom)) AS max_lat
      FROM boundaries
      ${whereClause}
    `;

    const result = await db.query(queryText, params);
    const row = result.rows[0];

    if (!row || !row.min_lng) {
      return res.status(404).json({ error: 'No boundaries found.' });
    }

    res.json({
      bbox: [
        [parseFloat(row.min_lat), parseFloat(row.min_lng)],
        [parseFloat(row.max_lat), parseFloat(row.max_lng)],
      ],
    });
  } catch (err) {
    console.error('getExtent error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

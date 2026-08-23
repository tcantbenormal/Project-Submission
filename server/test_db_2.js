const { Pool } = require('pg');
const pool = new Pool({
  host: '127.0.0.1',
  port: 5433,
  database: 'solar_gis',
  user: 'postgres',
  password: 'postgres',
});

async function test() {
  try {
    const res = await pool.query(`
      SELECT 
        city_id,
        COUNT(*) AS cnt,
        ROUND(SUM(solarpv_area_sqm)::numeric, 2) AS total_area,
        FLOOR(SUM(solarpv_area_sqm / 2.58)) AS floor_sum,
        SUM(FLOOR(solarpv_area_sqm / 2.58)) AS sum_floor
      FROM solar_pvs
      GROUP BY city_id
    `);
    console.log('Results per city:');
    console.table(res.rows);
  } catch(e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
test();

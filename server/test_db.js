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
    const res1 = await pool.query('SELECT SUM(FLOOR(solarpv_area_sqm / 2.58)) AS panels1 FROM solar_pvs WHERE city_id=2'); // Assuming 2 is Islamabad
    const res2 = await pool.query('SELECT FLOOR(SUM(solarpv_area_sqm / 2.58)) AS panels2 FROM solar_pvs WHERE city_id=2');
    console.log('Query 1 (SUM FLOOR):', res1.rows[0]);
    console.log('Query 2 (FLOOR SUM):', res2.rows[0]);
    
    // Also try without city_id in case it's for all cities
    const res3 = await pool.query('SELECT SUM(FLOOR(solarpv_area_sqm / 2.58)) AS panels3 FROM solar_pvs'); 
    console.log('Query 3 (SUM FLOOR all):', res3.rows[0]);
    
  } catch(e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
test();

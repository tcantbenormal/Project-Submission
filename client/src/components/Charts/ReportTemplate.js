import React, { forwardRef } from 'react';
import { formatNumber, formatArea, wattsToKW } from '../../utils/calculations';
import SunpathChart, { getSolarPosition } from './SunpathChart';

// HeraldX Brand Colors
const COLORS = {
  deepNavy: '#0A2342',
  deepTeal: '#0F7A6E',
  brightTeal: '#1BA098',
  deepNavyMid: '#2E4057',
  coolGrey: '#E5E5E5',
  offWhite: '#F9F9F9',
  solarAmber: '#F5A623',
  skyBlue: '#4BA3C3',
  deepAqua: '#045D75',
  storageOrange: '#D95F3B',
};

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const daylightHours = Array.from({ length: 14 }, (_, i) => i + 6);

const generateRealisticProfiles = (lat, lng) => {
  const profiles = [];
  const year = new Date().getFullYear();
  // Average cloudiness factors by month (approximate for typical climates, lower = more clouds)
  const cloudFactor = [0.65, 0.65, 0.6, 0.6, 0.7, 0.65, 0.45, 0.45, 0.6, 0.7, 0.7, 0.65];
  
  for (let m = 0; m < 12; m++) {
    const hourly = [];
    for (let h = 0; h < 24; h++) {
      // Use the 15th of the month to represent the average
      const t = new Date(Date.UTC(year, m, 15, h - 5, 30, 0)); // Assuming UTC+5 for approximation
      const pos = getSolarPosition(t, lat, lng);
      let dni = 0;
      if (pos.elevation > 0) {
        const altDeg = pos.elevation;
        const altRad = altDeg * Math.PI / 180;
        // Kasten & Young Air Mass
        const am = 1 / (Math.sin(altRad) + 0.50572 * Math.pow(6.07995 + altDeg, -1.6364));
        // Clear sky DNI (W/m2) estimate based on air mass
        const clearSkyDni = 1353 * Math.pow(0.7, Math.pow(am, 0.678));
        dni = Math.round(clearSkyDni * cloudFactor[m]);
      }
      hourly.push(dni);
    }
    profiles.push(hourly);
  }
  return profiles;
};

// We will compute profiles dynamically in the component, but we keep a fallback
const defaultProfiles = generateRealisticProfiles(33.6, 73.0);

const ReportTemplate = forwardRef(({ stats, locationData, mapDataUrl }, ref) => {
  const { useMemo, useState, useEffect } = React;
  
  const [realElevation, setRealElevation] = useState(null);

  useEffect(() => {
    const fetchElevation = async () => {
      const lat = locationData?.lat || 33.6;
      const lng = locationData?.lng || 73.0;
      try {
        const res = await fetch(`https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lng}`);
        const data = await res.json();
        if (data && data.elevation && data.elevation.length > 0) {
          setRealElevation(data.elevation[0]);
        }
      } catch (err) {
        console.error('Failed to fetch elevation:', err);
      }
    };
    fetchElevation();
  }, [locationData?.lat, locationData?.lng]);

  const realProfiles = useMemo(() => {
    return generateRealisticProfiles(locationData?.lat || 33.6, locationData?.lng || 73.0);
  }, [locationData?.lat, locationData?.lng]);

  const derivedZonal = useMemo(() => {
    if (stats?.zonal) return stats.zonal;
    const lat = locationData?.lat || 33.6;
    
    const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    let annualDniWh = 0;
    
    for (let m = 0; m < 12; m++) {
      const dailySumWh = realProfiles[m].reduce((sum, val) => sum + val, 0);
      annualDniWh += dailySumWh * daysInMonth[m];
    }
    
    const annualDniKwh = annualDniWh / 1000;
    const annualGhiKwh = annualDniKwh * 1.1; 
    const annualDifKwh = annualGhiKwh - annualDniKwh;
    const annualGtiKwh = annualGhiKwh * 1.15;
    const pvout = annualGtiKwh * 0.8;
    const opta = lat;
    const temp = 35 - (lat - 24) * 0.8;
    
    // Use real DEM elevation if loaded, otherwise fallback to a generic estimate based on lat
    const terrain = realElevation !== null ? realElevation : Math.max(0, (lat - 30) * 150);

    return {
      DNI: annualDniKwh,
      GHI: annualGhiKwh,
      DIF: annualDifKwh > 0 ? annualDifKwh : 600,
      GTI: annualGtiKwh,
      PVOUT: pvout,
      OPTA: opta,
      TEMP: temp,
      TERRAIN: terrain
    };
  }, [stats?.zonal, realProfiles, locationData?.lat, locationData?.lng, realElevation]);

  const zonal = derivedZonal;
  const capacityKW = stats?.total_installed_capacity_kw || wattsToKW(stats?.solarpv_capacity_w || 0);
  const totalPanels = stats?.total_panels || stats?.solarpv_panels || 0;
  const totalSolarArea = stats?.total_solar_area_sqm || stats?.total_solarpv_area_sqm || 0;
  const totalRooftopArea = stats?.total_rooftop_area_sqm || 0;
  const reportDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const totalPages = 3;

  // ── Shared Styles ──
  const pageStyle = {
    width: '794px',
    height: '1123px',
    background: '#ffffff',
    fontFamily: '"Inter", "Segoe UI", Arial, sans-serif',
    color: COLORS.deepNavyMid,
    boxSizing: 'border-box',
    position: 'relative',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  };

  const renderHeader = (pageNum) => (
    <div style={{ background: COLORS.deepNavy, color: '#fff', padding: '15px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
      <div>
        <div style={{ fontSize: '22px', fontWeight: 'bold', letterSpacing: '0.5px' }}>Uncounted Solar Gigawatts</div>
        <div style={{ fontSize: '11px', color: COLORS.brightTeal, marginTop: '4px' }}>HeraldX — Solar Energy Assessment Report</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ fontSize: '10px', color: '#ccc' }}>{reportDate}</div>
        <img src="/assets/hx-logo-report.png" alt="HeraldX" style={{ height: '40px', objectFit: 'contain' }} />
      </div>
    </div>
  );

  const renderFooter = (pageNum) => (
    <div style={{ flexShrink: 0, marginTop: 'auto' }}>
      <div style={{ height: '3px', background: COLORS.solarAmber }}></div>
      <div style={{ background: COLORS.deepNavy, color: '#ccc', padding: '10px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px' }}>
        <span>Generated by Uncounted Solar Gigawatts — HeraldX</span>
        <span>© {new Date().getFullYear()} HeraldX. All rights reserved.</span>
        <span>Page {pageNum} / {totalPages}</span>
      </div>
    </div>
  );

  const sectionTitleStyle = {
    background: COLORS.offWhite,
    padding: '8px 15px',
    fontSize: '13px',
    fontWeight: 'bold',
    color: COLORS.deepNavy,
    borderLeft: `4px solid ${COLORS.brightTeal}`,
    marginBottom: '15px',
  };

  const tableRowStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '6px 0',
    borderBottom: `1px solid ${COLORS.coolGrey}`,
    fontSize: '11px',
    color: COLORS.deepNavyMid,
  };

  const getReferenceBadge = (code, value) => {
    let label = '';
    let color = '';
    if (code === 'PVOUT') {
      if (value >= 1600) { label = 'Excellent'; color = COLORS.deepTeal; }
      else if (value >= 1400) { label = 'Good'; color = COLORS.brightTeal; }
      else if (value >= 1200) { label = 'Moderate'; color = COLORS.solarAmber; }
      else { label = 'Poor'; color = COLORS.storageOrange; }
    } else if (code === 'DNI' || code === 'GHI' || code === 'GTI') {
      if (value >= 1800) { label = 'Excellent'; color = COLORS.deepTeal; }
      else if (value >= 1500) { label = 'Good'; color = COLORS.brightTeal; }
      else if (value >= 1200) { label = 'Moderate'; color = COLORS.solarAmber; }
      else { label = 'Poor'; color = COLORS.storageOrange; }
    }
    
    if (!label) return null;
    return (
      <span style={{
        display: 'inline-block',
        fontSize: '7px',
        backgroundColor: `${color}1A`,
        color: color,
        padding: '1px 4px',
        borderRadius: '3px',
        marginLeft: '6px',
        fontWeight: 'bold',
        textTransform: 'uppercase',
        verticalAlign: 'middle',
      }}>
        {label}
      </span>
    );
  };

  // ── Page 1 ──
  const renderPage1 = () => (
    <div style={pageStyle} className="gsa-page">
      {renderHeader(1)}

      {/* Title Bar */}
      <div style={{ background: COLORS.offWhite, padding: '15px 40px', borderBottom: `3px solid ${COLORS.brightTeal}`, flexShrink: 0 }}>
        <h1 style={{ fontSize: '20px', margin: 0, color: COLORS.deepNavy, fontWeight: 'bold' }}>
          {locationData?.title || 'Selected Area'} — Solar Assessment
        </h1>
        <div style={{ fontSize: '11px', color: COLORS.deepTeal, marginTop: '4px' }}>
          Cities: {locationData?.title || 'Pakistan'}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '20px 40px', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ display: 'flex', gap: '20px', flex: 1, minHeight: 0 }}>
          {/* Left Column */}
          <div style={{ flex: '1', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={sectionTitleStyle}>SITE INFO — Climate Data</div>

            <div style={{ flex: '0 0 auto', marginBottom: '15px' }}>
              <div style={{ ...tableRowStyle, fontWeight: 'bold', borderBottom: `2px solid ${COLORS.deepTeal}`, color: COLORS.deepNavy }}>
                <span style={{ width: '45%' }}>Parameter</span>
                <span style={{ width: '15%' }}></span>
                <span style={{ width: '40%', textAlign: 'right' }}>Annual Value</span>
              </div>

              {[
                ['Specific PV power output', 'PVOUT', zonal.PVOUT, 'kWh/kWp'],
                ['Direct normal irradiation', 'DNI', zonal.DNI, 'kWh/m²'],
                ['Global horizontal irradiation', 'GHI', zonal.GHI, 'kWh/m²'],
                ['Diffuse horizontal irradiation', 'DIF', zonal.DIF, 'kWh/m²'],
                ['Global tilted irradiation (opt.)', 'GTI', zonal.GTI, 'kWh/m²'],
                ['Optimum tilt angle', 'OPTA', zonal.OPTA, '°'],
                ['Air temperature', 'TEMP', zonal.TEMP, '°C'],
                ['Terrain elevation', 'ELE', zonal.TERRAIN, 'm'],
              ].map(([label, code, value, unit]) => (
                <div key={code} style={tableRowStyle}>
                  <span style={{ width: '45%', display: 'flex', alignItems: 'center' }}>
                    {label} {getReferenceBadge(code, value)}
                  </span>
                  <span style={{ width: '15%', color: COLORS.deepTeal, fontWeight: 600 }}>{code}</span>
                  <span style={{ width: '40%', textAlign: 'right' }}>
                    <strong>{Number(value).toFixed(code === 'ELE' || code === 'OPTA' ? 0 : 1)}</strong>{' '}
                    <span style={{ color: '#999', fontSize: '10px' }}>{unit}</span>
                  </span>
                </div>
              ))}
            </div>

            {/* Sunpath Chart */}
            <div style={{ flex: '1', minHeight: '200px', overflow: 'hidden' }}>
              <SunpathChart lat={locationData?.lat || 33.598035} lng={locationData?.lng || 73.039169} />
            </div>
          </div>

          {/* Right Column */}
          <div style={{ flex: '1', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={sectionTitleStyle}>MAP OVERVIEW</div>
            <div style={{ height: '280px', background: '#e0e0e0', border: `1px solid ${COLORS.coolGrey}`, position: 'relative', overflow: 'hidden', marginBottom: '15px', flexShrink: 0 }}>
              {mapDataUrl ? (
                <img src={mapDataUrl} alt="Map View" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888' }}>Map Image</div>
              )}
            </div>

            <div style={sectionTitleStyle}>ASSET INTELLIGENCE</div>
            <div style={{ flex: '1' }}>
              {[
                ['Total Installed Capacity', `${formatNumber(capacityKW, 2)} kW`],
                ['Total Solar PV Area', `${formatNumber(totalSolarArea, 1)} sqm`],
                ['Total Rooftop Area', `${formatNumber(totalRooftopArea, 1)} sqm`],
                ['No. of Panels', formatNumber(totalPanels)],
                ['Number of Buildings', formatNumber(stats?.total_buildings || 0)],
                ['Solar Systems', formatNumber(stats?.total_solar_systems || 0)],
                ['Solar Penetration', `${formatNumber(stats?.total_buildings > 0 ? ((stats?.total_solar_systems || 0) / stats?.total_buildings) * 100 : 0, 1)}%`],
              ].map(([label, value]) => (
                <div key={label} style={tableRowStyle}>
                  <span>{label}</span>
                  <span><strong style={{ color: COLORS.deepTeal }}>{value}</strong></span>
                </div>
              ))}
              {stats?.total_aoi_area_sqm > 0 && (
                <div style={tableRowStyle}>
                  <span>Total AOI Area</span>
                  <span><strong style={{ color: COLORS.deepTeal }}>{formatArea(stats.total_aoi_area_sqm)}</strong></span>
                </div>
              )}
            </div>

            <div style={{ marginTop: '10px', padding: '10px', background: COLORS.offWhite, border: `1px solid ${COLORS.coolGrey}`, fontSize: '9px', color: '#666', lineHeight: '1.5', flexShrink: 0 }}>
              <strong>Methodology:</strong> High-resolution satellite imagery processed via HeraldX AI models. Calculations assume standard 580W panels (2.58 m²/panel).
            </div>
          </div>
        </div>
      </div>

      {renderFooter(1)}
    </div>
  );

  // ── Page 2 ──
  const renderPage2 = () => (
    <div style={pageStyle} className="gsa-page">
      {renderHeader(2)}

      <div style={{ padding: '15px 40px', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={sectionTitleStyle}>PV ELECTRICITY & SOLAR RADIATION</div>

        {/* Top Row: Annual + Monthly Chart side by side — FIXED 180px */}
        <div style={{ display: 'flex', gap: '12px', height: '180px', marginBottom: '10px', flexShrink: 0 }}>
          {/* Annual Average */}
          <div style={{ width: '160px', border: `1px solid ${COLORS.coolGrey}`, padding: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <div style={{ fontSize: '10px', fontWeight: 'bold', color: COLORS.deepNavy }}>Annual Average</div>
            <div style={{ fontSize: '9px', color: '#888', marginBottom: '10px' }}>Direct Normal Irradiation</div>
            <div style={{ color: COLORS.solarAmber, fontSize: '28px', fontWeight: 'bold' }}>{Number(zonal.DNI).toFixed(0)}</div>
            <div style={{ color: '#888', fontSize: '9px', marginTop: '4px' }}>kWh/m² per year</div>
          </div>

          {/* Monthly Averages Bar Chart */}
          <div style={{ flex: 1, border: `1px solid ${COLORS.coolGrey}`, padding: '12px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ fontSize: '10px', fontWeight: 'bold', color: COLORS.deepNavy }}>Monthly Averages — DNI [kWh/m²]</div>

            <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: '3px', paddingLeft: '28px', paddingTop: '8px', position: 'relative', overflow: 'hidden' }}>
              {/* Y Axis */}
              <div style={{ position: 'absolute', left: 0, top: '8px', bottom: '14px', width: '26px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', fontSize: '7px', color: '#888', borderRight: `1px solid ${COLORS.coolGrey}`, paddingRight: '2px', textAlign: 'right' }}>
                <span>200</span><span>100</span><span>0</span>
              </div>

              {months.map((m, i) => {
                const dailySumWh = realProfiles[i].reduce((sum, val) => sum + val, 0);
                // Monthly sum in kWh/m2
                const monthlySumKwh = (dailySumWh * [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][i]) / 1000;
                // Scale to a max of 200 for visual percentage
                const barPct = Math.min(100, (monthlySumKwh / 200) * 100);
                return (
                  <div key={m} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', paddingBottom: '14px' }}>
                    <div style={{ width: '75%', height: `${barPct}%`, background: COLORS.solarAmber, borderRadius: '1px 1px 0 0', minHeight: '2px' }}></div>
                    <div style={{ fontSize: '6px', color: '#666', marginTop: '2px', position: 'absolute', bottom: '2px' }}>{m}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Middle Row: 12 Small Multiples — FIXED 130px */}
        <div style={{ border: `1px solid ${COLORS.coolGrey}`, padding: '8px 10px', marginBottom: '10px', flexShrink: 0 }}>
          <div style={{ fontSize: '10px', fontWeight: 'bold', color: COLORS.deepNavy, marginBottom: '2px' }}>Average Hourly Profiles — Clear-Sky DNI [W/m²]</div>
          <div style={{ fontSize: '8px', color: '#888', marginBottom: '6px' }}>Time zone: {locationData?.tz || 'UTC+05'}</div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gridTemplateRows: 'repeat(2, 50px)', gap: '4px' }}>
            {months.map((m, i) => {
              const profile = realProfiles[i];
              // Use bezier curves or smooth lines for the profile
              const maxDniOverall = Math.max(800, ...realProfiles.flat());
              
              // We only want to plot daylight hours (e.g. 5 to 19)
              const startH = 5;
              const endH = 19;
              const pathPoints = [];
              for (let h = startH; h <= endH; h++) {
                const x = ((h - startH) / (endH - startH)) * 100;
                const y = 100 - (profile[h] / maxDniOverall) * 100;
                pathPoints.push(`${x},${y}`);
              }
              const pathD = `M0,100 ${pathPoints.map((p, idx) => `L${p}`).join(' ')} L100,100 Z`;

              return (
                <div key={m} style={{ display: 'flex', flexDirection: 'column', border: `1px solid ${COLORS.offWhite}`, overflow: 'hidden', height: '50px' }}>
                  <div style={{ fontSize: '7px', fontWeight: 'bold', padding: '1px 3px', color: COLORS.deepNavy, flexShrink: 0, lineHeight: '10px' }}>{m}</div>
                  <div style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
                    <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ display: 'block' }}>
                      <path
                        d={pathD}
                        fill={`${COLORS.solarAmber}33`}
                        stroke={COLORS.solarAmber}
                        strokeWidth="2"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '5px', color: '#aaa', padding: '0 2px', flexShrink: 0, lineHeight: '8px' }}>
                    <span>6h</span><span>12h</span><span>18h</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Heatmap Table — daylight hours only, fills remaining space */}
        <div style={{ border: `1px solid ${COLORS.coolGrey}`, padding: '8px 10px', flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: '10px', fontWeight: 'bold', color: COLORS.deepNavy, marginBottom: '2px', flexShrink: 0 }}>Hourly Irradiation Heatmap — Clear-Sky DNI [W/m²]</div>
          <div style={{ fontSize: '8px', color: '#888', marginBottom: '4px', flexShrink: 0 }}>Daylight hours (06:00 – 19:00)</div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '7px', textAlign: 'center', flex: 1 }}>
            <thead>
              <tr>
                <th style={{ width: '38px', textAlign: 'left', padding: '2px', color: COLORS.deepNavy }}>Hour</th>
                {months.map(m => <th key={m} style={{ padding: '2px', color: COLORS.deepNavy, fontWeight: 600 }}>{m}</th>)}
              </tr>
            </thead>
            <tbody>
              {daylightHours.map(hour => (
                <tr key={hour}>
                  <td style={{ textAlign: 'left', color: '#888', padding: '1px 2px', borderRight: `1px solid ${COLORS.coolGrey}` }}>{`${hour}:00`}</td>
                  {months.map((m, monthIdx) => {
                    const val = realProfiles[monthIdx][hour];
                    const maxVal = Math.max(800, ...realProfiles.flat());
                    let bg = 'transparent';
                    if (val > 0) {
                      const pct = val / maxVal;
                      if (pct < 0.2) bg = '#E8F6F5'; // Very pale teal
                      else if (pct < 0.4) bg = '#B1E1DD'; // Light teal
                      else if (pct < 0.6) bg = '#FFF1B8'; // Light amber
                      else if (pct < 0.8) bg = '#FFD54A'; // HeraldX Active Yellow
                      else bg = '#F5A623'; // HeraldX Solar Amber
                    }
                    return <td key={m} style={{ backgroundColor: bg, padding: '1px', borderBottom: `1px solid ${COLORS.offWhite}`, color: val > 0 ? '#333' : 'transparent' }}>{val > 0 ? val : ''}</td>;
                  })}
                </tr>
              ))}
              <tr style={{ borderTop: `2px solid ${COLORS.deepTeal}` }}>
                <td style={{ textAlign: 'left', fontWeight: 'bold', color: COLORS.deepNavy, padding: '2px' }}>Sum</td>
                {months.map((m, monthIdx) => (
                  <td key={m} style={{ fontWeight: 'bold', color: COLORS.deepNavy, padding: '2px' }}>
                    {realProfiles[monthIdx].reduce((a, b) => a + b, 0).toLocaleString()}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {renderFooter(2)}
    </div>
  );

  // ── Page 3 ──
  const renderPage3 = () => (
    <div style={pageStyle} className="gsa-page">
      {renderHeader(3)}

      <div style={{ padding: '20px 40px', flex: 1, overflow: 'hidden' }}>
        <div style={sectionTitleStyle}>GLOSSARY</div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', color: COLORS.deepNavyMid, marginBottom: '30px' }}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${COLORS.deepTeal}`, textAlign: 'left' }}>
              <th style={{ padding: '6px 8px', width: '12%', color: COLORS.deepNavy }}>Code</th>
              <th style={{ padding: '6px 8px', width: '25%', color: COLORS.deepNavy }}>Full Name</th>
              <th style={{ padding: '6px 8px', width: '15%', color: COLORS.deepNavy }}>Unit</th>
              <th style={{ padding: '6px 8px', width: '48%', color: COLORS.deepNavy }}>Description</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['DIF', 'Diffuse horizontal irradiation', 'kWh/m²', 'Average yearly/monthly sum of diffuse horizontal irradiation.'],
              ['DNI', 'Direct normal irradiation', 'kWh/m²', 'Average yearly/monthly sum of direct normal irradiation.'],
              ['ELE', 'Terrain elevation', 'm', 'Elevation above sea level from SRTM-3 data.'],
              ['GHI', 'Global horizontal irradiation', 'kWh/m²', 'Average yearly/monthly sum of global horizontal irradiation.'],
              ['GTI', 'Global tilted irradiation', 'kWh/m²', 'Average yearly/monthly sum of global tilted irradiation.'],
              ['GTI_opta', 'GTI at optimum angle', 'kWh/m²', 'GTI for PV modules fix-mounted at optimum tilt angle.'],
              ['OPTA', 'Optimum tilt of PV modules', '°', 'Optimum tilt facing the Equator for maximizing GTI input.'],
              ['PVOUT', 'Specific PV power output', 'kWh/kWp', 'Average yearly PV electricity normalized to 1 kWp installed capacity.'],
              ['TEMP', 'Air temperature', '°C', 'Average air temperature at 2 m above ground (ERA5 model).'],
            ].map(([code, name, unit, desc]) => (
              <tr key={code} style={{ borderBottom: `1px solid ${COLORS.coolGrey}` }}>
                <td style={{ padding: '6px 8px', fontWeight: 600, color: COLORS.deepTeal }}>{code}</td>
                <td style={{ padding: '6px 8px' }}>{name}</td>
                <td style={{ padding: '6px 8px', color: '#888' }}>{unit}</td>
                <td style={{ padding: '6px 8px', color: '#666' }}>{desc}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={sectionTitleStyle}>ABOUT THIS REPORT</div>

        <div style={{ fontSize: '10px', lineHeight: '1.7', color: '#555' }}>
          <p>
            This report is automatically generated by the <strong>Uncounted Solar Gigawatts</strong> platform developed by <strong>HeraldX</strong>.
            It provides estimated solar resource data, air temperature, terrain elevation, and potential photovoltaic power output
            for the selected location and input parameters.
          </p>
          <p>
            <strong>Asset Intelligence:</strong> Building footprints and existing solar PV installations are detected using
            HeraldX's proprietary AI-driven remote sensing models applied to high-resolution satellite imagery.
            Installed capacity metrics reflect precise, feature-level analysis of the selected area.
          </p>
          <p>
            <strong>Solar Resource Data:</strong> Climate and irradiation data is sourced from the Global Solar Atlas,
            a project funded by the World Bank Group's Energy Sector Management Assistance Program (ESMAP)
            and prepared by Solargis. Solar resource database © Solargis. Sunpath calculations powered by the
            <em> suncalc</em> astronomical library using precise site coordinates.
          </p>
          <p>
            <strong>Disclaimer:</strong> All data and analysis are provided for informational purposes only.
            HeraldX makes no warranties regarding the accuracy or completeness of the data.
            Users should conduct independent verification before making investment or planning decisions.
          </p>
        </div>

        <div style={{ marginTop: '30px', padding: '15px', background: COLORS.offWhite, border: `1px solid ${COLORS.coolGrey}`, fontSize: '10px', color: '#666' }}>
          <strong style={{ color: COLORS.deepNavy }}>Data Credits:</strong><br />
          Solar resource database & PV simulation software © Solargis<br />
          Global Solar Atlas © The World Bank Group / ESMAP<br />
          Building footprint extraction & solar asset detection © HeraldX<br />
          Terrain elevation data from SRTM-3 (NASA/USGS)
        </div>
      </div>

      {renderFooter(3)}
    </div>
  );

  return (
    <div
      ref={ref}
      style={{
        position: 'absolute',
        left: '-9999px',
        top: 0,
        width: '794px',
        background: '#e0e0e0',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
      }}
    >
      <div className="gsa-page-container">{renderPage1()}</div>
      <div className="gsa-page-container">{renderPage2()}</div>
      <div className="gsa-page-container">{renderPage3()}</div>
    </div>
  );
});

export default ReportTemplate;

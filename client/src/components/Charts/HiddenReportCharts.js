import React, { forwardRef } from 'react';
import HourlyProfileChart from './HourlyProfileChart';
import MonthlyProfileChart from './MonthlyProfileChart';

// Mock data based on typical GSA distributions
const mockHourlyData = Array.from({ length: 24 }).map((_, i) => {
  const hour = i;
  let pvout = 0;
  let ghi = 0;
  if (hour >= 6 && hour <= 18) {
    const peak = 12;
    const diff = Math.abs(peak - hour);
    pvout = Math.max(0, 150 - (diff * 25)) + Math.random() * 10;
    ghi = Math.max(0, 800 - (diff * 130)) + Math.random() * 50;
  }
  return { hour: `${hour}:00`, PVOUT: Math.round(pvout), GHI: Math.round(ghi) };
});

const mockMonthlyData = [
  { month: 'Jan', PVOUT: 120, GHI: 140 },
  { month: 'Feb', PVOUT: 130, GHI: 155 },
  { month: 'Mar', PVOUT: 155, GHI: 190 },
  { month: 'Apr', PVOUT: 170, GHI: 210 },
  { month: 'May', PVOUT: 185, GHI: 230 },
  { month: 'Jun', PVOUT: 195, GHI: 245 },
  { month: 'Jul', PVOUT: 190, GHI: 240 },
  { month: 'Aug', PVOUT: 180, GHI: 220 },
  { month: 'Sep', PVOUT: 160, GHI: 195 },
  { month: 'Oct', PVOUT: 145, GHI: 175 },
  { month: 'Nov', PVOUT: 125, GHI: 150 },
  { month: 'Dec', PVOUT: 115, GHI: 135 },
];

const HiddenReportCharts = forwardRef(({ stats }, ref) => {
  const defaultZonal = {
    PVOUT: 1645.2,
    GHI: 1920.5,
    DNI: 1480.3,
    DIF: 650.1,
    GTI: 2100.8,
    TEMP: 24.5,
    OPTA: 28.0,
    TERRAIN: 520,
  };
  
  const zonal = stats?.zonal || defaultZonal;

  return (
    <div 
      ref={ref} 
      style={{ 
        position: 'absolute', 
        left: '-9999px', 
        top: 0, 
        width: '800px', 
        padding: '20px', 
        background: '#fff',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}
    >
      <div style={{ display: 'flex', gap: '20px' }}>
        <div style={{ flex: 1 }}>
          <HourlyProfileChart data={mockHourlyData} />
        </div>
        <div style={{ flex: 1 }}>
          <MonthlyProfileChart data={mockMonthlyData} />
        </div>
      </div>
      
      <div style={{ padding: '20px', background: '#f5f7fa', borderRadius: '8px' }}>
        <h4 style={{ fontFamily: 'Inter', color: '#0A2342', marginTop: 0 }}>GSA Climate & Solar Resource Intelligence</h4>
        <p style={{ fontFamily: 'Inter', fontSize: '11px', color: '#555', marginBottom: '16px', lineHeight: '1.5' }}>
          The following climate statistics are extracted precisely from the Global Solar Atlas (GSA) grids for your selected Area of Interest (AOI). They form the foundation of our energy yield modeling and financial viability analysis.
        </p>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', fontFamily: 'Inter' }}>
          <tbody>
            {zonal.PVOUT !== undefined && (
              <tr style={{ borderBottom: '1px solid #ddd' }}>
                <td style={{ padding: '12px 0' }}>
                  <strong style={{ color: '#0A2342', display: 'block', marginBottom: '4px' }}>Specific Photovoltaic Power Output (PVOUT)</strong>
                  <span style={{ color: '#666', fontSize: '11px' }}>Represents the amount of power generated per unit of installed capacity. A higher PVOUT directly translates to better ROI and shorter payback periods for solar investments in this region.</span>
                </td>
                <td style={{ padding: '12px 0', textAlign: 'right', fontWeight: 'bold', verticalAlign: 'top', color: '#0F7A6E' }}>{Number(zonal.PVOUT).toFixed(2)}<br/><span style={{ fontSize: '10px', color: '#888', fontWeight: 'normal' }}>kWh/kWp</span></td>
                <td style={{ padding: '12px 10px', textAlign: 'right', verticalAlign: 'top', fontSize: '11px', color: '#555' }}>Excellent: &gt;1600<br/>Good: 1400-1600<br/>Poor: &lt;1400</td>
              </tr>
            )}
            {zonal.GHI !== undefined && (
              <tr style={{ borderBottom: '1px solid #ddd' }}>
                <td style={{ padding: '12px 0' }}>
                  <strong style={{ color: '#0A2342', display: 'block', marginBottom: '4px' }}>Global Horizontal Irradiation (GHI)</strong>
                  <span style={{ color: '#666', fontSize: '11px' }}>The total amount of shortwave radiation received from above by a surface horizontal to the ground. This is the most critical metric for evaluating the raw solar resource potential of the AOI.</span>
                </td>
                <td style={{ padding: '12px 0', textAlign: 'right', fontWeight: 'bold', verticalAlign: 'top', color: '#0F7A6E' }}>{Number(zonal.GHI).toFixed(2)}<br/><span style={{ fontSize: '10px', color: '#888', fontWeight: 'normal' }}>kWh/m²</span></td>
                <td style={{ padding: '12px 10px', textAlign: 'right', verticalAlign: 'top', fontSize: '11px', color: '#555' }}>High: &gt;1800<br/>Mod: 1400-1800<br/>Low: &lt;1400</td>
              </tr>
            )}
            {zonal.DNI !== undefined && (
              <tr style={{ borderBottom: '1px solid #ddd' }}>
                <td style={{ padding: '12px 0' }}>
                  <strong style={{ color: '#0A2342', display: 'block', marginBottom: '4px' }}>Direct Normal Irradiation (DNI)</strong>
                  <span style={{ color: '#666', fontSize: '11px' }}>The amount of solar radiation received per unit area by a surface that is always held perpendicular to the rays. Crucial for systems with tracking mechanisms or concentrated solar power (CSP).</span>
                </td>
                <td style={{ padding: '12px 0', textAlign: 'right', fontWeight: 'bold', verticalAlign: 'top', color: '#0F7A6E' }}>{Number(zonal.DNI).toFixed(2)}<br/><span style={{ fontSize: '10px', color: '#888', fontWeight: 'normal' }}>kWh/m²</span></td>
                <td style={{ padding: '12px 10px', textAlign: 'right', verticalAlign: 'top', fontSize: '11px', color: '#555' }}>High: &gt;2000<br/>Mod: 1500-2000<br/>Low: &lt;1500</td>
              </tr>
            )}
            {zonal.DIF !== undefined && (
              <tr style={{ borderBottom: '1px solid #ddd' }}>
                <td style={{ padding: '12px 0' }}>
                  <strong style={{ color: '#0A2342', display: 'block', marginBottom: '4px' }}>Diffuse Horizontal Irradiation (DIF)</strong>
                  <span style={{ color: '#666', fontSize: '11px' }}>The component of solar radiation received by a horizontal surface that has been scattered by the atmosphere. Important for estimating yields on cloudy days or in regions with high atmospheric scattering.</span>
                </td>
                <td style={{ padding: '12px 0', textAlign: 'right', fontWeight: 'bold', verticalAlign: 'top', color: '#0F7A6E' }}>{Number(zonal.DIF).toFixed(2)}<br/><span style={{ fontSize: '10px', color: '#888', fontWeight: 'normal' }}>kWh/m²</span></td>
                <td style={{ padding: '12px 10px', textAlign: 'right', verticalAlign: 'top', fontSize: '11px', color: '#555' }}>Avg: 600-800</td>
              </tr>
            )}
            {zonal.GTI !== undefined && (
              <tr style={{ borderBottom: '1px solid #ddd' }}>
                <td style={{ padding: '12px 0' }}>
                  <strong style={{ color: '#0A2342', display: 'block', marginBottom: '4px' }}>Global Tilted Irradiation (GTI)</strong>
                  <span style={{ color: '#666', fontSize: '11px' }}>The total solar radiation received by a surface with a defined tilt and azimuth (usually the optimum tilt). This provides the most accurate estimation of the energy hitting the solar panels.</span>
                </td>
                <td style={{ padding: '12px 0', textAlign: 'right', fontWeight: 'bold', verticalAlign: 'top', color: '#0F7A6E' }}>{Number(zonal.GTI).toFixed(2)}<br/><span style={{ fontSize: '10px', color: '#888', fontWeight: 'normal' }}>kWh/m²</span></td>
                <td style={{ padding: '12px 10px', textAlign: 'right', verticalAlign: 'top', fontSize: '11px', color: '#555' }}>High: &gt;2000<br/>Mod: 1600-2000</td>
              </tr>
            )}
            {zonal.TEMP !== undefined && (
              <tr style={{ borderBottom: '1px solid #ddd' }}>
                <td style={{ padding: '12px 0' }}>
                  <strong style={{ color: '#0A2342', display: 'block', marginBottom: '4px' }}>Air Temperature (TEMP)</strong>
                  <span style={{ color: '#666', fontSize: '11px' }}>Average ambient air temperature. High temperatures can negatively impact solar panel efficiency (temperature coefficient). This value is used to derate expected yields in hot climates.</span>
                </td>
                <td style={{ padding: '12px 0', textAlign: 'right', fontWeight: 'bold', verticalAlign: 'top', color: '#0F7A6E' }}>{Number(zonal.TEMP).toFixed(1)}<br/><span style={{ fontSize: '10px', color: '#888', fontWeight: 'normal' }}>°C</span></td>
                <td style={{ padding: '12px 10px', textAlign: 'right', verticalAlign: 'top', fontSize: '11px', color: '#555' }}>Optimal: 15-25<br/>High: &gt;25</td>
              </tr>
            )}
            {zonal.OPTA !== undefined && (
              <tr style={{ borderBottom: '1px solid #ddd' }}>
                <td style={{ padding: '12px 0' }}>
                  <strong style={{ color: '#0A2342', display: 'block', marginBottom: '4px' }}>Optimum Tilt Angle (OPTA)</strong>
                  <span style={{ color: '#666', fontSize: '11px' }}>The ideal angle for fixed solar panels to maximize annual energy yield. Adhering to this angle during installation planning ensures optimal performance of rooftop and ground-mounted assets.</span>
                </td>
                <td style={{ padding: '12px 0', textAlign: 'right', fontWeight: 'bold', verticalAlign: 'top', color: '#0F7A6E' }}>{Number(zonal.OPTA).toFixed(1)}<br/><span style={{ fontSize: '10px', color: '#888', fontWeight: 'normal' }}>°</span></td>
                <td style={{ padding: '12px 10px', textAlign: 'right', verticalAlign: 'top', fontSize: '11px', color: '#555' }}>Varies by Lat</td>
              </tr>
            )}
            {zonal.TERRAIN !== undefined && (
              <tr>
                <td style={{ padding: '12px 0' }}>
                  <strong style={{ color: '#0A2342', display: 'block', marginBottom: '4px' }}>Average Elevation (TERRAIN)</strong>
                  <span style={{ color: '#666', fontSize: '11px' }}>The average height above sea level for this AOI. Elevation affects air mass and consequently the amount of solar radiation reaching the surface.</span>
                </td>
                <td style={{ padding: '12px 0', textAlign: 'right', fontWeight: 'bold', verticalAlign: 'top', color: '#0F7A6E' }}>{Number(zonal.TERRAIN).toFixed(0)}<br/><span style={{ fontSize: '10px', color: '#888', fontWeight: 'normal' }}>m</span></td>
                <td style={{ padding: '12px 10px', textAlign: 'right', verticalAlign: 'top', fontSize: '11px', color: '#555' }}>-</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
});

export default HiddenReportCharts;

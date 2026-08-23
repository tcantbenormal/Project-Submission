import React, { useState, useRef } from 'react';
import domtoimage from 'dom-to-image-more';
import { formatNumber, formatArea, wattsToKW } from '../../utils/calculations';
import { generateReport } from '../../utils/pdfGenerator';
import ReportTemplate from '../Charts/ReportTemplate';
import './StatsPanel.css';

const StatsPanel = ({ stats, type, selectedCityNames, mapRef }) => {
  const [exporting, setExporting] = useState(false);
  const [mapDataUrl, setMapDataUrl] = useState(null);
  const chartsRef = useRef(null);

  if (!stats) {
    return <div className="stats-no-data">No data available</div>;
  }

  const capacityKW = stats.total_installed_capacity_kw || wattsToKW(stats.solarpv_capacity_w || 0);
  const totalSolarSystems = stats.total_solar_systems || 0;
  const totalPanels = stats.total_panels || stats.solarpv_panels || 0;
  const totalSolarArea = stats.total_solar_area_sqm || stats.total_solarpv_area_sqm || 0;
  const totalBuildings = stats.total_buildings || 0;
  const penetration = totalBuildings > 0 ? (totalSolarSystems / totalBuildings) * 100 : 0;
  const avgCapacity = totalSolarSystems > 0 ? capacityKW / totalSolarSystems : 0;

  const handleExport = async () => {
    setExporting(true);
    try {
      if (mapRef?.current?.prepareForScreenshot) {
        await mapRef.current.prepareForScreenshot(type);
      }
      const mapElement = mapRef?.current?.getMapElement?.();
      
      if (mapElement) {
        const url = await domtoimage.toJpeg(mapElement, {
          quality: 0.95,
          bgcolor: '#f9f9f9',
          width: 1388,
          height: 1120,
          style: {
            transform: 'none',
            transformOrigin: 'unset'
          }
        });
        setMapDataUrl(url);
        
        // Wait for React to render the image in GSAReportTemplate
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      await generateReport({
        title: type === 'aoi' ? 'AOI Summary Report' : 'Selection Summary Report',
        stats,
        type,
        selectedCities: selectedCityNames,
        chartsElement: chartsRef.current,
      });
    } catch (err) {
      console.error('Export failed:', err);
      alert('Failed to generate report. Please try again.');
    } finally {
      if (mapRef?.current?.resetAfterScreenshot) {
        mapRef.current.resetAfterScreenshot();
      }
      setExporting(false);
    }
  };

  const locationData = {
    title: selectedCityNames && selectedCityNames.length > 0 ? selectedCityNames.join(', ') : 'Pakistan AOI',
    coordinates: type === 'selection' ? 'Custom Selection Polygon' : 'AOI Boundary Polygon',
    subtitle: 'HeraldX Solar Assessment Region',
    lat: mapRef?.current?.getMap?.()?.getCenter?.()?.lat || 33.598035,
    lng: mapRef?.current?.getMap?.()?.getCenter?.()?.lng || 73.039169,
  };

  return (
    <div className="stats-panel">
      {/* Stats Cards Grid */}
      <div className="stats-grid">
        <div className="stats-card highlight">
          <div className="stats-card-label">Installed Capacity</div>
          <div className="stats-card-value amber">
            {formatNumber(capacityKW, 2)}
            <span className="stats-card-unit">kW</span>
          </div>
        </div>

        <div className="stats-card">
          <div className="stats-card-label">Total Solar Systems</div>
          <div className="stats-card-value teal">
            {formatNumber(totalSolarSystems)}
          </div>
        </div>

        <div className="stats-card">
          <div className="stats-card-label">Buildings</div>
          <div className="stats-card-value">
            {formatNumber(totalBuildings)}
          </div>
        </div>

        <div className="stats-card">
          <div className="stats-card-label">Penetration</div>
          <div className="stats-card-value">
            {formatNumber(penetration, 1)}
            <span className="stats-card-unit">%</span>
          </div>
        </div>

        <div className="stats-card">
          <div className="stats-card-label">Solar PV Area</div>
          <div className="stats-card-value teal">
            {formatNumber(totalSolarArea, 1)}
            <span className="stats-card-unit">sqm</span>
          </div>
        </div>

        <div className="stats-card">
          <div className="stats-card-label">Rooftop Area</div>
          <div className="stats-card-value">
            {formatNumber(stats.total_rooftop_area_sqm || 0, 1)}
            <span className="stats-card-unit">sqm</span>
          </div>
        </div>
      </div>

      {/* Detailed Table */}
      <table className="stats-table">
        <thead>
          <tr>
            <th>Metric</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Installed Capacity</td>
            <td>{formatNumber(capacityKW, 2)} kW</td>
          </tr>
          <tr>
            <td>Total Solar PV Area</td>
            <td>{formatArea(totalSolarArea)}</td>
          </tr>
          <tr>
            <td>Total Rooftop Area</td>
            <td>{formatArea(stats.total_rooftop_area_sqm || 0)}</td>
          </tr>
          {type === 'aoi' && stats.total_aoi_area_sqm > 0 && (
            <tr>
              <td>Total AOI Area</td>
              <td>{formatArea(stats.total_aoi_area_sqm)}</td>
            </tr>
          )}
          <tr>
            <td>No. of Panels</td>
            <td>{formatNumber(totalPanels)}</td>
          </tr>
          <tr>
            <td>Total Buildings</td>
            <td>{formatNumber(totalBuildings)}</td>
          </tr>
          <tr>
            <td>Solar Systems</td>
            <td>{formatNumber(totalSolarSystems)}</td>
          </tr>
          <tr>
            <td>Avg Solar System Capacity</td>
            <td>{formatNumber(avgCapacity, 2)} kW</td>
          </tr>
        </tbody>
      </table>

      {/* Zonal Stats Table */}
      {stats.zonal && (
        <div style={{ marginTop: '16px' }}>
          <div className="stats-card-label" style={{ marginBottom: '8px' }}>GSA Raster Statistics</div>
          <table className="stats-table">
            <tbody>
              {stats.zonal.PVOUT !== undefined && (
                <tr>
                  <td>PVOUT (Specific Yield)</td>
                  <td>{formatNumber(stats.zonal.PVOUT, 2)} kWh/kWp</td>
                </tr>
              )}
              {stats.zonal.GHI !== undefined && (
                <tr>
                  <td>GHI (Global Horizontal)</td>
                  <td>{formatNumber(stats.zonal.GHI, 2)} kWh/m²</td>
                </tr>
              )}
              {stats.zonal.DNI !== undefined && (
                <tr>
                  <td>DNI (Direct Normal)</td>
                  <td>{formatNumber(stats.zonal.DNI, 2)} kWh/m²</td>
                </tr>
              )}
              {stats.zonal.DIF !== undefined && (
                <tr>
                  <td>DIF (Diffuse Horizontal)</td>
                  <td>{formatNumber(stats.zonal.DIF, 2)} kWh/m²</td>
                </tr>
              )}
              {stats.zonal.GTI !== undefined && (
                <tr>
                  <td>GTI (Global Tilted)</td>
                  <td>{formatNumber(stats.zonal.GTI, 2)} kWh/m²</td>
                </tr>
              )}
              {stats.zonal.OPTA !== undefined && (
                <tr>
                  <td>Optimum Tilt</td>
                  <td>{formatNumber(stats.zonal.OPTA, 1)}°</td>
                </tr>
              )}
              {stats.zonal.TEMP !== undefined && (
                <tr>
                  <td>Air Temperature</td>
                  <td>{formatNumber(stats.zonal.TEMP, 1)} °C</td>
                </tr>
              )}
              {stats.zonal.TERRAIN !== undefined && (
                <tr>
                  <td>Elevation</td>
                  <td>{formatNumber(stats.zonal.TERRAIN, 0)} m</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Export Button */}
      <button
        id={`export-${type}-btn`}
        className="stats-export-btn"
        onClick={handleExport}
        disabled={exporting}
      >
        {exporting ? (
          <>
            <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
            Generating Report...
          </>
        ) : (
          <>
            📄 Download PDF Report
          </>
        )}
      </button>

      {/* Hidden PDF Template */}
      <ReportTemplate 
        ref={chartsRef} 
        stats={stats} 
        locationData={locationData}
        mapDataUrl={mapDataUrl}
      />
    </div>
  );
};

export default StatsPanel;

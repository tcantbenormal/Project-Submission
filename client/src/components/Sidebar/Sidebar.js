import React, { useState } from 'react';
import FilterPanel from '../FilterPanel/FilterPanel';
import StatsPanel from '../StatsPanel/StatsPanel';
import { ReactComponent as AOIFilterIcon } from '../../assets/AOI Filter.svg';
import { ReactComponent as LayersIcon } from '../../assets/Layers.svg';
import { ReactComponent as ReportIcon } from '../../assets/Report.svg';
import { ReactComponent as SelectionIcon } from '../../assets/Selection.svg';
import './Sidebar.css';

const Sidebar = ({
  collapsed,
  cities,
  selectedCityIds,
  onFilterApply,
  aoiStats,
  selectionStats,
  selectedCityNames,
  mapRef,
  layerVisibility,
  setLayerVisibility,
  layerOpacity,
  setLayerOpacity,
  showLabels,
  setShowLabels,
}) => {
  const [sections, setSections] = useState({
    filters: true,
    layers: true,
    aoiStats: true,
    selectionStats: true,
  });

  const toggleSection = (key) => {
    setSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleLayerToggle = (layerKey) => {
    setLayerVisibility((prev) => ({
      ...prev,
      [layerKey]: !prev[layerKey],
    }));
  };

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-scroll">
        {/* ── AOI Filter Section ── */}
        <div className="sidebar-section">
          <div
            className="sidebar-section-header"
            onClick={() => toggleSection('filters')}
          >
            <h3>
              <span className="section-icon"><AOIFilterIcon width="20" height="20" /></span>
              AOI Filter
            </h3>
            <span className={`section-toggle ${sections.filters ? 'expanded' : ''}`}>▼</span>
          </div>
          <div className={`sidebar-section-body ${!sections.filters ? 'collapsed' : ''}`}>
            <FilterPanel
              cities={cities}
              selectedCityIds={selectedCityIds}
              onApply={onFilterApply}
            />
          </div>
        </div>

        {/* ── Layer Controls ── */}
        <div className="sidebar-section">
          <div
            className="sidebar-section-header"
            onClick={() => toggleSection('layers')}
          >
            <h3>
              <span className="section-icon"><LayersIcon width="20" height="20" /></span>
              Layers
            </h3>
            <span className={`section-toggle ${sections.layers ? 'expanded' : ''}`}>▼</span>
          </div>
          <div className={`sidebar-section-body ${!sections.layers ? 'collapsed' : ''}`}>
            <div className="layer-toggles">
              <label className="layer-toggle">
                <input
                  type="checkbox"
                  checked={layerVisibility.boundaries}
                  onChange={() => handleLayerToggle('boundaries')}
                />
                <span className="layer-color-dot" style={{ background: '#0F7A6E' }} />
                <span>AOI Boundaries</span>
              </label>
              <div>
                <label className="layer-toggle">
                  <input
                    type="checkbox"
                    checked={layerVisibility.buildings}
                    onChange={() => handleLayerToggle('buildings')}
                  />
                  <span className="layer-color-dot" style={{ background: '#0A2342' }} />
                  <span>Rooftops / Buildings</span>
                </label>
                {layerVisibility.buildings && layerOpacity && (
                  <div style={{ display: 'flex', alignItems: 'center', padding: '0 var(--space-md) var(--space-sm) 40px', gap: '8px' }}>
                    <span style={{ fontSize: '11px', color: '#666' }}>Opacity: {Math.round(layerOpacity.buildings * 100)}%</span>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={layerOpacity.buildings}
                      onChange={(e) => setLayerOpacity({ ...layerOpacity, buildings: parseFloat(e.target.value) })}
                      style={{ flex: 1, accentColor: '#0A2342' }}
                    />
                  </div>
                )}
              </div>
              <div>
                <label className="layer-toggle">
                  <input
                    type="checkbox"
                    checked={layerVisibility.solarPV}
                    onChange={() => handleLayerToggle('solarPV')}
                  />
                  <span className="layer-color-dot" style={{ background: '#F5A623' }} />
                  <span>Solar PV Panels</span>
                </label>
                {layerVisibility.solarPV && layerOpacity && (
                  <div style={{ display: 'flex', alignItems: 'center', padding: '0 var(--space-md) var(--space-sm) 40px', gap: '8px' }}>
                    <span style={{ fontSize: '11px', color: '#666' }}>Opacity: {Math.round(layerOpacity.solarPV * 100)}%</span>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={layerOpacity.solarPV}
                      onChange={(e) => setLayerOpacity({ ...layerOpacity, solarPV: parseFloat(e.target.value) })}
                      style={{ flex: 1, accentColor: '#F5A623' }}
                    />
                  </div>
                )}
              </div>
              <label className="layer-toggle" style={{ borderTop: '1px solid var(--cool-grey)', paddingTop: '10px', marginTop: '4px' }}>
                <input
                  type="checkbox"
                  checked={showLabels}
                  onChange={() => setShowLabels(!showLabels)}
                />
                <span className="layer-color-dot" style={{ background: '#4BA3C3' }} />
                <span>Google Labels</span>
              </label>
            </div>
          </div>
        </div>

        {/* ── AOI Summary Stats ── */}
        <div className="sidebar-section">
          <div
            className="sidebar-section-header"
            onClick={() => toggleSection('aoiStats')}
          >
            <h3>
              <span className="section-icon"><ReportIcon width="20" height="20" /></span>
              AOI Summary
            </h3>
            <span className={`section-toggle ${sections.aoiStats ? 'expanded' : ''}`}>▼</span>
          </div>
          <div className={`sidebar-section-body ${!sections.aoiStats ? 'collapsed' : ''}`}>
            <StatsPanel
              stats={aoiStats}
              type="aoi"
              selectedCityNames={selectedCityNames}
              mapRef={mapRef}
            />
          </div>
        </div>

        {/* ── Selection Summary Stats ── */}
        <div className="sidebar-section">
          <div
            className="sidebar-section-header"
            onClick={() => toggleSection('selectionStats')}
          >
            <h3>
              <span className="section-icon"><SelectionIcon width="20" height="20" /></span>
              Selection Summary
            </h3>
            <span className={`section-toggle ${sections.selectionStats ? 'expanded' : ''}`}>▼</span>
          </div>
          <div className={`sidebar-section-body ${!sections.selectionStats ? 'collapsed' : ''}`}>
            {selectionStats ? (
              <StatsPanel
                stats={selectionStats}
                type="selection"
                selectedCityNames={selectedCityNames}
                mapRef={mapRef}
              />
            ) : (
              <div style={{
                textAlign: 'center',
                padding: 'var(--space-lg)',
                color: 'var(--deep-navy-mid)',
                fontSize: 'var(--font-size-sm)',
                opacity: 0.6,
              }}>
                <p style={{ fontSize: '24px', marginBottom: '8px' }}>🖱️</p>
                <p>Click a feature or drag to select multiple rooftops on the map</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;

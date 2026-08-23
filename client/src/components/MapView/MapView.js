import React, { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw';
import 'leaflet-draw/dist/leaflet.draw.css';
import { spatialSelect } from '../../services/statsService';
import { formatNumber, formatArea, wattsToKW } from '../../utils/calculations';
import './MapView.css';
import solarPanelIcon from '../../assets/solar-panel-svgrepo-com.svg';

const MapView = forwardRef(({
  boundaries,
  buildings,
  solarPV,
  extent,
  layerVisibility,
  layerOpacity,
  showLabels,
  onSelectionStats,
  selectedCityIds,
  loadingLayers,
}, ref) => {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layersRef = useRef({
    boundaries: null,
    buildings: null,
    solarPV: null,
    satellite: null,
    labels: null,
    selectionRect: null,
    selectedHighlight: null,
    pvoutGroup: null,
    screenshotControls: [], // Track temporary controls for reports
  });
  const drawControlRef = useRef(null);

  // Track latest opacities for hover states
  const opacityRef = useRef(layerOpacity);
  useEffect(() => {
    opacityRef.current = layerOpacity;
  }, [layerOpacity]);

  // Dynamically update building opacity without recreating layer
  useEffect(() => {
    if (layersRef.current.buildings && layerOpacity?.buildings !== undefined) {
      layersRef.current.buildings.setStyle({ fillOpacity: layerOpacity.buildings });
    }
  }, [layerOpacity?.buildings]);

  // Dynamically update solar PV opacity without recreating layer
  useEffect(() => {
    if (layersRef.current.solarPV && layerOpacity?.solarPV !== undefined) {
      layersRef.current.solarPV.setStyle({ fillOpacity: layerOpacity.solarPV });
    }
  }, [layerOpacity?.solarPV]);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Expose map element for PDF screenshot
  useImperativeHandle(ref, () => ({
    getMapElement: () => mapContainerRef.current,
    getMap: () => mapInstanceRef.current,
    prepareForScreenshot: async (type) => {
      const map = mapInstanceRef.current;
      if (!map) return;

      const container = mapContainerRef.current;
      const originalWidth = container.offsetWidth;
      const originalHeight = container.offsetHeight;

      layersRef.current.originalMapStyle = {
        position: container.style.position,
        width: container.style.width,
        height: container.style.height,
        left: container.style.left,
        top: container.style.top,
        zIndex: container.style.zIndex,
        transform: container.style.transform,
        transformOrigin: container.style.transformOrigin,
      };

      if (window.getComputedStyle(container.parentElement).position === 'static') {
        container.parentElement.style.position = 'relative';
      }
      layersRef.current.originalParentOverflow = container.parentElement.style.overflow;
      container.parentElement.style.overflow = 'hidden';

      const targetWidth = 1388;
      const targetHeight = 1120;
      const scale = Math.max(originalWidth / targetWidth, originalHeight / targetHeight);

      // Enlarge map but scale it down via CSS so it visibly stays in the same place
      container.style.position = 'absolute';
      container.style.top = '0';
      container.style.left = '0';
      container.style.width = targetWidth + 'px';
      container.style.height = targetHeight + 'px';
      container.style.transformOrigin = 'top left';
      container.style.transform = `scale(${scale})`;
      container.style.zIndex = '0';

      map.invalidateSize();
      
      // Close popups
      map.closePopup();

      // Adjust Opacities
      if (layersRef.current.buildings) {
        layersRef.current.buildings.setStyle({ fillOpacity: 0.75 });
      }
      if (layersRef.current.solarPV) {
        layersRef.current.solarPV.setStyle({ fillOpacity: 0.8 });
      }

      // Hide Zoom, Draw & Layer controls
      document.querySelectorAll('.leaflet-control-zoom, .leaflet-draw-toolbar, .leaflet-control-layers').forEach(el => el.style.display = 'none');

      // Add temporary North Arrow
      const NorthArrowControl = L.Control.extend({
        onAdd: function() {
          const img = L.DomUtil.create('img');
          img.src = '/north-arrow.png';
          img.style.width = '40px';
          img.style.height = '40px';
          img.style.margin = '10px';
          img.style.filter = 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))';
          return img;
        }
      });
      const northArrow = new NorthArrowControl({ position: 'topright' });
      northArrow.addTo(map);

      // Add temporary Legend
      const LegendControl = L.Control.extend({
        onAdd: function() {
          const div = L.DomUtil.create('div', 'info legend');
          div.style.background = 'rgba(255, 255, 255, 0.9)';
          div.style.padding = '14px';
          div.style.borderRadius = '6px';
          div.style.boxShadow = '0 1px 5px rgba(0,0,0,0.4)';
          div.style.fontSize = '14px';
          div.style.color = '#0A2342';
          div.style.fontFamily = 'Inter, sans-serif';
          div.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 8px; font-size: 16px;">Legend</div>
            <div style="display: flex; align-items: center; margin-bottom: 6px;">
              <div style="width: 18px; height: 18px; background: #0A2342; opacity: 0.75; margin-right: 10px;"></div> Rooftops
            </div>
            <div style="display: flex; align-items: center;">
              <div style="width: 18px; height: 18px; background: #F5A623; opacity: 0.8; margin-right: 10px;"></div> Solar PV Panels
            </div>
          `;
          return div;
        }
      });
      const legend = new LegendControl({ position: 'bottomright' });
      legend.addTo(map);

      layersRef.current.screenshotControls = [northArrow, legend];

      // Zoom to correct extent
      if (type === 'selection' && layersRef.current.selectedHighlight) {
        map.fitBounds(layersRef.current.selectedHighlight.getBounds(), { padding: [10, 10], animate: false });
      } else if (extent) {
        map.fitBounds(extent, { padding: [10, 10], animate: false });
      } else if (layersRef.current.boundaries) {
        map.fitBounds(layersRef.current.boundaries.getBounds(), { padding: [10, 10], animate: false });
      }
      
      // Wait for tiles to load
      await new Promise(resolve => setTimeout(resolve, 1000));
    },
    resetAfterScreenshot: () => {
      const map = mapInstanceRef.current;
      if (!map) return;

      const container = mapContainerRef.current;
      const original = layersRef.current.originalMapStyle;
      if (original) {
        container.style.position = original.position;
        container.style.width = original.width;
        container.style.height = original.height;
        container.style.left = original.left;
        container.style.top = original.top;
        container.style.zIndex = original.zIndex;
        container.style.transform = original.transform;
        container.style.transformOrigin = original.transformOrigin;
      }
      if (layersRef.current.originalParentOverflow !== undefined) {
        container.parentElement.style.overflow = layersRef.current.originalParentOverflow;
      }
      map.invalidateSize();

      // Remove temporary controls
      layersRef.current.screenshotControls.forEach(control => map.removeControl(control));
      layersRef.current.screenshotControls = [];

      // Restore UI controls
      document.querySelectorAll('.leaflet-control-zoom, .leaflet-draw-toolbar, .leaflet-control-layers').forEach(el => el.style.display = '');

      // Restore opacities
      if (layersRef.current.buildings) {
        layersRef.current.buildings.setStyle({ fillOpacity: layerOpacity?.buildings ?? 0.75 });
      }
      if (layersRef.current.solarPV) {
        layersRef.current.solarPV.setStyle({ fillOpacity: layerOpacity?.solarPV ?? 0.8 });
      }
    }
  }));

  // Initialize map
  useEffect(() => {
    if (mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [30.3753, 69.3451], // Pakistan center
      zoom: 5,
      zoomControl: false,
      attributionControl: false,
      preferCanvas: true, // Forces Leaflet to render GeoJSON on canvas (fixes html2canvas ignoring SVG paths)
    });

    // Create custom panes for specific z-index ordering
    map.createPane('labelsPane');
    map.getPane('labelsPane').style.zIndex = 250;
    map.getPane('labelsPane').style.pointerEvents = 'none'; // Allow clicks to pass through to features

    map.createPane('boundariesPane');
    map.getPane('boundariesPane').style.zIndex = 410;

    map.createPane('pvoutPane');
    map.getPane('pvoutPane').style.zIndex = 415;

    map.createPane('buildingsPane');
    map.getPane('buildingsPane').style.zIndex = 420;

    map.createPane('solarPVPane');
    map.getPane('solarPVPane').style.zIndex = 430;
    map.getPane('solarPVPane').style.pointerEvents = 'none';

    // Add zoom control to top-right
    L.control.zoom({ position: 'topright' }).addTo(map);

    const esriBasemap = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 19 }
    );

    const googleBasemap = L.tileLayer(
      'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
      { maxZoom: 22, subdomains: ['mt0', 'mt1', 'mt2', 'mt3'] }
    );

    // Set default basemap
    googleBasemap.addTo(map);
    layersRef.current.satellite = googleBasemap;

    const baseMaps = {
      "ESRI World Imagery (Nadir)": esriBasemap,
      "Google Satellite (Oblique)": googleBasemap
    };
    
    L.control.layers(baseMaps, null, { position: 'bottomright' }).addTo(map);

    // Add draw control for rectangle selection
    const drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);

    const drawControl = new L.Control.Draw({
      position: 'topright',
      draw: {
        polygon: false,
        polyline: false,
        circle: false,
        circlemarker: false,
        marker: false,
        rectangle: {
          shapeOptions: {
            color: '#1BA098',
            weight: 2,
            fillColor: '#1BA098',
            fillOpacity: 0.15,
            dashArray: '5, 5',
          },
        },
      },
      edit: {
        featureGroup: drawnItems,
        remove: true,
        edit: false,
      },
    });
    map.addControl(drawControl);
    drawControlRef.current = drawControl;

    // Handle rectangle draw
    map.on(L.Draw.Event.CREATED, async (e) => {
      // Remove previous selection rectangle
      drawnItems.clearLayers();
      if (layersRef.current.selectedHighlight) {
        map.removeLayer(layersRef.current.selectedHighlight);
      }

      const layer = e.layer;
      drawnItems.addLayer(layer);

      // Get bounds as GeoJSON polygon
      const bounds = layer.getBounds();
      const polygon = {
        type: 'Polygon',
        coordinates: [[
          [bounds.getWest(), bounds.getSouth()],
          [bounds.getEast(), bounds.getSouth()],
          [bounds.getEast(), bounds.getNorth()],
          [bounds.getWest(), bounds.getNorth()],
          [bounds.getWest(), bounds.getSouth()],
        ]],
      };

      try {
        const [result, zonalStats] = await Promise.all([
          spatialSelect(polygon, selectedCityIds),
          import('../../services/statsService').then(m => m.fetchZonalStats(polygon, selectedCityIds)).catch(e => {
            console.error('Failed to fetch zonal stats:', e);
            return null;
          })
        ]);

        // Highlight selected features
        const highlightGroup = L.featureGroup();

        if (result.selected_buildings && result.selected_buildings.length > 0) {
          // Highlight buildings in the current buildings layer
          if (layersRef.current.buildings) {
            layersRef.current.buildings.eachLayer((lyr) => {
              const id = lyr.feature?.properties?.id;
              if (result.selected_buildings.includes(id)) {
                const highlight = L.geoJSON(lyr.toGeoJSON(), {
                  style: {
                    color: '#1BA098',
                    weight: 3,
                    fillColor: '#1BA098',
                    fillOpacity: 0.5,
                  },
                });
                highlightGroup.addLayer(highlight);
              }
            });
          }
        }

        if (highlightGroup.getLayers().length > 0) {
          highlightGroup.addTo(map);
          layersRef.current.selectedHighlight = highlightGroup;
        }

        // Merge zonal stats if available
        if (zonalStats) {
          result.summary.zonal = zonalStats;
        }

        // Update selection stats
        onSelectionStats(result.summary, {
          buildings: result.selected_buildings || [],
          solar: result.selected_solar || [],
        });
      } catch (err) {
        console.error('Spatial selection failed:', err);
      }
    });

    // Clear selection on draw delete
    map.on(L.Draw.Event.DELETED, () => {
      if (layersRef.current.selectedHighlight) {
        map.removeLayer(layersRef.current.selectedHighlight);
        layersRef.current.selectedHighlight = null;
      }
      onSelectionStats(null, null);
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update labels layer
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (showLabels) {
      if (!layersRef.current.labels) {
        const labels = L.tileLayer(
          'https://mt1.google.com/vt/lyrs=h&x={x}&y={y}&z={z}',
          { maxZoom: 22, pane: 'labelsPane' }
        ).addTo(map);
        layersRef.current.labels = labels;
      }
    } else {
      if (layersRef.current.labels) {
        map.removeLayer(layersRef.current.labels);
        layersRef.current.labels = null;
      }
    }
  }, [showLabels]);

  // Update boundaries layer
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Remove old layer
    if (layersRef.current.boundaries) {
      map.removeLayer(layersRef.current.boundaries);
      layersRef.current.boundaries = null;
    }

    if (boundaries && layerVisibility.boundaries) {
      const layer = L.geoJSON(boundaries, {
        pane: 'boundariesPane',
        style: {
          color: '#0F7A6E',
          weight: 2.5,
          fillColor: '#0F7A6E',
          fillOpacity: 0.05,
          dashArray: '8, 4',
        },
        onEachFeature: (feature, lyr) => {
          const props = feature.properties;
          lyr.bindPopup(`
            <div style="font-family: Inter, sans-serif; padding: 12px; min-width: 200px;">
              <div style="background: #0A2342; color: #fff; padding: 8px 12px; margin: -12px -12px 12px; border-radius: 12px 12px 0 0;">
                <strong style="font-size: 13px;">${props.city_name || 'AOI'} Boundary</strong>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #E5E5E5;">
                <span style="color: #2E4057; font-size: 12px;">Boundary Area</span>
                <strong style="color: #0F7A6E; font-size: 12px;">${formatArea(props.boundary_area_sqm)}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 4px 0;">
                <span style="color: #2E4057; font-size: 12px;">Province</span>
                <strong style="color: #0F7A6E; font-size: 12px;">${props.province || 'N/A'}</strong>
              </div>
            </div>
          `, { maxWidth: 300, className: 'hx-popup' });
        },
      }).addTo(map);
      layersRef.current.boundaries = layer;
    }
  }, [boundaries, layerVisibility.boundaries]);

  // Update buildings layer
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (layersRef.current.buildings) {
      map.removeLayer(layersRef.current.buildings);
      layersRef.current.buildings = null;
    }

    if (buildings && layerVisibility.buildings) {
      const layer = L.geoJSON(buildings, {
        pane: 'buildingsPane',
        style: {
          color: '#0A2342',
          weight: 1,
          fillColor: '#2E4057',
          fillOpacity: opacityRef.current?.buildings ?? 0.75,
        },
        onEachFeature: (feature, lyr) => {
          const props = feature.properties;
          // Calculate stats for popup
          const solarpv_area = parseFloat(props.solarpv_area_sqm || 0);
          const no_of_panels = Math.floor(solarpv_area / 2.58);
          const capacity_w = no_of_panels * 580;
          const capacity_kw = capacity_w / 1000;

          lyr.bindPopup(`
            <div style="font-family: Inter, sans-serif; padding: 12px; min-width: 220px;">
              <div style="background: linear-gradient(135deg, #0A2342, #2E4057); color: #fff; padding: 10px 12px; margin: -12px -12px 12px; border-radius: 12px 12px 0 0;">
                <strong style="font-size: 13px; display: flex; align-items: center;"><img src="${solarPanelIcon}" style="width: 16px; height: 16px; margin-right: 6px;" alt="Solar Panel" /> Installed Solar System</strong>
                <div style="font-size: 10px; opacity: 0.7; margin-top: 2px;">${props.city_name || ''} • FID: ${props.fid}</div>
              </div>
              <div style="display: flex; flex-direction: column; gap: 6px;">
                <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #E5E5E5;">
                  <span style="color: #2E4057; font-size: 12px;">Solar System Area</span>
                  <strong style="color: #F5A623; font-size: 12px;">${formatNumber(solarpv_area, 2)} sqm</strong>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #E5E5E5;">
                  <span style="color: #2E4057; font-size: 12px;">Rooftop Area</span>
                  <strong style="color: #0F7A6E; font-size: 12px;">${formatNumber(props.rooftop_area_sqm, 2)} sqm</strong>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #E5E5E5;">
                  <span style="color: #2E4057; font-size: 12px;">No. of Panels</span>
                  <strong style="color: #0A2342; font-size: 12px;">${formatNumber(no_of_panels)}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 4px 0;">
                  <span style="color: #2E4057; font-size: 12px;">Solar System Capacity</span>
                  <strong style="color: #0F7A6E; font-size: 12px;">${formatNumber(capacity_kw, 2)} kW</strong>
                </div>
              </div>
            </div>
          `, { maxWidth: 320, className: 'hx-popup' });

          // Hover effect
          lyr.on('mouseover', function () {
            this.setStyle({ fillOpacity: 0.9, weight: 2, color: '#1BA098' });
          });
          lyr.on('mouseout', function () {
            this.setStyle({ fillOpacity: opacityRef.current?.buildings ?? 0.75, weight: 1, color: '#0A2342' });
          });
        },
      }).addTo(map);
      layersRef.current.buildings = layer;
    }
  }, [buildings, layerVisibility.buildings]);

  // Update solar PV layer
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (layersRef.current.solarPV) {
      map.removeLayer(layersRef.current.solarPV);
      layersRef.current.solarPV = null;
    }

    if (solarPV && layerVisibility.solarPV) {
      const layer = L.geoJSON(solarPV, {
        pane: 'solarPVPane',
        style: {
          color: '#F5A623',
          weight: 1.5,
          fillColor: '#F5A623',
          fillOpacity: opacityRef.current?.solarPV ?? 0.8,
        },
        interactive: false,
      }).addTo(map);
      layersRef.current.solarPV = layer;
    }
  }, [solarPV, layerVisibility.solarPV]);

  // Fly to extent
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !extent) return;

    map.flyToBounds(extent, {
      padding: [40, 40],
      duration: 1.2,
      maxZoom: 17,
    });
  }, [extent]);

  // Address search
  const handleSearch = useCallback(async (query) => {
    setSearchQuery(query);
    if (query.length < 3) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=pk&limit=5`
      );
      const data = await response.json();
      setSearchResults(data);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleSearchSelect = (result) => {
    const map = mapInstanceRef.current;
    if (!map) return;

    map.flyTo([parseFloat(result.lat), parseFloat(result.lon)], 16, { duration: 1 });
    setSearchResults([]);
    setSearchQuery(result.display_name.split(',')[0]);
  };

  return (
    <div className="map-container">
      {/* Search Bar */}
      <div className="map-search-bar">
        <div className="map-search-input-wrapper">
          <span className="map-search-icon">🔍</span>
          <input
            id="map-search-input"
            type="text"
            className="map-search-input"
            placeholder="Search address in Pakistan..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
        {searchResults.length > 0 && (
          <div className="map-search-results">
            {searchResults.map((result, idx) => (
              <div
                key={idx}
                className="map-search-result-item"
                onClick={() => handleSearchSelect(result)}
              >
                📍 {result.display_name}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Loading indicator */}
      {loadingLayers && (
        <div className="map-loading-overlay">
          <div className="spinner" />
          <span>Loading layers...</span>
        </div>
      )}

      {/* Selection hint */}
      <div className="map-selection-hint">
        <span className="hint-icon">📐</span>
        <span>Use the rectangle tool (top-right) to select features</span>
      </div>

      {/* Map */}
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
});

MapView.displayName = 'MapView';

export default MapView;

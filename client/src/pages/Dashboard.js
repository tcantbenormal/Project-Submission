import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar/Sidebar';
import MapView from '../components/MapView/MapView';
import { fetchCities, fetchBoundaries, fetchBuildings, fetchSolarPV, fetchExtent } from '../services/geodataService';
import { fetchSummary } from '../services/statsService';
import './Dashboard.css';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const mapRef = useRef(null);

  // Sidebar state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Data state
  const [cities, setCities] = useState([]);
  const [selectedCityIds, setSelectedCityIds] = useState([]);
  const [boundaries, setBoundaries] = useState(null);
  const [buildings, setBuildings] = useState(null);
  const [solarPV, setSolarPV] = useState(null);
  const [extent, setExtent] = useState(null);

  // Stats state
  const [aoiStats, setAoiStats] = useState(null);
  const [selectionStats, setSelectionStats] = useState(null);
  const [selectedFeatures, setSelectedFeatures] = useState({ buildings: [], solar: [] });

  // Loading state
  const [loadingData, setLoadingData] = useState(true);
  const [loadingLayers, setLoadingLayers] = useState(false);

  // Layer visibility
  const [layerVisibility, setLayerVisibility] = useState({
    buildings: true,
    solarPV: true,
    boundaries: true,
  });
  const [layerOpacity, setLayerOpacity] = useState({
    buildings: 0.75,
    solarPV: 0.8,
  });
  const [showLabels, setShowLabels] = useState(false);

  // Load cities on mount
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const citiesData = await fetchCities();
        setCities(citiesData);

        // Load all data by default (country extent)
        const allCityIds = citiesData.map((c) => c.id);
        setSelectedCityIds(allCityIds);

        const [boundariesData, buildingsData, solarData, extentData, summaryData] = await Promise.all([
          fetchBoundaries(allCityIds),
          fetchBuildings(allCityIds),
          fetchSolarPV(allCityIds),
          fetchExtent(allCityIds),
          fetchSummary(allCityIds),
        ]);

        setBoundaries(boundariesData);
        setBuildings(buildingsData);
        setSolarPV(solarData);
        setExtent(extentData.bbox);
        setAoiStats(summaryData);
      } catch (err) {
        console.error('Failed to load initial data:', err);
      } finally {
        setLoadingData(false);
      }
    };

    loadInitialData();
  }, []);

  // Handle filter apply
  const handleFilterApply = useCallback(async (cityIds) => {
    setLoadingLayers(true);
    try {
      setSelectedCityIds(cityIds);

      const [boundariesData, buildingsData, solarData, extentData, summaryData] = await Promise.all([
        fetchBoundaries(cityIds),
        fetchBuildings(cityIds),
        fetchSolarPV(cityIds),
        fetchExtent(cityIds),
        fetchSummary(cityIds),
      ]);

      setBoundaries(boundariesData);
      setBuildings(buildingsData);
      setSolarPV(solarData);
      setExtent(extentData.bbox);
      setAoiStats(summaryData);

      // Clear selection stats
      setSelectionStats(null);
      setSelectedFeatures({ buildings: [], solar: [] });
    } catch (err) {
      console.error('Failed to load data for selected cities:', err);
    } finally {
      setLoadingLayers(false);
    }
  }, []);

  // Handle selection stats update
  const handleSelectionStats = useCallback((stats, features) => {
    setSelectionStats(stats);
    setSelectedFeatures(features || { buildings: [], solar: [] });
  }, []);

  // Handle logout
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getSelectedCityNames = () => {
    return cities
      .filter(c => selectedCityIds.includes(c.id))
      .map(c => c.name);
  };

  return (
    <div className="dashboard">
      {/* ── Navbar ── */}
      <nav className="dashboard-navbar">
        <div className="navbar-brand">
          <img src="/assets/hx-logo.png" alt="HeraldX" className="navbar-logo" />
          <div className="navbar-title">
            <h1>Uncounted Solar Gigawatts</h1>
            <span>WebGIS Dashboard — HeraldX</span>
          </div>
        </div>
        <div className="navbar-actions">
          <div className="navbar-user">
            <div className="navbar-user-avatar">{getInitials(user?.name)}</div>
            <span>{user?.name}</span>
          </div>
          <button id="logout-btn" className="navbar-logout" onClick={handleLogout}>
            Sign Out
          </button>
        </div>
      </nav>

      {/* ── Main Content ── */}
      <div className="dashboard-content">
        {/* Sidebar */}
        <Sidebar
          collapsed={sidebarCollapsed}
          cities={cities}
          selectedCityIds={selectedCityIds}
          onFilterApply={handleFilterApply}
          aoiStats={aoiStats}
          selectionStats={selectionStats}
          selectedCityNames={getSelectedCityNames()}
          mapRef={mapRef}
          layerVisibility={layerVisibility}
          setLayerVisibility={setLayerVisibility}
          layerOpacity={layerOpacity}
          setLayerOpacity={setLayerOpacity}
          showLabels={showLabels}
          setShowLabels={setShowLabels}
        />

        {/* Sidebar Toggle */}
        <button
          className={`sidebar-toggle ${sidebarCollapsed ? 'collapsed' : ''}`}
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? '▶' : '◀'}
        </button>

        {/* Map */}
        <div className="dashboard-map">
          {loadingData ? (
            <div className="dashboard-loading">
              <div className="spinner" />
              <p>Loading geospatial data...</p>
            </div>
          ) : (
            <MapView
              ref={mapRef}
              boundaries={boundaries}
              buildings={buildings}
              solarPV={solarPV}
              extent={extent}
              layerVisibility={layerVisibility}
              layerOpacity={layerOpacity}
              showLabels={showLabels}
              onSelectionStats={handleSelectionStats}
              selectedCityIds={selectedCityIds}
              loadingLayers={loadingLayers}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

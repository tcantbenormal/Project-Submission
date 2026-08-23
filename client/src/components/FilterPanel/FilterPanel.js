import React, { useState, useEffect, useRef, useMemo } from 'react';
import './FilterPanel.css';

const FilterPanel = ({ cities, selectedCityIds, onApply }) => {
  // Derive provinces from cities
  const provinces = useMemo(() => {
    const provinceMap = {};
    cities.forEach((city) => {
      if (!provinceMap[city.province]) {
        provinceMap[city.province] = [];
      }
      provinceMap[city.province].push(city);
    });
    return Object.entries(provinceMap).map(([name, citiesList]) => ({
      name,
      cities: citiesList,
    }));
  }, [cities]);

  // Province selection state
  const [selectedProvinces, setSelectedProvinces] = useState([]);
  const [selectedCities, setSelectedCities] = useState([]);
  const [provinceOpen, setProvinceOpen] = useState(false);
  const [cityOpen, setCityOpen] = useState(false);

  const provinceRef = useRef(null);
  const cityRef = useRef(null);

  const initializedRef = useRef(false);

  // Initialize with all selected
  useEffect(() => {
    if (cities.length > 0 && !initializedRef.current) {
      setSelectedProvinces(provinces.map((p) => p.name));
      setSelectedCities(cities.map((c) => c.id));
      initializedRef.current = true;
    }
  }, [cities, provinces]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (provinceRef.current && !provinceRef.current.contains(e.target)) {
        setProvinceOpen(false);
      }
      if (cityRef.current && !cityRef.current.contains(e.target)) {
        setCityOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtered cities based on selected provinces
  const filteredCities = useMemo(() => {
    if (selectedProvinces.length === 0) return cities;
    return cities.filter((c) => selectedProvinces.includes(c.province));
  }, [cities, selectedProvinces]);

  // Province toggle
  const toggleProvince = (provinceName) => {
    setSelectedProvinces((prev) => {
      const next = prev.includes(provinceName)
        ? prev.filter((p) => p !== provinceName)
        : [...prev, provinceName];

      // Auto-adjust cities: add cities of newly selected province, remove cities of deselected province
      const provinceObj = provinces.find((p) => p.name === provinceName);
      if (provinceObj) {
        if (next.includes(provinceName)) {
          // Province just selected: add its cities
          setSelectedCities((prevCities) => {
            const newCityIds = provinceObj.cities.map((c) => c.id);
            return [...new Set([...prevCities, ...newCityIds])];
          });
        } else {
          // Province deselected: remove its cities
          const removeCityIds = provinceObj.cities.map((c) => c.id);
          setSelectedCities((prevCities) =>
            prevCities.filter((id) => !removeCityIds.includes(id))
          );
        }
      }

      return next;
    });
  };

  // City toggle
  const toggleCity = (cityId) => {
    setSelectedCities((prev) =>
      prev.includes(cityId)
        ? prev.filter((id) => id !== cityId)
        : [...prev, cityId]
    );
  };

  // Apply handler
  const handleApply = () => {
    const idsToApply = selectedCities.length > 0
      ? selectedCities
      : cities.map((c) => c.id);
    onApply(idsToApply);
    setProvinceOpen(false);
    setCityOpen(false);
  };

  // Reset handler
  const handleReset = () => {
    setSelectedProvinces(provinces.map((p) => p.name));
    setSelectedCities(cities.map((c) => c.id));
    onApply(cities.map((c) => c.id));
  };

  // Display text helpers
  const getProvinceText = () => {
    if (selectedProvinces.length === 0) return 'Select Province';
    if (selectedProvinces.length === provinces.length) return 'All Provinces';
    return selectedProvinces.join(', ');
  };

  const getCityText = () => {
    if (selectedCities.length === 0) return 'Select City';
    const filtered = filteredCities.filter((c) => selectedCities.includes(c.id));
    if (filtered.length === filteredCities.length && filteredCities.length > 0) return 'All Cities';
    return filtered.map((c) => c.name).join(', ');
  };

  return (
    <div className="filter-panel">
      {/* Province Dropdown */}
      <div className="filter-dropdown" ref={provinceRef}>
        <label>Select Province</label>
        <div
          className={`filter-dropdown-trigger ${provinceOpen ? 'open' : ''}`}
          onClick={() => { setProvinceOpen(!provinceOpen); setCityOpen(false); }}
        >
          <span className="filter-selected-text">{getProvinceText()}</span>
          {selectedProvinces.length > 0 && selectedProvinces.length < provinces.length && (
            <span className="filter-selected-count">{selectedProvinces.length}</span>
          )}
          <span className={`filter-dropdown-arrow ${provinceOpen ? 'open' : ''}`}>▼</span>
        </div>
        {provinceOpen && (
          <div className="filter-dropdown-menu">
            <div
              className="filter-dropdown-item"
              onClick={() => {
                setSelectedProvinces([]);
                setSelectedCities([]);
              }}
            >
              <input
                type="checkbox"
                checked={selectedProvinces.length === 0}
                onChange={() => {}}
              />
              <span style={{ fontStyle: 'italic', color: '#999' }}>Uncheck All</span>
            </div>
            {provinces.map((province) => (
              <div
                key={province.name}
                className={`filter-dropdown-item ${selectedProvinces.includes(province.name) ? 'selected' : ''}`}
                onClick={() => toggleProvince(province.name)}
              >
                <input
                  type="checkbox"
                  checked={selectedProvinces.includes(province.name)}
                  onChange={() => {}}
                />
                <span>{province.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* City Dropdown */}
      <div className="filter-dropdown" ref={cityRef}>
        <label>Select City</label>
        <div
          className={`filter-dropdown-trigger ${cityOpen ? 'open' : ''}`}
          onClick={() => { setCityOpen(!cityOpen); setProvinceOpen(false); }}
        >
          <span className="filter-selected-text">{getCityText()}</span>
          {selectedCities.length > 0 && selectedCities.length < filteredCities.length && (
            <span className="filter-selected-count">{selectedCities.length}</span>
          )}
          <span className={`filter-dropdown-arrow ${cityOpen ? 'open' : ''}`}>▼</span>
        </div>
        {cityOpen && (
          <div className="filter-dropdown-menu">
            <div
              className="filter-dropdown-item"
              onClick={() => setSelectedCities([])}
            >
              <input
                type="checkbox"
                checked={selectedCities.length === 0}
                onChange={() => {}}
              />
              <span style={{ fontStyle: 'italic', color: '#999' }}>Uncheck All</span>
            </div>
            {filteredCities.map((city) => (
              <div
                key={city.id}
                className={`filter-dropdown-item ${selectedCities.includes(city.id) ? 'selected' : ''}`}
                onClick={() => toggleCity(city.id)}
              >
                <input
                  type="checkbox"
                  checked={selectedCities.includes(city.id)}
                  onChange={() => {}}
                />
                <span>{city.name}</span>
                <span style={{
                  marginLeft: 'auto',
                  fontSize: 'var(--font-size-xs)',
                  color: '#999',
                  fontWeight: 400,
                }}>
                  {city.province}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Apply / Reset */}
      <div className="filter-apply-row">
        <button
          id="filter-apply-btn"
          className="btn btn-primary filter-apply-btn"
          onClick={handleApply}
        >
          ✓ Apply Filter
        </button>
        <button
          id="filter-reset-btn"
          className="filter-reset-btn"
          onClick={handleReset}
        >
          ↻ Reset
        </button>
      </div>
    </div>
  );
};

export default FilterPanel;

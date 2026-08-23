import api from './api';

export const fetchSummary = async (cityIds) => {
  const params = cityIds && cityIds.length > 0 ? { city_ids: cityIds.join(','), _t: Date.now() } : { _t: Date.now() };
  const response = await api.get('/stats/summary', { params });
  return response.data.summary;
};

export const fetchSelectionStats = async (buildingIds, solarIds) => {
  const response = await api.post('/stats/selection', {
    building_ids: buildingIds || [],
    solar_ids: solarIds || [],
  });
  return response.data.selection;
};

export const spatialSelect = async (polygon, cityIds) => {
  const response = await api.post('/stats/spatial-select', {
    polygon,
    city_ids: cityIds || [],
  });
  return response.data;
};

export const fetchZonalStats = async (polygon, cityIds) => {
  const response = await api.post('/stats/zonal', {
    polygon,
    city_ids: cityIds || [],
  });
  return response.data.stats;
};

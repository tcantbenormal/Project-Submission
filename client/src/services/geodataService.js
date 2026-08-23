import api from './api';

export const fetchCities = async () => {
  const response = await api.get('/geodata/cities');
  return response.data.cities;
};

export const fetchBoundaries = async (cityIds) => {
  const params = cityIds && cityIds.length > 0 ? { city_ids: cityIds.join(',') } : {};
  const response = await api.get('/geodata/boundaries', { params });
  return response.data;
};

export const fetchBuildings = async (cityIds) => {
  const params = cityIds && cityIds.length > 0 ? { city_ids: cityIds.join(',') } : {};
  const response = await api.get('/geodata/buildings', { params });
  return response.data;
};

export const fetchSolarPV = async (cityIds) => {
  const params = cityIds && cityIds.length > 0 ? { city_ids: cityIds.join(',') } : {};
  const response = await api.get('/geodata/solarpv', { params });
  return response.data;
};

export const fetchExtent = async (cityIds) => {
  const params = cityIds && cityIds.length > 0 ? { city_ids: cityIds.join(',') } : {};
  const response = await api.get('/geodata/extent', { params });
  return response.data;
};

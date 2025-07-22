import { useState, useCallback } from 'react';
import { API_KEYS } from '../config/api.js';

export const use2GISApi = (mapRef) => {
  const [startSuggestions, setStartSuggestions] = useState([]);
  const [endSuggestions, setEndSuggestions] = useState([]);
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [waypointSuggestions, setWaypointSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const clearSuggestions = useCallback((type, index = 0) => {
    switch (type) {
      case 'start':
        setStartSuggestions([]);
        break;
      case 'end':
        setEndSuggestions([]);
        break;
      case 'waypoint':
        setWaypointSuggestions(prevSuggestions => {
          const newSuggestions = [...prevSuggestions];
          newSuggestions[index] = [];
          return newSuggestions;
        });
        break;
      default:
        setSearchSuggestions([]);
    }
  }, []);

  const getSuggestions = useCallback(async (query, type, index = 0, cityCoords = null) => {
    // Проверяем валидность входных данных
    if (!query || query.length < 2) {
      clearSuggestions(type, index);
      return;
    }

    // Проверяем наличие карты
    if (!mapRef?.current) {
      console.error('Map reference is not available');
      clearSuggestions(type, index);
      return;
    }

    try {
      setIsLoading(true);
      let currentLocation;

      // Определяем текущее местоположение для поиска
      if (type === 'waypoint' && cityCoords && cityCoords.length === 2) {
        currentLocation = `${cityCoords[1]},${cityCoords[0]}`;
      } else {
        const center = mapRef.current.getCenter();
        if (!center || !Array.isArray(center) || center.length !== 2) {
          throw new Error('Invalid map center coordinates');
        }
        currentLocation = `${center[0]},${center[1]}`;
      }

      const url = `https://catalog.api.2gis.com/3.0/suggests?q=${encodeURIComponent(query)}&location=${currentLocation}&suggest_type=object&key=${API_KEYS.TWO_GIS}`;
      
      console.log('Fetching suggestions from:', url);
      const res = await fetch(url);
      
      if (!res.ok) {
        const errorData = await res.json();
        console.error('API Error:', errorData);
        throw new Error(`Ошибка запроса к API 2GIS для предложений: ${res.status}`);
      }
      
      const data = await res.json();
      
      if (!data?.result?.items) {
        console.error('Invalid API response:', data);
        throw new Error('Некорректный ответ от API 2GIS');
      }

      const parsedSuggestions = data.result.items;
      console.log('Parsed suggestions:', parsedSuggestions);

      // Обновляем подсказки в зависимости от типа
      switch (type) {
        case 'start':
          setStartSuggestions(parsedSuggestions);
          break;
        case 'end':
          setEndSuggestions(parsedSuggestions);
          break;
        case 'waypoint':
          setWaypointSuggestions(prevSuggestions => {
            const newSuggestions = [...prevSuggestions];
            newSuggestions[index] = parsedSuggestions;
            return newSuggestions;
          });
          break;
        default:
          setSearchSuggestions(parsedSuggestions);
      }
    } catch (err) {
      console.error('Ошибка запроса предложений:', err);
      clearSuggestions(type, index);
    } finally {
      setIsLoading(false);
    }
  }, [mapRef, clearSuggestions]);

  const searchLocation = useCallback(async (suggestion) => {
    if (!suggestion || !mapRef?.current) {
      console.error('Invalid search parameters or map reference');
      return null;
    }

    try {
      // Пытаемся получить локацию из localStorage
      let currentLocation;
      try {
        const userLocation = JSON.parse(localStorage.getItem('userLocation'));
        if (userLocation && Array.isArray(userLocation) && userLocation.length === 2) {
          currentLocation = userLocation;
        } else {
          // Если локация в localStorage недоступна, используем центр карты
          const center = mapRef.current.getCenter();
          if (!center || !Array.isArray(center) || center.length !== 2) {
            throw new Error('Не удалось получить координаты центра карты');
          }
          currentLocation = center;
        }
      } catch (error) {
        console.warn('Ошибка при получении локации:', error);
        // Используем центр карты как запасной вариант
        const center = mapRef.current.getCenter();
        if (!center || !Array.isArray(center) || center.length !== 2) {
          throw new Error('Не удалось получить координаты центра карты');
        }
        currentLocation = center;
      }

      console.log('Используем локацию для поиска:', currentLocation);

      // Пробуем найти по ID, если он есть
      if (suggestion.id) {
        const idUrl = `https://catalog.api.2gis.com/3.0/items/${suggestion.id}?fields=items.point&key=${API_KEYS.TWO_GIS}`;
        console.log('Поиск по ID:', idUrl);
        const idRes = await fetch(idUrl);

        if (idRes.ok) {
          const idData = await idRes.json();
          const idItem = idData.result?.items?.[0];
          if (idItem?.point?.lon && idItem?.point?.lat) {
            console.log('Найдены координаты по ID:', [idItem.point.lon, idItem.point.lat]);
            return [idItem.point.lon, idItem.point.lat];
          }
        }
      }

      // Если по ID не нашли или ID нет, пробуем геокодирование
      const searchText = suggestion.search_attributes?.suggested_text || suggestion.name || suggestion.full_name || '';
      const addressText = suggestion.address_name || suggestion.full_address || '';
      const searchQuery = `${searchText} ${addressText}`.trim();

      const geoUrl = `https://catalog.api.2gis.com/3.0/items/geocode?q=${encodeURIComponent(searchQuery)}&location=${currentLocation[0]},${currentLocation[1]}&fields=items.point&key=${API_KEYS.TWO_GIS}`;
      console.log('Геокодирование адреса:', geoUrl);
      const geoRes = await fetch(geoUrl);

      if (!geoRes.ok) {
        throw new Error(`Ошибка геокодирования: ${geoRes.status}`);
      }

      const geoData = await geoRes.json();
      const geoItem = geoData.result?.items?.[0];

      if (geoItem?.point?.lon && geoItem?.point?.lat) {
        console.log('Найдены координаты через геокодирование:', [geoItem.point.lon, geoItem.point.lat]);
        return [geoItem.point.lon, geoItem.point.lat];
      }

      // Если геокодирование не помогло, пробуем общий поиск
      const searchUrl = `https://catalog.api.2gis.com/3.0/items?q=${encodeURIComponent(searchQuery)}&location=${currentLocation[0]},${currentLocation[1]}&radius=2000&fields=items.point&key=${API_KEYS.TWO_GIS}`;
      console.log('Поиск по названию и адресу:', searchUrl);
      const searchRes = await fetch(searchUrl);

      if (searchRes.ok) {
        const searchData = await searchRes.json();
        const searchItem = searchData.result?.items?.[0];
        if (searchItem?.point?.lon && searchItem?.point?.lat) {
          console.log('Найдены координаты через поиск:', [searchItem.point.lon, searchItem.point.lat]);
          return [searchItem.point.lon, searchItem.point.lat];
        }
      }

      console.error('Не удалось найти координаты для:', suggestion);
      return null;
    } catch (error) {
      console.error('Ошибка поиска места:', error);
      return null;
    }
  }, [mapRef]);

  return {
    startSuggestions,
    setStartSuggestions,
    endSuggestions,
    setEndSuggestions,
    searchSuggestions,
    setSearchSuggestions,
    waypointSuggestions,
    setWaypointSuggestions,
    getSuggestions,
    searchLocation,
    isLoading,
    clearSuggestions,
    API_KEY: API_KEYS.TWO_GIS
  };
};
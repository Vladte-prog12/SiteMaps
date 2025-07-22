import React, { useEffect, useRef, useState } from 'react';
import './map.css';
import { useLocation } from "../../context/LocationContext.jsx";
import { useSearchParams, useLocation as useLocationReactRouter } from 'react-router-dom';
import SearchBar from '../../components/SearchBar/SearchBar';
import Rating from '../../components/Rating/Rating';
import { use2GISApi } from '../../hooks/use2GISApi';
import { API_KEYS } from '../../config/api.js';
import Help from '../../components/Help/Help';
import TourOutlinedIcon from '@mui/icons-material/TourOutlined';
import { getCategoryById } from '../../services/placesService';
import { FormControlLabel, Switch, Checkbox, Collapse, Paper, Slider, Typography } from '@mui/material';

const API_URL = 'http://localhost:5000/api';

// const NEW_API_KEY = 'bc117143-e942-4b83-8d3a-fba1979fcbb5';

const MapComponent = () => {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const directionsRef = useRef(null);
  const markersRef = useRef([]);
  const pointsRef = useRef([]);
  const searchMarkersRef = useRef([]);
  const badPointsRef = useRef([]);
  const routePolylineRef = useRef(null);

  const [routeMode, setRouteMode] = useState('driving');
  const [routeBuildingMethod, setRouteBuildingMethod] = useState('');
  const [startPoint, setStartPoint] = useState('');
  const [endPoint, setEndPoint] = useState('');
  const [waypoints, setWaypoints] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [isRatingFilterEnabled, setIsRatingFilterEnabled] = useState(true);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [isRouteBuilt, setIsRouteBuilt] = useState(false);
  const [isRebuildMode, setIsRebuildMode] = useState(false);
  const [selectedPointForRebuild, setSelectedPointForRebuild] = useState(null);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [categorySearchQuery, setCategorySearchQuery] = useState('');
  const [filteredCategories, setFilteredCategories] = useState([]);
  const [showRebuildButton, setShowRebuildButton] = useState(false);
  const [routeDistance, setRouteDistance] = useState(null);
  const [routeDuration, setRouteDuration] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);
  const [tooltipStyle, setTooltipStyle] = useState({ display: 'none' });
  const [tooltipContent, setTooltipContent] = useState('');
  const [pointsCount, setPointsCount] = useState('');
  const [segmentDistances, setSegmentDistances] = useState([]);
  const [weights, setWeights] = useState({
    rating: 0.4,    // вес для рейтинга
    reviews: 0.3,   // вес для количества отзывов
    distance: 0.3   // вес для расстояния
  });
  const [showHelp, setShowHelp] = useState(false);
  const [filterOptions, setFilterOptions] = useState({
    qualityScore: false,
    rating: false,
    all: true // Set to true by default
  });
  const [qualityThreshold, setQualityThreshold] = useState(0.8); // Add quality threshold state

  const { location, updateLocation, getCurrentLocation } = useLocation();
  const [searchParams] = useSearchParams();
  const locationRoute = useLocationReactRouter();
  const { 
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
    API_KEY 
  } = use2GISApi(mapRef);

  const calculateRouteDistance = async (points, transportMode) => {
    if (!points || points.length < 2) {
      console.error("Недостаточно координат для расчета расстояния.");
      return null;
    }
  
    try {
      // Рассчитываем расстояния между последовательными точками
      const segmentDistances = [];
      
      // Для каждой пары точек делаем отдельный запрос к API
      for (let i = 0; i < points.length - 1; i++) {
        const point1 = points[i];
        const point2 = points[i + 1];
        
        const reqUrl = `https://routing.api.2gis.com/routing/7.0.0/global?key=${API_KEYS.TWO_GIS}`;
        const requestBody = {
          points: [
            {
              lon: point1.coordinates[0],
              lat: point1.coordinates[1],
              type: 'stop'
            },
            {
              lon: point2.coordinates[0],
              lat: point2.coordinates[1],
              type: 'stop'
            }
          ],
          transport: transportMode,
          route_mode: 'fastest',
          traffic_mode: 'jam',
          output: 'summary'
        };

        console.log(`Отправляем запрос Routing API для сегмента ${i + 1}:`, requestBody);

        const response = await fetch(reqUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody)
        });
  
        if (!response.ok) {
          throw new Error(`Ошибка запроса Routing API для сегмента ${i + 1}: ${response.status}`);
        }
  
        const data = await response.json();
  
        if (data.result && data.result.length > 0) {
          const route = data.result[0];
          const segmentDistance = route.distance || route.total_distance || route.length;
          
          segmentDistances.push({
            from: point1,
            to: point2,
            distance: segmentDistance,
            distanceKm: (segmentDistance / 1000).toFixed(2)
          });
        }
      }
  
      // Рассчитываем общее расстояние
      const totalDistance = segmentDistances.reduce((sum, segment) => sum + segment.distance, 0);
      
      // Делаем запрос для получения общего времени в пути
      const totalReqUrl = `https://routing.api.2gis.com/routing/7.0.0/global?key=${API_KEYS.TWO_GIS}`;
      const totalRequestBody = {
        points: points.map((point, index) => ({
          lon: point.coordinates[0],
          lat: point.coordinates[1],
          type: index === 0 || index === points.length - 1 ? 'stop' : 'via'
        })),
        transport: transportMode,
        route_mode: 'fastest',
        traffic_mode: 'jam',
        output: 'summary'
      };

      console.log('Отправляем запрос Routing API для общего маршрута:', totalRequestBody);

      const totalResponse = await fetch(totalReqUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(totalRequestBody)
      });
  
      if (!totalResponse.ok) {
        throw new Error(`Ошибка запроса Routing API для общего маршрута: ${totalResponse.status}`);
      }
  
      const totalData = await totalResponse.json();
      const totalDuration = totalData.result?.[0]?.duration || 0;
  
      // Выводим расстояния в консоль
      console.log('Расстояния между точками маршрута:');
      segmentDistances.forEach((segment, index) => {
        console.log(`От точки ${index + 1} до точки ${index + 2}: ${segment.distanceKm} км`);
      });
  
        return { 
        distance: totalDistance,
        duration: totalDuration,
        segmentDistances: segmentDistances
        };
    } catch (error) {
      console.error('Ошибка при вызове Routing API:', error);
      return null;
    }
  };

  useEffect(() => {
    if (mapRef.current && locationRoute.pathname === '/yandex-map' && location) {
      mapRef.current.setCenter(location);
      mapRef.current.setZoom(16);

      markersRef.current.forEach((marker) => marker.destroy());
      markersRef.current = [];

      const marker = new window.mapgl.Marker(mapRef.current, {
        coordinates: location,
        icon: 'https://docs.2gis.com/img/dotMarker.svg',
      });
      markersRef.current.push(marker);
    }
  }, [location, mapRef, locationRoute.pathname]);

  const clearRoute = () => {
    if (directionsRef.current) {
      directionsRef.current.clear();
    }
    if (routePolylineRef.current) {
      routePolylineRef.current.destroy();
      routePolylineRef.current = null;
    }
    setRouteInfo(null);
    setRouteDistance(null);
    setRouteDuration(null);
    setSegmentDistances([]);
    setIsRouteBuilt(false);
    setShowRebuildButton(false);
  };

  useEffect(() => {
    localStorage.removeItem('userLocation');

    const fetchCategories = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/categories');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        setCategories(data);
      } catch (error) {
        console.error('Ошибка получения категорий:', error);
      }
    };

    fetchCategories();

    const destination = searchParams.get('destination');
    const start = searchParams.get('start');
    
    if (destination) {
      setRouteBuildingMethod('input');
      setEndPoint(destination);
      if (start) {
        setStartPoint(start);
      } else {
        getCurrentLocation();
      }
    }

    const loadScripts = () => {
      return Promise.all([
        new Promise((resolve, reject) => {
          if (window.mapgl) return resolve();
          const script = document.createElement('script');
          script.src = 'https://mapgl.2gis.com/api/js/v1';
          script.async = true;
          script.onload = resolve;
          script.onerror = () => reject(new Error('Не удалось загрузить mapgl API'));
          document.body.appendChild(script);
        }),
        new Promise((resolve, reject) => {
          if (window.Directions) return resolve();
          const script = document.createElement('script');
          script.src = 'https://unpkg.com/@2gis/mapgl-directions@^2/dist/directions.js';
          script.async = true;
          script.onload = resolve;
          script.onerror = () => reject(new Error('Не удалось загрузить Directions API'));
          document.body.appendChild(script);
        }),
      ]);
    };

    loadScripts()
      .then(() => {
        const mapgl = window.mapgl;
        const Directions = window.Directions;

        if (!mapRef.current) {
          const map = new mapgl.Map(mapContainerRef.current, {
            center: location,
            zoom: 10,
            key: API_KEYS.TWO_GIS,
          });
          mapRef.current = map;

          const directions = new Directions(map, {
            directionsApiKey: API_KEYS.TWO_GIS,
          });
          directionsRef.current = directions;

          // Добавляем обработчик клика по карте
          map.on('click', handleMapClick);
        }
      })
      .catch(console.error);

    return () => {
      if (mapRef.current) {
        mapRef.current.destroy();
        mapRef.current = null;
      }
    };
  }, [routeBuildingMethod, pointsCount]);

  const drawRoute = async (mode) => {
    try {
      if (!mapRef.current || !directionsRef.current) {
        console.error('Карта или directions не инициализированы');
        return;
      }

      // Очищаем текущий маршрут
      directionsRef.current.clear();
      if (routePolylineRef.current) {
        routePolylineRef.current.destroy();
        routePolylineRef.current = null;
      }

      // Выводим информацию о всем маршруте
      console.log('=== Информация о маршруте ===');
      pointsRef.current.forEach((point, index) => {
        if (point) {
          console.log(`Точка ${index + 1}:`, {
            название: point.name || `Точка ${index + 1}`,
            координаты: point.coordinates
          });
        }
      });
      console.log('===========================');

      // Проверяем, что у нас есть все необходимые точки
      if (!pointsRef.current.every(point => point !== null)) {
        console.error('Не все точки установлены');
        return;
      }

      // Формируем точки для API
      const pointsForApi = pointsRef.current.map(point => point.coordinates);

      console.log('Строим маршрут с точками:', pointsForApi);

      // Строим маршрут в зависимости от режима (driving/walking)
      if (mode === 'driving') {
        await directionsRef.current.carRoute({
          points: pointsForApi,
          trafficMode: 'jam' // Учитываем пробки для авто
        });
      } else if (mode === 'walking') {
        await directionsRef.current.pedestrianRoute({
          points: pointsForApi,
        });
      }

      // Получаем информацию о маршруте с помощью calculateRouteDistance
      const routeInfo = await calculateRouteDistance(pointsForApi, mode);
      if (routeInfo) {
        setRouteInfo(routeInfo);
        setRouteDistance(routeInfo.distance);
        setRouteDuration(routeInfo.duration);
        setSegmentDistances(routeInfo.segmentDistances);
      }

      setIsRouteBuilt(true);

      // Если включен фильтр рейтинга, отображаем дополнительные маркеры
      if (isRatingFilterEnabled) {
        const categories = await fetch(`${API_URL}/places/unique-categories`).then(res => res.json());
        await displayAnalyzedPointsMarkers(categories.categories);
      }
    } catch (error) {
      console.error('Ошибка при построении маршрута:', error);
    }
  };

  // Добавляем обработчик для кнопки построения маршрута
  const handleBuildRoute = async () => {
    await drawRoute(routeMode);
  };

  const handleModeChange = (mode) => {
    setRouteMode(mode);
    if (pointsRef.current.length >= 2) {
      drawRoute(mode);
      setIsRouteBuilt(true);
    }
  };

  // Обработчик клика по карте для ручного добавления точек
  const handleMapClick = (e) => {
    if (routeBuildingMethod !== 'manual' || !pointsCount) {
      console.log('Клик игнорируется: неверный режим или не выбрано количество точек');
      return;
    }
    
    const coords = e.lngLat;
    console.log('Клик по карте:', coords);

    // Проверяем валидность pointsRef.current
    if (!Array.isArray(pointsRef.current) || pointsRef.current.length !== pointsCount) {
      console.log('Инициализируем массив точек заново');
      pointsRef.current = Array(pointsCount).fill(null);
    }

    // Находим первую пустую позицию
    const currentIndex = pointsRef.current.findIndex(point => point === null);
    if (currentIndex === -1) {
      console.log('Все точки уже установлены');
      return;
    }

    // Создаем новый маркер
    const marker = new window.mapgl.Marker(mapRef.current, {
      coordinates: coords,
      icon: 'https://docs.2gis.com/img/dotMarker.svg',
    });

    // Удаляем старый маркер, если он есть
    if (markersRef.current[currentIndex]) {
      markersRef.current[currentIndex].destroy();
    }

    // Обновляем массивы маркеров и точек
    markersRef.current[currentIndex] = marker;
    pointsRef.current[currentIndex] = {
      coordinates: coords,
      name: `Точка ${currentIndex + 1} на карте`,
      address: '',
    };

    console.log(`Точка ${currentIndex + 1} из ${pointsCount} установлена`);
    console.log('Текущее состояние точек:', pointsRef.current);

    // Проверяем, все ли точки установлены
    const allPointsSet = pointsRef.current.every(point => point !== null);
    if (allPointsSet) {
      console.log('Все точки установлены, строим маршрут');
      drawRoute(routeMode);
      setIsRouteBuilt(true);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery || !mapRef.current) {
      console.error("Поиск не может быть выполнен: отсутствует запрос или карта");
      return;
    }

    // Очищаем предыдущие маркеры
    searchMarkersRef.current.forEach((marker) => marker.destroy());
    searchMarkersRef.current = [];

    try {
      // Получаем текущие координаты центра карты
      const center = mapRef.current.getCenter();
      const location = `${center[0]},${center[1]}`;
      console.log('Текущий центр карты:', center);

      // Формируем URL для поиска мест
      const searchUrl = `https://catalog.api.2gis.com/3.0/items?q=${encodeURIComponent(searchQuery)}&location=${location}&radius=2000&fields=items.point,items.name,items.address_name,items.type,items.rubrics&key=${API_KEYS.TWO_GIS}`;
      console.log('URL запроса:', searchUrl);
      
      const response = await fetch(searchUrl);
      if (!response.ok) {
        throw new Error('Ошибка при поиске мест');
      }

      const data = await response.json();
      console.log('Полный ответ API:', data);

      const places = data.result?.items || [];
      console.log('Найдено мест:', places.length);
      console.log('Список найденных мест:', places.map(place => ({
        name: place.name,
        address: place.address_name,
        type: place.type,
        rubrics: place.rubrics,
        point: place.point
      })));

      if (places.length === 0) {
        alert('Ничего не найдено');
        return;
      }

      // Берем только первые 5 мест
      const topPlaces = places.slice(0, 5);
      console.log('Отображаем первые 5 мест:', topPlaces.length);

      // Создаем маркеры для каждого найденного места
      topPlaces.forEach((place, index) => {
        if (place.point) {
          console.log(`Создаем маркер для места ${index + 1}:`, {
            name: place.name,
            address: place.address_name,
            coordinates: [place.point.lon, place.point.lat]
          });

          // Создаем элемент для маркера
          const el = document.createElement('div');
          el.style.width = '24px';
          el.style.height = '24px';
          el.style.backgroundImage = 'url(https://cdn-icons-png.flaticon.com/512/684/684908.png)';
          el.style.backgroundSize = 'contain';
          el.style.backgroundRepeat = 'no-repeat';

          const marker = new window.mapgl.Marker(mapRef.current, {
            coordinates: [place.point.lon, place.point.lat],
            element: el,
          });
          marker._isQuality = false;

          // Добавляем обработчики событий для маркера
          marker.on('mouseover', () => {
            // Создаем метку с информацией о месте
            marker.setLabel({
              text: `${place.name}\n${place.address_name || 'Адрес не указан'}${place.rubrics ? '\n' + place.rubrics.map(r => r.name).join(', ') : ''}`,
              offset: [0, 25],
              relativeAnchor: [0.5, 0],
              fontSize: 12, // Корректируем размер шрифта
              lineHeight: 1.2, // Корректируем межстрочный интервал
              image: {
                url: 'https://docs.2gis.com/img/mapgl/tooltip-top.svg',
                size: [100, 50], // Корректируем размер фона подсказки
                stretchX: [[10, 40], [60, 90]],
                stretchY: [[20, 40]],
                padding: [20, 10, 10, 10], // Корректируем внутренние отступы
              },
            });
          });

          marker.on('mouseout', () => {
            // Удаляем метку при уходе курсора
            marker.setLabel(null);
          });

          // Добавляем обработчик клика для маркера маршрута
          marker.on('click', () => {
            const pointInfo = pointsRef.current[currentIndex];
            console.log('Нажата точка маршрута:', {
              название: pointInfo.name,
              координаты: coords
            });
          });

          searchMarkersRef.current.push(marker);
        } else {
          console.warn(`Место ${index + 1} пропущено - нет координат:`, place);
        }
      });

      // Центрируем карту на первом найденном месте
      if (topPlaces[0].point) {
        mapRef.current.setCenter([topPlaces[0].point.lon, topPlaces[0].point.lat]);
        mapRef.current.setZoom(14);
      }

    } catch (error) {
      console.error('Ошибка при поиске мест:', error);
      alert('Произошла ошибка при поиске мест');
    }
  };

  const handleQueryChange = async (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    await getSuggestions(query, 'search');
  };

  const handleSuggestionClick = (suggestion) => {
    const suggestedText = suggestion.search_attributes?.suggested_text || suggestion.name || "";
    setSearchQuery(suggestedText);
    setSearchSuggestions([]);
  };

  const handleRouteBuildingMethodChange = (method) => {
    console.log('Изменение способа построения маршрута на:', method);
    
    // Сбрасываем состояния
    setRouteBuildingMethod(method);
    setStartPoint('');
    setEndPoint('');
    setWaypoints([]);
    setRouteInfo(null);
    setRouteDistance(null);
    setRouteDuration(null);
    setSegmentDistances([]);
    setIsRouteBuilt(false);
    setShowRebuildButton(false);

    // Очищаем маршрут только если карта уже инициализирована
    if (mapRef.current) {
      clearRoute();
    }

    // Инициализируем массивы только если есть выбранное количество точек
    if (pointsCount) {
      if (method === 'input') {
        const waypointsCount = Math.max(0, pointsCount - 2);
        setWaypoints(Array(waypointsCount).fill(''));
        pointsRef.current = Array(pointsCount).fill(null);
        setWaypointSuggestions(Array(waypointsCount).fill([]));
      } else if (method === 'manual') {
        pointsRef.current = Array(pointsCount).fill(null);
      }
    }
  };

  const handlePointChange = async (e, type, index = 0) => {
    const value = e.target.value;
    console.log('Изменение точки:', { type, index, value });

    // Обновляем текстовые поля
    if (type === 'start') {
      setStartPoint(value);
      setStartSuggestions([]);
    } else if (type === 'end') {
      setEndPoint(value);
      setEndSuggestions([]);
    } else if (type === 'waypoint') {
      const newWaypoints = [...waypoints];
      newWaypoints[index] = value;
      setWaypoints(newWaypoints);
      setWaypointSuggestions(prevSuggestions => {
        const newSuggestions = [...prevSuggestions];
        newSuggestions[index] = [];
        return newSuggestions;
      });
    }

    // Получаем подсказки только если есть текст
    if (value.trim()) {
      const cityCoords = locationRoute.state?.cityCoords;
      await getSuggestions(value, type, index, cityCoords);
    }
  };

  const handlePointSuggestionClick = async (suggestion, type, index = 0) => {
    const suggestedText = suggestion.search_attributes?.suggested_text || suggestion.name || suggestion.full_name || "";
    const suggestedAddress = suggestion.address_name || suggestion.full_address || '';

    console.log('Выбрано место:', { type, index, text: suggestedText, address: suggestedAddress });

    // Обновляем текстовые поля
    if (type === 'start') {
      setStartPoint(suggestedText);
      setStartSuggestions([]);
    } else if (type === 'end') {
      setEndPoint(suggestedText);
      setEndSuggestions([]);
    } else if (type === 'waypoint') {
      const newWaypoints = [...waypoints];
      newWaypoints[index] = suggestedText;
      setWaypoints(newWaypoints);
      setWaypointSuggestions(prevSuggestions => {
        const newSuggestions = [...prevSuggestions];
        newSuggestions[index] = [];
        return newSuggestions;
      });
    }

    // Получаем координаты места
    const coords = await searchLocation(suggestion);
    if (!coords) {
      console.error('Не удалось найти координаты для:', suggestion);
      alert('Место не найдено');
      return;
    }

    console.log('Получены координаты:', coords);

    // Определяем индекс точки в общем массиве
    let pointIndex;
    if (type === 'start') {
      pointIndex = 0;
    } else if (type === 'end') {
      pointIndex = pointsCount - 1;
    } else {
      pointIndex = index + 1;
    }

    console.log('Устанавливаем точку с индексом:', pointIndex);

    // Удаляем старый маркер, если он есть
    if (markersRef.current[pointIndex]) {
      markersRef.current[pointIndex].destroy();
    }

    // Создаем новый маркер
    const marker = new window.mapgl.Marker(mapRef.current, {
      coordinates: coords,
      icon: 'https://docs.2gis.com/img/dotMarker.svg',
    });

    // Сохраняем маркер в массив
    markersRef.current[pointIndex] = marker;

    // Обновляем массив точек
    pointsRef.current[pointIndex] = {
      coordinates: coords,
      name: suggestedText,
      address: suggestedAddress,
    };

    // Проверяем, все ли точки установлены
    const allPointsSet = pointsRef.current.every(point => point !== null);
    if (allPointsSet) {
      console.log('Все точки установлены, можно строить маршрут');
      setShowRebuildButton(true);
      
      // Автоматически строим маршрут
      await drawRoute(routeMode);
    }
  };

  useEffect(() => {
    if (categorySearchQuery) {
      const lowerQuery = categorySearchQuery.toLowerCase();
      const filtered = categories.filter(cat => 
        cat.name.toLowerCase().includes(lowerQuery)
      );
      setFilteredCategories(filtered);
    } else {
      setFilteredCategories(categories);
    }
  }, [categorySearchQuery, categories]);

  // Обновляем количество промежуточных точек при изменении pointsCount
  useEffect(() => {
    if (routeBuildingMethod === 'input' && pointsCount > 2) {
      // Инициализируем массивы для режима ввода адресов
      const waypointsCount = Math.max(0, pointsCount - 2);
      setWaypoints(Array(waypointsCount).fill(''));
      pointsRef.current = Array(pointsCount).fill(null);
      setWaypointSuggestions(Array(waypointsCount).fill([]));
      
      // Очищаем все маркеры
      markersRef.current.forEach(marker => marker.destroy());
      markersRef.current = Array(pointsCount).fill(null);
      
      // Очищаем маршрут
      if (directionsRef.current) {
        directionsRef.current.clear();
      }
      
      // Сбрасываем состояния
      setRouteInfo(null);
      setRouteDistance(null);
      setRouteDuration(null);
      setSegmentDistances([]);
      setIsRouteBuilt(false);
    } else if (routeBuildingMethod === 'manual') {
      // Инициализируем массивы для ручного режима
      pointsRef.current = Array(pointsCount).fill(null);
      
      // Очищаем все маркеры
      markersRef.current.forEach(marker => marker.destroy());
      markersRef.current = Array(pointsCount).fill(null);
      
      // Очищаем маршрут
      if (directionsRef.current) {
        directionsRef.current.clear();
      }
      
      // Сбрасываем состояния
      setRouteInfo(null);
      setRouteDistance(null);
      setRouteDuration(null);
      setSegmentDistances([]);
      setIsRouteBuilt(false);
    }
    // Очищаем маршрут при любом изменении
    clearRoute();
  }, [pointsCount, routeBuildingMethod]);

  const renderWaypointInputs = () => {
    if (!isInputModeInitialized || pointsCount < 3) return null;

    return (
      <>
        {Array.from({ length: pointsCount - 2 }).map((_, index) => (
          <div key={`waypoint-${index}`} className="input-group">
            <label 
              htmlFor={`waypoint-${index}`}
              onClick={() => isRebuildMode && handlePointSelectForRebuild('waypoint', index)}
              style={{ 
                cursor: isRebuildMode ? 'pointer' : 'default',
                backgroundColor: selectedPointForRebuild?.type === 'waypoint' && selectedPointForRebuild?.index === index ? '#e0e0e0' : 'transparent',
                padding: '5px',
                borderRadius: '4px'
              }}
            >
              Промежуточная точка {index + 1}
            </label>
            <div className="input-with-suggestions" style={{ position: 'relative' }}>
              <input
                type="text"
                id={`waypoint-${index}`}
                className="route-input"
                value={waypoints[index] || ''}
                onChange={(e) => handlePointChange(e, 'waypoint', index)}
                onBlur={() => setTimeout(() => {
                  const newSuggestions = [...waypointSuggestions];
                  newSuggestions[index] = [];
                  setWaypointSuggestions(newSuggestions);
                }, 100)}
                placeholder={`Введите адрес промежуточной точки ${index + 1}`}
              />
              {waypointSuggestions[index] && waypointSuggestions[index].length > 0 && (
                <ul className="suggestions-list" style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1000 }}>
                  {waypointSuggestions[index].map((suggestion, idx) => (
                    <li
                      key={idx}
                      className="suggestion-item"
                      onClick={() => handlePointSuggestionClick(suggestion, 'waypoint', index)}
                    >
                      <div className="suggestion-name">
                        {suggestion.name || suggestion.full_name || suggestion.address_name}
                      </div>
                      {suggestion.address_name && (
                        <div className="suggestion-address">
                          {suggestion.address_name}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ))}
      </>
    );
  };

  // Функция для нормализации значения в диапазоне [0, 1]
  const normalizeValue = (value, min, max) => {
    if (max === min) return 0;
    return (value - min) / (max - min);
  };

  // Функция для расчета оценки точки
  const calculatePointScore = (rating, reviewsCount, distance) => {
    // Нормализуем значения
    const normalizedRating = normalizeValue(rating, 0, 5); // рейтинг от 0 до 5
    const normalizedReviews = normalizeValue(reviewsCount, 0, 1000); // предполагаем макс. 1000 отзывов
    const normalizedDistance = 1 - normalizeValue(distance, 0, 10000); // инвертируем расстояние (меньше = лучше)

    // Рассчитываем итоговую оценку
    const score = (
      weights.rating * normalizedRating +
      weights.reviews * normalizedReviews +
      weights.distance * normalizedDistance
    );

    return score;
  };

  // Хаверсинова формула для расстояния между двумя точками (в км)
  function haversine(lat1, lon1, lat2, lon2) {
    console.log('\n=== Формула Хаверсина ===');
    console.log('Входные параметры:');
    console.log(`Точка 1: широта ${lat1}°, долгота ${lon1}°`);
    console.log(`Точка 2: широта ${lat2}°, долгота ${lon2}°`);

    // Константы
    const R = 6371; // Радиус Земли в километрах
    console.log(`\nКонстанты:`);
    console.log(`R (радиус Земли) = ${R} км`);

    // Преобразование градусов в радианы
    const toRad = (deg) => deg * Math.PI / 180;
    
    // Разница координат в радианах
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    
    console.log('\n1. Преобразование координат в радианы:');
    console.log(`dLat = ${lat2}° - ${lat1}° = ${lat2 - lat1}° = ${dLat} рад`);
    console.log(`dLon = ${lon2}° - ${lon1}° = ${lon2 - lon1}° = ${dLon} рад`);

    // Формула Хаверсина:
    // a = sin²(Δφ/2) + cos(φ1)·cos(φ2)·sin²(Δλ/2)
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) + // sin²(Δφ/2)
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * // cos(φ1)·cos(φ2)
      Math.sin(dLon/2) * Math.sin(dLon/2);   // sin²(Δλ/2)

    console.log('\n2. Расчет параметра a:');
    console.log(`a = sin²(${dLat/2}) + cos(${lat1}°)·cos(${lat2}°)·sin²(${dLon/2})`);
    console.log(`a = ${Math.sin(dLat/2) * Math.sin(dLat/2)} + ${Math.cos(toRad(lat1)) * Math.cos(toRad(lat2))}·${Math.sin(dLon/2) * Math.sin(dLon/2)}`);
    console.log(`a = ${a}`);

    // c = 2·atan2(√a, √(1−a))
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    
    console.log('\n3. Расчет параметра c:');
    console.log(`c = 2·atan2(√${a}, √${1-a})`);
    console.log(`c = 2·atan2(${Math.sqrt(a)}, ${Math.sqrt(1-a)})`);
    console.log(`c = ${c}`);

    // d = R·c
    const distance = R * c;
    
    console.log('\n4. Расчет итогового расстояния:');
    console.log(`d = R·c = ${R}·${c}`);
    console.log(`d = ${distance} км`);

    return distance;
  }

  // Добавляем функцию для расчета расстояния до траектории
  const calculateDistanceToTrajectory = (point, trajectory) => {
    if (!trajectory || trajectory.length < 2) return 0;
    
    let minDistance = Infinity;
    
    // Проверяем расстояние до каждого сегмента траектории
    for (let i = 0; i < trajectory.length - 1; i++) {
      const segmentStart = trajectory[i];
      const segmentEnd = trajectory[i + 1];
      
      // Расстояние от точки до сегмента
      const distance = haversine(
        point.latitude || point.lat,
        point.longitude || point.lon,
        (segmentStart[1] + segmentEnd[1]) / 2,
        (segmentStart[0] + segmentEnd[0]) / 2
      );
      
      minDistance = Math.min(minDistance, distance);
    }
    
    return minDistance;
  };

  // --- Новое состояние ---
  const [badPoints, setBadPoints] = useState([]);
  const [pointStats, setPointStats] = useState([]); // S для всех точек
  const [showGuide, setShowGuide] = useState(false);
  const [currentGuideStep, setCurrentGuideStep] = useState(0);
  const contentRef = useRef(null);

  // --- Состояние для отслеживания первого запуска гида ---
  const [hasLaunchedGuide, setHasLaunchedGuide] = useState(() => {
    // Проверяем localStorage при инициализации
    return localStorage.getItem('hasLaunchedGuide') === 'true';
  });

  // --- Новое состояние для стиля контента гида ---
  const [contentStyle, setContentStyle] = useState({});

  // --- Состояние для массива шагов гида ---
  const [guideSteps, setGuideSteps] = useState([]);

  // --- Проверка точек после построения маршрута ---
  const checkRoutePoints = async (points, suppressAlerts = false) => {
    console.log('\n=== Начало проверки точек маршрута ===');
    const badPoints = [];
    const pointStats = [];
    let totalPoints = 0;

    // Получаем начальную точку маршрута
    const startPoint = points[0];
    if (!startPoint) {
      console.error('Начальная точка маршрута не найдена');
      return { badPoints, pointStats, totalPoints };
    }

    for (let i = 1; i < points.length; i++) {
      const point = points[i];
      console.log(`\nПроверка точки ${i + 1}:`);
      console.log(`Координаты: ${point.coordinates[0]}, ${point.coordinates[1]}`); // Обновляем для доступа к координатам из объекта
      console.log(`Название: ${point.name}`);
      console.log(`Адрес: ${point.address}`);

      try {
        // Получаем информацию об отзывах и нормализованные значения
        const reviewsInfo = await checkReviews(point.name, point.address); // Используем сохраненное название и адрес
        if (!reviewsInfo) {
          console.log('Не удалось получить информацию об отзывах');
          continue;
        }

        // Проверяем наличие всех необходимых данных
        if (!reviewsInfo.categoryId) {
          console.log('Отсутствует ID категории');
          continue;
        }

        // Получаем веса для расчета S-оценки
        const weights = await getWeights(reviewsInfo.categoryId);
        console.log('\nВеса для расчета:');
        console.log(`- Вес рейтинга (a): ${weights.a}`);
        console.log(`- Вес отзывов (b): ${weights.b}`);
        console.log(`- Вес расстояния (d): ${weights.d}`);

        // Рассчитываем S-оценку
        const sScore = await calculateSScore(
          reviewsInfo.normalizedRating,
          reviewsInfo.normalizedReviews,
          point.coordinates, // Передаем только координаты для расчета S-оценки
          weights,
          startPoint.coordinates // Передаем только координаты начальной точки
        );

        // Определяем, является ли точка "хорошей" по S-оценке и по рейтингу пользователя
        const isGoodSScore = sScore >= 0.6; // Используем порог 0.6 как в серверной логике
        const isGoodRating = reviewsInfo.rating >= rating;

        console.log(`\nОценка точки:`);
        console.log(`- S-оценка: ${sScore}`);
        console.log(`- Порог S-оценки: 0.6`);
        console.log(`- Соответствует S-оценке: ${isGoodSScore}`);
        console.log(`- Средний рейтинг: ${reviewsInfo.rating}`);
        console.log(`- Минимальный рейтинг пользователя: ${rating}`);
        console.log(`- Соответствует рейтингу пользователя: ${isGoodRating}`);

        let requiresRebuild = false;

        // Логика вывода алертов только если suppressAlerts не true
        if (!suppressAlerts) {
        if (!isGoodSScore && !isGoodRating) {
            alert(`Точка "${point.name}" плохая и средний рейтинг (${reviewsInfo.rating.toFixed(1)}) не соответствует установленному (${rating})`);
            requiresRebuild = true;
        } else if (isGoodSScore && !isGoodRating) {
             alert(`Точка "${point.name}" хорошая (S=${sScore.toFixed(2)}), но средний рейтинг (${reviewsInfo.rating.toFixed(1)}) не соответствует установленному (${rating}). Попробуем найти точку лучше в базе.`);
             requiresRebuild = true;
        } else if (!isGoodSScore && isGoodRating) {
            console.log(`Точка "${point.name}" имеет плохую S-оценку (${sScore.toFixed(2)}), но соответствует минимальному рейтингу пользователя.`);
             requiresRebuild = true;
          } else {
            console.log(`Точка "${point.name}" хорошая (S=${sScore.toFixed(2)}) и соответствует минимальному рейтингу пользователя.`);
            requiresRebuild = false;
          }
        } else { // Если suppressAlerts true, только логируем необходимость перестроения
             if (!isGoodSScore || !isGoodRating) {
                console.log(`Точка "${point.name}" требует внимания (S=${sScore.toFixed(2)}, Рейтинг=${reviewsInfo.rating.toFixed(1)}).`);
                requiresRebuild = true;
             } else {
                 console.log(`Точка "${point.name}" хорошая (S=${sScore.toFixed(2)}, Рейтинг=${reviewsInfo.rating.toFixed(1)}).`);
                 requiresRebuild = false;
             }
        }

        if (requiresRebuild) {
             console.log('Точка добавлена в список требующих перестроения.');
             badPoints.push({
               name: point.name,
               address: point.address,
               rating: reviewsInfo.rating,
               sScore: sScore,
            placeId: reviewsInfo.placeId,
            categoryId: reviewsInfo.categoryId,
            cityId: reviewsInfo.cityId,
            lon: point.coordinates[0],
               lat: point.coordinates[1],
            index: i
             });
        }

        pointStats.push({
          name: point.name,
          address: point.address,
          rating: reviewsInfo.rating,
          sScore: sScore,
          isGood: isGoodSScore && isGoodRating
        });

        totalPoints++;
      } catch (error) {
        console.error('Ошибка при проверке точки:', error);
      }
    }

    console.log('\n=== Итоги проверки ===');
    console.log(`Всего точек (кроме начальной): ${totalPoints}`);
    console.log(`Точек, требующих внимания (плохая S или низкий рейтинг): ${badPoints.length}`);
    console.log('Статистика точек:', pointStats);
    console.log('Точки, требующие внимания:', badPoints);

    // Получаем список уникальных категорий
    try {
      const response = await fetch(`${API_URL}/places/unique-categories`);
      if (!response.ok) {
        throw new Error('Failed to fetch categories');
      }
      const data = await response.json();
      console.log("\n=== Категории рассмотренных точек ===");
      data.categories.forEach((category, index) => {
        console.log(`${index + 1}. ${category}`);
      });

      // Отображаем маркеры для найденных категорий
      await displayAnalyzedPointsMarkers(data.categories);

      // === АВТОМАТИЧЕСКИЙ АНАЛИЗ АЛЬТЕРНАТИВ ===
      // Для каждой точки маршрута (кроме стартовой) инициируем анализ альтернатив
      for (const point of points.slice(1)) { // пропускаем стартовую
        if (!point) continue;
        // Получаем данные о точке (categoryId, cityId, placeId, rating, sScore)
        const reviewsInfo = await checkReviews(point.name, point.address);
        if (!reviewsInfo || !reviewsInfo.categoryId || !reviewsInfo.cityId) continue;

        // Получаем веса для категории
        const weights = await getWeights(reviewsInfo.categoryId);

        // Формируем траекторию маршрута
        const routeTrajectory = points.map(p => ({
          lon: p.coordinates[0],
          lat: p.coordinates[1]
        }));

        // Запрос на поиск альтернатив
        await fetch('http://localhost:5000/api/places/alternatives', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            category_id: reviewsInfo.categoryId,
            city_id: reviewsInfo.cityId,
            minRating: rating, // или другое значение
            minReviews: 1,
            originalPointCoords: {
              placeId: reviewsInfo.placeId,
              lon: point.coordinates[0],
              lat: point.coordinates[1]
            },
            routeTrajectory,
            weights,
            currentPointRating: reviewsInfo.rating,
            currentPointSScore: 0 // если есть, подставить
          })
        });
      }
      // === КОНЕЦ АВТОМАТИЧЕСКОГО АНАЛИЗА АЛЬТЕРНАТИВ ===
    } catch (error) {
      console.error('Ошибка при получении списка категорий:', error);
    }

    // Обновляем badPointsRef
    badPointsRef.current = badPoints;
    setBadPoints(badPoints);
    setPointStats(pointStats);

    return { badPoints, pointStats, totalPoints };
  };

  // Добавляем новую функцию для получения нормализованных значений
  const getNormalizedValues = async (name, address) => {
    try {
      console.log('\n=== Получение нормализованных значений ===');
      console.log(`Место: ${name}`);
      console.log(`Адрес: ${address}`);

      const response = await fetch('http://localhost:5000/api/places/check-reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, address })
      });

      if (!response.ok) {
        console.error(`Ошибка запроса нормализованных значений: ${response.status}`);
        return null;
      }

      const data = await response.json();
      console.log('Получены нормализованные значения:', data);

      return {
        normalizedRating: data.normalizedRating || 0,
        normalizedReviews: data.normalizedReviews || 0
      };
    } catch (error) {
      console.error('Ошибка при получении нормализованных значений:', error);
      return null;
    }
  };

  // --- Хук: проверять точки после построения маршрута ---
  useEffect(() => {
    if (isRouteBuilt) {
      checkRoutePoints(pointsRef.current);
    }
    // eslint-disable-next-line
  }, [isRouteBuilt]);

  // --- Перестроение маршрута ---
  const fetchAlternatives = async (point, routeTrajectory, nextPointCoords) => {
    try {
      console.log('\n=== Поиск альтернатив ===');
      console.log('Входные параметры точки:', point);
      console.log('Траектория маршрута:', routeTrajectory);
      console.log('Координаты следующей точки:', nextPointCoords);

      // Получаем веса для категории
      console.log('\nПолучение весов для категории:', point.categoryId);
      const weights = await getWeights(point.categoryId);
      console.log('Полученные веса:', weights);

      // Формируем запрос к серверу
      const requestBody = {
        category_id: point.categoryId,
        city_id: point.cityId,
        minRating: 5, // Минимальный рейтинг пользователя
        minReviews: 1,
        originalPointCoords: {
          placeId: point.placeId,
          lon: point.lon,
          lat: point.lat
        },
        routeTrajectory: routeTrajectory,
        weights: weights,
        currentPointRating: point.rating,
        currentPointSScore: point.sScore,
        nextPointCoords: nextPointCoords
      };

      console.log('\nОтправляем запрос на сервер:', {
        url: 'http://localhost:5000/api/places/alternatives',
        method: 'POST',
        body: requestBody
      });

      const alternativesResponse = await fetch('http://localhost:5000/api/places/alternatives', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      console.log('\nПолучен ответ от сервера:', alternativesResponse);

      if (!alternativesResponse.ok) {
        console.error('Ошибка при получении альтернатив:', alternativesResponse.status);
        return null;
      }

      const alternatives = await alternativesResponse.json();
      console.log('\nПолучены альтернативы:', alternatives);

      if (!alternatives || alternatives.length === 0) {
        console.log('Альтернативы не найдены');
        return null;
      }

      // Получаем координаты точек, которые уже есть в маршруте
      const existingCoords = pointsRef.current.map(p => ({
        lon: p[0],
        lat: p[1]
      }));
      console.log('Существующие координаты точек в маршруте:', existingCoords);

      // Функция для сравнения координат с учетом погрешности
      const areCoordsEqual = (coord1, coord2) => {
        const epsilon = 0.0001; // Погрешность для сравнения координат
        return Math.abs(coord1.lon - coord2.lon) < epsilon && 
               Math.abs(coord1.lat - coord2.lat) < epsilon;
      };

      // Фильтруем альтернативы, исключая те, которые уже есть в маршруте (по координатам)
      const validAlternatives = alternatives.filter(alt => {
        const altCoords = { lon: alt.longitude, lat: alt.latitude };
        return !existingCoords.some(existingCoord => areCoordsEqual(existingCoord, altCoords));
      });
      console.log('Отфильтрованные альтернативы (исключая существующие в маршруте):', validAlternatives);

      if (validAlternatives.length === 0) {
        console.log('Нет подходящих альтернатив (все уже используются в маршруте)');
        return null;
      }

      // Берем первую подходящую альтернативу (они уже отсортированы по S-оценке на сервере)
      const alternative = validAlternatives[0];
      console.log('Выбрана альтернатива:', alternative);

      // Проверяем наличие координат в ответе
      if (!alternative.longitude || !alternative.latitude) {
        console.error('В ответе отсутствуют координаты альтернативы');
        return null;
      }

      // Преобразуем координаты в нужный формат
      const transformedCoords = [alternative.longitude, alternative.latitude];
      console.log('Преобразованные координаты:', transformedCoords);

      return {
        ...alternative,
        coords: transformedCoords
      };
    } catch (error) {
      console.error('Ошибка при поиске альтернатив:', error);
      return null;
    }
  };

  const handleRebuildRoute = () => {
    setIsRebuildMode(true);
    setSelectedPointForRebuild(null);
  };

  const handlePointSelectForRebuild = (type, index = 0) => {
    setSelectedPointForRebuild({ type, index });
  };

  const rebuildRoute = async (badPoint) => {
    console.log('\n=== Перестроение маршрута ===');
    console.log('Параметры точки для замены:', badPoint);

    try {
      // Получаем информацию о месте
      const placeInfo = await checkReviews(badPoint.name, badPoint.address);
      if (!placeInfo) {
        console.log('Не удалось получить информацию о месте');
        return;
      }

      console.log('\nПолучена информация о месте:', placeInfo);

      // Получаем текущую траекторию маршрута
      const currentRouteTrajectory = pointsRef.current.map(p => ({ lon: p[0], lat: p[1] }));
      console.log('\nТекущая траектория маршрута:', currentRouteTrajectory);

      // Находим индекс текущей плохой точки в маршруте
      const badPointIndex = pointsRef.current.findIndex(p => 
        p && p[0] === badPoint.lon && p[1] === badPoint.lat
      );

      // Определяем координаты следующей точки, если она существует
      const nextPointCoords = 
        (badPointIndex !== -1 && badPointIndex < pointsRef.current.length - 1) ? 
        { lon: pointsRef.current[badPointIndex + 1][0], lat: pointsRef.current[badPointIndex + 1][1] } : 
        null;

      // Ищем альтернативу
      const alternative = await fetchAlternatives({
        name: badPoint.name,
        address: badPoint.address,
        lon: badPoint.lon,
        lat: badPoint.lat,
        categoryId: placeInfo.categoryId,
        cityId: placeInfo.cityId,
        placeId: placeInfo.placeId,
        rating: placeInfo.rating,
        sScore: badPoint.sScore
      }, currentRouteTrajectory, nextPointCoords);

      console.log('\nРезультат поиска альтернативы:', alternative);

      if (!alternative) {
        console.log('Альтернативы не найдены, оставляем текущую точку');
        alert(`Не удалось найти подходящую альтернативу для точки "${badPoint.name}". Точка останется без изменений.`);
        return;
      }

      // Обновляем маркеры на карте
      const pointIndex = pointsRef.current.findIndex(p => 
        p && p[0] === badPoint.lon && p[1] === badPoint.lat
      );

      console.log('\nИндекс точки для замены:', pointIndex);

      if (pointIndex !== -1) {
        console.log('\nОбновляем координаты точки:', {
          old: [badPoint.lon, badPoint.lat],
          new: [alternative.longitude, alternative.latitude]
        });

        // Обновляем точки в ref
        pointsRef.current[pointIndex] = [alternative.longitude, alternative.latitude];

        // Уничтожаем старый маркер если он существует
        if (markersRef.current[pointIndex]) {
          markersRef.current[pointIndex].destroy();
        }

        // Создаем новый маркер
        const marker = new window.mapgl.Marker(mapRef.current, {
          coordinates: [alternative.longitude, alternative.latitude],
          icon: 'https://api.2gis.com/mapgl/static/images/icons/marker_default.png',
          iconOffset: [0, 0]
        });
        markersRef.current[pointIndex] = marker;

        // Очищаем текущий маршрут
        if (directionsRef.current) {
          directionsRef.current.clear();
        }

        // Перестраиваем маршрут
        await drawRoute(routeMode);
        
        // Обновляем статистику маршрута, но без алертов
        await checkRoutePoints(pointsRef.current, true);
        
        // Обновляем состояние маршрута
        setIsRouteBuilt(true);

        // Обновляем значение в соответствующем инпуте
        if (routeBuildingMethod === 'input') {
          const newName = alternative.name || alternative.full_name || alternative.address || '';
          if (pointIndex === 0) {
            setStartPoint(newName);
          } else if (pointIndex === pointsCount - 1) {
            setEndPoint(newName);
          } else {
            const newWaypoints = [...waypoints];
            newWaypoints[pointIndex - 1] = newName;
            setWaypoints(newWaypoints);
          }
        }

        // Показываем сообщение об успешной замене точки
        alert(`Точка "${badPoint.name}" успешно заменена на "${alternative.name || alternative.full_name || alternative.address}"`);
      }
    } catch (error) {
      console.error('Ошибка при перестроении маршрута:', error);
      alert('Произошла ошибка при перестроении маршрута. Пожалуйста, попробуйте снова.');
    }
  };

  const evaluateRoutePoints = async (points, routeTrajectory) => {
    try {
      const response = await fetch(`${API_URL}/places/evaluate-route-points`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          routePoints: points,
          routeTrajectory,
          weights: {
            a: 1, // weight for rating
            b: 1, // weight for reviews
            d: 1  // weight for distance
          },
          sThreshold: qualityThreshold // Send the quality threshold to the server
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to evaluate route points');
      }

      const evaluatedPoints = await response.json();
      return evaluatedPoints;
    } catch (error) {
      console.error('Error evaluating route points:', error);
      return [];
    }
  };

  // --- Функции навигации по гиду ---
  const handleNextGuideStep = () => {
    let nextStepIndex = currentGuideStep + 1;
    const currentMethod = routeBuildingMethod;
    const currentPoints = pointsCount;
    const routeIsBuilt = isRouteBuilt;

    switch (guideSteps[currentGuideStep]?.selector) {
      case '.route-building-method select':
        if (currentMethod === '') {
          nextStepIndex = currentGuideStep; // Остаемся на текущем шаге, пока не выбран метод
        } else {
        nextStepIndex = guideSteps.findIndex(step => step.selector === '.points-count-selector select');
        }
        break;

      case '.points-count-selector select':
        if (currentPoints === '') {
          nextStepIndex = currentGuideStep; // Остаемся на текущем шаге, пока не выбрано количество точек
        } else if (currentMethod === 'manual') {
          nextStepIndex = guideSteps.findIndex(step => 
            step.selector === '.map-box' && 
            step.condition({ routeBuildingMethod: 'manual', pointsCount: currentPoints, isRouteBuilt: false })
          );
        } else if (currentMethod === 'input') {
          nextStepIndex = guideSteps.findIndex(step => step.selector === '#start-point');
        }
        break;

      case '#start-point': // От начальной точки (Шаг 3 Input)
        if (currentMethod === 'input') {
          if (currentPoints > 2) {
            // К первой промежуточной точке, если есть
            nextStepIndex = guideSteps.findIndex(step => step.selector === '#waypoint-1');
        } else {
            // Если промежуточных нет, к конечной точке
            nextStepIndex = guideSteps.findIndex(step => step.selector === '#end-point');
          }
        }
         break;

      case '.map-box': // От карты (Шаг отображения маршрута Input/Manual)
        // После отображения маршрута всегда идем к параметрам перестроения, если маршрут построен
        if ((currentMethod === 'manual' || currentMethod === 'input') && routeIsBuilt) { // Этот шаг теперь общий для обоих методов
          nextStepIndex = guideSteps.findIndex(step => step.selector === '.map-ui.right-panel' && step.condition({ routeBuildingMethod: currentMethod, pointsCount, isRouteBuilt: true })); // Переход к параметрам перестроения
        } else { // Если маршрут еще не построен (хотя на этом шаге он должен быть построен), остаемся на этом шаге
           nextStepIndex = currentGuideStep;
        }
        break;

       case '#end-point': // От конечной точки (Последний шаг ввода адреса Input)
          if (currentMethod === 'input') {
              // После конечной точки переходим к отображению маршрута на карте, если он построен
               if (routeIsBuilt) {
                  nextStepIndex = guideSteps.findIndex(step => step.selector === '.map-box' && step.condition({ routeBuildingMethod: 'input', pointsCount, isRouteBuilt: true })); // Переход к шагу отображения маршрута на карте
               } else { // Если маршрут еще не построен, остаемся на этом шаге
                   nextStepIndex = currentGuideStep;
               }
          }
         break;

       case '.map-ui.right-panel': // От параметров перестроения (Общий для обоих методов)
            // Всегда идем к завершению
             nextStepIndex = guideSteps.findIndex(step => step.selector === null && step.text.includes('Обучение завершено'));
            break;

      default: // Для промежуточных точек (#waypoint-X) и шага завершения
        // Если текущий шаг - промежуточная точка в Input режиме
        if (currentMethod === 'input' && guideSteps[currentGuideStep]?.selector?.startsWith('#waypoint-')) {
            const currentWaypointIndex = parseInt(guideSteps[currentGuideStep].selector.split('-')[1]);
            if (currentWaypointIndex < currentPoints - 2) {
                // К следующей промежуточной точке
                nextStepIndex = guideSteps.findIndex(step => step.selector === `#waypoint-${currentWaypointIndex + 1}`);
    } else {
                // От последней промежуточной к конечной точке
                nextStepIndex = guideSteps.findIndex(step => step.selector === '#end-point');
            }
        } else { // Для всех остальных случаев (например, от завершения, когда selector null)
             nextStepIndex = currentGuideStep + 1; // Просто идем к следующему по порядку
        }
        break;
    }

    // Проверяем, что найденный nextStepIndex является валидным шагом и его условие выполняется
    let finalNextStepIndex = nextStepIndex;
     // Находим первый подходящий шаг начиная с nextStepIndex (включая его)
     while(finalNextStepIndex < guideSteps.length) {
         const nextStep = guideSteps[finalNextStepIndex];
          // Если у шага есть селектор, проверяем условие. Если нет селектора (шаг завершения), он всегда доступен.
        if (nextStep && (nextStep.selector === null ? nextStep.text.includes('Обучение завершено') : nextStep.condition({
            routeBuildingMethod: currentMethod,
            pointsCount: currentPoints,
            isRouteBuilt: routeIsBuilt,
        }))) { // Условие для шага завершения проверяем по тексту, для остальных по condition
            // Условие выполняется или это шаг завершения, это наш следующий шаг
            break;
        }
        // Условие не выполняется, пробуем следующий шаг по индексу
        finalNextStepIndex++;
    }
    // Если after loop finalNextStepIndex >= guideSteps.length, значит подходящего шага не найдено после текущего.


    if (finalNextStepIndex < guideSteps.length && finalNextStepIndex !== currentGuideStep) { // Проверяем, что следующий шаг найден и он не совпадает с текущим
        setCurrentGuideStep(finalNextStepIndex);
    } else if (finalNextStepIndex >= guideSteps.length) { // Если вышли за пределы массива после поиска
        setShowGuide(false); // Закрыть после последнего подходящего шага
    } else { // Если finalNextStepIndex === currentGuideStep (не нашли куда идти дальше, кроме текущего)
        // Остаемся на текущем шаге
    }
  };

  const handlePrevGuideStep = () => {
    let prevStepIndex = currentGuideStep - 1;
    const currentMethod = routeBuildingMethod;
    const currentPoints = pointsCount;
    const routeIsBuilt = isRouteBuilt;

    // Упрощенная логика возврата на предыдущий шаг
     switch (guideSteps[currentGuideStep]?.selector) { // Используем селектор текущего шага
        case '.points-count-selector select': // От выбора количества точек (Шаг 2)
            // Всегда возвращаемся к выбору способа построения (Шаг 1)
            if (currentMethod === 'manual' || currentMethod === 'input') { // Возвращаемся к выбору метода из любого второго шага
                 prevStepIndex = guideSteps.findIndex(step => step.selector === '.route-building-method select');
            }
            break;

        case '.map-box': // От карты (Шаг 3 Manual)
            // Всегда возвращаемся к выбору количества точек (Шаг 2)
            if (currentMethod === 'manual') {
               prevStepIndex = guideSteps.findIndex(step => step.selector === '.points-count-selector select');
            }
            break;

        case '#start-point': // От начальной точки (Шаг 3 Input)
             // Всегда возвращаемся к выбору количества точек (Шаг 2)
             if (currentMethod === 'input') {
                 prevStepIndex = guideSteps.findIndex(step => step.selector === '.points-count-selector select');
             }
             break;

        case '#end-point': // От конечной точки (Последний шаг ввода адреса Input)
             if (currentMethod === 'input') {
                 if (currentPoints > 2) {
                     // К последней промежуточной точке, если есть
                     prevStepIndex = guideSteps.findIndex(step => step.selector === `#waypoint-${currentPoints - 2}`);
                 } else {
                     // Если промежуточных нет, к начальной точке
                     prevStepIndex = guideSteps.findIndex(step => step.selector === '#start-point');
                 }
             }
             break;

         case null: // От шага завершения (selector === null)
              if (guideSteps[currentGuideStep]?.text.includes('Обучение завершено')) { // Проверяем, что это именно шаг завершения
                 // Всегда возвращаемся к параметрам перестроения, если маршрут построен
                 if (routeIsBuilt) {
                     prevStepIndex = guideSteps.findIndex(step => step.selector === '.map-ui.right-panel' && step.condition({ routeBuildingMethod: currentMethod, pointsCount, isRouteBuilt: true })); // Возвращаемся к параметрам перестроения
                 }
              }
             break;

        case '.map-ui.right-panel': // От параметров перестроения (Общий)
              // Возвращаемся к последнему шагу, зависящему от метода
              if (currentMethod === 'input') {
                  // К конечной точке в режиме Input
                  prevStepIndex = guideSteps.findIndex(step => step.selector === '#end-point');
              } else if (currentMethod === 'manual') {
                  // К шагу карты в режиме Manual
                  prevStepIndex = guideSteps.findIndex(step => step.selector === '.map-box');
              }
             break;

        default: // Для промежуточных точек (#waypoint-X)
            // Если текущий шаг - промежуточная точка в Input режиме
            if (currentMethod === 'input' && guideSteps[currentGuideStep]?.selector?.startsWith('#waypoint-')) {
                const currentWaypointIndex = parseInt(guideSteps[currentGuideStep].selector.split('-')[1]);
                if (currentWaypointIndex > 1) {
                    // К предыдущей промежуточной точке
                    prevStepIndex = guideSteps.findIndex(step => step.selector === `#waypoint-${currentWaypointIndex - 1}`);
                } else {
                    // От первой промежуточной к начальной точке
                    prevStepIndex = guideSteps.findIndex(step => step.selector === '#start-point');
                }
            } else { // Для всех остальных случаев (маловероятно при текущей структуре)
                 prevStepIndex = currentGuideStep - 1; // Просто идем к предыдущему по порядку
            }
            break;
     }

    // Находим первый подходящий шаг назад начиная с prevStepIndex (включая его)
    let finalPrevStepIndex = prevStepIndex;
    while(finalPrevStepIndex >= 0) {
        const prevStep = guideSteps[finalPrevStepIndex];
         // Если условие выполняется (для шага завершения условие true)
        if (prevStep && (prevStep.selector === null ? true : prevStep.condition({ routeBuildingMethod: currentMethod, pointsCount, isRouteBuilt: routeIsBuilt }))) {
             break;
         }
        // Условие не выполняется, пробуем предыдущий шаг по индексу
        finalPrevStepIndex--;
    }
    // Если after loop finalPrevStepIndex < 0, значит подходящего шага не найдено до текущего.

    if (finalPrevStepIndex >= 0) {
      setCurrentGuideStep(finalPrevStepIndex);
    } else { // Если finalPrevStepIndex < 0 (не нашли куда идти назад)
        // Остаемся на текущем шаге или можно закрыть гид, если совсем некуда идти
        // Для простоты остаемся на текущем шаге
    }
  };

  // --- Хук для обновления подсветки и позиционирования гида ---
  useEffect(() => {
    // Состояние для хранения оригинальных стилей подсвеченного элемента
    let originalElementPosition = null; // Сохраняем только position и zIndex
    let originalElementZIndex = null;
    let targetElement = null;

    const applyHighlight = () => {
      // Удаляем класс подсветки со всех элементов перед применением к текущему
      document.querySelectorAll('.is-guide-highlighted').forEach(el => {
        el.classList.remove('is-guide-highlighted');
        // Восстанавливаем оригинальные стили, если они были сохранены
        if (el === targetElement) {
          if (originalElementPosition !== null) el.style.position = originalElementPosition;
          if (originalElementZIndex !== null) el.style.zIndex = originalElementZIndex;
        }
      });

      if (!showGuide) { // При закрытии гида
        setContentStyle({}); // Сбрасываем стиль контента при закрытии
        // Сброс сохраненных оригинальных стилей при закрытии гида
        originalElementPosition = null;
        originalElementZIndex = null;
        targetElement = null;
        return;
      }

      const currentStep = guideSteps[currentGuideStep];
      targetElement = currentStep.selector ? document.querySelector(currentStep.selector) : null;

      if (targetElement) {
        // Сохраняем оригинальные стили перед изменением
        originalElementPosition = targetElement.style.position;
        originalElementZIndex = targetElement.style.zIndex;

        // Добавляем класс подсветки текущему элементу
        targetElement.classList.add('is-guide-highlighted');
        // Устанавливаем position: relative или sticky, если нет явного позиционирования, для работы z-index
        // и поднимаем z-index
         if (!targetElement.style.position || targetElement.style.position === 'static') {
             targetElement.style.position = 'relative'; // Или 'sticky' в зависимости от контекста скролла
         }
         targetElement.style.zIndex = '10002'; // Выше контента гида (10001)

        // Рассчитываем позицию для контента гида (центрируем и сдвигаем при пересечении)
        const rect = targetElement.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        const contentRect = contentRef.current?.getBoundingClientRect();
        let contentTop = (viewportHeight - (contentRect?.height || 0)) / 2; // Центрируем по вертикали
        let contentLeft = (viewportWidth - (contentRect?.width || 0)) / 2; // Центрируем по горизонтали

        // Небольшой сдвиг, если контент пересекается с элементом
        if (contentRect && rect) {
          const overlapX = Math.max(0, Math.min(rect.right, contentLeft + contentRect.width) - Math.max(rect.left, contentLeft));
          const overlapY = Math.max(0, Math.min(rect.bottom, contentTop + contentRect.height) - Math.max(rect.top, contentTop));

          if (overlapX > 0 && overlapY > 0) {
            // Если есть пересечение, сдвигаем контент вправо от элемента
            contentLeft = rect.right + 20;
            // Если после сдвига вправо контент выходит за viewport, сдвигаем его влево
            if (contentLeft + (contentRect?.width || 0) > viewportWidth - 20) {
              contentLeft = rect.left - (contentRect?.width || 0) - 20;
            }
            // Дополнительные корректировки для гарантии видимости
            contentLeft = Math.max(20, contentLeft); // Отступ 20px от левого края
            contentLeft = Math.min(contentLeft, viewportWidth - (contentRect?.width || 0) - 20); // Отступ 20px от правого края

            // Сдвигаем контент, чтобы его верх был примерно на уровне центра элемента
            contentTop = rect.top + rect.height / 2 - (contentRect?.height || 0) / 2;
             // Дополнительные корректировки для гарантии видимости
            contentTop = Math.max(20, contentTop); // Отступ 20px от верхнего края
            contentTop = Math.min(contentTop, viewportHeight - (contentRect?.height || 0) - 20); // Отступ 20px от нижнего края
          }
        }

        setContentStyle({
          top: contentTop + 'px',
          left: contentLeft + 'px',
          opacity: 1,
          transition: 'all 0.3s ease',
        });

      } else { // Если элемента нет (например, для последнего шага)
          // Позиционируем контент гида по центру viewport
           const contentRect = contentRef.current?.getBoundingClientRect();
           const viewportWidth = window.innerWidth;
           const viewportHeight = window.innerHeight;
           setContentStyle({
             top: contentRect ? (viewportHeight - contentRect.height) / 2 + 'px' : '50%',
             left: contentRect ? (viewportWidth - contentRect.width) / 2 + 'px' : '50%',
             transform: contentRect ? 'none' : 'translate(-50%, -50%)', // Центрируем без transform если размеры известны
             opacity: 1,
             transition: 'all 0.3s ease',
           });
        }
    };

    applyHighlight(); // Применяем подсветку и позицию контента при смене шага или showGuide

    // Функция очистки: восстанавливаем стили при отмонтировании или смене зависимостей
    return () => {
        // Убираем класс подсветки со всех элементов при отмонтировании
        document.querySelectorAll('.is-guide-highlighted').forEach(el => {
          el.classList.remove('is-guide-highlighted');
          // Восстанавливаем оригинальные стили
          if (el === targetElement) {
            if (originalElementPosition !== null) el.style.position = originalElementPosition;
            if (originalElementZIndex !== null) el.style.zIndex = originalElementZIndex;
          }
        });
    };

  }, [showGuide, currentGuideStep, guideSteps]); // Добавили guideSteps в зависимости хука

  // --- Хук для динамического обновления шагов гида при изменении pointsCount ---
  useEffect(() => {
    // Базовые шаги, которые есть независимо от количества промежуточных точек
    const baseSteps = [
      {
        selector: '.route-building-method select', // Шаг 1: Выбор способа построения
        text: 'Выберите способ построения маршрута: вручную на карте или по адресам.',
        condition: () => true,
      },
      {
        selector: '.points-count-selector select', // Шаг 2: Выбор количества точек
        text: 'Выберите количество промежуточных точек маршрута (включая начало и конец). Например, 3 точки - это начало, одна промежуточная и конец.',
        condition: ({ routeBuildingMethod }) => routeBuildingMethod !== '',
      },
      // Шаги для ручного построения
      {
        selector: '.map-box', // Шаг 3 (Manual): Клик на карту
        text: 'Нажмите на карту, чтобы добавить точки маршрута. Добавьте выбранное количество точек.',
        condition: ({ routeBuildingMethod, pointsCount, isRouteBuilt }) => 
          routeBuildingMethod === 'manual' && pointsCount !== '' && !isRouteBuilt,
      },
      {
        selector: '.map-box', // Шаг 4 (Manual): Параметры перестроения после построения
        text: 'Маршрут построен на карте. Проверьте его и нажмите Далее.',
        condition: ({ routeBuildingMethod, isRouteBuilt }) => 
          routeBuildingMethod === 'manual' && isRouteBuilt,
      },
      // Шаги для построения по адресам
      // Начальная точка всегда первый шаг ввода адреса для input метода
      {
        selector: '#start-point', // Шаг 3 (Input): Ввод начальной точки
        text: 'Введите адрес начальной точки маршрута и выберите его из списка подсказок.',
        condition: ({ routeBuildingMethod, pointsCount }) => 
          routeBuildingMethod === 'input' && pointsCount !== '',
      },
      // Шаг для отображения маршрута на карте после ввода адресов (для input метода)
      {
        selector: '.map-box', // Шаг 5 (Input): Параметры перестроения после построения
        text: 'Маршрут построен по указанным адресам. Проверьте его и нажмите Далее.',
        condition: ({ routeBuildingMethod, isRouteBuilt }) => 
          routeBuildingMethod === 'input' && isRouteBuilt,
      },
      // Шаг для параметров перестроения (общий для обоих методов)
      {
        selector: '.map-ui.right-panel', // Шаг 6 (Общий): Параметры перестроения
        text: 'Теперь вы можете настроить параметры перестроения маршрута или перейти к завершению обучения.',
        condition: ({ isRouteBuilt }) => isRouteBuilt,
      },
      // Завершающий шаг
      {
        selector: null, // Последний шаг: Завершение
        text: 'Обучение завершено. Теперь вы можете самостоятельно построить маршрут и использовать функцию его перестроения!',
        condition: () => true,
      },
    ];

    const dynamicSteps = [];
    if (routeBuildingMethod === 'input' && pointsCount > 2) {
      for (let i = 1; i < pointsCount - 1; i++) {
        dynamicSteps.push({
          selector: `#waypoint-${i}`,
          text: `Введите адрес промежуточной точки ${i} маршрута и выберите его из списка подсказок.`,
          condition: ({ routeBuildingMethod, pointsCount }) => routeBuildingMethod === 'input' && pointsCount > i + 1
        });
      }
    }

    // Конечная точка для input метода добавляется после динамических шагов промежуточных точек
     if (routeBuildingMethod === 'input') {
         dynamicSteps.push({
           selector: `#end-point`,
           text: 'Введите адрес конечной точки маршрута и выберите его из списка подсказок.',
           condition: ({ routeBuildingMethod, pointsCount }) => routeBuildingMethod === 'input' && pointsCount >= 2
         });
     }


    // Объединяем базовые и динамические шаги. Порядок важен!
    let finalSteps = [];
    // Добавляем первые 2 базовых шага (метод и кол-во точек)
    finalSteps.push(...baseSteps.slice(0, 2));

    if (routeBuildingMethod === 'manual') {
        // Для ручного метода добавляем шаги 3 и 4 из базовых (карта для построения и карта с построенным маршрутом)
        finalSteps.push(...baseSteps.slice(2, 4));
    } else if (routeBuildingMethod === 'input') {
        // Для метода по адресам добавляем шаг начальной точки, динамические промежуточные, конечную точку и шаг отображения маршрута
        finalSteps.push(baseSteps[4]); // Начальная точка
        finalSteps.push(...dynamicSteps); // Промежуточные и конечная (включая конечную, добавленную в dynamicSteps)
        finalSteps.push(baseSteps[5]); // Шаг отображения маршрута на карте после ввода адресов
    }

    // Добавляем общие шаги: параметры перестроения и завершение
    // Находим их по селекторам, чтобы порядок не зависел от индекса в baseSteps
    const paramsStep = baseSteps.find(step => step.selector === '.map-ui.right-panel');
    if(paramsStep) finalSteps.push(paramsStep);
    const completionStep = baseSteps.find(step => step.selector === null);
    if(completionStep) finalSteps.push(completionStep);


    setGuideSteps(finalSteps);
  }, [pointsCount, routeBuildingMethod, isRouteBuilt]); // Зависимости: пересчитываем шаги при изменении этих состояний


  // --- Эффект для подсветки текущего элемента гида ---
  useEffect(() => {
    const applyHighlight = () => {
      // Удаляем подсветку со всех элементов
      document.querySelectorAll('.is-guide-highlighted').forEach(el => {
        el.classList.remove('is-guide-highlighted');
      });

      // Only apply highlight if the guide is shown
      if (showGuide) {
        // Добавляем подсветку текущему элементу
        const currentStep = guideSteps[currentGuideStep];
        if (currentStep) {
          const element = document.querySelector(currentStep.selector);
          if (element) {
            element.classList.add('is-guide-highlighted');
            // Прокручиваем к элементу, если он не виден
            element.scrollIntoView({
              behavior: 'smooth', // Плавная прокрутка
              block: 'center', // Выравнивание элемента по центру видимой области
              inline: 'nearest'
            });
          }
        }
      }
    };

    applyHighlight();
  }, [currentGuideStep, guideSteps, showGuide]); // Add showGuide to dependencies

  const handlePointsCountChange = (e) => {
    const newCount = parseInt(e.target.value);
    console.log('Изменение количества точек на:', newCount);
    
    // Сбрасываем состояния
    setPointsCount(newCount);
    setStartPoint('');
    setEndPoint('');
    setWaypoints([]);
    setRouteInfo(null);
    setRouteDistance(null);
    setRouteDuration(null);
    setSegmentDistances([]);
    setIsRouteBuilt(false);
    setShowRebuildButton(false);

    // Очищаем маршрут только если карта уже инициализирована
    if (mapRef.current) {
      clearRoute();
    }

    // Инициализируем массивы в зависимости от выбранного способа
    if (routeBuildingMethod) {
      if (routeBuildingMethod === 'input') {
        const waypointsCount = Math.max(0, newCount - 2);
        setWaypoints(Array(waypointsCount).fill(''));
        pointsRef.current = Array(newCount).fill(null);
        setWaypointSuggestions(Array(waypointsCount).fill([]));
      } else if (routeBuildingMethod === 'manual') {
        pointsRef.current = Array(newCount).fill(null);
      }
    }
  };

  // Добавляем состояние для отслеживания инициализации полей ввода
  const [isInputModeInitialized, setIsInputModeInitialized] = useState(false);

  // Обновляем useEffect для инициализации полей ввода
  useEffect(() => {
    if (routeBuildingMethod === 'input' && pointsCount) {
      console.log('Инициализация режима ввода адресов:', { pointsCount });
      
      // Инициализируем массивы
      const waypointsCount = Math.max(0, pointsCount - 2);
      setWaypoints(Array(waypointsCount).fill(''));
      pointsRef.current = Array(pointsCount).fill(null);
      setWaypointSuggestions(Array(waypointsCount).fill([]));
      
      // Сбрасываем состояния
      setStartPoint('');
      setEndPoint('');
      setRouteInfo(null);
      setRouteDistance(null);
      setRouteDuration(null);
      setSegmentDistances([]);
      setIsRouteBuilt(false);
      setShowRebuildButton(false);
      
      // Очищаем маркеры и маршрут
      if (mapRef.current) {
        clearRoute();
      }
      
      setIsInputModeInitialized(true);
    } else {
      setIsInputModeInitialized(false);
    }
  }, [routeBuildingMethod, pointsCount]);

  const calculateSScore = async (normalizedRating, normalizedReviews, point, weights, startPoint) => {
    try {
      console.log('\n=== Расчет S-оценки ===');
      console.log('Входные параметры:');
      console.log(`- Нормализованный рейтинг: ${normalizedRating}`);
      console.log(`- Нормализованное количество отзывов: ${normalizedReviews}`);
      console.log(`- Координаты точки: [${point[0]}, ${point[1]}]`);
      console.log(`- Веса: ${JSON.stringify(weights)}`);

      if (!startPoint) {
        console.error('Начальная точка маршрута не найдена');
        return 0;
      }

      // Рассчитываем расстояние до начальной точки по формуле Хаверсина
      console.log('\n=== Расчет расстояния по формуле Хаверсина ===');
      console.log('Начальная точка:', startPoint);
      console.log('Текущая точка:', point);
      
      const distance = haversine(
        startPoint[1], // lat1
        startPoint[0], // lon1
        point[1],      // lat2
        point[0]       // lon2
      );

      console.log('Расстояние до начальной точки (км):', distance);

      // Нормализуем расстояние (предполагаем, что максимальное расстояние 10 км)
      const maxDistance = 10;
      const normalizedDistance = Math.min(distance / maxDistance, 1);
      console.log('Нормализованное расстояние:', normalizedDistance);

      // Рассчитываем S-оценку
      const sScore = (
        weights.a * normalizedRating + 
        weights.b * normalizedReviews + 
        weights.d * (1 - normalizedDistance)
      );

      console.log('\nРезультаты расчета:');
      console.log(`S-оценка = ${sScore}`);
      console.log(`Формула: S = ${weights.a} * ${normalizedRating} + ${weights.b} * ${normalizedReviews} + ${weights.d} * (1 - ${normalizedDistance})`);
      console.log(`Компоненты формулы:`);
      console.log(`- Рейтинг: ${weights.a} * ${normalizedRating} = ${weights.a * normalizedRating}`);
      console.log(`- Отзывы: ${weights.b} * ${normalizedReviews} = ${weights.b * normalizedReviews}`);
      console.log(`- Расстояние: ${weights.d} * (1 - ${normalizedDistance}) = ${weights.d * (1 - normalizedDistance)}`);

      return sScore;
    } catch (error) {
      console.error('Ошибка при расчете S-оценки:', error);
      return 0;
    }
  };

  const searchLocationByCoordinates = async (lon, lat) => {
    try {
      const url = `https://catalog.api.2gis.com/3.0/items?point=${lon},${lat}&fields=items.name,items.address_name&key=${API_KEYS.TWO_GIS}`;
      const response = await fetch(url);
      const data = await response.json();
      const item = data.result?.items?.[0];
      
      if (item) {
        return {
          name: item.name,
          address: item.address_name || ''
        };
      }
      return null;
    } catch (error) {
      console.error('Error searching location by coordinates:', error);
      return null;
    }
  };

  const getCategoryIdFromDatabase = async (name, address) => {
    try {
      const response = await fetch(`http://localhost:5000/api/places?name=${encodeURIComponent(name)}&address=${encodeURIComponent(address)}`);
      if (!response.ok) {
        console.error('Error response from places API:', response.status);
        return null;
      }
      
      const places = await response.json();
      if (places && places.length > 0) {
        return places[0].category_id;
      }
      return null;
    } catch (error) {
      console.error('Error getting category ID:', error);
      return null;
    }
  };

  const checkReviews = async (name, address) => {
    try {
      console.log('\n=== Запрос информации об отзывах ===');
      console.log(`Место: ${name}`);
      console.log(`Адрес: ${address}`);

      const response = await fetch('http://localhost:5000/api/places/check-reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, address })
      });

      if (!response.ok) {
        console.error(`Ошибка запроса check-reviews: ${response.status}`);
        return null;
      }

      const data = await response.json();
      console.log('Получены данные об отзывах:', data);

      // Проверяем наличие всех необходимых полей
      if (!data || typeof data !== 'object') {
        console.error('Некорректный формат данных от сервера');
        return null;
      }

      // Проверяем наличие информации о месте
      if (!data.place) {
        console.error('Отсутствует информация о месте');
        return null;
      }

      // Извлекаем все необходимые значения с проверкой на undefined
      const result = {
        rating: parseFloat(data.averageRating) || 0,
        hasReviews: Boolean(data.hasReviews),
        normalizedRating: parseFloat(data.normalizedRating) || 0,
        normalizedReviews: parseFloat(data.normalizedReviewsCount) || 0,
        placeId: parseInt(data.place.id) || 0,
        categoryId: parseInt(data.place.category_id) || 0,
        cityId: parseInt(data.place.city_id) || 0,
        reviewsCount: parseInt(data.reviewsCount) || 0
      };

      console.log('\nОбработанные данные:');
      console.log(`- Рейтинг: ${result.rating}`);
      console.log(`- Наличие отзывов: ${result.hasReviews}`);
      console.log(`- Нормализованный рейтинг: ${result.normalizedRating}`);
      console.log(`- Нормализованное количество отзывов: ${result.normalizedReviews}`);
      console.log(`- ID места: ${result.placeId}`);
      console.log(`- ID категории: ${result.categoryId}`);
      console.log(`- ID города: ${result.cityId}`);
      console.log(`- Количество отзывов: ${result.reviewsCount}`);

      return result;
    } catch (error) {
      console.error('Ошибка при получении информации об отзывах:', error);
      return null;
    }
  };

  const getPlaceDetails = async (name, address) => {
    try {
      const response = await fetch(`/api/places?name=${encodeURIComponent(name)}&address=${encodeURIComponent(address)}`);
      if (!response.ok) return null;
      
      const places = await response.json();
      return places && places.length > 0 ? places[0] : null;
    } catch (error) {
      console.error('Error getting place details:', error);
      return null;
    }
  };

  const getWeights = async (categoryId) => {
    try {
      console.log('\n=== Получение весов для категории ===');
      console.log(`ID категории: ${categoryId}`);

      // Используем стандартные веса, так как бэкенд не предоставляет API для весов
      const defaultWeights = {
        a: 0.4, // вес рейтинга
        b: 0.4, // вес отзывов
        d: 0.2  // вес расстояния
      };

      console.log('Используем стандартные веса:', defaultWeights);
      return defaultWeights;
    } catch (error) {
      console.error('Error getting weights:', error);
      return {
        a: 0.4,
        b: 0.4,
        d: 0.2
      };
    }
  };

  const formatDuration = (seconds) => {
    if (seconds === null) return 'N/A';
    const minutes = Math.floor(seconds / 60);
    return `${minutes} мин`;
  };

  useEffect(() => {
    localStorage.removeItem('userLocation');

    const fetchCategories = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/categories');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        setCategories(data);
      } catch (error) {
        console.error('Ошибка получения категорий:', error);
      }
    };

    fetchCategories();

    const destination = searchParams.get('destination');
    const start = searchParams.get('start');
    
    if (destination) {
      setRouteBuildingMethod('input');
      setEndPoint(destination);
      if (start) {
        setStartPoint(start);
      } else {
        getCurrentLocation();
      }
    }

    const loadScripts = () => {
      return Promise.all([
        new Promise((resolve, reject) => {
          if (window.mapgl) return resolve();
          const script = document.createElement('script');
          script.src = 'https://mapgl.2gis.com/api/js/v1';
          script.async = true;
          script.onload = resolve;
          script.onerror = () => reject(new Error('Не удалось загрузить mapgl API'));
          document.body.appendChild(script);
        }),
        new Promise((resolve, reject) => {
          if (window.Directions) return resolve();
          const script = document.createElement('script');
          script.src = 'https://unpkg.com/@2gis/mapgl-directions@^2/dist/directions.js';
          script.async = true;
          script.onload = resolve;
          script.onerror = () => reject(new Error('Не удалось загрузить Directions API'));
          document.body.appendChild(script);
        }),
      ]);
    };

    loadScripts()
      .then(() => {
        const mapgl = window.mapgl;
        const Directions = window.Directions;

        if (!mapRef.current) {
          const map = new mapgl.Map(mapContainerRef.current, {
            center: location,
            zoom: 10,
            key: API_KEYS.TWO_GIS,
          });
          mapRef.current = map;

          const directions = new Directions(map, {
            directionsApiKey: API_KEYS.TWO_GIS,
          });
          directionsRef.current = directions;

          // Добавляем обработчик клика по карте
          map.on('click', handleMapClick);
        }
      })
      .catch(console.error);

    return () => {
      if (mapRef.current) {
        mapRef.current.destroy();
        mapRef.current = null;
      }
    };
  }, [routeBuildingMethod, pointsCount]);

  const [analyzedCategories, setAnalyzedCategories] = useState(new Map());

  const analyzePoint = async (point) => {
    try {
      console.log('\n=== Запрос информации об отзывах ===');
      console.log('Место:', point.name);
      console.log('Адрес:', point.address);

      const response = await fetch(`${API_URL}/places/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: point.name,
          address: point.address,
          city_id: point.city_id
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch reviews');
      }

      const data = await response.json();
      console.log('Получены данные об отзывах:', data);

      if (!data.place || !data.place.category_id) {
        console.error('Отсутствует ID категории в данных места');
        return;
      }

      // Получаем название категории
      console.log('Запрашиваем название категории для ID:', data.place.category_id);
      try {
        const categoryResponse = await fetch(`${API_URL}/categories/get-name?id=${data.place.category_id}`);
        console.log('Ответ от сервера:', categoryResponse.status);
        if (!categoryResponse.ok) {
          throw new Error(`Failed to fetch category name: ${categoryResponse.status}`);
        }
        const categoryData = await categoryResponse.json();
        console.log('Полученные данные о категории:', categoryData);

        console.log('\nОбработанные данные:');
        console.log('- Рейтинг:', data.averageRating);
        console.log('- Наличие отзывов:', data.hasReviews);
        console.log('- Нормализованный рейтинг:', data.normalizedRating);
        console.log('- Нормализованное количество отзывов:', data.normalizedReviewsCount);
        console.log('- ID места:', data.place.id);
        console.log('- ID категории:', data.place.category_id);
        console.log('- Название категории:', categoryData.name);
        console.log('- ID города:', data.place.city_id);
        console.log('- Количество отзывов:', data.reviewsCount);

        // Store category information
        setAnalyzedCategories(prev => {
          const newMap = new Map(prev);
          newMap.set(data.place.id, {
            id: data.place.category_id,
            name: categoryData.name
          });
          return newMap;
        });
      } catch (categoryError) {
        console.error('Ошибка при получении названия категории:', categoryError);
      }

      // ... rest of the analysis code ...
    } catch (error) {
      console.error('Error analyzing point:', error);
    }
  };

  const analyzePoints = async () => {
    if (!startPoint || pointsToCheck.length === 0) {
      console.log("Нет точек для анализа");
      return;
    }

    console.log("\n=== Начало анализа точек ===");
    console.log("Начальная точка:", startPoint);
    console.log("Точки для проверки:", pointsToCheck);

    const pointsToReconstruct = [];
    const pointsStats = [];

    for (const point of pointsToCheck) {
      const result = await analyzePoint(point);
      if (result) {
        pointsStats.push(result);
        if (result.needsReconstruction) {
          pointsToReconstruct.push(point);
        }
      }
    }

    // После анализа всех точек
    console.log("\n=== Итоги проверки ===");
    console.log("Всего точек (кроме начальной):", pointsToCheck.length);
    console.log("Точек, требующих внимания (плохая S или низкий рейтинг):", pointsToReconstruct.length);
    console.log("Статистика точек:", pointsStats);
    console.log("Точки, требующие внимания:", pointsToReconstruct);

    // Получаем список уникальных категорий
    try {
      const response = await fetch(`${API_URL}/places/unique-categories`);
      if (!response.ok) {
        throw new Error('Failed to fetch categories');
      }
      const data = await response.json();
      console.log("\n=== Категории рассмотренных точек ===");
      data.categories.forEach((category, index) => {
        console.log(`${index + 1}. ${category}`);
      });
    } catch (error) {
      console.error('Ошибка при получении списка категорий:', error);
    }

    if (pointsToReconstruct.length > 0) {
      setShowRebuildButton(true);
      setIsRebuildMode(true);
    }
  };

  const displayAnalyzedPointsMarkers = async (categories) => {
    if (!mapRef.current || !categories || categories.length === 0) return;

    // Очищаем предыдущие маркеры
    searchMarkersRef.current.forEach((marker) => marker.destroy());
    searchMarkersRef.current = [];

    // Если включён фильтр качества, не создаём маркеры поиска
    if (filterOptions.qualityScore) {
      // Здесь можно оставить только код, который добавляет маркеры-альтернативы (marker.svg)
      // (например, вызовите только ту часть, которая делает fetch альтернатив и создаёт marker.svg)
      // return; // если альтернативы добавляются в другом месте
      // ...
      // (оставьте только нужную часть, если она есть)
      return;
    }

    try {
      // Получаем текущие координаты центра карты
      const center = mapRef.current.getCenter();
      const location = `${center[0]},${center[1]}`;
      console.log('Текущий центр карты:', center);

      // Формируем поисковый запрос из категорий с союзом и
      const searchQuery = categories.join(' и ');
      console.log('Поисковый запрос:', searchQuery);

      // Формируем URL для поиска мест
      const searchUrl = `https://catalog.api.2gis.com/3.0/items?q=${encodeURIComponent(searchQuery)}&location=${location}&radius=2000&fields=items.point,items.name,items.address_name,items.type,items.rubrics&key=${API_KEYS.TWO_GIS}`;
      console.log('URL запроса:', searchUrl);
      
      const response = await fetch(searchUrl);
      if (!response.ok) {
        throw new Error('Ошибка при поиске мест');
      }

      const data = await response.json();
      console.log('Полный ответ API:', data);

      const places = data.result?.items || [];
      console.log('Найдено мест:', places.length);
      console.log('Список найденных мест:', places.map(place => ({
        name: place.name,
        address: place.address_name,
        type: place.type,
        rubrics: place.rubrics,
        point: place.point
      })));

      if (places.length === 0) {
        console.log('Ничего не найдено');
        return;
      }

      // Берем только первые 5 мест
      const topPlaces = places.slice(0, 5);
      console.log('Отображаем первые 5 мест:', topPlaces.length);

      // Создаем маркеры для каждого найденного места
      topPlaces.forEach((place, index) => {
        if (place.point) {
          console.log(`Создаем маркер для места ${index + 1}:`, {
            name: place.name,
            address: place.address_name,
            coordinates: [place.point.lon, place.point.lat]
          });

          // Создаем элемент для маркера
          const el = document.createElement('div');
          el.style.width = '24px';
          el.style.height = '24px';
          el.style.backgroundImage = 'url(https://cdn-icons-png.flaticon.com/512/684/684908.png)';
          el.style.backgroundSize = 'contain';
          el.style.backgroundRepeat = 'no-repeat';

          const marker = new window.mapgl.Marker(mapRef.current, {
            coordinates: [place.point.lon, place.point.lat],
            element: el,
          });
          marker._isQuality = false;

          // Добавляем обработчики событий для маркера
          marker.on('mouseover', () => {
            // Создаем метку с информацией о месте
            marker.setLabel({
              text: `${place.name}\n${place.address_name || 'Адрес не указан'}${place.rubrics ? '\n' + place.rubrics.map(r => r.name).join(', ') : ''}`,
              offset: [0, 25],
              relativeAnchor: [0.5, 0],
              fontSize: 12,
              lineHeight: 1.2,
              image: {
                url: 'https://docs.2gis.com/img/mapgl/tooltip-top.svg',
                size: [100, 50],
                stretchX: [[10, 40], [60, 90]],
                stretchY: [[20, 40]],
                padding: [20, 10, 10, 10],
              },
            });
          });

          marker.on('mouseout', () => {
            // Удаляем метку при уходе курсора
            marker.setLabel(null);
          });

          // Добавляем обработчик клика для альтернативного маркера
          marker.on('click', async () => {
            const isRebuild = isRebuildModeRef.current;
            const selectedPoint = selectedPointForRebuildRef.current;
            if (!isRebuild || !selectedPoint) return;

            let pointIndex;
            if (selectedPoint.type === 'start') {
              pointIndex = 0;
            } else if (selectedPoint.type === 'end') {
              pointIndex = pointsCount - 1;
            } else {
              pointIndex = selectedPoint.index + 1;
            }
            const oldPoint = pointsRef.current[pointIndex];

            // Новая точка (place)
            const newS = typeof place.sScore === 'number' ? place.sScore : (place.sScore ? parseFloat(place.sScore) : null);
            const newRating = typeof place.avg_rating === 'number' ? place.avg_rating : (place.avg_rating ? parseFloat(place.avg_rating) : null);
            // Старая точка
            const oldS = typeof oldPoint.sScore === 'number' ? oldPoint.sScore : (oldPoint.sScore ? parseFloat(oldPoint.sScore) : null);
            const oldRating = typeof oldPoint.rating === 'number' ? oldPoint.rating : (oldPoint.rating ? parseFloat(oldPoint.rating) : null);
            const userRating = rating;

            let alertText = '';
            let allowReplace = true;

            const newSCategory = getSCategory(newS);
            const oldSCategory = getSCategory(oldS);

            if (newS == null || newRating == null || isNaN(newS) || isNaN(newRating)) {
              alertText = `У точки \"${place.name}\" нет информации о качестве заведения и среднему рейтингу, качества неизвестно, хотите выбрать точку \"${place.name}\" в качестве точки в маршруте?`;
              allowReplace = window.confirm(alertText);
              if (!allowReplace) return;
            } else if (oldS != null && newS > oldS && newRating >= userRating) {
              alertText = `Точка \"${place.name}\" имеет качество места ${newSCategory}, что выше, чем у прошлой точки \"${oldPoint.name}\" (${oldSCategory}) в маршруте. Рейтинг соответствует выбранному пользователем.`;
              window.alert(alertText);
            } else if (oldS != null && newS < oldS && newRating < userRating) {
              alertText = `Точка \"${place.name}\" имеет качество места ${newSCategory}, что ниже, чем у прошлой точки \"${oldPoint.name}\" (${oldSCategory}) в маршруте! Рейтинг не соответствует выбранному пользователем.`;
              window.alert(alertText);
            } else if (oldS != null && newS < oldS && newRating >= userRating) {
              alertText = `Точка \"${place.name}\" имеет качество места ${newSCategory}, что ниже, чем у прошлой точки \"${oldPoint.name}\" (${oldSCategory}) в маршруте, но рейтинг соответствует выбранному пользователем.`;
              window.alert(alertText);
            } else if (oldS != null && newS > oldS && newRating < userRating) {
              alertText = `Точка \"${place.name}\" имеет качество места ${newSCategory}, что выше, чем у прошлой точки \"${oldPoint.name}\" (${oldSCategory}) в маршруте, но рейтинг не соответствует выбранному пользователем.`;
              window.alert(alertText);
            } else if (oldS != null && newS === oldS && newRating < userRating) {
              alertText = `Точка \"${place.name}\" имеет такое же качество места (${newSCategory}), как и прошлая точка \"${oldPoint.name}\", но рейтинг не соответствует выбранному пользователем.`;
              window.alert(alertText);
            } else if (oldS != null && newS === oldS && newRating >= userRating) {
              alertText = `Точка \"${place.name}\" имеет такое же качество места (${newSCategory}), как и прошлая точка \"${oldPoint.name}\". Рейтинг соответствует выбранному пользователем.`;
              window.alert(alertText);
            }

            // --- Замена точки и перестроение маршрута ---
            pointsRef.current[pointIndex] = {
              coordinates: [place.point.lon, place.point.lat],
              name: place.name,
              address: place.address_name || '',
              sScore: newS,
              rating: newRating
            };

            if (markersRef.current[pointIndex]) {
              markersRef.current[pointIndex].destroy();
            }
            const newMarker = new window.mapgl.Marker(mapRef.current, {
              coordinates: [place.point.lon, place.point.lat],
              icon: 'https://docs.2gis.com/img/dotMarker.svg',
            });
            markersRef.current[pointIndex] = newMarker;
            if (directionsRef.current) {
              directionsRef.current.clear();
            }
            await drawRoute(routeMode);
            if (routeBuildingMethod === 'input') {
              const newName = place.name || place.full_name || place.address_name || '';
              if (pointIndex === 0) {
                setStartPoint(newName);
              } else if (pointIndex === pointsCount - 1) {
                setEndPoint(newName);
              } else {
                const newWaypoints = [...waypoints];
                newWaypoints[pointIndex - 1] = newName;
                setWaypoints(newWaypoints);
              }
            }
            setIsRebuildMode(false);
            setSelectedPointForRebuild(null);
            setIsRouteBuilt(true);
          });

          searchMarkersRef.current.push(marker);
        } else {
          console.warn(`Место ${index + 1} пропущено - нет координат:`, place);
        }
      });

      // Центрируем карту на первом найденном месте
      if (topPlaces[0].point) {
        mapRef.current.setCenter([topPlaces[0].point.lon, topPlaces[0].point.lat]);
        mapRef.current.setZoom(14);
      }

      // Получаем альтернативы с бэкенда для каждой точки маршрута (кроме начальной)
      try {
        // Получаем все точки маршрута кроме начальной
        const routePoints = pointsRef.current.slice(1);
        
        // Для каждой точки получаем альтернативы
        for (const point of routePoints) {
          // Получаем информацию о текущей точке из маршрута
          const currentPointInfo = await checkReviews(point.name, point.address);
          console.log('Текущая точка маршрута:', point.name, 'категория:', currentPointInfo.categoryId);
          
          // Получаем альтернативы для текущей категории
          const alternativesResponse = await fetch(`${API_URL}/places/alternatives`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              category_id: currentPointInfo.categoryId,
              city_id: currentPointInfo.cityId,
              originalPointCoords: {
                placeId: currentPointInfo.placeId,
                lon: point.coordinates[0],
                lat: point.coordinates[1]
              },
              routeTrajectory: pointsRef.current.map(p => ({
                lon: p.coordinates[0],
                lat: p.coordinates[1]
              })),
              weights: {
                a: 0.4,
                b: 0.4,
                d: 0.2
              }
            })
          });

          if (!alternativesResponse.ok) {
            throw new Error('Ошибка при получении альтернатив');
          }

          const alternativesData = await alternativesResponse.json();
          console.log('\nСЫРЫЕ данные с сервера для точки:', point.name, 'категория:', currentPointInfo.categoryId, JSON.stringify(alternativesData, null, 2));

          // Отображаем альтернативы на карте
          alternativesData.forEach((alt, index) => {
            const marker = new window.mapgl.Marker(mapRef.current, {
              coordinates: [Number(alt.longitude), Number(alt.latitude)],
              icon: 'https://docs.2gis.com/img/mapgl/marker.svg',
            });
            marker._isQuality = true;

            // Добавляем обработчики событий для маркера
            marker.on('mouseover', () => {
              marker.setLabel({
                text: `${alt.name}\n${alt.address}\nРейтинг: ${alt.avg_rating}\nОтзывы: ${alt.reviews_count}\nS-оценка: ${alt.sScore.toFixed(2)}\nКатегория ID: ${alt.category_id}`,
                offset: [0, 25],
                relativeAnchor: [0.5, 0],
                fontSize: 12,
                lineHeight: 1.2,
                image: {
                  url: 'https://docs.2gis.com/img/mapgl/tooltip-top.svg',
                  size: [100, 50],
                  stretchX: [[10, 40], [60, 90]],
                  stretchY: [[20, 40]],
                  padding: [20, 10, 10, 10],
                },
              });
            });

            marker.on('mouseout', () => {
              marker.setLabel(null);
            });

            // Обновляем обработчик клика для альтернативного маркера
            marker.on('click', async () => {
                const isRebuild = isRebuildModeRef.current;
                const selectedPoint = selectedPointForRebuildRef.current;
                if (!isRebuild || !selectedPoint) return;

                let pointIndex;
                if (selectedPoint.type === 'start') {
                    pointIndex = 0;
                } else if (selectedPoint.type === 'end') {
                    pointIndex = pointsCount - 1;
                } else {
                    pointIndex = selectedPoint.index + 1;
                }
                const oldPoint = pointsRef.current[pointIndex];

                // Новая точка (alt)
                const newS = typeof alt.sScore === 'number' ? alt.sScore : (alt.sScore ? parseFloat(alt.sScore) : null);
                const newRating = typeof alt.avg_rating === 'number' ? alt.avg_rating : (alt.avg_rating ? parseFloat(alt.avg_rating) : null);
                // Старая точка
                const oldS = typeof oldPoint.sScore === 'number' ? oldPoint.sScore : (oldPoint.sScore ? parseFloat(oldPoint.sScore) : null);
                const oldRating = typeof oldPoint.rating === 'number' ? oldPoint.rating : (oldPoint.rating ? parseFloat(oldPoint.rating) : null);
                const userRating = rating;

                let alertText = '';
                let allowReplace = true;

                const newSCategory = getSCategory(newS);
                const oldSCategory = getSCategory(oldS);

                if (newS == null || newRating == null || isNaN(newS) || isNaN(newRating)) {
                    // Нет информации о качестве
                    alertText = `У точки "${alt.name}" нет информации о качестве заведения и среднему рейтингу. Качество неизвестно. Хотите выбрать точку "${alt.name}" в качестве точки в маршруте?`;
                    allowReplace = window.confirm(alertText);
                    if (!allowReplace) return;
                } else {
                    // Есть информация, сравниваем
                    if (oldS != null && newS > oldS && newRating >= userRating) {
                        alertText = `Точка "${alt.name}" имеет качество места ${newSCategory}, что выше, чем у прошлой точки "${oldPoint.name}" (${oldSCategory}) в маршруте.\nРейтинг соответствует выбранному пользователем.`;
                    } else if (oldS != null && newS < oldS && newRating < userRating) {
                        alertText = `Точка "${alt.name}" имеет качество места ${newSCategory}, что ниже, чем у прошлой точки "${oldPoint.name}" (${oldSCategory}) в маршруте!\nРейтинг не соответствует выбранному пользователем.`;
                    } else if (oldS != null && newS < oldS && newRating >= userRating) {
                        alertText = `Точка "${alt.name}" имеет качество места ${newSCategory}, что ниже, чем у прошлой точки "${oldPoint.name}" (${oldSCategory}) в маршруте, но рейтинг соответствует выбранному пользователем.`;
                    } else if (oldS != null && newS > oldS && newRating < userRating) {
                        alertText = `Точка "${alt.name}" имеет качество места ${newSCategory}, что выше, чем у прошлой точки "${oldPoint.name}" (${oldSCategory}) в маршруте, но рейтинг не соответствует выбранному пользователем.`;
                    } else {
                        alertText = `Точка "${alt.name}" выбрана. S-оценка: ${newS}, рейтинг: ${newRating}`;
                    }
                    window.alert(alertText);
                }

                // --- Замена точки и перестроение маршрута ---
                pointsRef.current[pointIndex] = {
                    coordinates: [Number(alt.longitude), Number(alt.latitude)],
                    name: alt.name,
                    address: alt.address || '',
                    sScore: newS,
                    rating: newRating
                };

                if (markersRef.current[pointIndex]) {
                    markersRef.current[pointIndex].destroy();
                }
                const newMarker = new window.mapgl.Marker(mapRef.current, {
                    coordinates: [Number(alt.longitude), Number(alt.latitude)],
                    icon: 'https://docs.2gis.com/img/dotMarker.svg',
                });
                markersRef.current[pointIndex] = newMarker;
                if (directionsRef.current) {
                    directionsRef.current.clear();
                }
                await drawRoute(routeMode);
                if (routeBuildingMethod === 'input') {
                    const newName = alt.name || alt.full_name || alt.address || '';
                    if (pointIndex === 0) {
                        setStartPoint(newName);
                    } else if (pointIndex === pointsCount - 1) {
                        setEndPoint(newName);
                    } else {
                        const newWaypoints = [...waypoints];
                        newWaypoints[pointIndex - 1] = newName;
                        setWaypoints(newWaypoints);
                    }
                }
                setIsRebuildMode(false);
                setSelectedPointForRebuild(null);
                setIsRouteBuilt(true);
            });

            searchMarkersRef.current.push(marker);
          });

          // Если есть следующая точка в маршруте, получаем альтернативы для её категории
          const nextPointIndex = routePoints.indexOf(point) + 1;
          if (nextPointIndex < routePoints.length) {
            const nextPoint = routePoints[nextPointIndex];
            const nextPointInfo = await checkReviews(nextPoint.name, nextPoint.address);
            console.log('Следующая точка маршрута:', nextPoint.name, 'категория:', nextPointInfo.categoryId);
            
            // Получаем альтернативы для следующей категории
            const nextAlternativesResponse = await fetch(`${API_URL}/places/alternatives`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                category_id: nextPointInfo.categoryId,
                city_id: nextPointInfo.cityId,
                originalPointCoords: {
                  placeId: nextPointInfo.placeId,
                  lon: nextPoint.coordinates[0],
                  lat: nextPoint.coordinates[1]
                },
                routeTrajectory: pointsRef.current.map(p => ({
                  lon: p.coordinates[0],
                  lat: p.coordinates[1]
                })),
                weights: {
                  a: 0.4,
                  b: 0.4,
                  d: 0.2
                }
              })
            });

            if (!nextAlternativesResponse.ok) {
              throw new Error('Ошибка при получении альтернатив для следующей точки');
            }

            const nextAlternativesData = await nextAlternativesResponse.json();
            console.log('\nСЫРЫЕ данные с сервера для следующей точки:', nextPoint.name, 'категория:', nextPointInfo.categoryId, JSON.stringify(nextAlternativesData, null, 2));

            // Отображаем альтернативы следующей точки
            nextAlternativesData.forEach((alt, index) => {
              const marker = new window.mapgl.Marker(mapRef.current, {
                coordinates: [Number(alt.longitude), Number(alt.latitude)],
                icon: 'https://docs.2gis.com/img/mapgl/marker.svg',
              });
              marker._isQuality = true;

              marker.on('mouseover', () => {
                marker.setLabel({
                  text: `${alt.name}\n${alt.address}\nРейтинг: ${alt.avg_rating}\nОтзывы: ${alt.reviews_count}\nS-оценка: ${alt.sScore.toFixed(2)}\nКатегория ID: ${alt.category_id}`,
                  offset: [0, 25],
                  relativeAnchor: [0.5, 0],
                  fontSize: 12,
                  lineHeight: 1.2,
                  image: {
                    url: 'https://docs.2gis.com/img/mapgl/tooltip-top.svg',
                    size: [100, 50],
                    stretchX: [[10, 40], [60, 90]],
                    stretchY: [[20, 40]],
                    padding: [20, 10, 10, 10],
                  },
                });
              });

              marker.on('mouseout', () => {
                marker.setLabel(null);
              });

              // Добавляем обработчик клика для альтернативного маркера
              marker.on('click', () => {
                console.log('Нажата альтернатива:', {
                  название: alt.name,
                  координаты: [Number(alt.longitude), Number(alt.latitude)]
                });
              });

              searchMarkersRef.current.push(marker);
            });
          }
        }
      } catch (error) {
        console.error('Ошибка при получении альтернатив:', error);
      }

    } catch (error) {
      console.error('Ошибка при отображении маркеров:', error);
    }
  };

  // Добавляем ref-обертки для актуальных значений
  const isRebuildModeRef = useRef(isRebuildMode);
  const selectedPointForRebuildRef = useRef(selectedPointForRebuild);
  useEffect(() => { isRebuildModeRef.current = isRebuildMode; }, [isRebuildMode]);
  useEffect(() => { selectedPointForRebuildRef.current = selectedPointForRebuild; }, [selectedPointForRebuild]);

  function getSCategory(s) {
    if (s == null || isNaN(s)) return "неизвестное";
    if (s < qualityThreshold * 0.5) return "плохое";
    if (s <= qualityThreshold) return "хорошее";
    return "отличное";
  }

  // Добавляем эффект для обработки изменения состояния переключателя
  useEffect(() => {
    if (isRouteBuilt && isRatingFilterEnabled) {
      if (filterOptions.all) {
      fetch(`${API_URL}/places/unique-categories`)
        .then(res => res.json())
        .then(data => displayAnalyzedPointsMarkers(data.categories))
        .catch(error => console.error('Ошибка при получении категорий:', error));
      } else if (filterOptions.qualityScore) {
        // Удаляем все маркеры, кроме _isQuality === true
        searchMarkersRef.current.forEach((marker) => {
          if (!marker._isQuality) marker.destroy();
        });
        searchMarkersRef.current = searchMarkersRef.current.filter(marker => marker._isQuality);
        // Если не осталось ни одного маркера качества — подгружаем их
        if (searchMarkersRef.current.length === 0) {
          fetch(`${API_URL}/places/unique-categories`)
            .then(res => res.json())
            .then(data => displayAnalyzedPointsMarkers(data.categories))
            .catch(error => console.error('Ошибка при получении категорий:', error));
        }
      } else {
        searchMarkersRef.current.forEach((marker) => marker.destroy());
        searchMarkersRef.current = [];
      }
    } else if (!isRatingFilterEnabled) {
      searchMarkersRef.current.forEach((marker) => marker.destroy());
      searchMarkersRef.current = [];
    }
  }, [isRatingFilterEnabled, isRouteBuilt, filterOptions.all, filterOptions.qualityScore]);

  // Добавляем обработчик изменения чекбоксов
  const handleFilterOptionChange = (option) => (event) => {
    const newOptions = {
      ...filterOptions,
      [option]: event.target.checked
    };
    
    // If "all" is selected, disable other options
    if (option === 'all' && event.target.checked) {
      newOptions.qualityScore = false;
      newOptions.rating = false;
    }
    
    // If any other option is selected, disable "all"
    if (option !== 'all' && event.target.checked) {
      newOptions.all = false;
    }
    
    setFilterOptions(newOptions);
  };

  // Add this function before the return statement
  const getQualityCategory = (threshold) => {
    if (threshold < 0.4) return "плохое";
    if (threshold <= 0.8) return "хорошее";
    return "отличное";
  };

  return (
    <div className="outer-container">
      {/* Условное затемнение всего контента, если гид активен */}
      {showGuide && <div className="overlay-blur"></div>}
      <div className="page-container">
        <div className="map-inner-wrapper">
          {showGuide && (
            <div className="interactive-guide-overlay">
              <div className="interactive-guide-content" ref={contentRef} style={contentStyle}>
                <div className="guide-text">
                  {guideSteps[currentGuideStep]?.text}
                </div>
                <div className="guide-navigation">
                  <button onClick={handlePrevGuideStep} disabled={currentGuideStep === 0}>Назад</button>
                  <span>{currentGuideStep + 1} / {guideSteps.length}</span>
                  <button onClick={handleNextGuideStep}>
                    {currentGuideStep === guideSteps.length - 1 ? 'Завершить' : 'Далее'}
                  </button>
                </div>
                 <button className="guide-close" onClick={() => setShowGuide(false)}>×</button>
              </div>
            </div>
          )}
          <div id="marker-tooltip" style={tooltipStyle}>{tooltipContent}</div>
          <div className="map-ui left-panel">
            <div className="route-building-method">
              <label>Способ построения маршрута:</label>
              <select 
                value={routeBuildingMethod} 
                onChange={(e) => handleRouteBuildingMethodChange(e.target.value)}
              >
                <option value="">Выбор</option>
                <option value="manual">Вручную на карте</option>
                <option value="input">По адресам</option>
              </select>
            </div>

            <div className="points-count-selector">
              <label>Количество точек маршрута:</label>
              <select 
                value={pointsCount} 
                onChange={handlePointsCountChange}
              >
                <option value="">Выбор</option>
                <option value={2}>2 точки</option>
                <option value={3}>3 точки</option>
                <option value={4}>4 точки</option>
                <option value={5}>5 точек</option>
              </select>
            </div>

            {routeBuildingMethod === 'manual' ? (
              <>
                <button
                  onClick={clearRoute}
                  disabled={!isRouteBuilt}
                  className={isRouteBuilt ? '' : 'disabled'}
                >
                  {isRouteBuilt ? 'Сбросить точки' : `Выберите ${pointsCount} точки на карте`}
                </button>
                <div className="mode-buttons">
                  <button onClick={() => handleModeChange('driving')}>На авто</button>
                  <button onClick={() => handleModeChange('walking')}>Пешком</button>
                </div>
                {routeInfo && (
                  <div className="route-info">
                    <p>Расстояние: {routeInfo.distance} км</p>
                    <p>Время в пути: {formatDuration(routeInfo.duration)}</p>
                  </div>
                )}
              </>
            ) : (
              <div className="input-route">
                {routeBuildingMethod === 'input' && isInputModeInitialized && (
                <div className="route-input-container">
                    <div className="input-group">
                  <label 
                    htmlFor="start-point"
                    onClick={() => isRebuildMode && handlePointSelectForRebuild('start')}
                    style={{ 
                      cursor: isRebuildMode ? 'pointer' : 'default',
                      backgroundColor: selectedPointForRebuild?.type === 'start' ? '#e0e0e0' : 'transparent',
                      padding: '5px',
                      borderRadius: '4px'
                    }}
                  >
                    Начальная точка
                  </label>
                      <div className="input-with-suggestions" style={{ position: 'relative' }}>
                  <input
                    type="text"
                          id="start-point"
                    className="route-input"
                  value={startPoint}
                  onChange={(e) => handlePointChange(e, 'start')}
                    onBlur={() => setTimeout(() => setStartSuggestions([]), 100)}
                          placeholder="Введите адрес начальной точки"
                  />
                  {startSuggestions.length > 0 && (
                          <ul className="suggestions-list" style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1000 }}>
                      {startSuggestions.map((suggestion, index) => (
                        <li
                          key={index}
                          className="suggestion-item"
                          onClick={() => handlePointSuggestionClick(suggestion, 'start')}
                        >
                          <div className="suggestion-name">
                            {suggestion.name || suggestion.full_name || suggestion.address_name}
                          </div>
                          {suggestion.address_name && (
                            <div className="suggestion-address">
                              {suggestion.address_name}
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                      </div>
                </div>

                {renderWaypointInputs()}

                    <div className="input-group">
                  <label 
                    htmlFor="end-point"
                    onClick={() => isRebuildMode && handlePointSelectForRebuild('end')}
                    style={{ 
                      cursor: isRebuildMode ? 'pointer' : 'default',
                      backgroundColor: selectedPointForRebuild?.type === 'end' ? '#e0e0e0' : 'transparent',
                      padding: '5px',
                      borderRadius: '4px'
                    }}
                  >
                    Конечная точка
                  </label>
                      <div className="input-with-suggestions" style={{ position: 'relative' }}>
                  <input
                    type="text"
                          id="end-point"
                    className="route-input"
                  value={endPoint}
                  onChange={(e) => handlePointChange(e, 'end')}
                    onBlur={() => setTimeout(() => setEndSuggestions([]), 100)}
                          placeholder="Введите адрес конечной точки"
                  />
                  {endSuggestions.length > 0 && (
                          <ul className="suggestions-list" style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1000 }}>
                      {endSuggestions.map((suggestion, index) => (
                        <li
                          key={index}
                          className="suggestion-item"
                          onClick={() => handlePointSuggestionClick(suggestion, 'end')}
                        >
                           <div className="suggestion-name">
                            {suggestion.name || suggestion.full_name || suggestion.address_name}
                          </div>
                          {suggestion.address_name && (
                            <div className="suggestion-address">
                              {suggestion.address_name}
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                    </div>
                  </div>
                )}

                <div className="mode-buttons">
                  <button onClick={() => handleModeChange('driving')}>На авто</button>
                  <button onClick={() => handleModeChange('walking')}>Пешком</button>
                </div>

                {routeInfo && (
                  <div className="route-info">
                    <p>Расстояние: {routeInfo.distance} км</p>
                    <p>Время в пути: {formatDuration(routeInfo.duration)}</p>
                  </div>
                )}
              </div>
            )}

            {isRouteBuilt && (
              <button
                className="rebuild-button"
                onClick={() => handleRebuildRoute()}
                style={{marginTop: '10px', padding: '10px', width: '100%'}}
              >
                Перестроить маршрут
              </button>
            )}

            <SearchBar
              value={searchQuery}
              onChange={handleQueryChange}
              onSuggestionClick={handleSuggestionClick}
              placeholder="Введите название места"
              suggestions={searchSuggestions}
            />
            <div className="buttonCont">
              <button onClick={handleSearch} className="search-button">
                Найти место
              </button>
            </div>
          </div>
          <div style={{ position: 'relative', flex: 1 }}>
          <div ref={mapContainerRef} className="map-box" />
            {!showHelp && !showGuide && (
              <button
                className="help-button-map"
                onClick={() => setShowHelp(true)}
              >
                ?
              </button>
            )}
            {/* Кнопка для запуска интерактивного гида */}
            {!showGuide && (
              <button
                className={
                  `start-guide-button ${!hasLaunchedGuide ? 'animate-jump' : ''}`
                }
                onClick={() => { // Добавляем обработчик клика
                  setCurrentGuideStep(0); // Сбрасываем шаг на первый
                  setShowGuide(true); // Показываем гид
                  // Устанавливаем флаг в localStorage и обновляем состояние
                  localStorage.setItem('hasLaunchedGuide', 'true');
                  setHasLaunchedGuide(true);
                }}
              >
                <TourOutlinedIcon />
              </button>
            )}
          </div>
          <div className="map-ui right-panel">
            <button 
              onClick={() => setIsRebuildMode(!isRebuildMode)}
              className={isRebuildMode ? 'active' : ''}
            >
              Параметры перестроения маршрута
            </button>

            {isRebuildMode && (
              <>
                <Rating
                  rating={rating}
                  setRating={setRating}
                  hoverRating={hoverRating}
                  setHoverRating={setHoverRating}
                  isEnabled={isRatingFilterEnabled}
                  onToggle={(e) => setIsRatingFilterEnabled(e.target.checked)}
                />
                <div className="rating-filter-toggle">
                  <FormControlLabel
                    control={
                      <Switch
                        checked={isRatingFilterEnabled}
                        onChange={(e) => setIsRatingFilterEnabled(e.target.checked)}
                        color="primary"
                      />
                    }
                    label="Отображение дополнительных точек"
                />
                </div>
                <Collapse in={isRatingFilterEnabled}>
                  <Paper elevation={3} style={{ padding: '10px', marginTop: '10px', backgroundColor: '#f5f5f5' }}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={filterOptions.qualityScore}
                          onChange={handleFilterOptionChange('qualityScore')}
                          disabled={filterOptions.all}
                        />
                      }
                      label="Учет оценки качества места"
                    />
                    {filterOptions.qualityScore && (
                      <div style={{ marginTop: '10px', padding: '0 10px' }}>
                        <Typography id="quality-threshold-slider" gutterBottom>
                          Пороговое значение качества: {getQualityCategory(qualityThreshold)}
                        </Typography>
                        <Slider
                          value={qualityThreshold}
                          onChange={(_, newValue) => setQualityThreshold(newValue)}
                          aria-labelledby="quality-threshold-slider"
                          step={0.1}
                          marks
                          min={0}
                          max={1}
                          valueLabelDisplay="auto"
                          valueLabelFormat={(value) => getQualityCategory(value)}
                        />
                      </div>
                    )}
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={filterOptions.rating}
                          onChange={handleFilterOptionChange('rating')}
                          disabled={filterOptions.all}
                        />
                      }
                      label="Учет рейтинга заведения"
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={filterOptions.all}
                          onChange={handleFilterOptionChange('all')}
                        />
                      }
                      label="Отобразить все альтернативы"
                    />
                  </Paper>
                </Collapse>
                <div className="category-selector">
                  {/* <label htmlFor="categories">Категория:</label>
                    <input
                      type="text"
                    id="categories"
                    value={selectedCategory}
                    onChange={(e) => {
                      setSelectedCategory(e.target.value);
                      setCategorySearchQuery(e.target.value);
                    }}
                      onFocus={() => setIsCategoryDropdownOpen(true)}
                      onBlur={() => setTimeout(() => setIsCategoryDropdownOpen(false), 100)}
                    placeholder="Выберите категорию"
                    />
                    {isCategoryDropdownOpen && filteredCategories.length > 0 && (
                    <ul className="category-dropdown">
                        {filteredCategories.map((cat) => (
                        <li 
                          key={cat.id} 
                          onMouseDown={() => {
                              setSelectedCategory(cat.name);
                              setIsCategoryDropdownOpen(false);
                            }}
                          >
                            {cat.name}
                        </li>
                        ))}
                    </ul>
                  )} */}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {showHelp && <Help onClose={() => setShowHelp(false)} />}
    </div>
  );
};

export default MapComponent;

// Массив шагов для интерактивного гида (перенесен из InteractiveGuide.jsx)
const guideSteps = [
  {
    selector: '.route-building-method select', // Шаг 1: Выбор способа построения
    text: 'Выберите способ построения маршрута: вручную на карте или по адресам.',
    condition: () => true,
  },
  {
    selector: '.points-count-selector select', // Шаг 2: Выбор количества точек
    text: 'Выберите количество промежуточных точек маршрута (включая начало и конец). Например, 3 точки - это начало, одна промежуточная и конец.',
    condition: (props) => props.routeBuildingMethod !== '',
  },
  // Шаги для ручного построения
  {
    selector: '.map-box', // Шаг 3 (Manual): Клик на карту
    text: 'Отлично! Кликните на карту, чтобы добавить выбранное количество точек маршрута.',
    condition: (props) => props.routeBuildingMethod === 'manual' && props.pointsCount !== '',
  },
  {
    selector: '.map-ui.right-panel', // Шаг 4 (Manual): Параметры перестроения после построения
    text: 'После построения маршрута, вы можете использовать параметры справа для его перестроения, например, установив минимальный рейтинг для мест.',
    condition: (props) => props.routeBuildingMethod === 'manual' && props.isRouteBuilt,
  },
  // Шаги для способа 'input' - динамически добавляются для каждой точки
  {
    selector: '#start-point', // Шаг 3 (Input): Ввод начальной точки
    text: 'Введите адрес начальной точки маршрута.',
    condition: (props) => props.routeBuildingMethod === 'input' && props.pointsCount !== '',
  },
  // Промежуточные точки будут вставляться здесь динамически
  {
    selector: '#end-point', // Шаг N (Input): Ввод конечной точки
    text: 'Введите адрес конечной точки маршрута.',
    condition: (props) => props.routeBuildingMethod === 'input',
  },
  {
    selector: '.map-ui.right-panel', // Шаг N+1 (Input): Параметры перестроения после построения
    text: 'После построения маршрута, вы можете использовать параметры справа для его перестроения, например, установив минимальный рейтинг для мест.',
    condition: (props) => props.routeBuildingMethod === 'input' && props.isRouteBuilt,
  },
  {
    selector: null, // Последний шаг: Завершение
    text: 'Обучение завершено! Теперь вы готовы планировать свои идеальные маршруты.',
    condition: (props) => props.isRouteBuilt, // Показываем после построения маршрута любым способом
  },
];
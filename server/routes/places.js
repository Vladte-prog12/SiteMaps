const express = require('express');
const router = express.Router();
const db = require('../db');
const placeController = require('../controllers/placeController');
const { requireAuth } = require('../middleware/authMiddleware');

router.get('/', async (req, res) => {
  try {
    const { name, address } = req.query;
    let query = 'SELECT * FROM places';
    const queryParams = [];

    if (name || address) {
      query += ' WHERE';
      if (name) {
        query += ' name LIKE ?';
        queryParams.push(`%${name}%`);
      }
      if (name && address) {
        query += ' AND';
      }
      if (address) {
        query += ' address LIKE ?';
        queryParams.push(`%${address}%`);
      }
    }

    const [places] = await db.query(query, queryParams);
    res.status(200).json(places);
  } catch (err) {
    console.error('Ошибка получения мест:', err);
    res.status(500).json({ message: err.message || 'Ошибка сервера' });
  }
});


function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[m][n];
}

function similarity(a, b) {
  const levDist = levenshtein(a, b);
  const maxLen = Math.max(a.length, b.length);
  return maxLen === 0 ? 1 : 1 - levDist / maxLen;
}

const determineCategoryDynamic = async (name, db) => {
  const lowerName = name.toLowerCase();
  const [categoriesRows] = await db.query('SELECT name FROM categories');
  const categories = categoriesRows.map(row => row.name);
  let bestCategory = null;
  let bestScore = 0;
  for (const category of categories) {
    const score = similarity(lowerName, category.toLowerCase());
    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
    }
  }
  if (bestScore > 0.4) {
    return bestCategory;
  }
  return name;
};

router.post('/from-suggestion', async (req, res) => {
  console.log('Request body:', req.body);
  
  let { name, address, city_id, category_id, point } = req.body;
  if (!name || !address || !city_id || !category_id) {
    return res.status(400).json({ message: 'Не заполнены обязательные поля' });
  }

  try {
    const cityIdInt = parseInt(city_id, 10);
    if (isNaN(cityIdInt)) {
      throw new Error('Неверный формат идентификатора города');
    }

    const [existing] = await db.query('SELECT * FROM places WHERE name = ? AND address = ?', [name, address]);
    if (existing.length > 0) {
      return res.status(200).json(existing[0]);
    }

    // Берем координаты напрямую из point в запросе
    let latitude = null, longitude = null;
    if (point && point.lat && point.lon) {
      latitude = Number(point.lat);
      longitude = Number(point.lon);
      console.log('Координаты из запроса:', { latitude, longitude });
    }

    console.log('Добавляем место с координатами:', { latitude, longitude });

    const [result] = await db.query(
      'INSERT INTO places (name, address, city_id, category_id, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?)',
      [name, address, cityIdInt, category_id, latitude, longitude]
    );

    const [newPlaceRows] = await db.query('SELECT * FROM places WHERE id = ?', [result.insertId]);
    res.status(201).json(newPlaceRows[0]);
  } catch (err) {
    console.error('Ошибка создания места:', err);
    res.status(500).json({ message: err.message || 'Ошибка сервера' });
  }
});

// New route to check place reviews
router.post('/check-reviews', placeController.checkPlaceReviews);

// Helper function for min-max normalization
const normalize = (value, min, max) => {
  if (max - min === 0) return 0; // Avoid division by zero
  return (value - min) / (max - min);
};

// Helper function to calculate Haversine distance between two points (latitude, longitude)
const haversineDistance = (coords1, coords2) => {
  const R = 6371; // Radius of Earth in kilometers
  const lat1 = coords1.lat * Math.PI / 180;
  const lon1 = coords1.lon * Math.PI / 180;
  const lat2 = coords2.lat * Math.PI / 180;
  const lon2 = coords2.lon * Math.PI / 180;

  const dLat = lat2 - lat1;
  const dLon = lon2 - lon1;

  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1) * Math.cos(lat2) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distance = R * c; // Distance in kilometers
  return distance;
};

// Helper function to calculate the dot product of two vectors
const dot = (v1, v2) => v1.x * v2.x + v1.y * v2.y;

// Helper function to calculate the squared length of a vector
const lenSq = (v) => dot(v, v);

// Helper function to subtract two points to get a vector
const subtractPoints = (p2, p1) => ({ x: p2.lon - p1.lon, y: p2.lat - p1.lat });

// Helper function to calculate the distance from a point to a line segment
const distanceToSegment = (point, start, end) => {
  const A = point;
  const B = start;
  const C = end;

  const v = subtractPoints(C, B); // Vector from B to C
  const w = subtractPoints(A, B); // Vector from B to A

  const c1 = dot(w, v);
  if (c1 <= 0) return haversineDistance(A, B); // Closest point is B

  const c2 = lenSq(v);
  if (c2 <= c1) return haversineDistance(A, C); // Closest point is C

  // Closest point is on the segment
  const b = c1 / c2;
  const Pb = { lat: B.lat + b * v.y, lon: B.lon + b * v.x };
  return haversineDistance(A, Pb);
};

// Helper function to calculate the shortest distance from a point to a polyline
const distanceToPolyline = (point, polyline) => {
  if (!polyline || polyline.length < 2) {
    console.warn('Некорректная полилиния для расчета расстояния:', polyline);
    return 0; // Возвращаем 0 вместо Infinity для некорректных случаев
  }

  // Нормализуем формат точки
  const normalizedPoint = {
    lat: point.lat || point.latitude,
    lon: point.lon || point.longitude
  };

  // Нормализуем формат полилинии
  const normalizedPolyline = polyline.map(p => ({
    lat: p.lat || p.latitude,
    lon: p.lon || p.longitude
  }));

  let minDistance = Infinity;
  for (let i = 0; i < normalizedPolyline.length - 1; i++) {
    const start = normalizedPolyline[i];
    const end = normalizedPolyline[i + 1];
    const dist = distanceToSegment(normalizedPoint, start, end);
    minDistance = Math.min(minDistance, dist);
  }

  // Если не удалось рассчитать расстояние, возвращаем 0
  return isFinite(minDistance) ? minDistance : 0;
};

// Helper function to get min and max average rating for a given category and city
const getMinMaxAvgRatingForCategoryAndCity = async (categoryId, cityId) => {
  try {
    console.log(`Бэкенд: Запрос мин/макс среднего рейтинга для категории ${categoryId} в городе ${cityId}`);
    const [result] = await db.query(
      `SELECT
         MIN(avg_rating) as min_avg_rating,
         MAX(avg_rating) as max_avg_rating
       FROM (
         SELECT
           AVG(r.rating) as avg_rating
         FROM places p
         LEFT JOIN reviews r ON p.id = r.place_id
         WHERE p.category_id = ? AND p.city_id = ?
         GROUP BY p.id
         HAVING AVG(r.rating) IS NOT NULL -- Исключаем места без отзывов из расчета мин/макс
       ) as subquery`,
      [categoryId, cityId]
    );

    // Если нет мест с отзывами в данной категории/городе, или запрос пустой
    if (!result || result.length === 0 || result[0].min_avg_rating === null) {
      console.log(`Бэкенд: Мин/макс средний рейтинг не найдены для категории ${categoryId} в городе ${cityId} (нет мест с отзывами). Используем дефолтные 1-5.`);
       // Возвращаем дефолтный диапазон 1-5, если нет данных
      return { min_avg_rating: 1, max_avg_rating: 5 };
    }

    console.log(`Бэкенд: Найдены мин/макс средний рейтинг для категории ${categoryId} в городе ${cityId}: Мин=${result[0].min_avg_rating}, Макс=${result[0].max_avg_rating}`);

    // Убедимся, что min_avg_rating не меньше 1
    const minAvgRating = Math.max(1, result[0].min_avg_rating - 0.1); // Добавляем небольшой буфер
    // Убедимся, что max_avg_rating не больше 5 и не меньше minAvgRating
    const maxAvgRating = Math.min(5, Math.max(minAvgRating + 0.1, result[0].max_avg_rating));

    console.log(`Бэкенд: Скорректированные мин/макс средний рейтинг: Мин=${minAvgRating}, Макс=${maxAvgRating}`);
    return { min_avg_rating: minAvgRating, max_avg_rating: maxAvgRating };

  } catch (error) {
    console.error('Бэкенд: Ошибка получения мин/макс среднего рейтинга:', error);
    // В случае ошибки также возвращаем дефолтный диапазон
    return { min_avg_rating: 1, max_avg_rating: 5 };
  }
};

// Helper function to calculate point score S
// Now accepts dynamic min/max ratings for normalization
const calculatePointScoreS = (rating, reviewsCount, distanceToTrajectory, weights, minRatingForCategory, maxRatingForCategory, coordinates) => {
  console.log(`Бэкенд: Расчет S оценки для точки: Рейтинг=${rating}, Отзывы=${reviewsCount}, Расстояние до траектории=${distanceToTrajectory.toFixed(2)}, Веса=${JSON.stringify(weights)}`);
  console.log(`Бэкенд: Параметры нормализации рейтинга: Мин по категории/городу=${minRatingForCategory}, Макс по категории/городу=${maxRatingForCategory}`);
  if (coordinates) {
    console.log(`Бэкенд: Координаты точки: Широта=${coordinates.latitude}, Долгота=${coordinates.longitude}`);
  }

  // Проверяем наличие весов
  if (!weights || typeof weights !== 'object') {
    console.error('Бэкенд: Отсутствуют или некорректны веса для расчета S-оценки');
    return 0;
  }

  // Assume min/max values for reviews and distance are known or can be determined from data
  const minReviews = 0; // Example min reviews
  const maxReviews = 1000; // Placeholder - should be dynamic or based on context
  const maxDistanceToTrajectory = 10; // Placeholder in km - should be dynamic or based on context

  // Use dynamic min/max for rating normalization
  const normalizedRating = normalize(rating, minRatingForCategory, maxRatingForCategory);
  // Apply log to reviews count before normalization
  const normalizedReviews = normalize(Math.log(reviewsCount + 1), Math.log(minReviews + 1), Math.log(maxReviews + 1));
  const normalizedDistance = normalize(distanceToTrajectory, 0, maxDistanceToTrajectory);

  // Ensure normalized values are within [0, 1] range before calculation
  const clampedNormalizedRating = Math.max(0, Math.min(1, normalizedRating));
  const clampedNormalizedReviews = Math.max(0, Math.min(1, normalizedReviews));
  const clampedNormalizedDistance = Math.max(0, Math.min(1, normalizedDistance));

  console.log(`Бэкенд: Клампированные нормализованные значения: Рейтинг=${clampedNormalizedRating.toFixed(4)}, Отзывы=${clampedNormalizedReviews.toFixed(4)}, Расстояние=${clampedNormalizedDistance.toFixed(4)}`);

  const { a, b, d } = weights; // weights = { a, b, d }

  const s = a * clampedNormalizedRating + b * clampedNormalizedReviews + d * (1 - clampedNormalizedDistance);
  console.log(`Бэкенд: Расчет S: ${a.toFixed(2)}*${clampedNormalizedRating.toFixed(4)} + ${b.toFixed(2)}*${clampedNormalizedReviews.toFixed(4)} + ${d.toFixed(2)}*(1-${clampedNormalizedDistance.toFixed(4)}) = ${s.toFixed(4)}`);
  return s;
};

// New endpoint to evaluate route points and identify 'bad' ones
router.post('/evaluate-route-points', async (req, res) => {
  console.log('\n=== Бэкенд: Запрос оценки точек маршрута ===');
  const { routePoints, routeTrajectory, weights, sThreshold = 0.8 } = req.body;

  if (!routePoints || routePoints.length < 1 || !routeTrajectory || routeTrajectory.length < 2 || !weights) {
    console.log('Бэкенд: Отсутствуют обязательные параметры для оценки точек:', { routePoints: routePoints ? routePoints.length : 0, routeTrajectory: routeTrajectory ? routeTrajectory.length : 0, weights });
    return res.status(400).json({ message: 'Missing required parameters for point evaluation' });
  }

  try {
    const evaluatedPoints = [];

    for (const point of routePoints) {
      console.log(`Бэкенд: Оценка точки маршрута: ${point.name || 'Без имени'}, ID=${point.id || 'новый'}, Cat ID=${point.category_id}, City ID=${point.city_id}`);

      if (point.rating === undefined || point.reviewsCount === undefined || point.category_id === undefined || point.city_id === undefined || point.coords === undefined) {
        console.error('Бэкенд: Объект точки маршрута не содержит все необходимые поля для оценки S:', point);
        evaluatedPoints.push({
          ...point,
          sScore: null,
          isBad: true,
          evaluationError: 'Missing data for S score calculation'
        });
        continue;
      }

      // Получаем все места в категории и городе для анализа
      const placesQuery = `
        SELECT 
          p.*,
          COALESCE(AVG(r.rating), 0) as avg_rating,
          COUNT(r.id) as reviews_count
        FROM places p
        LEFT JOIN reviews r ON p.id = r.place_id
        WHERE p.category_id = ? 
          AND p.city_id = ?
        GROUP BY p.id
        HAVING reviews_count > 0`;

      const [places] = await db.query(placesQuery, [point.category_id, point.city_id]);
      console.log(`Бэкенд: Найдено ${places.length} мест в категории и городе для анализа`);

      // Получаем мин/макс рейтинги из найденных мест
      const min_avg_rating = Math.min(...places.map(p => p.avg_rating));
      const max_avg_rating = Math.max(...places.map(p => p.avg_rating));
      console.log(`Бэкенд: Мин/макс рейтинги в категории: ${min_avg_rating} - ${max_avg_rating}`);

      // Вычисление расстояния до траектории (D)
      const distanceToTrajectory = distanceToPolyline(point.coords, routeTrajectory);
      console.log(`Бэкенд: Расстояние точки до траектории: ${distanceToTrajectory.toFixed(2)} км`);

      // Рассчитываем S оценку с динамическими мин/макс рейтингами
      const sScore = calculatePointScoreS(
        parseFloat(point.rating || 0),
        parseInt(point.reviewsCount || 0, 10),
        distanceToTrajectory,
        weights,
        min_avg_rating,
        max_avg_rating,
        { latitude: point.coords.lat, longitude: point.coords.lon }
      );

      // Определяем, является ли точка 'bad' на основе порога
      const isBad = sScore < sThreshold;
      console.log(`Бэкенд: S-оценка точки ${point.name || 'Без имени'}: ${sScore.toFixed(4)}, Порог: ${sThreshold.toFixed(2)}, Точка 'плохая': ${isBad}`);

      evaluatedPoints.push({
        ...point,
        sScore: sScore,
        isBad: isBad,
        qualityCategory: sScore < sThreshold * 0.5 ? "плохое" : sScore <= sThreshold ? "хорошее" : "отличное"
      });
    }

    console.log(`Бэкенд: Оценка всех точек маршрута завершена. Всего оценено: ${evaluatedPoints.length}`);
    res.json(evaluatedPoints);

  } catch (error) {
    console.error('Бэкенд: Ошибка при оценке точек маршрута:', error);
    res.status(500).json({ message: 'Internal server error during route point evaluation', error: error.message });
  }
});

// Эндпоинт для поиска альтернативных мест
router.post('/alternatives', async (req, res) => {
  console.log('\n=== Бэкенд: Поиск альтернатив ===');
  const { 
    category_id, 
    city_id, 
    originalPointCoords,
    routeTrajectory,
    weights
  } = req.body;

  // Проверяем корректность routeTrajectory
  if (!routeTrajectory || !Array.isArray(routeTrajectory) || routeTrajectory.length < 2) {
    console.warn('Некорректная траектория маршрута:', routeTrajectory);
    return res.status(400).json({ message: 'Invalid route trajectory' });
  }

  console.log('Параметры поиска:', {
    category_id,
    city_id,
    originalPointCoords,
    routeTrajectoryLength: routeTrajectory.length,
    weights
  });

  try {
    // Получаем мин/макс рейтинги для категории и города
    console.log('\nЗапрос мин/макс рейтингов для категории и города:');
    const minMaxQuery = `
      SELECT
        MIN(avg_rating) as min_avg_rating,
        MAX(avg_rating) as max_avg_rating
      FROM (
        SELECT
          AVG(r.rating) as avg_rating
        FROM places p
        LEFT JOIN reviews r ON p.id = r.place_id
        WHERE p.category_id = ? AND p.city_id = ?
        GROUP BY p.id
        HAVING AVG(r.rating) IS NOT NULL
      ) as subquery`;
    
    console.log('SQL запрос:', minMaxQuery);
    console.log('Параметры:', [category_id, city_id]);

    const [minMaxResult] = await db.query(minMaxQuery, [category_id, city_id]);
    console.log('Результат запроса мин/макс рейтингов:', minMaxResult);

    const { min_avg_rating, max_avg_rating } = minMaxResult[0] || { min_avg_rating: 1, max_avg_rating: 5 };
    console.log('Используемые мин/макс рейтинги:', { min_avg_rating, max_avg_rating });
    
    // Ищем все места в категории и городе
    console.log('\nПоиск всех мест в категории и городе');
    const placesQuery = `
      SELECT 
        p.*,
        COALESCE(AVG(r.rating), 0) as avg_rating,
        COUNT(r.id) as reviews_count
      FROM places p
      LEFT JOIN reviews r ON p.id = r.place_id
      WHERE p.category_id = ? 
        AND p.city_id = ?
        AND p.id != ?
      GROUP BY p.id
      HAVING reviews_count > 0`;

    console.log('SQL запрос:', placesQuery);
    console.log('Параметры:', [category_id, city_id, originalPointCoords.placeId]);

    const [places] = await db.query(placesQuery, 
      [category_id, city_id, originalPointCoords.placeId]
    );

    console.log(`Найдено ${places.length} мест в категории и городе`);

    if (places.length === 0) {
      console.log('Альтернативы не найдены');
      return res.json([]);
    }

    // Рассчитываем S-оценку для каждого места
    console.log('\nРасчет S-оценок для найденных мест:');
    const scoredPlaces = places.map(place => {
      // Нормализуем рейтинг (от 0 до 1)
      const normalizedRating = (place.avg_rating - min_avg_rating) / (max_avg_rating - min_avg_rating);
      
      // Нормализуем количество отзывов (логарифмическая шкала от 0 до 1)
      const normalizedReviews = Math.log10(place.reviews_count + 1) / Math.log10(10);
      
      // Рассчитываем расстояние до траектории
      const distanceToTrajectory = distanceToPolyline(
        { lat: place.latitude, lon: place.longitude },
        routeTrajectory
      );
      
      console.log(`\nРасчет расстояния для ${place.name}:`, {
        coordinates: { lat: place.latitude, lon: place.longitude },
        routeTrajectory: routeTrajectory,
        rawDistance: distanceToTrajectory,
        distanceType: typeof distanceToTrajectory,
        distanceString: distanceToTrajectory.toString()
      });
      
      // Нормализуем расстояние (чем ближе к траектории, тем лучше)
      const normalizedDistance = distanceToTrajectory === 0 ? 1 : Math.max(0, 1 - (distanceToTrajectory / 10));
      
      console.log(`Нормализация расстояния для ${place.name}:`, {
        rawDistance: distanceToTrajectory,
        normalizedDistance: normalizedDistance,
        normalizedType: typeof normalizedDistance,
        normalizedString: normalizedDistance.toString()
      });

      // Рассчитываем S-оценку
      const sScore = weights.a * normalizedRating + 
                    weights.b * normalizedReviews + 
                    weights.d * normalizedDistance;

      // Формируем объект с данными
      const placeData = {
        ...place,
        normalizedRating,
        normalizedReviews,
        distanceToTrajectory,
        normalizedDistance,
        sScore
      };

      // Проверяем данные перед отправкой
      console.log(`\nДанные перед отправкой для ${place.name}:`, {
        raw: placeData,
        stringified: JSON.stringify(placeData),
        parsed: JSON.parse(JSON.stringify(placeData))
      });

      return placeData;
    });

    // Сортируем места по S-оценке (по убыванию)
    scoredPlaces.sort((a, b) => b.sScore - a.sScore);

    // Отладочный вывод перед отправкой
    console.log('\nОтправляем данные на фронтенд:');
    scoredPlaces.forEach(place => {
      console.log(`Место ${place.name}:`, {
        normalizedRating: place.normalizedRating,
        normalizedReviews: place.normalizedReviews,
        distanceToTrajectory: place.distanceToTrajectory,
        normalizedDistance: place.normalizedDistance,
        sScore: place.sScore
      });
      
      // Проверяем точность значений
      console.log(`Точность значений для ${place.name}:`, {
        normalizedRating: place.normalizedRating.toString().length,
        normalizedReviews: place.normalizedReviews.toString().length,
        distanceToTrajectory: place.distanceToTrajectory.toString().length,
        normalizedDistance: place.normalizedDistance.toString().length,
        sScore: place.sScore.toString().length
      });
    });

    // Проверяем финальные данные
    console.log('\nФинальные данные перед отправкой:', {
      raw: scoredPlaces,
      stringified: JSON.stringify(scoredPlaces),
      parsed: JSON.parse(JSON.stringify(scoredPlaces))
    });

    // Отправляем ответ с явным указанием Content-Type
    res.setHeader('Content-Type', 'application/json');
    res.json(scoredPlaces);

    // Логируем финальные данные для проверки
    console.log('\nФинальные данные для отправки:', JSON.stringify(scoredPlaces, null, 2));
  } catch (error) {
    console.error('Ошибка при поиске альтернатив:', error);
    res.status(500).json({ message: 'Internal server error during alternatives search' });
  }
});

// Обновление координат места
router.put('/:id/update-coordinates', async (req, res) => {
  const { id } = req.params;
  const { latitude, longitude } = req.body;

  if (!latitude || !longitude) {
    return res.status(400).json({ message: 'Необходимо указать координаты' });
  }

  try {
    await db.query(
      'UPDATE places SET latitude = ?, longitude = ? WHERE id = ?',
      [latitude, longitude, id]
    );

    const [updatedPlace] = await db.query('SELECT * FROM places WHERE id = ?', [id]);
    res.json(updatedPlace[0]);
  } catch (err) {
    console.error('Ошибка обновления координат:', err);
    res.status(500).json({ message: err.message || 'Ошибка сервера' });
  }
});

// Проверка существования места
router.post("/check", async (req, res) => {
  try {
    const { name, address, city_id } = req.body;

    if (!name || !address || !city_id) {
      return res.status(400).json({ message: "Необходимо указать название, адрес и город" });
    }

    const [places] = await db.query(
      "SELECT id FROM places WHERE name = ? AND address = ? AND city_id = ?",
      [name, address, city_id]
    );

    if (places.length > 0) {
      return res.status(200).json({
        exists: true,
        placeId: places[0].id
      });
    }

    return res.status(200).json({
      exists: false
    });
  } catch (error) {
    console.error("Ошибка при проверке места:", error);
    res.status(500).json({ message: "Ошибка сервера" });
  }
});

// New endpoint to evaluate a single point
router.post('/evaluate-point', async (req, res) => {
    const { lat, lon, categoryId, cityId, avgRating, reviewCount, routeTrajectory, weights } = req.body;

    if (!lat || !lon || !categoryId || !cityId || avgRating === undefined || reviewCount === undefined || !routeTrajectory || !weights) {
        return res.status(400).json({ message: 'Missing required parameters for point evaluation.' });
    }

    try {
        // Get dynamic min/max rating
        const { minAvgRating, maxAvgRating } = await getMinMaxAvgRatingForCategoryAndCity(categoryId, cityId);

        // Calculate distance to trajectory
        const distanceToTrajectory = haversineDistance(lat, lon, routeTrajectory); // Assuming haversineDistance can handle trajectory

        // Calculate S-score using backend logic with dynamic normalization
        const sScore = calculatePointScoreS(
            avgRating,
            reviewCount,
            distanceToTrajectory,
            minAvgRating,
            maxAvgRating,
            weights
        );

        res.json({ sScore });

    } catch (error) {
        console.error('Error evaluating point:', error);
        res.status(500).json({ message: 'Internal server error during point evaluation.' });
  }
});

// Endpoint to get min/max ratings for a category and city
router.post('/min-max-rating', async (req, res) => {
  console.log('\n=== Бэкенд: Получение мин/макс рейтингов ===');
  const { category_id, city_id } = req.body;

  if (!category_id || !city_id) {
    console.error('Бэкенд: Отсутствуют обязательные параметры');
    return res.status(400).json({ message: 'Missing required parameters' });
  }

  try {
    console.log(`Бэкенд: Запрос мин/макс рейтингов для категории ${category_id} в городе ${city_id}`);
    
    const [result] = await db.query(
      `SELECT
         MIN(avg_rating) as min_avg_rating,
         MAX(avg_rating) as max_avg_rating
       FROM (
         SELECT
           AVG(r.rating) as avg_rating
         FROM places p
         LEFT JOIN reviews r ON p.id = r.place_id
         WHERE p.category_id = ? AND p.city_id = ?
         GROUP BY p.id
         HAVING AVG(r.rating) IS NOT NULL
       ) as subquery`,
      [category_id, city_id]
    );

    if (!result || result.length === 0 || result[0].min_avg_rating === null) {
      console.log('Бэкенд: Не найдены места с отзывами, используем дефолтные значения');
      return res.json({ min_avg_rating: 1, max_avg_rating: 5 });
    }

    const min_avg_rating = Math.max(1, result[0].min_avg_rating - 0.1);
    const max_avg_rating = Math.min(5, Math.max(min_avg_rating + 0.1, result[0].max_avg_rating));

    console.log(`Бэкенд: Найдены мин/макс рейтинги: Мин=${min_avg_rating}, Макс=${max_avg_rating}`);
    return res.json({ min_avg_rating, max_avg_rating });

  } catch (error) {
    console.error('Бэкенд: Ошибка при получении мин/макс рейтингов:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Endpoint to get category information by ID
router.get('/category/:id', async (req, res) => {
  try {
    const categoryId = req.params.id;
    
    const [category] = await db.query(
      'SELECT * FROM categories WHERE id = ?',
      [categoryId]
    );

    if (!category || category.length === 0) {
      return res.status(404).json({ message: 'Category not found' });
    }

    res.json(category[0]);
  } catch (error) {
    console.error('Error getting category:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/reviews', async (req, res) => {
  try {
    const { name, address, city_id } = req.body;

    // Получаем информацию о месте с названием категории
    const [places] = await db.query(
      `SELECT p.*, c.name as category_name 
       FROM places p 
       LEFT JOIN categories c ON p.category_id = c.id 
       WHERE p.name = ? AND p.address = ? AND p.city_id = ?`,
      [name, address, city_id]
    );

    if (places.length === 0) {
      return res.json({
        found: false,
        message: 'Место не найдено'
      });
    }

    const place = places[0];

    // Получаем все места в той же категории и городе
    const [categoryRatings] = await db.query(
      `SELECT 
        p.id,
        p.name,
        COALESCE(AVG(r.rating), 0) as avg_rating,
        COUNT(r.id) as reviews_count
      FROM places p
      LEFT JOIN reviews r ON p.id = r.place_id
      WHERE p.category_id = ? AND p.city_id = ?
      GROUP BY p.id
      ORDER BY avg_rating ASC`,
      [place.category_id, place.city_id]
    );

    // ... rest of the code ...

    return res.json({
      found: true,
      hasReviews: reviews.length > 0,
      averageRating: averageRating,
      reviewsCount: reviews.length,
      normalizedRating: normalizedRating,
      normalizedReviewsCount: normalizedReviewsCount,
      place: {
        ...place,
        category_name: place.category_name // Добавляем название категории в ответ
      }
    });

  } catch (error) {
    console.error('Error getting place reviews:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Эндпоинт для получения названия категории по ID
router.get('/category-name/:id', async (req, res) => {
  try {
    const categoryId = req.params.id;
    
    const [category] = await db.query(
      'SELECT name FROM categories WHERE id = ?',
      [categoryId]
    );

    if (!category || category.length === 0) {
      return res.status(404).json({ message: 'Категория не найдена' });
    }

    res.json({ name: category[0].name });
  } catch (error) {
    console.error('Ошибка получения названия категории:', error);
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
});

router.get('/unique-categories', placeController.getUniqueCategories);

// New route to get unique categories
router.get('/unique-categories', async (req, res) => {
  try {
    const [categories] = await db.query(`
      SELECT DISTINCT c.name 
      FROM categories c 
      INNER JOIN places p ON c.id = p.category_id
    `);
    res.status(200).json({ categories: categories.map(c => c.name) });
  } catch (error) {
    console.error('Ошибка при получении уникальных категорий:', error);
    res.status(500).json({ message: 'Error getting unique categories', error: error.message });
  }
});

module.exports = router;

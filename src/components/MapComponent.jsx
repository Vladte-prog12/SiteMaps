const rebuildRoute = async (badPoints) => {
  console.log('Starting rebuildRoute with badPoints:', badPoints);
  const newRoute = [...route];
  
  for (const badPoint of badPoints) {
    console.log('Processing bad point:', badPoint);
    const pointIndex = newRoute.findIndex(p => 
      p.lat === badPoint.lat && p.lon === badPoint.lon
    );
    
    if (pointIndex === -1) continue;

    // Получаем альтернативы
    const alternatives = await fetchAlternatives(badPoint.category_id, badPoint.city_id);
    console.log('Received alternatives:', alternatives);

    if (alternatives.length === 0) continue;

    // Фильтруем альтернативы по расстоянию
    const k = 5;
    const alternativesWithDistance = alternatives.map(alt => ({
      ...alt,
      distance: calculateDistance(
        badPoint.lat,
        badPoint.lon,
        alt.latitude || 0,
        alt.longitude || 0
      )
    }));

    const kNearest = alternativesWithDistance
      .sort((a, b) => a.distance - b.distance)
      .slice(0, k);
    console.log('K nearest alternatives:', kNearest);

    // Если у альтернатив нет координат, получаем их через геокодирование
    // Эту часть убираем, так как сервер уже должен возвращать координаты, если они есть в базе или удалось их получить
    const alternativesWithCoords = kNearest; // Просто используем альтернативы как есть

    // Считаем score для каждой альтернативы
    const scoredAlternatives = alternativesWithCoords.map(alt => ({
      ...alt,
      score: calculateScore(alt)
    }));
    console.log('Scored alternatives:', scoredAlternatives);

    // Выбираем лучшую альтернативу
    const bestAlternative = scoredAlternatives.reduce((best, current) => {
      if (!best || current.score > best.score) return current;
      return best;
    }, null);
    console.log('Best alternative:', bestAlternative);

    if (bestAlternative && bestAlternative.latitude && bestAlternative.longitude) {
      console.log('Заменяем плохую точку на лучшую альтернативу:', bestAlternative);
      console.log('Используем координаты:', { lat: bestAlternative.latitude, lon: bestAlternative.longitude });
      // Заменяем плохую точку на альтернативу
      newRoute[pointIndex] = {
        ...newRoute[pointIndex],
        lat: bestAlternative.latitude,
        lon: bestAlternative.longitude,
        name: bestAlternative.name || bestAlternative.full_name || bestAlternative.address || 'Место на карте',
        address: bestAlternative.address || '',
        category_id: bestAlternative.category_id,
        city_id: bestAlternative.city_id,
        avg_rating: bestAlternative.avg_rating,
        review_count: bestAlternative.review_count
      };

      // Обновляем инпут на фронте, если режим - ввод адресов
      if (routeBuildingMethod === 'input') {
        const newName = bestAlternative.full_name || bestAlternative.name || bestAlternative.address || '';
        console.log('Updating input with new name:', newName, 'at index:', badPoint.index);
        if (badPoint.index === 0) {
          setStartPoint(newName);
        } else if (badPoint.index === initialPoints.length - 1) { // Используем initialPoints.length для корректного индекса EndPoint
          setEndPoint(newName);
        } else {
          const newWaypoints = [...waypoints];
          newWaypoints[badPoint.index - 1] = newName; // Индексы waypoints начинаются с 0 для точек после старта
          setWaypoints(newWaypoints);
        }
      }
    }
  }

  // Обновляем маршрут
  setRoute(newRoute);
  setBadPoints([]);
}; 
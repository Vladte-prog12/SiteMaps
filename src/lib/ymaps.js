// lib/ymaps.js
await window.ymaps3.ready; // Дожидаемся загрузки API

// Экспортируем компоненты, которые понадобятся для работы с картой
export const {
    YMap,
    YMapDefaultSchemeLayer,
    YMapDefaultFeaturesLayer,
    YMapControls,
    YMapControlButton,
    YMapFeature,
  } = window.ymaps3;
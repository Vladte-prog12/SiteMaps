import React, { useEffect, useState } from "react";
import { getCities, getPopularPlaces } from "../../services/popularPlacesService";
import { Button, Rating, Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress, Typography, Box, Divider, Chip, Grid, Paper, ImageList, ImageListItem, IconButton } from "@mui/material";
import { useNavigate } from "react-router-dom";
import DirectionsIcon from '@mui/icons-material/Directions';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import StarIcon from '@mui/icons-material/Star';
import CommentIcon from '@mui/icons-material/Comment';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PhoneIcon from '@mui/icons-material/Phone';
import LanguageIcon from '@mui/icons-material/Language';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import LocalBarIcon from '@mui/icons-material/LocalBar';
import CloseIcon from '@mui/icons-material/Close';
import "./popularPlaces.css";
import { API_KEYS } from '../../config/api';

const placeDetailsCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 минут
const API_KEY = API_KEYS.TWO_GIS; // API Key для 2GIS

const PopularPlaces = () => {
  const [cities, setCities] = useState([]);
  const [popularPlaces, setPopularPlaces] = useState([]);
  const [selectedCityId, setSelectedCityId] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [placeDetails, setPlaceDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCities();
    fetchPopularPlaces();
  }, []);

  const fetchCities = async () => {
    try {
      const data = await getCities();
      setCities(data);
    } catch (error) {
      console.error("Ошибка загрузки городов:", error);
    }
  };

  const fetchPopularPlaces = async (cityId = null) => {
    try {
      const data = await getPopularPlaces(cityId);
      setPopularPlaces(data);
    } catch (error) {
      console.error("Ошибка загрузки популярных мест:", error);
    }
  };

  const handleCityChange = (event) => {
    const cityId = event.target.value ? Number(event.target.value) : null;
    setSelectedCityId(cityId);
    fetchPopularPlaces(cityId);
  };

  const handleBuildRoute = async (place) => {
    try {
      // Пробуем взять координаты из localStorage
      let coords = null;
      const stored = localStorage.getItem('userLocation');
      if (stored) {
        const arr = JSON.parse(stored);
        if (Array.isArray(arr) && arr.length === 2) {
          coords = { longitude: arr[0], latitude: arr[1] };
        }
      }

      // Если нет в localStorage — пробуем через geolocation
      if (!coords) {
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject);
        });
        coords = { longitude: position.coords.longitude, latitude: position.coords.latitude };
      }

      // Обратное геокодирование
      const apiKey = API_KEYS.TWO_GIS;
      const url = `https://catalog.api.2gis.com/3.0/items/geocode?lon=${coords.longitude}&lat=${coords.latitude}&fields=items.point&key=${apiKey}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.result?.items?.[0]) {
        const item = data.result.items[0];
        const startAddress = item.full_name || item.address_name || item.name;
        navigate(`/yandex-map?start=${encodeURIComponent(startAddress)}&destination=${encodeURIComponent(place.address)}`);
      } else {
        navigate(`/yandex-map?start=${encodeURIComponent(`${coords.longitude},${coords.latitude}`)}&destination=${encodeURIComponent(place.address)}`);
      }
    } catch (error) {
      console.error("Ошибка при получении местоположения:", error);
      navigate(`/yandex-map?destination=${encodeURIComponent(place.address)}`);
    }
  };

  const handlePlaceDetails = async (place) => {
    setSelectedPlace(place);
    setOpenDialog(true);
    setLoading(true);
    setError('');

    // Временно убираем логику кэширования
    // const cacheKey = place.id; // Используем ID популярного места для кэша
    // const now = Date.now();
  
    // if (placeDetailsCache.has(cacheKey)) {
    //   const cached = placeDetailsCache.get(cacheKey);
    //   if (now - cached.timestamp < CACHE_TTL_MS) {
    //     console.log(`КЭШ ХИТ: данные взяты из кэша для ID "${cacheKey}" (${place.place_name || 'Название неизвестно'})`);
    //     setPlaceDetails(cached.data);
    //     setLoading(false);
    //     return;
    //   } else {
    //     console.log(`КЭШ ПРОСРОЧЕН: удаляем данные для ID "${cacheKey}" (${place.place_name || 'Название неизвестно'})`);
    //     placeDetailsCache.delete(cacheKey);
    //   }
    // } else {
    //   console.log(`КЭШ ПРОМАХ: данных не было в кэше для ID "${cacheKey}" (${place.place_name || 'Название неизвестно'})`);
    // }
  
    try {
      const apiKey = API_KEYS.TWO_GIS;
      const fields = [
        "items.point",
        "items.address",
        "items.adm_div",
        "items.full_address_name",
        "items.rubrics",
        "items.org",
        "items.schedule",
        "items.description",
        "items.flags",
        "items.contact_groups",
        "items.external_content"
      ].join(",");
  
      let url;

      // Находим город популярного места по place.city_id
      const placeCity = cities.find(city => city.id === place.city_id);

      if (!placeCity) {
          throw new Error(`Город с ID ${place.city_id} не найден в списке городов.`);
      }

      if (!placeCity.latitude || !placeCity.longitude) {
          throw new Error(`Координаты для города "${placeCity.name}" отсутствуют. Геокодируйте город сначала.`);
          // TODO: Возможно, добавить логику геокодирования города здесь, если его нет?
          // Пока просто выбрасываем ошибку.
      }

       // Используем координаты города, к которому привязано место
      const locStr = `${placeCity.longitude},${placeCity.latitude}`;
      const query = encodeURIComponent(place.place_name);

      // Формируем запрос к API 2GIS, используя название места и координаты его города
      url = `https://catalog.api.2gis.com/3.0/items?q=${query}&location=${locStr}&fields=${fields}&key=${apiKey}`;
  
      const response = await fetch(url);
      const data = await response.json();
  
      // Обработка ответа
      if (data.result && data.result.items && data.result.items.length > 0) {
        const result = data.result.items[0]; // Берем первый результат
        console.log('Ответ от API 2GIS:', result);
        console.log('External content:', result.external_content);
        setPlaceDetails(result);
        // placeDetailsCache.set(cacheKey, { timestamp: now, data: result }); // Сохранение в кэш (убрано временно)
        // console.log(`КЭШ СОХРАНЕН: данные сохранены в кэше для ID "${cacheKey}" (${place.place_name || 'Название неизвестно'})`); // Сообщение о сохранении (убрано временно)
      } else {
        setPlaceDetails(null);
        setError(`Информация о заведении "${place.place_name || 'Название неизвестно'}" в городе "${placeCity ? placeCity.name : 'ID ' + place.city_id}" не найдена в 2GIS.`);
      }

    } catch (error) {
      console.error("Ошибка при получении данных о месте:", error);
      setError('Ошибка при получении информации о заведении: ' + error.message);
      setPlaceDetails(null);
    } finally {
      setLoading(false);
    }
  };
  

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setPlaceDetails(null);
  };

  const formatSchedule = (schedule) => {
    if (!schedule) return "Информация отсутствует";
    
    try {
      const scheduleObj = typeof schedule === 'string' ? JSON.parse(schedule) : schedule;
      
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const dayNames = {
        'Mon': 'Понедельник',
        'Tue': 'Вторник',
        'Wed': 'Среда',
        'Thu': 'Четверг',
        'Fri': 'Пятница',
        'Sat': 'Суббота',
        'Sun': 'Воскресенье'
      };
      
      // Проверяем, одинаковое ли расписание для всех дней
      const allDaysSame = days.every(day => {
        if (!scheduleObj[day]) return false;
        const daySchedule = JSON.stringify(scheduleObj[day]);
        return days.every(otherDay => 
          !scheduleObj[otherDay] || JSON.stringify(scheduleObj[otherDay]) === daySchedule
        );
      });
      
      if (allDaysSame) {
        // Если расписание одинаковое для всех дней
        const firstDay = days.find(day => scheduleObj[day]);
        if (firstDay) {
          const hours = scheduleObj[firstDay].working_hours.map(h => 
            `${h.from} - ${h.to}`
          ).join(', ');
          return `Ежедневно: ${hours}`;
        }
      } else {
        // Если расписание разное для разных дней
        return days.map(day => {
          if (!scheduleObj[day]) return null;
          const hours = scheduleObj[day].working_hours.map(h => 
            `${h.from} - ${h.to}`
          ).join(', ');
          return `${dayNames[day]}: ${hours}`;
        }).filter(Boolean).join('\n');
      }
      
      return "Расписание недоступно";
    } catch (e) {
      console.error("Ошибка при форматировании расписания:", e);
      return "Расписание недоступно";
    }
  };

  // Функция для получения иконки категории
  const getCategoryIcon = (category) => {
    const categoryName = category.toLowerCase();
    if (categoryName.includes('restaurant') || categoryName.includes('кафе') || categoryName.includes('ресторан')) {
      return <RestaurantIcon fontSize="small" />;
    } else if (categoryName.includes('bar') || categoryName.includes('бар')) {
      return <LocalBarIcon fontSize="small" />;
    } else {
      return <InfoOutlinedIcon fontSize="small" />;
    }
  };

  // Функция для получения контактной информации
  const getContactInfo = (contactGroups) => {
    if (!contactGroups || !Array.isArray(contactGroups)) return null;
    
    const contacts = {};
    
    contactGroups.forEach(group => {
      if (group.type === 'phone') {
        contacts.phone = group.contacts.map(c => c.value).join(', ');
      } else if (group.type === 'website') {
        contacts.website = group.contacts.map(c => c.value).join(', ');
      }
    });
    
    return contacts;
  };

  return (
    <>
      <div className="popular-places-container">
        <h2>Популярные места</h2>

        {/* Фильтр по городам */}
        <label htmlFor="citySelect">Выберите город:</label>
        <select id="citySelect" value={selectedCityId || ""} onChange={handleCityChange}>
          <option value="">Все города</option>
          {cities.map((city) => (
            <option key={city.id} value={city.id}>
              {city.name}
            </option>
          ))}
        </select>

        {/* Список популярных мест */}
        <div className="places-list">
          {popularPlaces.length > 0 ? (
            popularPlaces.map((place) => (
              <div key={place.id} className="place-card">
                <div className="place-content">
                  <h3 className="place-title">{place.place_name}</h3>
                  <div className="place-info">
                    <div className="info-row">
                      <LocationOnIcon className="info-icon" />
                      <span>{place.address}</span>
                    </div>
                    <div className="info-row rating-row">
                      <div className="rating-container">
                        <Rating 
                          value={place.avg_rating} 
                          readOnly 
                          precision={0.5}
                          size="small"
                          emptyIcon={<StarIcon style={{ opacity: 0.3 }} fontSize="inherit" />}
                        />
                        <span className="rating-value">{place.avg_rating}</span>
                      </div>
                    </div>
                    <div className="info-row">
                      <CommentIcon className="info-icon" />
                      <span>{place.review_count} {getReviewWord(place.review_count)}</span>
                    </div>
                  </div>
                  <div className="place-actions">
                    <Button
                      variant="contained"
                      onClick={() => handleBuildRoute(place)}
                      startIcon={<DirectionsIcon />}
                      size="small"
                    >
                      Маршрут
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={() => handlePlaceDetails(place)}
                      startIcon={<InfoOutlinedIcon />}
                      size="small"
                    >
                      Подробнее
                    </Button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p>Популярных мест пока нет.</p>
          )}
        </div>
      </div>

      {/* Диалоговое окно с информацией о месте */}
      <Dialog 
        open={openDialog} 
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedPlace ? selectedPlace.place_name : "Информация о месте"}
        </DialogTitle>
        <DialogContent>
          {loading ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          ) : placeDetails ? (
            <Box sx={{ mt: 2 }}>
              <Divider sx={{ my: 2 }} />
              
              {/* Адрес */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <LocationOnIcon sx={{ mr: 1 }} />
                  Адрес
                </Typography>
                <Paper elevation={0} sx={{ p: 2, bgcolor: '#f5f5f5', borderRadius: 2 }}>
                  <Typography variant="body1">
                    {placeDetails.full_address_name || placeDetails.address_name || "Адрес не указан"}
                  </Typography>
                </Paper>
              </Box>
              
              {/* Фотографии */}
              {placeDetails.external_content && placeDetails.external_content.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>
                    Фотографии
                  </Typography>
                  <Grid container spacing={2} justifyContent="center">
                    {placeDetails.external_content.map((item, index) => (
                      // Проверяем, что у элемента есть поле main_photo_url
                      item.main_photo_url && (
                        <Grid item key={index} xs={12} sm={6} md={4}>
                          <Paper 
                            elevation={0} 
                            sx={{
                              p: 1, 
                              bgcolor: '#f5f5f5', 
                              borderRadius: 2,
                              overflow: 'hidden', // Убедимся, что изображение не выходит за границы Paper
                              display: 'flex', // Используем flexbox для центрирования изображения внутри Paper
                              justifyContent: 'center',
                              alignItems: 'center',
                              height: '300px' // Увеличиваем фиксированную высоту контейнера для фото
                            }}
                          >
                            <img
                              src={item.main_photo_url}
                              alt={`Фото ${index + 1}`}
                              loading="lazy"
                              style={{
                                borderRadius: '8px',
                                objectFit: 'cover',
                                maxWidth: '100%', // Изображение не должно выходить за ширину контейнера
                                maxHeight: '100%' // Изображение не должно выходить за высоту контейнера
                              }}
                              onClick={() => setSelectedImage(item.main_photo_url)}
                            />
                          </Paper>
                        </Grid>
                      )
                    ))}
                  </Grid>
                </Box>
              )}
              
              {/* Диалог для просмотра фото в полноэкранном режиме */}
              <Dialog
                open={!!selectedImage}
                onClose={() => setSelectedImage(null)}
                maxWidth="lg"
                fullWidth
                PaperProps={{
                  sx: {
                    bgcolor: 'rgba(0, 0, 0, 0.9)',
                    boxShadow: 'none',
                    m: 0,
                    height: '100vh'
                  }
                }}
              >
                <DialogContent sx={{ p: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <IconButton
                    onClick={() => setSelectedImage(null)}
                    sx={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      color: 'white',
                      bgcolor: 'rgba(0, 0, 0, 0.5)',
                      '&:hover': {
                        bgcolor: 'rgba(0, 0, 0, 0.7)'
                      }
                    }}
                  >
                    <CloseIcon />
                  </IconButton>
                  <img
                    src={selectedImage}
                    alt="Фото заведения"
                    style={{
                      maxWidth: '100%',
                      maxHeight: '90vh',
                      objectFit: 'contain'
                    }}
                  />
                </DialogContent>
              </Dialog>
              
              {/* Режим работы */}
              {placeDetails.schedule && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <AccessTimeIcon sx={{ mr: 1 }} />
                    Режим работы
                  </Typography>
                  <Paper elevation={0} sx={{ p: 2, bgcolor: '#f5f5f5', borderRadius: 2 }}>
                    <Typography variant="body1" component="div" sx={{ whiteSpace: 'pre-line' }}>
                      {formatSchedule(placeDetails.schedule)}
                    </Typography>
                  </Paper>
                </Box>
              )}
              
              {/* Описание */}
              {placeDetails.description && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>
                    Описание
                  </Typography>
                  <Paper elevation={0} sx={{ p: 2, bgcolor: '#f5f5f5', borderRadius: 2 }}>
                    <Typography variant="body1">
                      {placeDetails.description}
                    </Typography>
                  </Paper>
                </Box>
              )}
              
              {/* Категории */}
              {placeDetails.rubrics && placeDetails.rubrics.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>
                    Категории
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {placeDetails.rubrics.map((rubric, index) => (
                      <Chip 
                        key={index}
                        icon={getCategoryIcon(rubric.name)}
                        label={rubric.name}
                        variant="outlined"
                        sx={{ 
                          bgcolor: '#f0f7ff', 
                          borderColor: '#c0e0fa',
                          '&:hover': { bgcolor: '#e0f0ff' }
                        }}
                      />
                    ))}
                  </Box>
                </Box>
              )}
              
              {/* Контактная информация */}
              {placeDetails.contact_groups && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>
                    Контактная информация
                  </Typography>
                  <Paper elevation={0} sx={{ p: 2, bgcolor: '#f5f5f5', borderRadius: 2 }}>
                    {(() => {
                      const contacts = getContactInfo(placeDetails.contact_groups);
                      if (!contacts) return <Typography>Контактная информация отсутствует</Typography>;
                      
                      return (
                        <Grid container spacing={2}>
                          {contacts.phone && (
                            <Grid item xs={12}>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <PhoneIcon sx={{ mr: 1, color: '#2A3D56' }} />
                                <Typography variant="body1">{contacts.phone}</Typography>
                              </Box>
                            </Grid>
                          )}
                          {contacts.website && (
                            <Grid item xs={12}>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <LanguageIcon sx={{ mr: 1, color: '#2A3D56' }} />
                                <Typography variant="body1">
                                  <a 
                                    href={contacts.website.startsWith('http') ? contacts.website : `https://${contacts.website}`} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    style={{ color: '#2A3D56', textDecoration: 'none' }}
                                  >
                                    {contacts.website}
                                  </a>
                                </Typography>
                              </Box>
                            </Grid>
                          )}
                        </Grid>
                      );
                    })()}
                  </Paper>
                </Box>
              )}
              
              {/* Особенности */}
              {placeDetails.flags && Array.isArray(placeDetails.flags) && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>
                    Особенности
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {placeDetails.flags.includes("has_photos") && (
                      <Chip label="Есть фотографии" color="primary" variant="outlined" />
                    )}
                    {placeDetails.flags.includes("has_reviews") && (
                      <Chip label="Есть отзывы" color="primary" variant="outlined" />
                    )}
                    {placeDetails.flags.includes("has_website") && (
                      <Chip label="Есть сайт" color="primary" variant="outlined" />
                    )}
                  </Box>
                </Box>
              )}
            </Box>
          ) : (
            <Typography variant="body1" sx={{ p: 2 }}>
              {error || "Не удалось загрузить подробную информацию о месте."}
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 2 }}>
          {selectedPlace && (
            <Button
              variant="contained"
              onClick={() => handleBuildRoute(selectedPlace)}
              startIcon={<DirectionsIcon />}
              sx={{
                bgcolor: '#d8ebfc',
                color: '#2A3D56',
                border: '1px solid #c0e0fa',
                borderRadius: '12px',
                fontWeight: 600,
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                '&:hover': {
                  bgcolor: '#c0e0fa',
                  boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
                  transform: 'translateY(-2px)',
                  borderColor: '#a8d5f8'
                }
              }}
            >
              Маршрут
            </Button>
          )}
          <Button 
            onClick={handleCloseDialog}
            variant="outlined"
            sx={{
              color: '#2A3D56',
              border: '1px solid #c0e0fa',
              borderRadius: '12px',
              fontWeight: 600,
              '&:hover': {
                bgcolor: '#f0f7ff',
                borderColor: '#a8d5f8'
              }
            }}
          >
            Закрыть
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

const getReviewWord = (count) => {
  const lastDigit = count % 10;
  const lastTwoDigits = count % 100;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 19) return 'отзывов';
  if (lastDigit === 1) return 'отзыв';
  if (lastDigit >= 2 && lastDigit <= 4) return 'отзыва';
  return 'отзывов';
};

export default PopularPlaces;

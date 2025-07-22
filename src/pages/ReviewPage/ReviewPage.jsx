import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Rating,
  Alert,
  Stack,
  Divider,
  Grid,
  Pagination,
  IconButton,
  Tooltip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import ViewListIcon from '@mui/icons-material/ViewList';
import { motion } from 'framer-motion';
import { createReview, getReviews } from '../../services/reviewsService';
import { createPlaceFromSuggestion } from '../../services/placesService';
import { getCurrentUser } from '../../services/authService';
import { useLocation } from '../../context/LocationContext';
import debounce from 'lodash/debounce';
import leoProfanity from 'leo-profanity';
import { API_KEYS } from '../../config/api';

const API_KEY = API_KEYS.TWO_GIS;
const REVIEWS_PER_PAGE = 6;

const suggestionsCache = new Map();
const TTL = 5 * 60 * 1000;
const MAX_CACHE_ENTRIES = 50;

const getSuggestionsWithCache = async (query, location) => {
  const cacheKey = query.toLowerCase();
  const now = Date.now();

  if (suggestionsCache.has(cacheKey)) {
    const { timestamp, data } = suggestionsCache.get(cacheKey);
    if (now - timestamp < TTL) return data;
    suggestionsCache.delete(cacheKey);
  }

  const locStr = `${location[0]},${location[1]}`;
  const url = `https://catalog.api.2gis.com/3.0/suggests?q=${encodeURIComponent(query)}&location=${locStr}&fields=items.adm_div&radius=20000&key=${API_KEY}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error('Ошибка запроса к API 2GIS для предложений');

  const data = await res.json();
  const items = data.result?.items || [];

  if (suggestionsCache.size >= MAX_CACHE_ENTRIES) {
    const firstKey = suggestionsCache.keys().next().value;
    suggestionsCache.delete(firstKey);
  }

  suggestionsCache.set(cacheKey, { timestamp: now, data: items });
  return items;
};

const categories = [
  { id: 1, name: 'Кафе' },
  { id: 2, name: 'Ресторан' },
  { id: 3, name: 'Бар' },
  { id: 4, name: 'Музей' },
  { id: 5, name: 'Театр' },
];

const determineCategory = (name) => {
  const lower = name.toLowerCase();
  for (const category of categories) {
    if (lower.includes(category.name.toLowerCase())) return category.name;
  }
  return 'Кафе';
};

const ReviewPage = () => {
  const user = getCurrentUser();
  const { location } = useLocation();

  const [rating, setRating] = useState(5);
  const [text, setText] = useState('');
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [allReviews, setAllReviews] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [page, setPage] = useState(1);
  const [cities, setCities] = useState([]);
  const [selectedCity, setSelectedCity] = useState('');
  const [currentCityCoords, setCurrentCityCoords] = useState(null);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const data = await getReviews();
        setAllReviews(data || []);
      } catch (err) {
        setError(err.message);
      }
    };
    fetchReviews();
  }, []);

  useEffect(() => {
    const fetchCities = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/cities');
        if (!response.ok) {
          throw new Error('Ошибка при загрузке городов');
        }
        const data = await response.json();
        setCities(data);
      } catch (err) {
        console.error('Ошибка при загрузке городов:', err);
        setError('Ошибка при загрузке городов');
      }
    };
    fetchCities();
  }, []);

  const handleCityChange = async (event, newValue) => {
    if (!newValue) {
      setSelectedCity('');
      setCurrentCityCoords(null);
      setSearchQuery('');
      setSuggestions([]);
      return;
    }

    setSelectedCity(newValue.id);
    
    if (newValue.latitude && newValue.longitude) {
      setCurrentCityCoords([newValue.latitude, newValue.longitude]);
    } else {
      try {
        const geoResponse = await fetch(
          `https://catalog.api.2gis.com/3.0/items/geocode?q=${encodeURIComponent(newValue.name)}&fields=items.point&key=${API_KEY}`
        );

        if (!geoResponse.ok) {
          throw new Error('Ошибка при геокодировании города');
        }

        const geoData = await geoResponse.json();
        const point = geoData.result?.items?.[0]?.point;

        if (point) {
          const updateResponse = await fetch(`http://localhost:5000/api/cities/update-coordinates/${newValue.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              latitude: point.lat,
              longitude: point.lon,
            }),
          });

          if (!updateResponse.ok) {
            const errorData = await updateResponse.json();
            throw new Error(errorData.message || 'Ошибка при обновлении координат в базе');
          }

          const updateData = await updateResponse.json();
          
          setCurrentCityCoords([point.lat, point.lon]);
          
          const updatedCities = cities.map(city => 
            city.id === newValue.id 
              ? { ...city, latitude: point.lat, longitude: point.lon }
              : city
          );
          setCities(updatedCities);
        } else {
          throw new Error('Не удалось получить координаты города');
        }
      } catch (err) {
        console.error('Ошибка при получении координат города:', err);
        setError('Не удалось получить координаты города: ' + err.message);
        setSelectedCity('');
        setCurrentCityCoords(null);
      }
    }
  };

  const handleQueryChange = async ({ target: { value } }) => {
    setSearchQuery(value);

    if (value.length < 3) {
      setSuggestions([]);
      return;
    }

    if (!selectedCity || !currentCityCoords) {
      setError('Пожалуйста, сначала выберите город');
      setSuggestions([]);
      return;
    }

    try {
      const locStr = `${currentCityCoords[1]},${currentCityCoords[0]}`;
      const url = `https://catalog.api.2gis.com/3.0/suggests?q=${encodeURIComponent(value)}&location=${locStr}&fields=items.adm_div&key=${API_KEY}`;

      const res = await fetch(url);
      if (!res.ok) throw new Error('Ошибка запроса к API 2GIS для предложений');

      const data = await res.json();
      const items = data.result?.items || [];
      setSuggestions(items);
    } catch (err) {
      console.error('Ошибка запроса предложений:', err);
      setError('Ошибка при поиске мест');
    }
  };

  const checkAndAddCategory = async (categoryName) => {
    try {
      const checkResponse = await fetch(`http://localhost:5000/api/categories/check?name=${encodeURIComponent(categoryName)}`);
      const checkData = await checkResponse.json();

      if (checkData.exists) {
        console.log(`Категория "${categoryName}" уже существует в базе с ID: ${checkData.categoryId}`);
        return checkData.categoryId;
      }

      const addResponse = await fetch('http://localhost:5000/api/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: categoryName }),
      });

      if (!addResponse.ok) {
        throw new Error('Ошибка при добавлении категории');
      }

      const newCategory = await addResponse.json();
      console.log(`Добавлена новая категория "${categoryName}" с ID: ${newCategory.id}`);
      return newCategory.id;
    } catch (error) {
      console.error('Ошибка при работе с категорией:', error);
      throw error;
    }
  };

  const getPlaceDetails = async (place) => {
    try {
      const fields = [
        "items.point",
        "items.address",
        "items.adm_div",
        "items.full_address_name",
        "items.rubrics",
      ].join(",");

      const locStr = `${currentCityCoords[1]},${currentCityCoords[0]}`;
      const url = `https://catalog.api.2gis.com/3.0/items?q=${encodeURIComponent(place.name)}&location=${locStr}&fields=${fields}&key=${API_KEY}`;

      const response = await fetch(url);
      if (!response.ok) throw new Error('Ошибка запроса к API 2GIS для деталей места');

      const data = await response.json();
      
      if (data.result?.items?.[0]) {
        const placeDetails = data.result.items[0];
        console.log('Детальная информация о месте:', placeDetails);
        
        if (placeDetails.rubrics && placeDetails.rubrics.length > 0) {
          console.log('Категории заведения:', placeDetails.rubrics.map(r => r.name));
          
          const placeName = placeDetails.name.toLowerCase();
          let chosenCategory = null;
          
          if (placeName.includes('кафе')) {
            chosenCategory = placeDetails.rubrics.find(r => r.name === 'Кафе');
          } else if (placeName.includes('ресторан')) {
            chosenCategory = placeDetails.rubrics.find(r => r.name === 'Рестораны');
          } else if (placeName.includes('бар')) {
            chosenCategory = placeDetails.rubrics.find(r => r.name === 'Бары');
          }
          
          if (!chosenCategory) {
            chosenCategory = placeDetails.rubrics.find(r => r.kind === 'primary');
          }
          
          if (!chosenCategory) {
            chosenCategory = placeDetails.rubrics[0];
          }
          
          if (chosenCategory) {
            try {
              const categoryId = await checkAndAddCategory(chosenCategory.name);
              placeDetails.categoryId = categoryId;
              console.log(`Выбрана категория "${chosenCategory.name}" с ID: ${categoryId}`);
            } catch (error) {
              console.error('Ошибка при обработке категории:', error);
            }
          }
        } else {
          console.log('Категории не найдены');
        }
        
        return placeDetails;
      }
      
      return null;
    } catch (err) {
      console.error('Ошибка при получении деталей места:', err);
      return null;
    }
  };

  const debouncedQueryChange = useMemo(() => debounce(handleQueryChange, 300), [currentCityCoords]);

  useEffect(() => {
    return () => {
      debouncedQueryChange.cancel();
    };
  }, [debouncedQueryChange]);

  if (!user) {
    return (
      <Box maxWidth="md" mx="auto" p={4}>
        <Alert severity="info">Войдите в аккаунт, чтобы оставить отзыв</Alert>
      </Box>
    );
  }

  useEffect(() => {
    leoProfanity.clearList();
    leoProfanity.add(leoProfanity.getDictionary('ru'));
    leoProfanity.add(leoProfanity.getDictionary('en'));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPlace || typeof selectedPlace !== 'object') {
      setError('Пожалуйста, выберите место из подсказок');
      return;
    }
    if (!text.trim()) {
      setError('Пожалуйста, заполните поле отзыва');
      return;
    }
    if (!selectedCity) {
      setError('Пожалуйста, выберите город');
      return;
    }

    if (leoProfanity.check(text)) {
      setError('Ваш отзыв содержит недопустимую лексику. Пожалуйста, исправьте его.');
      return;
    }

    if (!user.id) {
      setError('Ошибка: не найден id пользователя');
      return;
    }

    let cityData = cities.find(c => c.id === selectedCity);
    if (!cityData) {
      setError('Ошибка: не найден город в списке');
      return;
    }

    if (!selectedPlace.categoryId) {
      setError('Ошибка: не удалось определить категорию заведения');
      return;
    }

    let localPlaceId;
    try {
      if (!selectedPlace.point) {
        throw new Error('Не удалось получить координаты места');
      }

      // Сначала проверяем, существует ли уже такое место
      const checkPlaceResponse = await fetch(`http://localhost:5000/api/places/check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: selectedPlace.name,
          address: selectedPlace.address_name,
          city_id: selectedCity
        }),
      });

      const checkPlaceData = await checkPlaceResponse.json();

      if (checkPlaceData.exists) {
        // Если место существует, используем его ID
        localPlaceId = checkPlaceData.placeId;
        console.log('Место уже существует в базе с ID:', localPlaceId);
      } else {
        // Если места нет, создаем новое
        console.log('Отправляем данные на сервер:', {
          name: selectedPlace.name,
          address: selectedPlace.address_name,
          city_id: selectedCity,
          category_id: selectedPlace.categoryId,
          point: selectedPlace.point
        });

        const placeResponse = await fetch('http://localhost:5000/api/places/from-suggestion', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: selectedPlace.name,
            address: selectedPlace.address_name,
            city_id: selectedCity,
            category_id: selectedPlace.categoryId,
            point: selectedPlace.point
          }),
        });

        if (!placeResponse.ok) {
          throw new Error('Ошибка при создании места');
        }

        const placeData = await placeResponse.json();
        localPlaceId = placeData.id;
        if (placeData.latitude && placeData.longitude) {
          console.log('Координаты нового места:', placeData.latitude, placeData.longitude);
        }
      }
      setSuggestions([]);
    } catch (err) {
      setError('Ошибка при сохранении заведения: ' + err.message);
      return;
    }

    const payload = {
      user_id: user.id,
      rating: rating ?? 1,
      comment: text,
      place_id: localPlaceId,
    };

    try {
      setError('');
      const newReview = await createReview(payload);
      setAllReviews([newReview, ...allReviews]);
      setText('');
      setRating(5);
      setSelectedCity('');
      setSuccess('Отзыв успешно отправлен!');
      setTimeout(() => setSuccess(''), 3000);
      setPage(1);
    } catch (err) {
      setError(err.message);
    }
  };

  const totalPages = Math.ceil(allReviews.length / REVIEWS_PER_PAGE);
  const currentReviews = allReviews.slice((page - 1) * REVIEWS_PER_PAGE, page * REVIEWS_PER_PAGE);

  const renderReviewCard = (review) => (
    <motion.div
      key={review.id}
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: false }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <Paper elevation={3} className="review-card">
        <Box p={2}>
          <Box className="review-info">
            <Box className="reviewer-info">
              <Typography variant="h6" className="review-author" sx={{ fontFamily: 'var(--font-family)' }}>{review.userName}</Typography>
              <Typography variant="body2" className="review-date" sx={{ fontFamily: 'var(--font-family)' }}>{new Date(review.created_at).toLocaleDateString()}</Typography>
            </Box>
            <Rating value={review.rating} readOnly size="small" className="review-rating" sx={{ fontFamily: 'var(--font-family)' }}/>
          </Box>
          {
            review.placeName && (
              <Box className="review-place">
                <Typography variant="body2" className="review-place-name" sx={{ fontFamily: 'var(--font-family)' }}>
                  Заведение: {review.placeName}
                </Typography>
                {
                  review.placeAddress && (
                    <Typography variant="body2" className="review-place-address" sx={{ fontFamily: 'var(--font-family)' }}>
                      Адрес: {review.placeAddress}
                    </Typography>
                  )
                }
              </Box>
            )
          }
          <Typography variant="body1" className="review-comment" mt={2} sx={{ fontFamily: 'var(--font-family)' }}>
            {review.comment}
          </Typography>
        </Box>
      </Paper>
    </motion.div>
  );

  return (
    <Box maxWidth="md" mx="auto" p={4}>
      <Typography variant="h4" component="h1" gutterBottom className="review-title" sx={{ fontFamily: 'var(--font-family)', textAlign: 'center' }}>
        Оставить отзыв
      </Typography>
      <Paper elevation={3} sx={{ p: 4, mb: 6 }}>
        <form onSubmit={handleSubmit}>
          <Stack spacing={3}>
            {error && <Alert severity="error" sx={{ fontFamily: 'var(--font-family)' }}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ fontFamily: 'var(--font-family)' }}>{success}</Alert>}
            
            <Autocomplete
              value={cities.find(city => city.id === selectedCity) || null}
              onChange={handleCityChange}
              options={cities}
              getOptionLabel={(option) => option.name}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Выберите город"
                  required
                  variant="outlined"
                  sx={{ fontFamily: 'var(--font-family)' }}
                  InputLabelProps={{ sx: { fontFamily: 'var(--font-family)' } }}
                  InputProps={{
                    ...params.InputProps,
                    sx: { fontFamily: 'var(--font-family)' },
                  }}
                />
              )}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              noOptionsText="Город не найден"
              loadingText="Загрузка..."
              filterOptions={(options, { inputValue }) => {
                const searchTerm = inputValue.toLowerCase();
                return options.filter(option => 
                  option.name.toLowerCase().includes(searchTerm)
                );
              }}
              renderOption={(props, option) => (
                <li {...props} key={option.id} style={{ fontFamily: 'var(--font-family)' }}>
                  {option.name}
                </li>
              )}
            />

            <Autocomplete
              freeSolo
              options={suggestions}
              getOptionLabel={(option) => option.name || ''}
              inputValue={searchQuery}
              onInputChange={(event, newInputValue) => {
                setSearchQuery(newInputValue);
                debouncedQueryChange({ target: { value: newInputValue } });
              }}
              onChange={async (event, newValue) => {
                if (typeof newValue === 'object' && newValue !== null) {
                  const placeDetails = await getPlaceDetails(newValue);
                  if (placeDetails) {
                    console.log('Выбрано место:', newValue.name);
                    console.log('Полная информация о месте:', placeDetails);
                    setSelectedPlace({
                      ...newValue,
                      point: placeDetails.point,
                      categoryId: placeDetails.categoryId
                    });
                    setSearchQuery(newValue.name);
                  } else {
                     setSelectedPlace(null);
                     setSearchQuery('');
                  }
                } else {
                  setSelectedPlace(null);
                  setSearchQuery('');
                }
              }}
              renderInput={(params) => (
                <TextField 
                  {...params} 
                  label="Найти место" 
                  variant="outlined"
                  disabled={!selectedCity || !currentCityCoords}
                  helperText={!selectedCity ? "Сначала выберите город" : !currentCityCoords ? "Загрузка координат города..." : ""}
                  sx={{ fontFamily: 'var(--font-family)' }}
                  InputLabelProps={{ sx: { fontFamily: 'var(--font-family)' } }}
                  InputProps={{
                    ...params.InputProps,
                    sx: { fontFamily: 'var(--font-family)' },
                  }}
                  FormHelperTextProps={{ sx: { fontFamily: 'var(--font-family)' } }}
                />
              )}
              renderOption={(props, option) => (
                <li {...props} key={option.id || option.name} style={{ fontFamily: 'var(--font-family)' }}>
                  {option.name}
                </li>
              )}
            />
            <Box>
              <Typography variant="subtitle1" gutterBottom sx={{ fontFamily: 'var(--font-family)' }}>
                Оценка
              </Typography>
              <Rating value={rating} onChange={(_, newValue) => setRating(newValue ?? 1)} size="large" sx={{ fontFamily: 'var(--font-family)' }} />
            </Box>
            <TextField
              label="Ваш отзыв"
              variant="outlined"
              fullWidth
              multiline
              minRows={4}
              value={text}
              onChange={(e) => setText(e.target.value)}
              sx={{ fontFamily: 'var(--font-family)' }}
              InputLabelProps={{ sx: { fontFamily: 'var(--font-family)' } }}
              InputProps={{
                sx: { fontFamily: 'var(--font-family)' },
              }}
            />
            <Button type="submit" variant="contained" size="large">
              Отправить
            </Button>
          </Stack>
        </form>
      </Paper>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h5" fontWeight="bold" sx={{ fontFamily: 'var(--font-family)' }}>
          Отзывы ({allReviews.length})
        </Typography>
      </Stack>
      {allReviews.length === 0 ? (
        <Typography color="text.secondary">Пока нет ни одного отзыва.</Typography>
      ) : (
        <Stack spacing={3}>
          {currentReviews.map((review) => (
            <Box key={review.id}>{renderReviewCard(review)}</Box>
          ))}
        </Stack>
      )}
      {totalPages > 1 && (
        <Box display="flex" justifyContent="center" my={4}>
          <Pagination count={totalPages} page={page} onChange={(e, value) => setPage(value)} color="primary" />
        </Box>
      )}
    </Box>
  );
};

export default ReviewPage;

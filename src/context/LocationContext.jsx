import React, { createContext, useContext, useEffect, useState } from 'react';

const defaultLocation = [37.6173, 55.7558]; 
const LocationContext = createContext();

export const LocationProvider = ({ children }) => {
  const [location, setLocation] = useState(() => {
    const saved = localStorage.getItem('user_location');
    return saved ? JSON.parse(saved) : defaultLocation;
  });

  const updateLocation = (newLocation) => {
    setLocation(newLocation);
    localStorage.setItem('user_location', JSON.stringify(newLocation));
  };

  const getCurrentLocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Геолокация не поддерживается вашим браузером'));
      } else {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const coords = [position.coords.longitude, position.coords.latitude];
            updateLocation(coords); // Обновляем состояние и localStorage
            resolve(coords);
          },
          (error) => {
            console.error('Ошибка при получении геолокации:', error);
            reject(error);
          }
        );
      }
    });
  };

  useEffect(() => {
    if (!localStorage.getItem('user_location')) {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const coords = [position.coords.longitude, position.coords.latitude];
            updateLocation(coords);
          },
          () => {
            console.warn('Не удалось определить геолокацию, используется Москва');
          }
        );
      }
    }
  }, []);

  return (
    <LocationContext.Provider value={{ location, updateLocation, getCurrentLocation }}>
      {children}
    </LocationContext.Provider>
  );
};

export const useLocation = () => useContext(LocationContext);

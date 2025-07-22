import React, { useState } from 'react';
import './Help.css';

const Help = ({ onClose }) => {
  const [activeSection, setActiveSection] = useState('getting-started');

  const sections = {
    'getting-started': {
      title: 'Начало работы',
      content: `
        <h4>Добро пожаловать в планировщик маршрутов!</h4>
        <p>Этот инструмент поможет вам создать оптимальный маршрут с учетом ваших предпочтений.</p>
        <h5>Основные шаги:</h5>
        <ol>
          <li>Выберите способ построения маршрута (вручную или по адресам)</li>
          <li>Определите количество точек в маршруте</li>
          <li>Выберите режим передвижения (авто или пешком)</li>
          <li>Постройте маршрут</li>
        </ol>
      `
    },
    'route-building': {
      title: 'Построение маршрута',
      content: `
        <h4>Способы построения маршрута</h4>
        <h5>Вручную на карте:</h5>
        <ul>
          <li>Кликните на карту, чтобы добавить точки маршрута</li>
          <li>Точки будут соединены автоматически</li>
          <li>Вы можете изменить режим передвижения в любой момент</li>
        </ul>
        <h5>По адресам:</h5>
        <ul>
          <li>Введите начальный адрес</li>
          <li>Добавьте промежуточные точки (если нужно)</li>
          <li>Введите конечный адрес</li>
          <li>Маршрут будет построен автоматически</li>
        </ul>
      `
    },
    'route-optimization': {
      title: 'Перестроение маршрута',
      content: `
        <h4>Перестроение маршрута</h4>
        <p>Если маршрут не соответствует вашим требованиям, вы можете его перестроить:</p>
        <ol>
          <li>Установите минимальный рейтинг для точек маршрута</li>
          <li>Нажмите кнопку "Перестроить маршрут"</li>
          <li>Система найдет альтернативные точки с лучшим рейтингом</li>
        </ol>
        <h5>Как работает перестроение:</h5>
        <ul>
          <li>Система проверяет рейтинг каждой точки</li>
          <li>Ищет альтернативные места поблизости</li>
          <li>Учитывает расстояние до траектории</li>
          <li>Выбирает оптимальные варианты</li>
        </ul>
      `
    },
    'search': {
      title: 'Поиск мест',
      content: `
        <h4>Поиск мест на карте</h4>
        <p>Используйте поиск для нахождения конкретных мест:</p>
        <ol>
          <li>Введите название места в поисковую строку</li>
          <li>Выберите нужное место из выпадающего списка</li>
          <li>Место будет отмечено на карте</li>
        </ol>
        <h5>Советы по поиску:</h5>
        <ul>
          <li>Используйте точные названия</li>
          <li>Можно искать по адресу</li>
          <li>Результаты показываются с учетом вашего местоположения</li>
        </ul>
      `
    }
  };

  return (
    <div className="help-overlay">
      <div className="help-content">
        <div className="help-header">
          <h3>Справка</h3>
          <button className="help-close" onClick={onClose}>×</button>
        </div>
        <div className="help-body">
          <div className="help-sidebar">
            {Object.entries(sections).map(([key, section]) => (
              <button
                key={key}
                className={`help-nav-button ${activeSection === key ? 'active' : ''}`}
                onClick={() => setActiveSection(key)}
              >
                {section.title}
              </button>
            ))}
          </div>
          <div className="help-main">
            <div 
              className="help-section"
              key={activeSection}
              dangerouslySetInnerHTML={{ __html: sections[activeSection].content }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Help; 
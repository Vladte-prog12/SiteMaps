import React, { useState, useEffect } from 'react';
import './Guide.css';

const Guide = ({ onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  const steps = [
    {
      target: '.route-building-method',
      title: 'Выбор способа построения маршрута',
      content: 'Выберите, как вы хотите построить маршрут: вручную на карте или по адресам.',
      position: 'bottom'
    },
    {
      target: '.points-count-selector',
      title: 'Количество точек маршрута',
      content: 'Определите, сколько точек будет в вашем маршруте (от 2 до 5).',
      position: 'bottom'
    },
    {
      target: '.mode-buttons',
      title: 'Выбор режима передвижения',
      content: 'Выберите, как вы планируете передвигаться: на автомобиле или пешком.',
      position: 'top'
    },
    {
      target: '.search-bar',
      title: 'Поиск мест',
      content: 'Используйте поиск для нахождения конкретных мест на карте.',
      position: 'bottom'
    },
    {
      target: '.rebuild-button',
      title: 'Перестроение маршрута',
      content: 'Если маршрут не соответствует вашим требованиям, вы можете перестроить его с учетом рейтинга мест.',
      position: 'top'
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    onClose();
    // Сохраняем в localStorage, что гайд был показан
    localStorage.setItem('guideShown', 'true');
  };

  useEffect(() => {
    // Проверяем, был ли гайд уже показан
    const guideShown = localStorage.getItem('guideShown');
    if (guideShown === 'true') {
      setIsVisible(false);
    }
  }, []);

  if (!isVisible) return null;

  const currentStepData = steps[currentStep];

  return (
    <div className="guide-overlay">
      <div className="guide-content">
        <div className="guide-header">
          <h3>{currentStepData.title}</h3>
          <button className="guide-close" onClick={handleClose}>×</button>
        </div>
        <div className="guide-body">
          <p>{currentStepData.content}</p>
        </div>
        <div className="guide-footer">
          <button 
            className="guide-button prev" 
            onClick={handlePrev}
            disabled={currentStep === 0}
          >
            Назад
          </button>
          <div className="guide-progress">
            {currentStep + 1} из {steps.length}
          </div>
          <button 
            className="guide-button next" 
            onClick={handleNext}
          >
            {currentStep === steps.length - 1 ? 'Завершить' : 'Далее'}
          </button>
        </div>
      </div>
      <div 
        className="guide-highlight"
        style={{
          position: 'absolute',
          top: document.querySelector(currentStepData.target)?.getBoundingClientRect().top,
          left: document.querySelector(currentStepData.target)?.getBoundingClientRect().left,
          width: document.querySelector(currentStepData.target)?.offsetWidth,
          height: document.querySelector(currentStepData.target)?.offsetHeight
        }}
      />
    </div>
  );
};

export default Guide; 
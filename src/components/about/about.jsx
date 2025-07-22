import React from "react";
import { motion } from 'framer-motion';
import './about.css';
import { useNavigate } from 'react-router-dom';

const About = () => {
  const navigate = useNavigate();
  const description =
    "Планируйте свои маршруты с учетом ваших интересов! Наш сервис позволяет строить маршруты между точками города, учитывая не только расстояние, но и такие параметры, как безопасность, время в пути, тип мест и ваши личные предпочтения. Откройте для себя новые маршруты и делитесь ими с друзьями.";

  return (
    <motion.section 
      className="about"
      initial={{ x: 100, opacity: 0 }}
      whileInView={{ x: 0, opacity: 1 }}
      viewport={{ once: false }}
      transition={{ duration: 0.8, ease: "easeOut" }}
    >
      <div className="about-container">
        <h3>О маршрутах</h3>
        <p>{description}</p>
        <button className="cta-button" onClick={() => navigate('/yandex-map')}>Узнать больше</button>
      </div>
    </motion.section>
  );
};

export default About;

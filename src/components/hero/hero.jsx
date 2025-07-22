import React from "react";
import { motion } from 'framer-motion';
import './hero.css';
import { useNavigate } from 'react-router-dom';

const Hero = () => {
  const navigate = useNavigate();
  const title = "Откройте для себя популярные места города!";
  const description =
    "На нашем сайте вы найдете подборку самых интересных и популярных мест города: достопримечательности, кафе, парки, музеи и многое другое. Просматривайте подробные страницы с описаниями, фото и отзывами, чтобы выбрать лучшие места для посещения.";

  return (
    <motion.section 
      className="hero"
      initial={{ x: -100, opacity: 0 }}
      whileInView={{ x: 0, opacity: 1 }}
      viewport={{ once: false }}
      transition={{ duration: 0.8, ease: "easeOut" }}
    >
      <div className="hero-container">
        <h3>{title}</h3>
        <p>{description}</p>
        <div className="hero-buttons">
          <button className="cta-button" onClick={() => navigate('/popular-places')}>Узнать больше</button>
        </div>
      </div>
    </motion.section>
  );
};

export default Hero;

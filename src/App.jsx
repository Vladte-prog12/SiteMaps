// src/App.jsx

import React from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import Header from "./components/header/header"; // Убедись, что путь правильный
import Footer from './components/footer/footer'; // Импортируем компонент футера
import HomePage from "./pages/HomePage/HomePage"; // Путь к HomePage
import MapComponent from './pages/MapComponent/MapComponent'; // Путь к компоненту карты
import Login from "./pages/Login/Login";
import Register from "./pages/Register/Register";
import Profile from "./pages/Profile/Profile";
import PopularPlaces from "./pages/PopularPlaces/PopularPlaces";
import ReviewPage from "./pages/ReviewPage/ReviewPage";
import ContactPage from "./pages/ContactPage/ContactPage";
import PageTransition from "./components/PageTransition";

const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<HomePage />} />
        <Route path="/yandex-map" element={
          <PageTransition animationType="slide">
            <MapComponent />
          </PageTransition>
        } />
        <Route path="/login" element={
          <PageTransition animationType="zoom">
            <Login />
          </PageTransition>
        } />
        <Route path="/register" element={
          <PageTransition animationType="wave">
            <Register />
          </PageTransition>
        } />
        <Route path="/popular-places" element={
          <PageTransition animationType="slide">
            <PopularPlaces />
          </PageTransition>
        } />
        <Route path="/profile" element={
          <PageTransition animationType="fade">
            <Profile />
          </PageTransition>
        } />
        <Route path="/reviews" element={
          <PageTransition animationType="zoom">
            <ReviewPage />
          </PageTransition>
        } />
        <Route path="/contact" element={
          <PageTransition animationType="wave">
            <ContactPage />
          </PageTransition>
        } />
      </Routes>
    </AnimatePresence>
  );
};

const App = () => {
  return (
    <Router>
      <Header /> {/* Хедер теперь есть на всех страницах */}
      <AnimatedRoutes />
      <Footer /> {/* Футер на всех страницах */}
    </Router>
  );
};

export default App;

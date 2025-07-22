import React from "react";
import Hero from "../../components/hero/hero";
import About from "../../components/about/about";
import Features from "../../components/features/features";
import Examples from "../../components/examples/examples";
import './home.css';

const HomePage = () => {
  return (
    <div>
      <div className="app-container">
        <div className="row-container">
          <Hero />
          <About />
        </div>
        <Features />
        <Examples />
      </div>
    </div>
  );
};

export default HomePage;

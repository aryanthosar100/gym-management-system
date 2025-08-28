import React from "react";
import { useNavigate } from "react-router-dom";
import "./Home.css";
import logo from "../assets/logo.jpeg";
import heroBg from "../assets/hero-home.png";

const Home = () => {
  const navigate = useNavigate();

  return (
    <div
      className="home-container"
      style={{ backgroundImage: `url(${heroBg})` }}
    >
      <header className="home-header">
        <img src={logo} alt="Pulse Fitness" className="logo" />
      </header>
      <div className="home-content">
        <h1>
          BE YOUR <span>BEST</span>
        </h1>
        <div className="button-group">
          <button onClick={() => navigate("/login")}>LOGIN</button>
          <button onClick={() => navigate("/signup")}>SIGN UP</button>
        </div>
      </div>
    </div>
  );
};

export default Home;
import React from "react";
import { Link } from "react-router-dom";

const About: React.FC = () => {
  return (
    <div style={{ maxWidth: 860, margin: "40px auto", padding: "0 16px", lineHeight: 1.6 }}>
      <header style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <img src="/logo.jpeg" alt="Fuel Finder" style={{ width: 40, height: 40, borderRadius: 8 }} />
        <h1 style={{ margin: 0 }}>About Fuel Finder</h1>
      </header>

      <p>
        Fuel Finder is an online fuel station locator and navigation web app for
        Oriental Mindoro, Philippines. It helps drivers quickly discover nearby gas
        stations and points of interest, compare fuel options, and navigate using
        efficient routes powered by OSRM (Open Source Routing Machine) with an A*-based
        routing algorithm on OpenStreetMap data.
      </p>

      <h2>Coverage and Data</h2>
      <p>
        The app focuses on Oriental Mindoro and surrounding areas. Station data,
        prices, and points of interest are sourced from a combination of community
        reports and curated datasets. Map data is provided by OpenStreetMap
        contributors.
      </p>

      <h2>Navigation</h2>
      <p>
        Routing is provided by OSRM with A*-based pathfinding for fast, turn-by-turn
        directions. The app supports locating the nearest gas stations and relevant
        POIs such as convenience stores, repair shops, car washes, and motor shops.
      </p>

      <h2>Features</h2>
      <ul>
        <li>Find nearby fuel stations and POIs in Oriental Mindoro</li>
        <li>Smart camera follow and quick recenter controls</li>
        <li>Optional arrival notifications with voice and haptic feedback</li>
        <li>Mobile-first UI with bottom sheet details</li>
      </ul>

      <h2>Contact</h2>
      <p>
        Have feedback or corrections for station information? Please reach out via the
        project’s repository or contact channels listed on the home page.
      </p>

      <div style={{ marginTop: 24 }}>
        <Link to="/" style={{ color: "#1976D2", textDecoration: "none", fontWeight: 600 }}>
          ← Back to map
        </Link>
      </div>
    </div>
  );
};

export default About;

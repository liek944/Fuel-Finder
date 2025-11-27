import React from "react";
import { Link } from "react-router-dom";

const About: React.FC = () => {
  return (
    <div style={{ maxWidth: 900, margin: "40px auto", padding: "0 24px", fontFamily: "'Inter', sans-serif", color: "#333" }}>
      {/* Header Section */}
      <header style={{ textAlign: "center", marginBottom: 48 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, marginBottom: 16 }}>
          <img src="/logo.jpeg" alt="Fuel Finder" style={{ width: 64, height: 64, borderRadius: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} />
          <h1 style={{ margin: 0, fontSize: "2.5rem", color: "#1976D2" }}>Fuel Finder</h1>
        </div>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 500, color: "#555", maxWidth: 700, margin: "0 auto", lineHeight: 1.5 }}>
          An Online Fuel Station Locator and Navigation Mobile-App using OSRM A*-based Routing and OpenStreetMap
        </h2>
        <p style={{ marginTop: 16, fontSize: "0.9rem", color: "#777", fontStyle: "italic" }}>
          A BS Computer Science Thesis Project | Oriental Mindoro, Philippines
        </p>
      </header>

      {/* The Team Section */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={{ textAlign: "center", fontSize: "1.8rem", marginBottom: 32, color: "#333" }}>Meet the Team</h3>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 32 }}>

          {/* Jo Ann - Leader */}
          <div style={{
            width: 240,
            textAlign: "center",
            padding: 24,
            borderRadius: 16,
            background: "linear-gradient(145deg, #ffffff, #f0f4f8)",
            boxShadow: "0 8px 24px rgba(25, 118, 210, 0.15)",
            border: "2px solid #1976D2",
            position: "relative"
          }}>
            <div style={{
              position: "absolute",
              top: -12,
              left: "50%",
              transform: "translateX(-50%)",
              background: "#1976D2",
              color: "white",
              padding: "4px 12px",
              borderRadius: 20,
              fontSize: "0.75rem",
              fontWeight: "bold",
              letterSpacing: 1
            }}>
              TEAM LEADER
            </div>
            <div style={{ width: 100, height: 100, background: "#ddd", borderRadius: "50%", margin: "0 auto 16px", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
              {/* Placeholder for Jo Ann */}
              <span style={{ fontSize: "2rem", color: "#888" }}>JS</span>
            </div>
            <h4 style={{ margin: "0 0 4px", fontSize: "1.1rem", color: "#1976D2" }}>Jo Ann Supetran</h4>
            <p style={{ margin: 0, fontSize: "0.9rem", color: "#666" }}>Project Manager</p>
          </div>

          {/* Angelo */}
          <div style={{
            width: 220,
            textAlign: "center",
            padding: 24,
            borderRadius: 16,
            background: "#fff",
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
            border: "1px solid #eee"
          }}>
            <div style={{ width: 90, height: 90, background: "#f0f0f0", borderRadius: "50%", margin: "0 auto 16px", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
              {/* Placeholder for Angelo */}
              <span style={{ fontSize: "1.8rem", color: "#aaa" }}>AT</span>
            </div>
            <h4 style={{ margin: "0 0 4px", fontSize: "1.05rem", color: "#333" }}>Angelo Tiburania</h4>
            <p style={{ margin: 0, fontSize: "0.9rem", color: "#666" }}>Developer</p>
          </div>

          {/* Keil */}
          <div style={{
            width: 220,
            textAlign: "center",
            padding: 24,
            borderRadius: 16,
            background: "#fff",
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
            border: "1px solid #eee"
          }}>
            <div style={{ width: 90, height: 90, background: "#f0f0f0", borderRadius: "50%", margin: "0 auto 16px", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
              {/* Placeholder for Keil */}
              <span style={{ fontSize: "1.8rem", color: "#aaa" }}>KC</span>
            </div>
            <h4 style={{ margin: "0 0 4px", fontSize: "1.05rem", color: "#333" }}>Keil Nicus Castillon</h4>
            <p style={{ margin: 0, fontSize: "0.9rem", color: "#666" }}>Developer</p>
          </div>
        </div>
      </section>

      {/* Project Context & Tech */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40, marginBottom: 48 }}>
        <section>
          <h3 style={{ fontSize: "1.4rem", marginBottom: 16, color: "#333", borderBottom: "2px solid #1976D2", paddingBottom: 8, display: "inline-block" }}>About the Project</h3>
          <p style={{ lineHeight: 1.7, color: "#555" }}>
            Fuel Finder is designed to address the challenges of locating fuel stations and navigating efficiently in Oriental Mindoro.
            By integrating <strong>OpenStreetMap (OSM)</strong> data with an <strong>OSRM A*-based routing engine</strong>, the application provides accurate, turn-by-turn navigation and real-time spatial queries.
          </p>
          <p style={{ lineHeight: 1.7, color: "#555", marginTop: 12 }}>
            The system features a comprehensive database of gas stations and points of interest (POIs), helping drivers compare fuel prices and find essential services like repair shops and convenience stores.
          </p>
        </section>

        <section>
          <h3 style={{ fontSize: "1.4rem", marginBottom: 16, color: "#333", borderBottom: "2px solid #1976D2", paddingBottom: 8, display: "inline-block" }}>Technical Stack</h3>
          <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 12 }}>
            <li style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#1976D2" }}></span>
              <span><strong>Frontend:</strong> React, Leaflet.js</span>
            </li>
            <li style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#1976D2" }}></span>
              <span><strong>Backend:</strong> Node.js, Express.js</span>
            </li>
            <li style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#1976D2" }}></span>
              <span><strong>Database:</strong> PostgreSQL with PostGIS</span>
            </li>
            <li style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#1976D2" }}></span>
              <span><strong>Routing:</strong> OSRM (A* Algorithm)</span>
            </li>
            <li style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#1976D2" }}></span>
              <span><strong>Infrastructure:</strong> AWS EC2, Netlify</span>
            </li>
          </ul>
        </section>
      </div>

      {/* Features Grid */}
      <section style={{ marginBottom: 48 }}>
        <h3 style={{ fontSize: "1.4rem", marginBottom: 24, color: "#333" }}>Key Features</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 24 }}>
          {[
            { title: "Smart Navigation", desc: "Optimized A* routing with turn-by-turn directions." },
            { title: "Station Discovery", desc: "Find nearby gas stations with real-time spatial queries." },
            { title: "Price Comparison", desc: "Compare fuel prices to find the best deals." },
            { title: "POI System", desc: "Locate repair shops, car washes, and more." }
          ].map((feature, idx) => (
            <div key={idx} style={{ padding: 20, background: "#f9f9f9", borderRadius: 12, border: "1px solid #eee" }}>
              <h4 style={{ margin: "0 0 8px", color: "#1976D2" }}>{feature.title}</h4>
              <p style={{ margin: 0, fontSize: "0.9rem", color: "#666" }}>{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Contact Section */}
      <section style={{ textAlign: "center", padding: "32px", background: "#f0f4f8", borderRadius: 16 }}>
        <h3 style={{ margin: "0 0 16px", color: "#333" }}>Get in Touch</h3>
        <p style={{ maxWidth: 600, margin: "0 auto 24px", color: "#555" }}>
          Have feedback or corrections for station information? We'd love to hear from you.
        </p>
        <Link to="/" style={{
          display: "inline-block",
          padding: "12px 24px",
          background: "#1976D2",
          color: "white",
          textDecoration: "none",
          borderRadius: 8,
          fontWeight: 600,
          boxShadow: "0 4px 12px rgba(25, 118, 210, 0.3)"
        }}>
          Back to Map
        </Link>
      </section>
    </div>
  );
};

export default About;

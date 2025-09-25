import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import MainApp from "./components/MainApp";
import AdminPortal from "./components/AdminPortal";
import "./App.css";

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Main user-facing app */}
          <Route path="/" element={<MainApp />} />

          {/* Admin portal */}
          <Route path="/admin" element={<AdminPortal />} />

          {/* Redirect any unknown routes to main app */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;

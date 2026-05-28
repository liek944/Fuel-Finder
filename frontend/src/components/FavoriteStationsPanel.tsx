import React from 'react';
import { useSavedStations } from '../contexts/SavedStationsContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import '../styles/FavoriteStationsPanel.css';

interface FavoriteStationsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectStation: (stationId: number) => void;
}

const FavoriteStationsPanel: React.FC<FavoriteStationsPanelProps> = ({
  isOpen,
  onClose,
  onSelectStation,
}) => {
  const { savedStations, isLoading, unsaveStation } = useSavedStations();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  if (!isOpen) return null;

  return (
    <>
      <div className="favorites-panel-backdrop" onClick={onClose} />
      <div className={`favorites-panel ${isOpen ? 'open' : ''}`}>
        <div className="favorites-panel-header">
          <h2>Favorite Stations</h2>
          <button className="close-btn" onClick={onClose} aria-label="Close favorites panel">×</button>
        </div>
        
        <div className="favorites-panel-content">
          {!isAuthenticated ? (
            <div className="favorites-empty-state">
              <span className="empty-icon">🔒</span>
              <p>Sign in to save and view your favorite stations.</p>
              <button 
                className="favorites-signin-btn" 
                onClick={() => {
                  onClose();
                  navigate('/login');
                }}
              >
                Sign In
              </button>
            </div>
          ) : isLoading ? (
            <div className="favorites-loading">Loading favorites...</div>
          ) : savedStations.length === 0 ? (
            <div className="favorites-empty-state">
              <span className="empty-icon">❤️</span>
              <p>You haven't saved any stations yet.</p>
              <p className="empty-subtext">Click the heart icon on a station to save it.</p>
            </div>
          ) : (
            <ul className="favorites-list">
              {savedStations.map((station) => (
                <li key={station.id} className="favorite-item">
                  <div 
                    className="favorite-item-info"
                    onClick={() => onSelectStation(station.stationId)}
                  >
                    <h3>{station.station?.name || 'Unknown Station'}</h3>
                    {station.station?.brand && <span className="brand-badge">{station.station.brand}</span>}
                    {station.notes && <p className="favorite-notes">"{station.notes}"</p>}
                  </div>
                  <button 
                    className="remove-favorite-btn" 
                    onClick={(e) => {
                      e.stopPropagation();
                      unsaveStation(station.stationId);
                    }}
                    title="Remove from favorites"
                  >
                    🗑️
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
};

export default FavoriteStationsPanel;

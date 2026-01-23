/**
 * SaveButton Component
 * Toggle button to save/unsave a station
 * Shows heart icon - filled when saved, outline when not
 */

import React, { useState } from 'react';
import { useSavedStations } from '../../contexts/SavedStationsContext';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface SaveButtonProps {
  stationId: number;
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
}

const SaveButton: React.FC<SaveButtonProps> = ({ 
  stationId, 
  size = 'medium',
  showLabel = false 
}) => {
  const { isAuthenticated } = useAuth();
  const { isSaved, toggleSave, isLoading } = useSavedStations();
  const [isSaving, setIsSaving] = useState(false);
  const navigate = useNavigate();

  const saved = isSaved(stationId);

  const sizeStyles = {
    small: { fontSize: 16, padding: '4px 8px' },
    medium: { fontSize: 20, padding: '6px 10px' },
    large: { fontSize: 24, padding: '8px 12px' },
  };

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering parent click handlers

    if (!isAuthenticated) {
      // Redirect to login if not authenticated
      navigate('/login', { state: { from: window.location.pathname } });
      return;
    }

    if (isSaving || isLoading) return;

    try {
      setIsSaving(true);
      await toggleSave(stationId);
    } catch (error) {
      console.error('Failed to toggle save:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const buttonStyle: React.CSSProperties = {
    background: saved ? '#fff0f0' : 'transparent',
    border: saved ? '1px solid #ff6b6b' : '1px solid #ccc',
    borderRadius: 4,
    cursor: isSaving ? 'wait' : 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    transition: 'all 0.2s ease',
    opacity: isSaving ? 0.6 : 1,
    ...sizeStyles[size],
  };

  const iconStyle: React.CSSProperties = {
    color: saved ? '#ff6b6b' : '#999',
    transition: 'color 0.2s ease',
  };

  return (
    <button
      onClick={handleClick}
      style={buttonStyle}
      disabled={isSaving}
      title={saved ? 'Remove from saved' : 'Save station'}
      aria-label={saved ? 'Remove from saved stations' : 'Save this station'}
    >
      <span style={iconStyle}>
        {saved ? '❤️' : '🤍'}
      </span>
      {showLabel && (
        <span style={{ fontSize: sizeStyles[size].fontSize * 0.7, color: saved ? '#ff6b6b' : '#666' }}>
          {saved ? 'Saved' : 'Save'}
        </span>
      )}
    </button>
  );
};

export default SaveButton;

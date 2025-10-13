/**
 * Trip Replay Controller Component
 * 
 * Provides UI controls for trip replay animation.
 * Features:
 * - Play/Pause/Restart buttons
 * - Speed adjustment (1x-4x)
 * - Progress bar with scrubbing
 * - Time display
 * - Responsive mobile-friendly design
 * 
 * @module TripReplayController
 * @version 4.0.0
 * @since Phase 4
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  TripReplayAnimator,
  AnimationState,
  PlaybackSpeed,
  AnimationPosition
} from '../utils/tripReplayAnimator';

/**
 * Props for TripReplayController component
 */
export interface TripReplayControllerProps {
  /** Animator instance to control */
  animator: TripReplayAnimator;
  /** Whether to show time display */
  showTime?: boolean;
  /** Whether to show speed controls */
  showSpeedControls?: boolean;
  /** Whether to show progress bar */
  showProgressBar?: boolean;
  /** Custom class name */
  className?: string;
  /** Callback when animation state changes */
  onStateChange?: (state: AnimationState) => void;
  /** Callback when position updates */
  onPositionUpdate?: (position: AnimationPosition) => void;
}

/**
 * TripReplayController Component
 * 
 * Renders playback controls for trip replay animation.
 * 
 * @example
 * ```tsx
 * const animator = createTripReplayAnimator(trip.coordinates);
 * 
 * <TripReplayController
 *   animator={animator}
 *   showTime={true}
 *   showSpeedControls={true}
 *   showProgressBar={true}
 * />
 * ```
 */
const TripReplayController: React.FC<TripReplayControllerProps> = ({
  animator,
  showTime = true,
  showSpeedControls = true,
  showProgressBar = true,
  className = '',
  onStateChange,
  onPositionUpdate
}) => {
  const [state, setState] = useState<AnimationState>(animator.getState());
  const [progress, setProgress] = useState<number>(0);
  const [speed, setSpeed] = useState<PlaybackSpeed>(animator.getSpeed());
  const [isDragging, setIsDragging] = useState(false);

  // Subscribe to animator updates
  useEffect(() => {
    const unsubscribe = animator.subscribe((position, animState) => {
      if (!isDragging) {
        setProgress(position.progress);
      }
      setState(animState);

      // Notify parent
      if (onStateChange && animState !== state) {
        onStateChange(animState);
      }
      if (onPositionUpdate) {
        onPositionUpdate(position);
      }
    });

    return () => unsubscribe();
  }, [animator, isDragging, onStateChange, onPositionUpdate, state]);

  // Handle play/pause
  const handlePlayPause = useCallback(() => {
    if (state === 'playing') {
      animator.pause();
    } else if (state === 'completed') {
      animator.restart();
    } else {
      animator.play();
    }
  }, [animator, state]);

  // Handle restart
  const handleRestart = useCallback(() => {
    animator.restart();
  }, [animator]);

  // Handle speed change
  const handleSpeedChange = useCallback((newSpeed: PlaybackSpeed) => {
    animator.setSpeed(newSpeed);
    setSpeed(newSpeed);
  }, [animator]);

  // Handle progress bar click/drag
  const handleProgressChange = useCallback((event: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    const target = event.currentTarget;
    const rect = target.getBoundingClientRect();
    
    let clientX: number;
    if ('touches' in event) {
      clientX = event.touches[0]?.clientX || event.changedTouches[0]?.clientX || 0;
    } else {
      clientX = event.clientX;
    }
    
    const x = clientX - rect.left;
    const newProgress = Math.max(0, Math.min(1, x / rect.width));
    
    setProgress(newProgress);
    animator.seek(newProgress);
  }, [animator]);

  // Handle progress bar drag start
  const handleProgressDragStart = useCallback(() => {
    setIsDragging(true);
  }, []);

  // Handle progress bar drag end
  const handleProgressDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Format time display
  const formatTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Calculate current and total time
  const totalDuration = animator.getTotalDuration();
  const currentTime = totalDuration * progress;

  // Speed options
  const speedOptions: PlaybackSpeed[] = [1, 1.5, 2, 3, 4];

  return (
    <div className={`trip-replay-controller ${className}`}>
      {/* Progress Bar */}
      {showProgressBar && (
        <div className="replay-progress-container">
          <div
            className="replay-progress-bar"
            onClick={handleProgressChange}
            onMouseDown={handleProgressDragStart}
            onMouseUp={handleProgressDragEnd}
            onMouseLeave={handleProgressDragEnd}
            onTouchStart={handleProgressDragStart}
            onTouchEnd={handleProgressDragEnd}
            onTouchMove={handleProgressChange}
          >
            <div
              className="replay-progress-fill"
              style={{ width: `${progress * 100}%` }}
            />
            <div
              className="replay-progress-handle"
              style={{ left: `${progress * 100}%` }}
            />
          </div>
          
          {/* Time Display */}
          {showTime && (
            <div className="replay-time-display">
              <span className="replay-current-time">{formatTime(currentTime)}</span>
              <span className="replay-time-separator">/</span>
              <span className="replay-total-time">{formatTime(totalDuration)}</span>
            </div>
          )}
        </div>
      )}

      {/* Control Buttons */}
      <div className="replay-controls">
        {/* Restart Button */}
        <button
          className="replay-btn replay-btn-restart"
          onClick={handleRestart}
          title="Restart"
          aria-label="Restart animation"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
            <path d="M21 3v5h-5" />
            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
          </svg>
        </button>

        {/* Play/Pause Button */}
        <button
          className={`replay-btn replay-btn-play-pause ${state === 'playing' ? 'playing' : ''}`}
          onClick={handlePlayPause}
          title={state === 'playing' ? 'Pause' : 'Play'}
          aria-label={state === 'playing' ? 'Pause animation' : 'Play animation'}
        >
          {state === 'playing' ? (
            // Pause Icon
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          ) : (
            // Play Icon
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        {/* Speed Controls */}
        {showSpeedControls && (
          <div className="replay-speed-controls">
            <label className="replay-speed-label">Speed:</label>
            <div className="replay-speed-buttons">
              {speedOptions.map((speedOption) => (
                <button
                  key={speedOption}
                  className={`replay-speed-btn ${speed === speedOption ? 'active' : ''}`}
                  onClick={() => handleSpeedChange(speedOption)}
                  title={`${speedOption}x speed`}
                  aria-label={`Set playback speed to ${speedOption}x`}
                >
                  {speedOption}x
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* State Indicator */}
      <div className={`replay-state-indicator replay-state-${state}`}>
        {state === 'playing' && '▶ Playing'}
        {state === 'paused' && '⏸ Paused'}
        {state === 'completed' && '✓ Completed'}
        {state === 'idle' && '⏹ Ready'}
      </div>
    </div>
  );
};

export default TripReplayController;

/**
 * ReviewWidget Component
 * Displays reviews and allows users to submit new reviews for stations and POIs
 */

import React, { useState, useEffect } from 'react';
import { reviewsApi } from '../api/reviewsApi';
import './ReviewWidget.css';

interface ReviewWidgetProps {
  targetType: 'station' | 'poi';
  targetId: number;
  targetName: string;
}

interface Review {
  id: number;
  rating: number;
  comment?: string;
  displayName?: string;
  createdAt: string;
}

interface ReviewSummary {
  avgRating: string;
  totalReviews: number;
  breakdown: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
}

const ReviewWidget: React.FC<ReviewWidgetProps> = ({ targetType, targetId, targetName }) => {
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showReviews, setShowReviews] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Generate session ID (stored in localStorage for persistence)
  const getSessionId = () => {
    let sessionId = localStorage.getItem('reviewSessionId');
    if (!sessionId) {
      sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('reviewSessionId', sessionId);
    }
    return sessionId;
  };

  // Fetch review summary
  const fetchSummary = async () => {
    try {
      const data = await reviewsApi.summary(targetType, targetId);
      setSummary(data.summary);
    } catch (err) {
      console.error('Failed to fetch review summary:', err);
    }
  };

  // Fetch reviews
  const fetchReviews = async () => {
    try {
      const data = await reviewsApi.list(targetType, targetId, 10);
      setReviews(data.reviews || []);
    } catch (err) {
      console.error('Failed to fetch reviews:', err);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [targetType, targetId]);

  useEffect(() => {
    if (showReviews) {
      fetchReviews();
    }
  }, [showReviews, targetType, targetId]);

  const handleSubmit = async () => {
    if (rating === 0) {
      setError('Please select a rating');
      return;
    }

    if (comment.length > 500) {
      setError('Comment must be 500 characters or less');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      await reviewsApi.create(
        {
          targetType,
          targetId,
          rating,
          comment: comment.trim() || null,
          displayName: displayName.trim() || null,
        },
        getSessionId(),
      );

      setSuccess('Review submitted successfully!');
      setRating(0);
      setComment('');
      setDisplayName('');
      setShowForm(false);
      
      // Refresh summary and reviews
      await fetchSummary();
      if (showReviews) {
        await fetchReviews();
      }
    } catch (err: any) {
      const msg = err?.message || 'Failed to submit review. Please try again.';
      setError(msg);
      console.error('Review submission error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = (value: number, interactive: boolean = false) => {
    return (
      <div className="stars">
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={`star ${interactive ? 'interactive' : ''} ${
              star <= (interactive ? (hoverRating || rating) : value) ? 'filled' : ''
            }`}
            onClick={() => interactive && setRating(star)}
            onMouseEnter={() => interactive && setHoverRating(star)}
            onMouseLeave={() => interactive && setHoverRating(0)}
          >
            ★
          </span>
        ))}
      </div>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="review-widget">
      {/* Summary Section */}
      {summary && summary.totalReviews > 0 && (
        <div className="review-summary">
          <div className="summary-header">
            <div className="avg-rating">
              {renderStars(Math.round(parseFloat(summary.avgRating)))}
              <span className="rating-number">{parseFloat(summary.avgRating).toFixed(1)}</span>
              <span className="review-count">({summary.totalReviews} reviews)</span>
            </div>
          </div>
          <button
            className="view-reviews-btn"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowReviews(!showReviews);
            }}
          >
            {showReviews ? '▲ Hide Reviews' : '▼ View All Reviews'}
          </button>
        </div>
      )}

      {/* Reviews List */}
      {showReviews && reviews.length > 0 && (
        <div className="reviews-list">
          {reviews.map((review) => (
            <div key={review.id} className="review-item">
              <div className="review-header">
                <div className="review-author">
                  <strong>{review.displayName || 'Anonymous'}</strong>
                  {renderStars(review.rating)}
                </div>
                <span className="review-date">{formatDate(review.createdAt)}</span>
              </div>
              {review.comment && (
                <p className="review-comment">{review.comment}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Success/Error Messages */}
      {success && <div className="message success-message">{success}</div>}
      {error && <div className="message error-message">{error}</div>}

      {/* Submit Review Form */}
      {!showForm && (
        <button
          className="write-review-btn"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowForm(true);
          }}
        >
          ✍️ Write a Review
        </button>
      )}

      {showForm && (
        <div className="review-form">
          <div className="form-header">
            <h4>Rate {targetName}</h4>
            <button
              className="close-form-btn"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowForm(false);
              }}
            >
              ✕
            </button>
          </div>

          <div className="form-group">
            <label>Your Rating *</label>
            {renderStars(rating, true)}
          </div>

          <div className="form-group">
            <label>Your Name (optional)</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Anonymous"
              maxLength={50}
              disabled={submitting}
            />
          </div>

          <div className="form-group">
            <label>Comment (optional, max 500 chars)</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your experience..."
              maxLength={500}
              rows={4}
              disabled={submitting}
            />
            <div className="char-count">{comment.length}/500</div>
          </div>

          <div className="form-actions">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowForm(false);
              }}
              disabled={submitting}
              className="cancel-btn"
            >
              Cancel
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleSubmit();
              }}
              disabled={submitting || rating === 0}
              className="submit-btn"
            >
              {submitting ? 'Submitting...' : 'Submit Review'}
            </button>
          </div>
        </div>
      )}

      {summary && summary.totalReviews === 0 && !showForm && (
        <div className="no-reviews">
          <p>No reviews yet. Be the first to review!</p>
        </div>
      )}
    </div>
  );
};

export default ReviewWidget;

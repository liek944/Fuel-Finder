/**
 * ReviewsManagement Component
 * Admin interface for moderating reviews
 */

import React, { useState, useEffect } from 'react';
import { apiGet, apiDelete } from '../utils/api';
import './ReviewsManagement.css';

interface Review {
  id: number;
  target_type: string;
  target_id: number;
  target_name?: string;
  rating: number;
  comment: string | null;
  status: string;
  display_name: string | null;
  session_id: string | null;
  ip: string | null;
  user_agent: string | null;
  created_at: string;
  updated_at: string;
}

interface ReviewsManagementProps {
  adminApiKey: string;
}

export const ReviewsManagement: React.FC<ReviewsManagementProps> = ({ adminApiKey }) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterTargetType, setFilterTargetType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalReviews, setTotalReviews] = useState(0);
  const pageSize = 50;

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus !== 'all') params.append('status', filterStatus);
      if (filterTargetType !== 'all') params.append('targetType', filterTargetType);
      if (searchTerm) params.append('searchTerm', searchTerm);
      params.append('page', currentPage.toString());
      params.append('pageSize', pageSize.toString());

      const response = await apiGet(`/api/admin/reviews?${params.toString()}`, adminApiKey);
      
      if (response.ok) {
        const data = await response.json();
        setReviews(data.reviews || []);
        setTotalPages(data.pagination.totalPages);
        setTotalReviews(data.pagination.total);
      } else {
        console.error('Failed to fetch reviews');
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [filterStatus, filterTargetType, searchTerm, currentPage]);

  const handleUpdateStatus = async (reviewId: number, newStatus: string) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/admin/reviews/${reviewId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': adminApiKey,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        fetchReviews(); // Refresh list
      } else {
        alert('Failed to update review status');
      }
    } catch (error) {
      console.error('Error updating review:', error);
      alert('Error updating review');
    }
  };

  const handleDelete = async (reviewId: number) => {
    if (!confirm('Are you sure you want to delete this review? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await apiDelete(`/api/admin/reviews/${reviewId}`, adminApiKey);
      
      if (response.ok) {
        fetchReviews(); // Refresh list
      } else {
        alert('Failed to delete review');
      }
    } catch (error) {
      console.error('Error deleting review:', error);
      alert('Error deleting review');
    }
  };

  const renderStars = (rating: number) => {
    return (
      <span className="stars-display">
        {[1, 2, 3, 4, 5].map((star) => (
          <span key={star} className={star <= rating ? 'star-filled' : 'star-empty'}>
            ★
          </span>
        ))}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'published': return 'status-published';
      case 'pending': return 'status-pending';
      case 'rejected': return 'status-rejected';
      default: return '';
    }
  };

  return (
    <div className="reviews-management">
      <div className="reviews-header">
        <h2>📝 Reviews Management</h2>
        <div className="reviews-stats">
          <span className="stat-badge">Total: {totalReviews}</span>
        </div>
      </div>

      {/* Filters */}
      <div className="reviews-filters">
        <div className="filter-group">
          <label>Status:</label>
          <select value={filterStatus} onChange={(e) => {
            setFilterStatus(e.target.value);
            setCurrentPage(1);
          }}>
            <option value="all">All</option>
            <option value="published">Published</option>
            <option value="pending">Pending</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Type:</label>
          <select value={filterTargetType} onChange={(e) => {
            setFilterTargetType(e.target.value);
            setCurrentPage(1);
          }}>
            <option value="all">All</option>
            <option value="station">Stations</option>
            <option value="poi">POIs</option>
          </select>
        </div>

        <div className="filter-group search-group">
          <label>Search:</label>
          <input
            type="text"
            placeholder="Search comments or names..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
      </div>

      {/* Reviews Table */}
      {loading ? (
        <div className="loading-state">Loading reviews...</div>
      ) : reviews.length === 0 ? (
        <div className="empty-state">No reviews found</div>
      ) : (
        <>
          <div className="reviews-table-container">
            <table className="reviews-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Target</th>
                  <th>Rating</th>
                  <th>Comment</th>
                  <th>Author</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {reviews.map((review) => (
                  <tr key={review.id}>
                    <td>{review.id}</td>
                    <td>
                      <div className="target-info">
                        <span className={`target-type ${review.target_type}`}>
                          {review.target_type === 'station' ? '⛽' : '📍'}
                        </span>
                        <div>
                          <div className="target-name">{review.target_name || `${review.target_type} #${review.target_id}`}</div>
                          <div className="target-id">ID: {review.target_id}</div>
                        </div>
                      </div>
                    </td>
                    <td>{renderStars(review.rating)}</td>
                    <td>
                      <div className="comment-cell">
                        {review.comment || <em className="no-comment">No comment</em>}
                      </div>
                    </td>
                    <td>{review.display_name || <em>Anonymous</em>}</td>
                    <td>
                      <span className={`status-badge ${getStatusBadgeClass(review.status)}`}>
                        {review.status}
                      </span>
                    </td>
                    <td className="date-cell">{formatDate(review.created_at)}</td>
                    <td>
                      <div className="action-buttons">
                        {review.status !== 'published' && (
                          <button
                            className="action-btn publish-btn"
                            onClick={() => handleUpdateStatus(review.id, 'published')}
                            title="Publish"
                          >
                            ✓
                          </button>
                        )}
                        {review.status !== 'rejected' && (
                          <button
                            className="action-btn reject-btn"
                            onClick={() => handleUpdateStatus(review.id, 'rejected')}
                            title="Reject"
                          >
                            ✕
                          </button>
                        )}
                        <button
                          className="action-btn delete-btn"
                          onClick={() => handleDelete(review.id)}
                          title="Delete"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="pagination">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(currentPage - 1)}
            >
              ← Previous
            </button>
            <span className="page-info">
              Page {currentPage} of {totalPages}
            </span>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(currentPage + 1)}
            >
              Next →
            </button>
          </div>
        </>
      )}
    </div>
  );
};

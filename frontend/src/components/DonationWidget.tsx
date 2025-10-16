import React, { useState, useEffect } from 'react';
import './DonationWidget.css';
import { apiGet, apiPost } from '../utils/api';

interface DonationStats {
  total_donations: number;
  total_amount: number;
  donations_this_month: number;
  amount_this_month: number;
  donations_this_week: number;
  amount_this_week: number;
  average_donation: number;
  unique_donors: number;
}

interface RecentDonation {
  id: number;
  amount: number;
  donor_name: string;
  cause: string;
  notes: string | null;
  created_at: string;
}

interface DonationWidgetProps {
  onClose?: () => void;
}

const DonationWidget: React.FC<DonationWidgetProps> = ({ onClose }) => {
  const [amount, setAmount] = useState<number>(50);
  const [donorName, setDonorName] = useState<string>('');
  const [donorEmail, setDonorEmail] = useState<string>('');
  const [cause, setCause] = useState<string>('ambulance');
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [stats, setStats] = useState<DonationStats | null>(null);
  const [recentDonations, setRecentDonations] = useState<RecentDonation[]>([]);
  const [showRecent, setShowRecent] = useState<boolean>(false);

  const presetAmounts = [10, 20, 50, 100, 200, 500];

  const causes = [
    { value: 'ambulance', label: '🚑 Ambulance Services', description: 'Fuel for emergency ambulances' },
    { value: 'public_transport', label: '🚌 Public Transport', description: 'Support local transport cooperatives' },
    { value: 'emergency', label: '🚨 Emergency Services', description: 'Emergency response teams' },
    { value: 'general', label: '💙 General Fund', description: 'Community fuel support' }
  ];

  useEffect(() => {
    fetchDonationStats();
    fetchRecentDonations();
  }, []);

  const fetchDonationStats = async () => {
    try {
      const response = await apiGet('/api/donations/stats');
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch donation stats:', error);
    }
  };

  const fetchRecentDonations = async () => {
    try {
      const response = await apiGet('/api/donations/recent?limit=5');
      const data = await response.json();
      setRecentDonations(data);
    } catch (error) {
      console.error('Failed to fetch recent donations:', error);
    }
  };

  const handleDonate = async () => {
    if (amount < 10) {
      alert('Minimum donation is ₱10');
      return;
    }

    if (amount > 10000) {
      alert('Maximum donation is ₱10,000');
      return;
    }

    setLoading(true);

    try {
      const response = await apiPost('/api/donations/create', {
        amount,
        donor_name: donorName || 'Anonymous',
        donor_email: donorEmail,
        cause,
        notes,
      });

      const data = await response.json();

      if (data.success && data.payment_url) {
        // Redirect to PayMongo checkout page
        window.location.href = data.payment_url;
      } else {
        alert(data.message || 'Failed to create donation. Please try again.');
      }
    } catch (error) {
      console.error('Donation error:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (num: number): string => {
    return num.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const getCauseEmoji = (causeValue: string): string => {
    const causeObj = causes.find(c => c.value === causeValue);
    return causeObj ? causeObj.label.split(' ')[0] : '💙';
  };

  return (
    <div className="donation-widget-overlay">
      <div className="donation-widget">
        <button className="close-button" onClick={onClose}>✕</button>
        
        {/* Test Mode Notice */}
        <div className="test-mode-banner">
          🧪 TEST MODE ONLY - No real money will be charged
        </div>
        
        <div className="donation-header">
          <h2>💝 Support Our Community</h2>
          <p>Help fund fuel for ambulances, public transport, and emergency services in Oriental Mindoro</p>
        </div>

        {stats && (
          <div className="donation-stats">
            <div className="stat-item">
              <span className="stat-value">₱{formatAmount(stats.total_amount)}</span>
              <span className="stat-label">Total Raised</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{stats.total_donations}</span>
              <span className="stat-label">Donations</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">₱{formatAmount(stats.amount_this_month)}</span>
              <span className="stat-label">This Month</span>
            </div>
          </div>
        )}

        <div className="donation-tabs">
          <button 
            className={`tab-button ${!showRecent ? 'active' : ''}`}
            onClick={() => setShowRecent(false)}
          >
            Donate Now
          </button>
          <button 
            className={`tab-button ${showRecent ? 'active' : ''}`}
            onClick={() => setShowRecent(true)}
          >
            Recent Donors
          </button>
        </div>

        {!showRecent ? (
          <div className="donation-form">
            <div className="form-group">
              <label>Choose Cause:</label>
              <select value={cause} onChange={(e) => setCause(e.target.value)} className="cause-select">
                {causes.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
              <span className="cause-description">
                {causes.find(c => c.value === cause)?.description}
              </span>
            </div>

            <div className="form-group">
              <label>Donation Amount:</label>
              <div className="preset-amounts">
                {presetAmounts.map((preset) => (
                  <button
                    key={preset}
                    className={`preset-btn ${amount === preset ? 'active' : ''}`}
                    onClick={() => setAmount(preset)}
                  >
                    ₱{preset}
                  </button>
                ))}
              </div>
              <input
                type="number"
                className="amount-input"
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                placeholder="Custom amount"
                min="10"
                max="10000"
              />
              {amount > 0 && amount < 10 && (
                <span className="input-error">Minimum: ₱10</span>
              )}
              {amount > 10000 && (
                <span className="input-error">Maximum: ₱10,000</span>
              )}
            </div>

            <div className="form-group">
              <label>Name (Optional):</label>
              <input
                type="text"
                value={donorName}
                onChange={(e) => setDonorName(e.target.value)}
                placeholder="Anonymous"
                maxLength={100}
              />
            </div>

            <div className="form-group">
              <label>Email (Optional - for receipt):</label>
              <input
                type="email"
                value={donorEmail}
                onChange={(e) => setDonorEmail(e.target.value)}
                placeholder="your@email.com"
                maxLength={100}
              />
            </div>

            <div className="form-group">
              <label>Message (Optional):</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Leave a message of support..."
                rows={3}
                maxLength={500}
              />
            </div>

            <button
              className="donate-btn"
              onClick={handleDonate}
              disabled={loading || amount < 10 || amount > 10000}
            >
              {loading ? 'Processing...' : `Donate ₱${formatAmount(amount)}`}
            </button>

            <div className="payment-info">
              <p>💳 Secure payment via PayMongo</p>
              <p style={{ color: '#ff9800', fontWeight: 600 }}>🧪 Test Mode: Use test number 09123456789 with OTP 123456</p>
              <p className="tax-note">No real money will be charged in test mode</p>
            </div>
          </div>
        ) : (
          <div className="recent-donations">
            <h3>Recent Supporters</h3>
            {recentDonations.length > 0 ? (
              <div className="donations-list">
                {recentDonations.map((donation) => (
                  <div key={donation.id} className="donation-item">
                    <div className="donation-header-row">
                      <span className="donor-name">{donation.donor_name}</span>
                      <span className="donation-amount">₱{formatAmount(donation.amount)}</span>
                    </div>
                    <div className="donation-details">
                      <span className="donation-cause">{getCauseEmoji(donation.cause)} {donation.cause.replace('_', ' ')}</span>
                      <span className="donation-time">{formatTimeAgo(donation.created_at)}</span>
                    </div>
                    {donation.notes && (
                      <div className="donation-notes">"{donation.notes}"</div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-donations">No recent donations yet. Be the first!</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DonationWidget;

import React, { useEffect, useState } from 'react';
import '../styles/RegionalPricesBanner.css';

interface RegionalPrice {
  fuel_type: string;
  average_price: string;
  created_at: string;
}

const RegionalPricesBanner: React.FC = () => {
  const [prices, setPrices] = useState<RegionalPrice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRegionalPrices = async () => {
      try {
        const response = await fetch('/api/regional-prices');
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            setPrices(result.data);
          }
        }
      } catch (error) {
        console.error('Failed to fetch regional prices:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRegionalPrices();
  }, []);

  if (loading || prices.length === 0) return null;

  return (
    <div className="regional-prices-banner">
      <div className="banner-header">
        <h4>Oriental Mindoro Regional Average</h4>
        <span className="banner-subtitle">Updated automatically</span>
      </div>
      <div className="prices-row">
        {prices.map((price, index) => (
          <div key={index} className="price-item">
            <span className="fuel-type">{price.fuel_type}</span>
            <span className="avg-price">₱{parseFloat(price.average_price).toFixed(2)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RegionalPricesBanner;

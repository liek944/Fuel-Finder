import React, { useEffect, useState } from 'react';
import '../styles/RegionalPricesBanner.css';

interface RegionalPrice {
  fuel_type: string;
  average_price: string;
  created_at: string;
  data_sources?: any;
}

const RegionalPricesBanner: React.FC = () => {
  const [prices, setPrices] = useState<RegionalPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

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

  const getSourceLink = () => {
    if (prices.length > 0 && prices[0].data_sources) {
      try {
        const sources = typeof prices[0].data_sources === 'string' 
          ? JSON.parse(prices[0].data_sources) 
          : prices[0].data_sources;
          
        if (Array.isArray(sources) && sources.length > 0) {
          const url = sources[0];
          const domain = new URL(url).hostname.replace(/^www\./, '');
          return (
            <> • Source: <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline' }}>{domain}</a></>
          );
        }
      } catch (e) {
        console.error('Error parsing data sources:', e);
      }
    }
    return null;
  };

  if (!isExpanded) {
    return (
      <div className="regional-prices-banner collapsed" onClick={() => setIsExpanded(true)}>
        <span className="banner-icon">📊</span>
        <span className="banner-title">Regional Prices</span>
      </div>
    );
  }

  return (
    <div className="regional-prices-banner expanded">
      <div className="banner-header">
        <h4>Oriental Mindoro Regional Average</h4>
        <div className="banner-actions">
          <span className="banner-subtitle">
            Updated automatically
            {getSourceLink()}
          </span>
          <button className="close-banner-btn" onClick={(e) => { e.stopPropagation(); setIsExpanded(false); }}>✕</button>
        </div>
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

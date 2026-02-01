/**
 * Owner Form Component
 * Create/Edit form for station owners
 */

import React, { useState, useEffect } from 'react';
import { Owner, UnassignedStation, CreateOwnerInput, UpdateOwnerInput, ThemeConfig } from '../../../api/ownerManagementApi';

interface OwnerFormProps {
  owner: Owner | null;
  unassignedStations: UnassignedStation[];
  onSubmit: (data: CreateOwnerInput | UpdateOwnerInput) => void;
  onCancel: () => void;
}

const OwnerForm: React.FC<OwnerFormProps> = ({ owner, unassignedStations, onSubmit, onCancel }) => {
  const [name, setName] = useState(owner?.name || '');
  const [domain, setDomain] = useState(owner?.domain || '');
  const [email, setEmail] = useState(owner?.email || '');
  const [contactPerson, setContactPerson] = useState(owner?.contact_person || '');
  const [phone, setPhone] = useState(owner?.phone || '');
  const [isActive, setIsActive] = useState(owner?.is_active ?? true);
  const [primaryColor, setPrimaryColor] = useState(owner?.theme_config?.colors?.primary || '#3B82F6');
  const [secondaryColor, setSecondaryColor] = useState(owner?.theme_config?.colors?.secondary || '#10B981');
  const [accentColor, setAccentColor] = useState(owner?.theme_config?.colors?.accent || '#F59E0B');
  const [selectedStations, setSelectedStations] = useState<number[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Auto-generate domain from name
  useEffect(() => {
    if (!owner && name) {
      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
      setDomain(slug);
    }
  }, [name, owner]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (!name.trim()) newErrors.name = 'Name is required';
    if (!domain.trim()) newErrors.domain = 'Domain is required';
    else if (!/^[a-z0-9-]+$/.test(domain)) {
      newErrors.domain = 'Domain can only contain lowercase letters, numbers, and hyphens';
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Invalid email format';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const themeConfig: ThemeConfig = {
      colors: {
        primary: primaryColor,
        secondary: secondaryColor,
        accent: accentColor
      }
    };

    if (owner) {
      // Update existing owner
      const data: UpdateOwnerInput = {
        name,
        domain,
        email: email || undefined,
        contact_person: contactPerson || undefined,
        phone: phone || undefined,
        theme_config: themeConfig,
        is_active: isActive
      };
      onSubmit(data);
    } else {
      // Create new owner
      const data: CreateOwnerInput = {
        name,
        domain,
        email: email || undefined,
        contact_person: contactPerson || undefined,
        phone: phone || undefined,
        theme_config: themeConfig,
        station_ids: selectedStations.length > 0 ? selectedStations : undefined
      };
      onSubmit(data);
    }
  };

  const toggleStation = (stationId: number) => {
    setSelectedStations(prev => 
      prev.includes(stationId) 
        ? prev.filter(id => id !== stationId)
        : [...prev, stationId]
    );
  };

  return (
    <form className="owner-form" onSubmit={handleSubmit}>
      <h3>{owner ? 'Edit Owner' : 'Create New Owner'}</h3>
      
      <div className="form-section">
        <h4>Basic Information</h4>
        
        <div className="form-group">
          <label htmlFor="name">Company Name *</label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g., Shell Station Network"
            className={errors.name ? 'error' : ''}
          />
          {errors.name && <span className="error-text">{errors.name}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="domain">Domain (Subdomain) *</label>
          <div className="domain-input-wrapper">
            <input
              id="domain"
              type="text"
              value={domain}
              onChange={e => setDomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              placeholder="shell-network"
              className={errors.domain ? 'error' : ''}
            />
            <span className="domain-suffix">.fuelfinder.com</span>
          </div>
          {errors.domain && <span className="error-text">{errors.domain}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="admin@example.com"
            className={errors.email ? 'error' : ''}
          />
          {errors.email && <span className="error-text">{errors.email}</span>}
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="contactPerson">Contact Person</label>
            <input
              id="contactPerson"
              type="text"
              value={contactPerson}
              onChange={e => setContactPerson(e.target.value)}
              placeholder="John Doe"
            />
          </div>

          <div className="form-group">
            <label htmlFor="phone">Phone</label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="+63-917-XXX-XXXX"
            />
          </div>
        </div>

        {owner && (
          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={isActive}
                onChange={e => setIsActive(e.target.checked)}
              />
              Active (can access portal)
            </label>
          </div>
        )}
      </div>

      <div className="form-section">
        <h4>Theme Colors</h4>
        <div className="color-pickers">
          <div className="form-group color-group">
            <label htmlFor="primaryColor">Primary</label>
            <input
              id="primaryColor"
              type="color"
              value={primaryColor}
              onChange={e => setPrimaryColor(e.target.value)}
            />
            <span className="color-value">{primaryColor}</span>
          </div>

          <div className="form-group color-group">
            <label htmlFor="secondaryColor">Secondary</label>
            <input
              id="secondaryColor"
              type="color"
              value={secondaryColor}
              onChange={e => setSecondaryColor(e.target.value)}
            />
            <span className="color-value">{secondaryColor}</span>
          </div>

          <div className="form-group color-group">
            <label htmlFor="accentColor">Accent</label>
            <input
              id="accentColor"
              type="color"
              value={accentColor}
              onChange={e => setAccentColor(e.target.value)}
            />
            <span className="color-value">{accentColor}</span>
          </div>
        </div>
      </div>

      {/* Station Assignment - Only for new owners */}
      {!owner && unassignedStations.length > 0 && (
        <div className="form-section">
          <h4>Assign Stations ({selectedStations.length} selected)</h4>
          <div className="station-selection">
            {unassignedStations.map(station => (
              <label key={station.id} className="station-checkbox">
                <input
                  type="checkbox"
                  checked={selectedStations.includes(station.id)}
                  onChange={() => toggleStation(station.id)}
                />
                <span className="station-info">
                  <strong>{station.name}</strong>
                  {station.brand && <span className="station-brand">({station.brand})</span>}
                  <span className="station-address">{station.address}</span>
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="form-actions">
        <button type="button" className="btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn-primary">
          {owner ? 'Update Owner' : 'Create Owner'}
        </button>
      </div>
    </form>
  );
};

export default OwnerForm;

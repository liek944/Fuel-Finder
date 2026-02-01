/**
 * Owner Management Component
 * Admin interface for managing station owners
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  getAllOwners, 
  createOwner, 
  updateOwner, 
  getUnassignedStations,
  uploadOwnerLogo,
  Owner, 
  UnassignedStation,
  CreateOwnerInput,
  UpdateOwnerInput
} from '../../../api/ownerManagementApi';
import OwnerForm from './OwnerForm';
import './OwnerManagement.css';

interface OwnerManagementProps {
  adminApiKey: string;
}

const OwnerManagement: React.FC<OwnerManagementProps> = ({ adminApiKey }) => {
  const [owners, setOwners] = useState<Owner[]>([]);
  const [unassignedStations, setUnassignedStations] = useState<UnassignedStation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingOwner, setEditingOwner] = useState<Owner | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [ownersData, stationsData] = await Promise.all([
        getAllOwners(adminApiKey),
        getUnassignedStations(adminApiKey)
      ]);
      setOwners(ownersData);
      setUnassignedStations(stationsData);
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [adminApiKey]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreate = async (data: CreateOwnerInput & { logo?: { base64: string; filename: string } }) => {
    try {
      // Extract logo from data before creating owner
      const { logo, ...ownerData } = data;
      
      const newOwner = await createOwner(ownerData, adminApiKey);
      
      // Upload logo if provided
      if (logo) {
        try {
          await uploadOwnerLogo(newOwner.id, logo.base64, logo.filename, adminApiKey);
        } catch (logoErr: any) {
          console.warn('Logo upload failed:', logoErr.message);
          // Continue even if logo upload fails
        }
      }
      
      setSuccessMessage(`Owner "${newOwner.name}" created successfully! API Key: ${newOwner.api_key}`);
      setShowForm(false);
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleUpdate = async (data: UpdateOwnerInput) => {
    if (!editingOwner) return;
    try {
      await updateOwner(editingOwner.id, data, adminApiKey);
      setSuccessMessage(`Owner "${data.name || editingOwner.name}" updated successfully!`);
      setEditingOwner(null);
      setShowForm(false);
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleEditClick = (owner: Owner) => {
    setEditingOwner(owner);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingOwner(null);
  };

  const clearMessages = () => {
    setSuccessMessage(null);
    setError(null);
  };

  if (loading && owners.length === 0) {
    return (
      <div className="owner-management">
        <div className="owner-loading">Loading owners...</div>
      </div>
    );
  }

  return (
    <div className="owner-management">
      <div className="owner-header">
        <h2>Station Owner Management</h2>
        <button 
          className="btn-primary"
          onClick={() => {
            setEditingOwner(null);
            setShowForm(true);
            clearMessages();
          }}
        >
          + Add Owner
        </button>
      </div>

      {/* Messages */}
      {successMessage && (
        <div className="alert alert-success" onClick={() => setSuccessMessage(null)}>
          {successMessage}
          <span className="alert-close">×</span>
        </div>
      )}
      {error && (
        <div className="alert alert-error" onClick={() => setError(null)}>
          {error}
          <span className="alert-close">×</span>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={handleFormClose}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <OwnerForm
              owner={editingOwner}
              unassignedStations={unassignedStations}
              onSubmit={editingOwner ? handleUpdate : handleCreate}
              onCancel={handleFormClose}
            />
          </div>
        </div>
      )}

      {/* Owners Table */}
      <div className="owners-table-container">
        <table className="owners-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Domain</th>
              <th>Email</th>
              <th>Stations</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {owners.length === 0 ? (
              <tr>
                <td colSpan={6} className="no-data">
                  No owners found. Click "Add Owner" to create one.
                </td>
              </tr>
            ) : (
              owners.map(owner => (
                <tr key={owner.id} className={!owner.is_active ? 'inactive' : ''}>
                  <td>
                    <strong>{owner.name}</strong>
                    {owner.contact_person && (
                      <div className="owner-contact">{owner.contact_person}</div>
                    )}
                  </td>
                  <td>
                    <code>{owner.domain}</code>
                    <div className="owner-portal-link">
                      <a 
                        href={`https://${owner.domain}.fuelfinder.com`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                      >
                        Portal →
                      </a>
                    </div>
                  </td>
                  <td>{owner.email || '—'}</td>
                  <td className="station-count">{owner.station_count}</td>
                  <td>
                    <span className={`status-badge ${owner.is_active ? 'active' : 'inactive'}`}>
                      {owner.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <button 
                      className="btn-edit"
                      onClick={() => handleEditClick(owner)}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="owner-summary">
        <span>{owners.length} owner(s)</span>
        <span>{unassignedStations.length} unassigned station(s)</span>
      </div>
    </div>
  );
};

export default OwnerManagement;

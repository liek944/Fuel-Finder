import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import AdminStationForm from '../admin/stations/AdminStationForm';

describe('AdminStationForm', () => {
  const mockSetEditFormData = vi.fn();
  const mockOnSave = vi.fn();
  const mockOnCancel = vi.fn();
  const mockEditPrevOpenRef = { current: '08:00' };
  const mockEditPrevCloseRef = { current: '20:00' };

  const defaultProps = {
    editFormData: {
      name: 'Test Station',
      brand: 'Shell',
      address: '123 Test St',
      phone: '123-456-7890',
      operating_hours: { open: '08:00', close: '20:00' },
      fuel_prices: [],
    },
    setEditFormData: mockSetEditFormData,
    editSubmitting: false,
    onSave: mockOnSave,
    onCancel: mockOnCancel,
    editPrevOpenRef: mockEditPrevOpenRef,
    editPrevCloseRef: mockEditPrevCloseRef,
  };

  it('renders form fields correctly', () => {
    render(<AdminStationForm {...defaultProps} />);

    expect(screen.getByPlaceholderText('Name')).toHaveValue('Test Station');
    expect(screen.getByPlaceholderText('Brand')).toHaveValue('Shell');
    expect(screen.getByPlaceholderText('Address')).toHaveValue('123 Test St');
  });

  it('calls setEditFormData when input changes', () => {
    render(<AdminStationForm {...defaultProps} />);

    const nameInput = screen.getByPlaceholderText('Name');
    fireEvent.change(nameInput, { target: { value: 'New Name' } });

    expect(mockSetEditFormData).toHaveBeenCalledWith(expect.objectContaining({
      name: 'New Name',
    }));
  });

  it('calls onSave when save button is clicked', () => {
    render(<AdminStationForm {...defaultProps} />);

    const saveButton = screen.getByText('💾 Save');
    fireEvent.click(saveButton);

    expect(mockOnSave).toHaveBeenCalled();
  });
});

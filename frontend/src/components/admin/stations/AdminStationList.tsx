import React from "react";
import { Marker, Popup } from "react-leaflet";
import ImageSlideshow from "../../common/ImageSlideshow";
import AdminStationForm from "./AdminStationForm";
import type { Station } from "../../../types/station.types";

interface AdminStationListProps {
  stations: Station[];
  isAdminEnabled: boolean;
  editingStationId: number | null;
  editFormData: any;
  setEditFormData: (data: any) => void;
  editSubmitting: boolean;
  startEditStation: (station: Station) => void;
  cancelEdit: () => void;
  submitEditStation: (stationId: number) => void;
  onDeleteStation: (station: Station) => void | Promise<void>;
  stationImageUploadUrls: Record<string, string[]>;
  stationImageUploads: Record<string, File[]>;
  uploadingStationImages: Record<string, boolean>;
  handleStationImageSelect: (stationId: number, files: FileList | null) => void;
  uploadStationImages: (stationId: number) => void;
  clearStationImageUploads: (stationId: number) => void;
  createFuelStationIcon: (brand: string, proximity?: number) => any;
  editPrevOpenRef: React.MutableRefObject<string>;
  editPrevCloseRef: React.MutableRefObject<string>;
}

const AdminStationList: React.FC<AdminStationListProps> = ({
  stations,
  isAdminEnabled,
  editingStationId,
  editFormData,
  setEditFormData,
  editSubmitting,
  startEditStation,
  cancelEdit,
  submitEditStation,
  onDeleteStation,
  stationImageUploadUrls,
  stationImageUploads,
  uploadingStationImages,
  handleStationImageSelect,
  uploadStationImages,
  clearStationImageUploads,
  createFuelStationIcon,
  editPrevOpenRef,
  editPrevCloseRef,
}) => {
  return (
    <>
      {stations.map((station) => (
        <Marker
          key={`station-${station.id}`}
          position={[station.location.lat, station.location.lng]}
          icon={createFuelStationIcon(station.brand)}
        >
          <Popup>
            <div style={{ minWidth: 200 }}>
              {editingStationId === station.id ? (
                <AdminStationForm
                  editFormData={editFormData}
                  setEditFormData={setEditFormData}
                  editSubmitting={editSubmitting}
                  onSave={() => submitEditStation(station.id)}
                  onCancel={cancelEdit}
                  editPrevOpenRef={editPrevOpenRef}
                  editPrevCloseRef={editPrevCloseRef}
                />
              ) : (
                <>
                  <b>⛽ {station.name}</b>
                  <div style={{ marginTop: 4 }}>
                    <strong>Brand:</strong> {station.brand}
                  </div>
                  <div style={{ marginBottom: 4 }}>
                    <strong>Fuel Prices:</strong>
                    {station.fuel_prices && station.fuel_prices.length > 0 ? (
                      <div style={{ marginLeft: 8, marginTop: 4 }}>
                        {station.fuel_prices.map((fp) => (
                          <div key={fp.fuel_type} style={{ fontSize: 12, marginBottom: 2 }}>
                            <span style={{ fontWeight: 500 }}>{fp.fuel_type}:</span> ₱{Number(fp.price).toFixed(2)}/L
                            {fp.price_updated_by === "owner" && (
                              <span style={{ fontSize: 10, color: "#2563eb", marginLeft: 4, fontWeight: 500 }}>
                                (verified by owner)
                              </span>
                            )}
                            {fp.price_updated_by === "community" && (
                              <span style={{ fontSize: 10, color: "#666", marginLeft: 4 }}>(community)</span>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span> ₱{station.fuel_price}/L</span>
                    )}
                  </div>
                  <div>
                    <strong>Services:</strong> {station.services.join(", ")}
                  </div>
                  {station.address && (
                    <div>
                      <strong>Address:</strong> {station.address}
                    </div>
                  )}
                  {station.phone && (
                    <div>
                      <strong>Phone:</strong> {station.phone}
                    </div>
                  )}
                  {station.operating_hours && (
                    <div style={{ marginTop: 4, fontSize: 12, color: "#666" }}>
                      <strong>🕐 Hours:</strong> {station.operating_hours.open} - {station.operating_hours.close}
                    </div>
                  )}

                  {station.images && station.images.length > 0 && (
                    <ImageSlideshow images={station.images} />
                  )}
                </>
              )}

              {isAdminEnabled && editingStationId !== station.id && (
                <div style={{ marginTop: 12, paddingTop: 8, borderTop: "1px solid #eee" }}>
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ marginBottom: 4, fontSize: 12, fontWeight: 600 }}>📷 Add Images:</div>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => handleStationImageSelect(station.id, e.target.files)}
                      style={{ fontSize: 10, marginBottom: 4, width: "100%" }}
                    />
                    {stationImageUploadUrls[station.id.toString()] && (
                      <div style={{ display: "flex", gap: 4, marginBottom: 4, flexWrap: "wrap" }}>
                        {stationImageUploadUrls[station.id.toString()].map((url, idx) => (
                          <img
                            key={idx}
                            src={url}
                            alt={`Preview ${idx + 1}`}
                            style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 4, border: "1px solid #ddd" }}
                          />
                        ))}
                      </div>
                    )}

                    <div style={{ display: "flex", gap: 4 }}>
                      <button
                        style={{
                          background:
                            stationImageUploads[station.id.toString()] &&
                            stationImageUploads[station.id.toString()].length > 0
                              ? "#4CAF50"
                              : "#ccc",
                          color: "white",
                          border: "none",
                          padding: "4px 8px",
                          borderRadius: 4,
                          cursor:
                            stationImageUploads[station.id.toString()] &&
                            stationImageUploads[station.id.toString()].length > 0
                              ? "pointer"
                              : "not-allowed",
                          fontSize: 10,
                          fontWeight: 600,
                          flex: 1,
                        }}
                        disabled={
                          !stationImageUploads[station.id.toString()] ||
                          stationImageUploads[station.id.toString()].length === 0 ||
                          uploadingStationImages[station.id.toString()]
                        }
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          uploadStationImages(station.id);
                        }}
                      >
                        {uploadingStationImages[station.id.toString()] ? "⏳ Uploading..." : "📤 Upload"}
                      </button>

                      {stationImageUploads[station.id.toString()] && (
                        <button
                          style={{
                            background: "#ff9800",
                            color: "white",
                            border: "none",
                            padding: "4px 8px",
                            borderRadius: 4,
                            cursor: "pointer",
                            fontSize: 10,
                            fontWeight: 600,
                          }}
                          onClick={() => clearStationImageUploads(station.id)}
                        >
                          🗑️ Clear
                        </button>
                      )}
                    </div>
                  </div>

                  <button
                    style={{
                      background: "#2196F3",
                      color: "white",
                      border: "none",
                      padding: "6px 12px",
                      borderRadius: 4,
                      cursor: "pointer",
                      fontSize: 12,
                      fontWeight: 600,
                      width: "100%",
                      marginBottom: 4,
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      startEditStation(station);
                    }}
                  >
                    ✏️ Edit Station
                  </button>
                  <button
                    style={{
                      background: "#f44336",
                      color: "white",
                      border: "none",
                      padding: "6px 12px",
                      borderRadius: 4,
                      cursor: "pointer",
                      fontSize: 12,
                      fontWeight: 600,
                      width: "100%",
                    }}
                    onClick={() => onDeleteStation(station)}
                  >
                    🗑️ Delete Station
                  </button>
                </div>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
    </>
  );
};

export default AdminStationList;

import React from "react";
import { Marker, Popup } from "react-leaflet";
import ImageSlideshow from "../../common/ImageSlideshow";
import type { POI } from "../../../types/station.types";
import AdminPoiForm from "./AdminPoiForm";

interface AdminPoiListProps {
  pois: POI[];
  isAdminEnabled: boolean;
  editingPoiId: number | null;
  editFormData: any;
  setEditFormData: (data: any) => void;
  editSubmitting: boolean;
  startEditPoi: (poi: POI) => void;
  cancelEdit: () => void;
  submitEditPoi: (poiId: number) => void;
  onDeletePoi: (poi: POI) => void | Promise<void>;
  stationImageUploadUrls: Record<string, string[]>;
  stationImageUploads: Record<string, File[]>;
  uploadingStationImages: Record<string, boolean>;
  handleStationImageSelect: (poiId: number, files: FileList | null) => void;
  uploadStationImages: (poiId: number) => void;
  clearStationImageUploads: (poiId: number) => void;
  createPOIIcon: (type: string) => any;
  editPrevOpenRef: React.MutableRefObject<string>;
  editPrevCloseRef: React.MutableRefObject<string>;
}

const AdminPoiList: React.FC<AdminPoiListProps> = ({
  pois,
  isAdminEnabled,
  editingPoiId,
  editFormData,
  setEditFormData,
  editSubmitting,
  startEditPoi,
  cancelEdit,
  submitEditPoi,
  onDeletePoi,
  stationImageUploadUrls,
  stationImageUploads,
  uploadingStationImages,
  handleStationImageSelect,
  uploadStationImages,
  clearStationImageUploads,
  createPOIIcon,
  editPrevOpenRef,
  editPrevCloseRef,
}) => {
  return (
    <>
      {pois.map((poi) => (
        <Marker
          key={`poi-${poi.id}`}
          position={[poi.location.lat, poi.location.lng]}
          icon={createPOIIcon(poi.type)}
        >
          <Popup>
            <div style={{ minWidth: 180 }}>
              {editingPoiId === poi.id ? (
                <AdminPoiForm
                  editFormData={editFormData}
                  setEditFormData={setEditFormData}
                  editSubmitting={editSubmitting}
                  onSave={() => submitEditPoi(poi.id)}
                  onCancel={cancelEdit}
                  editPrevOpenRef={editPrevOpenRef}
                  editPrevCloseRef={editPrevCloseRef}
                />
              ) : (
                <>
                  <b>📍 {poi.name}</b>
                  <div style={{ marginTop: 4 }}>
                    <strong>Type:</strong> {poi.type}
                  </div>
                  {poi.address && (
                    <div>
                      <strong>Address:</strong> {poi.address}
                    </div>
                  )}
                  {poi.phone && (
                    <div>
                      <strong>Phone:</strong> {poi.phone}
                    </div>
                  )}
                  {poi.operating_hours && (
                    <div style={{ marginTop: 4, fontSize: 12, color: "#666" }}>
                      <strong>🕐 Hours:</strong> {poi.operating_hours.open} - {poi.operating_hours.close}
                    </div>
                  )}

                  {poi.images && poi.images.length > 0 && (
                    <ImageSlideshow images={poi.images} />
                  )}
                </>
              )}

              {isAdminEnabled && editingPoiId !== poi.id && (
                <div
                  style={{ marginTop: 12, paddingTop: 8, borderTop: "1px solid #eee" }}
                >
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ marginBottom: 4, fontSize: 12, fontWeight: 600 }}>
                      📷 Add Images:
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => handleStationImageSelect(poi.id, e.target.files)}
                      style={{ fontSize: 10, marginBottom: 4, width: "100%" }}
                    />

                    {stationImageUploadUrls[poi.id.toString()] && (
                      <div style={{ display: "flex", gap: 4, marginBottom: 4, flexWrap: "wrap" }}>
                        {stationImageUploadUrls[poi.id.toString()].map((url, idx) => (
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
                            stationImageUploads[poi.id.toString()] &&
                            stationImageUploads[poi.id.toString()].length > 0
                              ? "#4CAF50"
                              : "#ccc",
                          color: "white",
                          border: "none",
                          padding: "4px 8px",
                          borderRadius: 4,
                          cursor:
                            stationImageUploads[poi.id.toString()] &&
                            stationImageUploads[poi.id.toString()].length > 0
                              ? "pointer"
                              : "not-allowed",
                          fontSize: 10,
                          fontWeight: 600,
                          flex: 1,
                        }}
                        disabled={
                          !stationImageUploads[poi.id.toString()] ||
                          stationImageUploads[poi.id.toString()].length === 0 ||
                          uploadingStationImages[poi.id.toString()]
                        }
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          uploadStationImages(poi.id);
                        }}
                      >
                        {uploadingStationImages[poi.id.toString()] ? "⏳ Uploading..." : "📤 Upload"}
                      </button>

                      {stationImageUploads[poi.id.toString()] && (
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
                          onClick={() => clearStationImageUploads(poi.id)}
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
                      startEditPoi(poi);
                    }}
                  >
                    ✏️ Edit POI
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
                    onClick={() => onDeletePoi(poi)}
                  >
                    🗑️ Delete POI
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

export default AdminPoiList;

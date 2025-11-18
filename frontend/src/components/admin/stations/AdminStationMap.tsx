import React from "react";
import { MapContainer, TileLayer, Marker, Popup, LayersControl } from "react-leaflet";
import AddStationClickCatcher from "../map/AddStationClickCatcher";
import AdminStationList from "./AdminStationList";
import AdminPoiList from "../pois/AdminPoiList";
import type { Station, POI, CustomMarker } from "../../../types/station.types";

interface LatLng {
  lat: number;
  lng: number;
}

interface AdminStationMapProps {
  position: [number, number];
  isAdminEnabled: boolean;
  addingMode: boolean;
  pendingLatLng: LatLng | null;
  formType: string;
  formBrand: string;
  onSelectAddLocation: (lat: number, lng: number) => void;
  DefaultIcon: any;
  createFuelStationIcon: (brand: string, proximity?: number) => any;
  createPOIIcon: (type: string) => any;
  // Stations props
  stations: Station[];
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
  handleStationImageSelect: (id: number, files: FileList | null) => void;
  uploadStationImages: (id: number) => void;
  clearStationImageUploads: (id: number) => void;
  editPrevOpenRef: React.MutableRefObject<string>;
  editPrevCloseRef: React.MutableRefObject<string>;
  // POIs props
  pois: POI[];
  editingPoiId: number | null;
  startEditPoi: (poi: POI) => void;
  submitEditPoi: (poiId: number) => void;
  onDeletePoi: (poi: POI) => void | Promise<void>;
  // Custom markers
  customMarkers: CustomMarker[];
  removeCustomMarker: (id: number) => void;
}

const AdminStationMap: React.FC<AdminStationMapProps> = ({
  position,
  isAdminEnabled,
  addingMode,
  pendingLatLng,
  formType,
  formBrand,
  onSelectAddLocation,
  DefaultIcon,
  createFuelStationIcon,
  createPOIIcon,
  stations,
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
  editPrevOpenRef,
  editPrevCloseRef,
  pois,
  editingPoiId,
  startEditPoi,
  submitEditPoi,
  onDeletePoi,
  customMarkers,
  removeCustomMarker,
}) => {
  return (
    <MapContainer center={position} zoom={12} className="map-container-wrapper">
      <LayersControl position="bottomleft">
        <LayersControl.BaseLayer checked name="Street">
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            crossOrigin="anonymous"
          />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer name="Satellite">
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution='&copy; <a href="https://www.esri.com/">Esri</a> i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
            crossOrigin="anonymous"
            maxZoom={19}
          />
        </LayersControl.BaseLayer>
      </LayersControl>

      <AddStationClickCatcher enabled={addingMode && isAdminEnabled} onSelect={onSelectAddLocation} />

      {/* User location */}
      <Marker position={position} icon={DefaultIcon}>
        <Popup>
          <div>
            <b>📍 Your Location</b>
            <div style={{ marginTop: 4, fontSize: 12, color: "#666" }}>Admin Portal Base</div>
            <div style={{ marginTop: 4, fontSize: 11, color: "#888" }}>
              {position[0].toFixed(6)}, {position[1].toFixed(6)}
            </div>
          </div>
        </Popup>
      </Marker>

      {/* Pending marker for new POI */}
      {pendingLatLng && isAdminEnabled && (
        <Marker
          position={[pendingLatLng.lat, pendingLatLng.lng]}
          icon={formType === "gas" ? createFuelStationIcon(formBrand || "Local", 0) : createPOIIcon(formType)}
        >
          <Popup>
            <div>
              <b>🚧 New POI Location</b>
              <div style={{ marginTop: 4, fontSize: 12, color: "#666" }}>Type: {formType}</div>
              <div style={{ marginTop: 4, fontSize: 11, color: "#888" }}>
                {pendingLatLng.lat.toFixed(8)}, {pendingLatLng.lng.toFixed(8)}
              </div>
            </div>
          </Popup>
        </Marker>
      )}

      {/* Existing stations */}
      <AdminStationList
        stations={stations}
        isAdminEnabled={isAdminEnabled}
        editingStationId={editingStationId}
        editFormData={editFormData}
        setEditFormData={setEditFormData}
        editSubmitting={editSubmitting}
        startEditStation={startEditStation}
        cancelEdit={cancelEdit}
        submitEditStation={submitEditStation}
        onDeleteStation={onDeleteStation}
        stationImageUploadUrls={stationImageUploadUrls}
        stationImageUploads={stationImageUploads}
        uploadingStationImages={uploadingStationImages}
        handleStationImageSelect={handleStationImageSelect}
        uploadStationImages={uploadStationImages}
        clearStationImageUploads={clearStationImageUploads}
        createFuelStationIcon={createFuelStationIcon}
        editPrevOpenRef={editPrevOpenRef}
        editPrevCloseRef={editPrevCloseRef}
      />

      {/* POIs */}
      <AdminPoiList
        pois={pois}
        isAdminEnabled={isAdminEnabled}
        editingPoiId={editingPoiId}
        editFormData={editFormData}
        setEditFormData={setEditFormData}
        editSubmitting={editSubmitting}
        startEditPoi={startEditPoi}
        cancelEdit={cancelEdit}
        submitEditPoi={submitEditPoi}
        onDeletePoi={onDeletePoi}
        stationImageUploadUrls={stationImageUploadUrls}
        stationImageUploads={stationImageUploads}
        uploadingStationImages={uploadingStationImages}
        handleStationImageSelect={handleStationImageSelect}
        uploadStationImages={uploadStationImages}
        clearStationImageUploads={clearStationImageUploads}
        createPOIIcon={createPOIIcon}
        editPrevOpenRef={editPrevOpenRef}
        editPrevCloseRef={editPrevCloseRef}
      />

      {/* Custom markers */}
      {customMarkers.map((marker) => (
        <Marker key={`custom-${marker.id}`} position={[marker.lat, marker.lng]} icon={createPOIIcon(marker.type)}>
          <Popup>
            <div>
              <b>{marker.name}</b>
              <div style={{ marginTop: 4, color: "#666" }}>Type: {marker.type}</div>
              <div style={{ marginTop: 4, fontSize: 11, color: "#888" }}>Local marker</div>
              <div style={{ marginTop: 8 }}>
                <button
                  style={{
                    background: "#f44336",
                    color: "white",
                    border: "none",
                    padding: "4px 8px",
                    borderRadius: 4,
                    cursor: "pointer",
                    fontSize: 11,
                  }}
                  onClick={() => removeCustomMarker(marker.id)}
                >
                  🗑️ Remove Marker
                </button>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
};

export default AdminStationMap;

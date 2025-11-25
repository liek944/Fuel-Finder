import React, { useEffect, useMemo, useRef, useState } from "react";
import AdminStationMap from "./AdminStationMap";
import { createFuelStationIcon, createPOIIcon, createUserLocationIcon } from "../icons/MarkerIcons";
import { useAdminStations } from "../../../hooks/admin/useAdminStations";
import { useAdminPois } from "../../../hooks/admin/useAdminPois";
import type { Station, POI, CustomMarker } from "../../../types/station.types";
import { apiDelete, apiPost, apiPostBase64Images, apiPut } from "../../../utils/api";

interface StationsTabContainerProps {
  adminApiKey: string;
  isAdminEnabled: boolean;
  adminValidating?: boolean;
  onChangeApiKey: (val: string) => void;
  onEnableAdmin: () => void;
  onDisableAdmin: () => void;
}

interface LatLng {
  lat: number;
  lng: number;
}

const StationsTabContainer: React.FC<StationsTabContainerProps> = ({
  adminApiKey,
  isAdminEnabled,
  adminValidating,
  onChangeApiKey,
  onEnableAdmin,
  onDisableAdmin,
}) => {
  // Position (geolocation)
  const [position, setPosition] = useState<[number, number] | null>(null);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => setPosition([pos.coords.latitude, pos.coords.longitude]),
      () => setPosition([12.5966, 121.5258]) // Oriental Mindoro center fallback
    );
  }, []);

  // Data hooks
  const { stations, refresh: refreshStations } = useAdminStations();
  const { pois, refresh: refreshPois } = useAdminPois();

  const refreshAll = () => {
    refreshStations();
    refreshPois();
  };

  // Custom markers (local only)
  const [customMarkers, setCustomMarkers] = useState<CustomMarker[]>([]);
  useEffect(() => {
    try {
      const saved = localStorage.getItem("custom_markers");
      if (saved) setCustomMarkers(JSON.parse(saved));
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("custom_markers", JSON.stringify(customMarkers));
    } catch {}
  }, [customMarkers]);

  const removeCustomMarker = (id: number) => {
    setCustomMarkers((prev) => prev.filter((m) => m.id !== id));
  };

  // Add-new form states
  const [addingMode, setAddingMode] = useState(false);
  const [pendingLatLng, setPendingLatLng] = useState<LatLng | null>(null);

  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState<string>("gas");
  const [formBrand, setFormBrand] = useState<string>("Local");
  const [formPrice, setFormPrice] = useState<string>("60.00"); // legacy 
  const [formServices, setFormServices] = useState<string[]>([]);
  const [formFuelPrices, setFormFuelPrices] = useState<Array<{ fuel_type: string; price: string }>>([
    { fuel_type: "Regular", price: "58.00" },
    { fuel_type: "Diesel", price: "55.00" },
    { fuel_type: "Premium", price: "62.00" },
  ]);
  const [formAddress, setFormAddress] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formOpenTime, setFormOpenTime] = useState("08:00");
  const [formCloseTime, setFormCloseTime] = useState("20:00");
  const [unknownTime] = useState(false);

  // New entity image uploads
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formMsg, setFormMsg] = useState<{ type: "error" | "success"; text: string } | null>(null);

  // Manual coordinates inputs
  const [manualLat, setManualLat] = useState("");
  const [manualLng, setManualLng] = useState("");
  const [manualCoords, setManualCoords] = useState("");

  // Edit existing
  const [editingStationId, setEditingStationId] = useState<number | null>(null);
  const [editingPoiId, setEditingPoiId] = useState<number | null>(null);
  const [editFormData, setEditFormData] = useState<any>({});
  const [editSubmitting, setEditSubmitting] = useState(false);
  const editPrevOpenRef = useRef("08:00");
  const editPrevCloseRef = useRef("20:00");

  // Existing images upload per entity (station or poi id)
  const [stationImageUploads, setStationImageUploads] = useState<Record<string, File[]>>({});
  const [stationImageUploadUrls, setStationImageUploadUrls] = useState<Record<string, string[]>>({});
  const [uploadingStationImages, setUploadingStationImages] = useState<Record<string, boolean>>({});
  const uploadLocksRef = useRef<Set<string>>(new Set());

  const DefaultIcon = useMemo(() => createUserLocationIcon(), []);

  // Handlers copied from AdminPortal (preserve behavior)

  const startEditStation = (station: Station) => {
    setEditingStationId(station.id);
    setEditFormData({
      name: station.name,
      brand: station.brand,
      fuel_price: station.fuel_price,
      services: station.services,
      address: station.address || "",
      phone: station.phone || "",
      operating_hours: station.operating_hours,
      unknownTime: !station.operating_hours,
      lat: station.location.lat,
      lng: station.location.lng,
      fuel_prices: (station.fuel_prices || []).map((fp) => ({ fuel_type: fp.fuel_type, price: String(fp.price) })),
      _originalFuelTypes: Array.from(new Set((station.fuel_prices || []).map((fp) => fp.fuel_type))),
    });
  };

  const startEditPoi = (poi: POI) => {
    setEditingPoiId(poi.id);
    setEditFormData({
      name: poi.name,
      type: poi.type,
      address: poi.address || "",
      phone: poi.phone || "",
      operating_hours: poi.operating_hours,
      unknownTime: !poi.operating_hours,
    });
  };

  const cancelEdit = () => {
    setEditingStationId(null);
    setEditingPoiId(null);
    setEditFormData({});
  };

  const submitEditStation = async (stationId: number) => {
    setEditSubmitting(true);
    try {
      const { fuel_prices, _originalFuelTypes, unknownTime: u, ...general } = editFormData || {};
      if (u) general.operating_hours = null;

      const res = await apiPut(`/api/stations/${stationId}`, general, adminApiKey.trim());
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        alert(`Failed to update station: ${errorData.message || "Unknown error"}`);
        setEditSubmitting(false);
        return;
      }

      const newList: Array<{ fuel_type: string; price: string }> = (fuel_prices || []).filter((fp: any) => String(fp.fuel_type || "").trim().length > 0);
      const newMap = new Map<string, number>();
      newList.forEach((fp) => newMap.set(fp.fuel_type.trim(), parseFloat(fp.price)));
      const originalSet = new Set<string>((_originalFuelTypes || []) as string[]);

      for (const [ft, price] of Array.from(newMap.entries())) {
        if (price > 0) {
          const path = `/api/stations/${stationId}/fuel-prices/${encodeURIComponent(ft)}`;
          const putRes = await apiPut(path, { price, updated_by: "admin" }, adminApiKey.trim());
          if (!putRes.ok) {
            const e = await putRes.json().catch(() => ({}));
            console.warn("Fuel price upsert failed", ft, e);
          }
        }
      }

      const newTypes = new Set<string>(Array.from(newMap.keys()).filter((ft) => newMap.get(ft)! > 0));
      for (const ft of originalSet) {
        if (!newTypes.has(ft)) {
          const delPath = `/api/stations/${stationId}/fuel-prices/${encodeURIComponent(ft)}`;
          try {
            await apiDelete(delPath, adminApiKey.trim());
          } catch (e) {
            console.warn("Fuel price delete failed", ft, e);
          }
        }
      }

      alert("Station updated successfully!");
      setEditingStationId(null);
      setEditFormData({});
      refreshAll();
    } catch (err) {
      console.error("Error updating station:", err);
      alert("Network error. Please try again.");
    } finally {
      setEditSubmitting(false);
    }
  };

  const submitEditPoi = async (poiId: number) => {
    setEditSubmitting(true);
    try {
      const { unknownTime: u, ...rest } = editFormData;
      if (u) (rest as any).operating_hours = null;
      const res = await apiPut(`/api/pois/${poiId}`, rest, adminApiKey.trim());
      if (res.ok) {
        alert("POI updated successfully!");
        setEditingPoiId(null);
        setEditFormData({});
        refreshAll();
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(`Failed to update POI: ${errorData.message || "Unknown error"}`);
      }
    } catch (err) {
      console.error("Error updating POI:", err);
      alert("Network error. Please try again.");
    } finally {
      setEditSubmitting(false);
    }
  };

  const onDeleteStation = async (station: Station) => {
    if (!window.confirm(`Delete "${station.name}"?`)) return;
    try {
      const res = await apiDelete(`/api/stations/${station.id}`, adminApiKey.trim());
      if (res.ok) {
        refreshAll();
        alert("Station deleted successfully!");
      } else {
        alert("Failed to delete station");
      }
    } catch (err) {
      console.error("Delete failed:", err);
      alert("Error deleting station");
    }
  };

  const onDeletePoi = async (poi: POI) => {
    if (!window.confirm(`Delete "${poi.name}"?`)) return;
    try {
      const res = await apiDelete(`/api/pois/${poi.id}`, adminApiKey.trim());
      if (res.ok) {
        refreshAll();
        alert("POI deleted successfully!");
      } else {
        alert("Failed to delete POI");
      }
    } catch (err) {
      console.error("Delete failed:", err);
      alert("Error deleting POI");
    }
  };

  // Existing entity image selection and upload
  const handleStationImageSelect = async (entityId: number, files: FileList | null) => {
    if (!files || files.length === 0) return;
    const maxImages = 5;
    if (files.length > maxImages) {
      alert(`You can only upload up to ${maxImages} images at once.`);
      return;
    }
    const fileArray = Array.from(files);
    const urls: string[] = [];
    for (const file of fileArray) {
      if (file.size > 10 * 1024 * 1024) {
        alert(`File ${file.name} is too large. Max size is 10MB.`);
        continue;
      }
      if (!file.type.startsWith("image/")) {
        alert(`File ${file.name} is not an image.`);
        continue;
      }
      urls.push(URL.createObjectURL(file));
    }
    const key = entityId.toString();
    setStationImageUploads((prev) => ({ ...prev, [key]: fileArray }));
    if (stationImageUploadUrls[key]) {
      stationImageUploadUrls[key].forEach((u) => URL.revokeObjectURL(u));
    }
    setStationImageUploadUrls((prev) => ({ ...prev, [key]: urls }));
  };

  const uploadStationImages = async (entityId: number) => {
    const key = entityId.toString();
    const images = stationImageUploads[key];
    if (!images || images.length === 0) {
      alert("Please select images to upload first.");
      return;
    }
    if (uploadLocksRef.current.has(key) || uploadingStationImages[key]) return;
    uploadLocksRef.current.add(key);
    setUploadingStationImages((prev) => ({ ...prev, [key]: true }));
    try {
      const imageRes = await apiPostBase64Images(`/api/stations/${entityId}/images`, images, adminApiKey.trim());
      if (imageRes.ok) {
        alert(`Successfully uploaded ${images.length} image(s)!`);
        setStationImageUploads((prev) => {
          const u = { ...prev };
          delete u[key];
          return u;
        });
        if (stationImageUploadUrls[key]) stationImageUploadUrls[key].forEach((u) => URL.revokeObjectURL(u));
        setStationImageUploadUrls((prev) => {
          const u = { ...prev };
          delete u[key];
          return u;
        });
        refreshAll();
      } else {
        const errorData = await imageRes.json().catch(() => ({ error: "Upload failed" }));
        alert(`Image upload failed: ${errorData.message || errorData.error || "Unknown error"}`);
      }
    } catch (e) {
      console.error("Error uploading images:", e);
      alert("Error uploading images. Please try again.");
    } finally {
      uploadLocksRef.current.delete(key);
      setUploadingStationImages((prev) => ({ ...prev, [key]: false }));
    }
  };

  const clearStationImageUploads = (entityId: number) => {
    const key = entityId.toString();
    if (stationImageUploadUrls[key]) stationImageUploadUrls[key].forEach((u) => URL.revokeObjectURL(u));
    setStationImageUploads((prev) => {
      const u = { ...prev };
      delete u[key];
      return u;
    });
    setStationImageUploadUrls((prev) => {
      const u = { ...prev };
      delete u[key];
      return u;
    });
  };

  // New entity image selection for form
  const handleImageSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const maxImages = 5;
    if (files.length > maxImages) {
      alert(`You can only upload up to ${maxImages} images at once.`);
      return;
    }
    const validFiles: File[] = [];
    const maxSize = 10 * 1024 * 1024;
    const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    for (const f of files) {
      if (!allowed.includes(f.type)) {
        alert(`Invalid file type: ${f.name}. Please use JPG, PNG, or WebP images.`);
        continue;
      }
      if (f.size > maxSize) {
        alert(`File too large: ${f.name}. Maximum size is 10MB.`);
        continue;
      }
      validFiles.push(f);
    }
    if (validFiles.length === 0) return;
    setSelectedImages(validFiles);
    setImagePreviewUrls(validFiles.map((f) => URL.createObjectURL(f)));
  };

  const removeImage = (index: number) => {
    const newImages = selectedImages.filter((_, i) => i !== index);
    const newUrls = imagePreviewUrls.filter((_, i) => i !== index);
    URL.revokeObjectURL(imagePreviewUrls[index]);
    setSelectedImages(newImages);
    setImagePreviewUrls(newUrls);
  };

  const setManualCoordinates = () => {
    let lat: number;
    let lng: number;
    if (manualCoords.trim()) {
      const coords = manualCoords.trim().replace(/\s+/g, "").split(",");
      if (coords.length !== 2) {
        alert("Please enter coordinates in format: latitude, longitude (e.g., 12.5966, 121.5258)");
        return;
      }
      lat = parseFloat(coords[0]);
      lng = parseFloat(coords[1]);
    } else if (manualLat.trim() && manualLng.trim()) {
      lat = parseFloat(manualLat);
      lng = parseFloat(manualLng);
    } else {
      alert("Please enter coordinates either in the single field or both latitude and longitude fields.");
      return;
    }
    if (!isFinite(lat) || Math.abs(lat) > 90) {
      alert("Please enter a valid latitude between -90 and 90.");
      return;
    }
    if (!isFinite(lng) || Math.abs(lng) > 180) {
      alert("Please enter a valid longitude between -180 and 180.");
      return;
    }
    const isValidPhilippinesLat = lat >= 4 && lat <= 22;
    const isValidPhilippinesLng = lng >= 116 && lng <= 127;
    if (!isValidPhilippinesLat && isValidPhilippinesLng) {
      const shouldSwap = window.confirm(
        `⚠️ COORDINATE SWAP DETECTED!\n\nYour latitude (${lat.toFixed(6)}) looks like a longitude value.\nYour longitude (${lng.toFixed(6)}) looks like a latitude value.\n\nClick OK to auto-swap.`
      );
      if (shouldSwap) [lat, lng] = [lng, lat];
    } else if (isValidPhilippinesLat && !isValidPhilippinesLng) {
      const shouldSwap = window.confirm(
        `⚠️ COORDINATE SWAP DETECTED!\n\nYour longitude (${lng.toFixed(6)}) looks like a latitude value.\nYour latitude (${lat.toFixed(6)}) looks like a longitude value.\n\nClick OK to auto-swap.`
      );
      if (shouldSwap) [lat, lng] = [lng, lat];
    } else if (!isValidPhilippinesLat && !isValidPhilippinesLng) {
      const confirmOutside = window.confirm(
        `⚠️ WARNING: These coordinates (${lat.toFixed(6)}, ${lng.toFixed(6)}) are outside the Philippines region. Continue?`
      );
      if (!confirmOutside) return;
    }
    setPendingLatLng({ lat, lng });
    setManualLat("");
    setManualLng("");
    setManualCoords("");
  };

  const submitStationForm = async () => {
    if (!pendingLatLng || !formName) return;
    setFormSubmitting(true);
    setFormMsg(null);
    try {
      const isGasStation = formType === "gas";
      const endpoint = isGasStation ? "/api/stations" : "/api/pois";
      const payload: any = {
        name: formName,
        location: { lat: pendingLatLng.lat, lng: pendingLatLng.lng },
      };
      if (isGasStation) {
        payload.brand = formBrand;
        payload.fuel_price = parseFloat(formPrice);
        payload.address = formAddress;
        payload.phone = formPhone;
        payload.services = formServices;
        payload.fuel_prices = formFuelPrices
          .filter((fp) => fp.fuel_type.trim() && parseFloat(fp.price) > 0)
          .map((fp) => ({ fuel_type: fp.fuel_type.trim(), price: parseFloat(fp.price) }));
        if (!unknownTime && formOpenTime && formCloseTime) {
          payload.operating_hours = { open: formOpenTime, close: formCloseTime };
        }
      } else {
        payload.type = formType;
        payload.address = formAddress;
        payload.phone = formPhone;
        if (formOpenTime && formCloseTime) {
          payload.operating_hours = { open: formOpenTime, close: formCloseTime };
        }
      }
      const res = await apiPost(endpoint, payload, adminApiKey.trim());
      if (res.ok) {
        const newEntity = await res.json().catch(() => null);
        let imageUploadSuccess = true;
        if (selectedImages.length > 0 && !uploadingImages) {
          setUploadingImages(true);
          try {
            const imageEndpoint = isGasStation ? `/api/stations/${newEntity.id}/images` : `/api/pois/${newEntity.id}/images`;
            const imageRes = await apiPostBase64Images(imageEndpoint, selectedImages, adminApiKey.trim());
            if (!imageRes.ok) imageUploadSuccess = false;
          } catch {
            imageUploadSuccess = false;
          } finally {
            setUploadingImages(false);
          }
        }
        const entityType = isGasStation ? "Station" : "POI";
        const successMessage = imageUploadSuccess
          ? `${entityType} added successfully${selectedImages.length > 0 ? ` with ${selectedImages.length} image(s)` : ""}!`
          : `${entityType} added successfully, but image upload failed.`;
        setFormMsg({ type: "success", text: successMessage });
        refreshAll();
        // reset
        setFormName("");
        setFormType("gas");
        setFormBrand("Local");
        setFormPrice("60.00");
        setFormFuelPrices([
          { fuel_type: "Regular", price: "58.00" },
          { fuel_type: "Diesel", price: "55.00" },
          { fuel_type: "Premium", price: "62.00" },
        ]);
        setFormAddress("");
        setFormPhone("");
        setFormServices([]);
        setFormOpenTime("08:00");
        setFormCloseTime("20:00");
        setManualLat("");
        setAddingMode(false);
        setManualLng("");
        imagePreviewUrls.forEach((url) => URL.revokeObjectURL(url));
        setSelectedImages([]);
        setImagePreviewUrls([]);
        setUploadingImages(false);
      } else {
        const errorData = await res.json().catch(() => ({}));
        setFormMsg({ type: "error", text: errorData.message || `Failed to add ${formType === "gas" ? "station" : "POI"}` });
      }
    } catch (err) {
      console.error("Error adding POI:", err);
      setFormMsg({ type: "error", text: "Network error. Please try again." });
    } finally {
      setFormSubmitting(false);
    }
  };

  if (!position) {
    return <div className="loading-container">Loading admin portal...</div>;
  }

  return (
    <>
      {/* Map */}
      <AdminStationMap
        position={position}
        isAdminEnabled={isAdminEnabled}
        addingMode={addingMode}
        pendingLatLng={pendingLatLng}
        formType={formType}
        formBrand={formBrand}
        onSelectAddLocation={(lat, lng) => {
          setPendingLatLng({ lat, lng });
        }}
        DefaultIcon={DefaultIcon}
        createFuelStationIcon={createFuelStationIcon}
        createPOIIcon={createPOIIcon}
        stations={stations}
        editingStationId={editingStationId}
        editFormData={editFormData}
        setEditFormData={setEditFormData}
        editSubmitting={editSubmitting}
        startEditStation={startEditStation}
        cancelEdit={cancelEdit}
        submitEditStation={(id) => submitEditStation(id)}
        onDeleteStation={onDeleteStation}
        stationImageUploadUrls={stationImageUploadUrls}
        stationImageUploads={stationImageUploads}
        uploadingStationImages={uploadingStationImages}
        handleStationImageSelect={handleStationImageSelect}
        uploadStationImages={uploadStationImages}
        clearStationImageUploads={clearStationImageUploads}
        editPrevOpenRef={editPrevOpenRef}
        editPrevCloseRef={editPrevCloseRef}
        pois={pois}
        editingPoiId={editingPoiId}
        startEditPoi={startEditPoi}
        submitEditPoi={(id) => submitEditPoi(id)}
        onDeletePoi={onDeletePoi}
        customMarkers={customMarkers}
        removeCustomMarker={removeCustomMarker}
      />

      {/* Admin Controls Panel */}
      <div className="admin-controls-panel">
        <h3 style={{ margin: "0 0 15px 0", color: "#333", display: "flex", alignItems: "center", gap: 8 }}>
          🛠️ Admin Controls
        </h3>

        {/* API Key Section */}
        <div style={{ marginBottom: 20, padding: "12px", background: "#f5f5f5", borderRadius: 6 }}>
          <label style={{ display: "block", marginBottom: 8, fontWeight: 600, color: "#555" }}>🔑 Admin API Key</label>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <input
              type="password"
              placeholder="Enter admin API key"
              value={adminApiKey}
              onChange={(e) => onChangeApiKey(e.target.value)}
              style={{ flex: 1, padding: "8px", border: "1px solid #ddd", borderRadius: 4, fontSize: "14px" }}
            />
            {!isAdminEnabled ? (
              <button
                onClick={onEnableAdmin}
                disabled={!adminApiKey.trim() || !!adminValidating}
                style={{
                  padding: "8px 12px",
                  background: !adminApiKey.trim() || adminValidating ? "#ccc" : "#4CAF50",
                  color: "white",
                  border: "none",
                  borderRadius: 4,
                  cursor: !adminApiKey.trim() || adminValidating ? "not-allowed" : "pointer",
                  fontWeight: 600,
                  fontSize: "12px",
                }}
              >
                {adminValidating ? "Validating..." : "Enable"}
              </button>
            ) : (
              <button
                onClick={onDisableAdmin}
                style={{
                  padding: "8px 12px",
                  background: "#f44336",
                  color: "white",
                  border: "none",
                  borderRadius: 4,
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: "12px",
                }}
              >
                Disable
              </button>
            )}
          </div>
          <div style={{ fontSize: "12px", color: "#666", fontStyle: "italic" }}>
            {adminValidating ? "🔄 Validating API key..." : isAdminEnabled ? "✅ Admin features are now active" : "❌ Enter API key to enable admin features"}
          </div>
        </div>

        {isAdminEnabled && (
          <>
            {/* POI Management */}
            <div style={{ marginBottom: 20, padding: "12px", background: "#e8f5e9", borderRadius: 6 }}>
              <h4 style={{ margin: "0 0 10px 0", color: "#2e7d32", display: "flex", alignItems: "center", gap: 6 }}>
                📍 POI Management
              </h4>
              <button
                onClick={() => {
                  setAddingMode(!addingMode);
                  setPendingLatLng(null);
                  setFormMsg(null);
                  setManualLat("");
                  setManualLng("");
                  setManualCoords("");
                  setFormName("");
                  setFormType("gas");
                  setFormBrand("Local");
                  setFormPrice("60.00");
                  setFormAddress("");
                  setFormPhone("");
                  setFormServices([]);
                  setFormFuelPrices([
                    { fuel_type: "Regular", price: "58.00" },
                    { fuel_type: "Diesel", price: "55.00" },
                    { fuel_type: "Premium", price: "62.00" },
                  ]);
                  setFormOpenTime("08:00");
                  setFormCloseTime("20:00");
                  imagePreviewUrls.forEach((url) => URL.revokeObjectURL(url));
                  setSelectedImages([]);
                  setImagePreviewUrls([]);
                  setUploadingImages(false);
                }}
                style={{
                  width: "100%",
                  padding: "12px",
                  background: addingMode ? "#f44336" : "#4CAF50",
                  color: "white",
                  border: "none",
                  borderRadius: 4,
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: "14px",
                }}
              >
                {addingMode ? "❌ Cancel" : "➕ Add New POI"}
              </button>

              {addingMode && (
                <>
                  <div style={{ marginTop: 8, padding: "8px", background: "rgba(255,193,7,0.1)", borderRadius: 4, border: "1px solid #ffc107" }}>
                    <p style={{ margin: "0 0 8px 0", fontSize: 12, color: "#2e7d32", fontWeight: 600 }}>
                      👆 Click on the map to place a new POI OR enter coordinates manually:
                    </p>
                    <p style={{ margin: "0 0 4px 0", fontSize: 11, color: "#999" }}>
                      💡 Tip: Right-click on Google Maps → Copy coordinates
                    </p>
                    <p style={{ margin: "0 0 8px 0", fontSize: 10, color: "#e65100", fontWeight: 600, background: "#fff3e0", padding: "4px 6px", borderRadius: 3 }}>
                      ⚠️ Google Maps format: Lat, Lng (e.g., 12.5966, 121.5258)
                    </p>

                    {/* Single coordinate input field */}
                    <div style={{ marginBottom: 12 }}>
                      <label style={{ display: "block", fontSize: 11, color: "#333", marginBottom: 4, fontWeight: 600 }}>
                        📍 Paste Coordinates (recommended)
                      </label>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <input
                          type="text"
                          placeholder="12.596600, 121.525800"
                          value={manualCoords}
                          onChange={(e) => setManualCoords(e.target.value)}
                          style={{ flex: 1, padding: "10px", border: "2px solid #4CAF50", borderRadius: 4, fontSize: "13px", fontFamily: "monospace", background: "#f0f9ff" }}
                        />
                        <button
                          onClick={setManualCoordinates}
                          disabled={!manualCoords.trim() && (!manualLat.trim() || !manualLng.trim())}
                          style={{
                            padding: "10px 16px",
                            background: !manualCoords.trim() && (!manualLat.trim() || !manualLng.trim()) ? "#ccc" : "#4CAF50",
                            color: "white",
                            border: "none",
                            borderRadius: 4,
                            cursor: !manualCoords.trim() && (!manualLat.trim() || !manualLng.trim()) ? "not-allowed" : "pointer",
                            fontSize: "13px",
                            fontWeight: 600,
                            whiteSpace: "nowrap",
                          }}
                        >
                          📍 Set
                        </button>
                      </div>
                    </div>

                    {/* Separator */}
                    <div style={{ textAlign: "center", margin: "12px 0 8px 0", fontSize: 10, color: "#999", fontStyle: "italic" }}>
                      — OR enter separately —
                    </div>

                    {/* Separate coordinate inputs */}
                    <div style={{ display: "flex", gap: 8, alignItems: "end" }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: "block", fontSize: 10, color: "#666", marginBottom: 2, fontWeight: 600 }}>
                          Latitude (4° to 22°)
                        </label>
                        <input
                          type="number"
                          step="0.000001"
                          min="-90"
                          max="90"
                          placeholder="12.596600"
                          value={manualLat}
                          onChange={(e) => setManualLat(e.target.value)}
                          style={{ width: "100%", padding: "8px", border: "1px solid #ddd", borderRadius: 4, fontSize: "12px" }}
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: "block", fontSize: 10, color: "#666", marginBottom: 2, fontWeight: 600 }}>
                          Longitude (116° to 127°)
                        </label>
                        <input
                          type="number"
                          step="0.000001"
                          min="-180"
                          max="180"
                          placeholder="121.525800"
                          value={manualLng}
                          onChange={(e) => setManualLng(e.target.value)}
                          style={{ width: "100%", padding: "8px", border: "1px solid #ddd", borderRadius: 4, fontSize: "12px" }}
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Stats */}
            <div style={{ backgroundColor: "#f5f5f5", padding: "12px", borderRadius: 6 }}>
              <h4 style={{ margin: "0 0 8px 0", color: "#333", display: "flex", alignItems: "center", gap: 6 }}>
                📊 Database Stats
              </h4>
              <div style={{ fontSize: 14, color: "#666" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span>⛽ Stations:</span>
                  <span style={{ fontWeight: 600 }}>{stations.length}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span>📍 POIs:</span>
                  <span style={{ fontWeight: 600 }}>{pois.length}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>🏪 Local markers:</span>
                  <span style={{ fontWeight: 600 }}>{customMarkers.length}</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* POI Form Overlay */}
      {isAdminEnabled && addingMode && pendingLatLng && (
        <div className="poi-form-overlay">
          <div className="poi-form-container">
            <h3 style={{ margin: "0 0 20px 0", color: "#333", display: "flex", alignItems: "center", gap: 8 }}>
              📍 Add New POI
            </h3>

            {/* POI Type Selector */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", marginBottom: 10, fontWeight: 600, color: "#555", fontSize: "14px" }}>
                POI Type *
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                {[
                  { type: "gas", icon: "⛽", label: "Gas Station", color: "#2196F3" },
                  { type: "convenience", icon: "🏪", label: "Store", color: "#FF9800" },
                  { type: "repair", icon: "🔧", label: "Repair", color: "#9C27B0" },
                  { type: "car_wash", icon: "🚗", label: "Car Wash", color: "#00BCD4" },
                  { type: "motor_shop", icon: "🏍️", label: "Motor Shop", color: "#F44336" },
                ].map((poiType) => (
                  <button
                    key={poiType.type}
                    onClick={() => {
                      setFormType(poiType.type);
                      if (poiType.type !== "gas") {
                        setFormBrand("");
                        setFormPrice("");
                      } else {
                        setFormBrand("Local");
                        setFormPrice("60.00");
                      }
                    }}
                    style={{
                      padding: "15px 10px",
                      background: formType === poiType.type ? poiType.color : "#f5f5f5",
                      color: formType === poiType.type ? "white" : "#666",
                      border: formType === poiType.type ? `2px solid ${poiType.color}` : "2px solid #ddd",
                      borderRadius: 8,
                      cursor: "pointer",
                      fontSize: "12px",
                      fontWeight: 600,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 6,
                      transition: "all 0.2s",
                    }}
                  >
                    <span style={{ fontSize: "24px" }}>{poiType.icon}</span>
                    <span>{poiType.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 15 }}>
              <label style={{ display: "block", marginBottom: 6, fontWeight: 600, color: "#555", fontSize: "14px" }}>
                Name *
              </label>
              <input
                type="text"
                placeholder={formType === "gas" ? "Station name" : "POI name"}
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                style={{ width: "100%", padding: 10, border: "1px solid #ddd", borderRadius: 6, fontSize: 14 }}
              />
            </div>

            {formType === "gas" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
                <div>
                  <label style={{ display: "block", marginBottom: 6, fontWeight: 600, color: "#555", fontSize: 12 }}>Brand</label>
                  <input
                    type="text"
                    value={formBrand}
                    onChange={(e) => setFormBrand(e.target.value)}
                    style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4, fontSize: 12 }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: 6, fontWeight: 600, color: "#555", fontSize: 12 }}>Legacy Fuel Price</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4, fontSize: 12 }}
                  />
                </div>
              </div>
            )}

            {formType === "gas" && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Fuel Prices</div>
                {formFuelPrices.map((fp, idx) => (
                  <div key={idx} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 60px", gap: 6, marginBottom: 6 }}>
                    <input
                      type="text"
                      placeholder="Fuel Type"
                      value={fp.fuel_type}
                      onChange={(e) => {
                        const arr = [...formFuelPrices];
                        arr[idx] = { ...arr[idx], fuel_type: e.target.value };
                        setFormFuelPrices(arr);
                      }}
                      style={{ padding: 8, border: "1px solid #ddd", borderRadius: 4, fontSize: 12 }}
                    />
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={fp.price}
                      onChange={(e) => {
                        const arr = [...formFuelPrices];
                        arr[idx] = { ...arr[idx], price: e.target.value };
                        setFormFuelPrices(arr);
                      }}
                      style={{ padding: 8, border: "1px solid #ddd", borderRadius: 4, fontSize: 12 }}
                    />
                    <button
                      onClick={() => setFormFuelPrices(formFuelPrices.filter((_, i) => i !== idx))}
                      style={{ background: "#f44336", color: "white", border: "none", borderRadius: 4, cursor: "pointer", fontSize: 12 }}
                    >
                      ✖
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => setFormFuelPrices([...formFuelPrices, { fuel_type: "", price: "" }])}
                  style={{ background: "#2196F3", color: "white", border: "none", borderRadius: 4, cursor: "pointer", fontSize: 12, padding: "6px 10px" }}
                >
                  ➕ Add fuel type
                </button>
              </div>
            )}

            <div style={{ marginBottom: 10 }}>
              <label style={{ display: "block", marginBottom: 6, fontWeight: 600, color: "#555", fontSize: 12 }}>Address</label>
              <input type="text" value={formAddress} onChange={(e) => setFormAddress(e.target.value)} style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4, fontSize: 12 }} />
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={{ display: "block", marginBottom: 6, fontWeight: 600, color: "#555", fontSize: 12 }}>Phone</label>
              <input type="text" value={formPhone} onChange={(e) => setFormPhone(e.target.value)} style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4, fontSize: 12 }} />
            </div>

            {formType === "gas" && (
              <div style={{ marginBottom: 10 }}>
                <label style={{ display: "block", marginBottom: 6, fontWeight: 600, color: "#555", fontSize: 12 }}>Services (comma-separated)</label>
                <input
                  type="text"
                  value={formServices.join(", ")}
                  onChange={(e) =>
                    setFormServices(
                      e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter((s) => s.length > 0),
                    )
                  }
                  style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4, fontSize: 12 }}
                  placeholder="e.g., Air, Car Wash, Restroom"
                />
              </div>
            )}

            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Operating Hours</div>
            <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
              <input type="time" step="60" value={formOpenTime} onChange={(e) => setFormOpenTime(e.target.value)} style={{ flex: 1, padding: 6, fontSize: 12 }} />
              <input type="time" step="60" value={formCloseTime} onChange={(e) => setFormCloseTime(e.target.value)} style={{ flex: 1, padding: 6, fontSize: 12 }} />
            </div>

            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Images (optional)</div>
              <input type="file" accept="image/*" multiple onChange={handleImageSelection} style={{ fontSize: 12, width: "100%" }} />
              {imagePreviewUrls.length > 0 && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                  {imagePreviewUrls.map((url, idx) => (
                    <div key={idx} style={{ position: "relative" }}>
                      <img src={url} alt={`Preview ${idx + 1}`} style={{ width: 60, height: 60, objectFit: "cover", borderRadius: 6, border: "1px solid #ddd" }} />
                      <button onClick={() => removeImage(idx)} style={{ position: "absolute", top: -6, right: -6, background: "#f44336", color: "white", border: "none", borderRadius: "50%", width: 18, height: 18, cursor: "pointer", fontSize: 10 }}>✖</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {formMsg && (
              <div style={{ marginBottom: 10, color: formMsg.type === "success" ? "#2e7d32" : "#d32f2f", fontSize: 12, fontWeight: 600 }}>
                {formMsg.text}
              </div>
            )}

            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={submitStationForm}
                disabled={formSubmitting || !formName || !pendingLatLng}
                style={{ flex: 1, padding: "10px 12px", background: formSubmitting ? "#ccc" : "#4CAF50", color: "white", border: "none", borderRadius: 6, cursor: formSubmitting ? "not-allowed" : "pointer", fontWeight: 700 }}
              >
                {formSubmitting ? "⏳ Saving..." : "💾 Save"}
              </button>
              <button
                onClick={() => setAddingMode(false)}
                style={{ flex: 1, padding: "10px 12px", background: "#999", color: "white", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700 }}
              >
                ✖️ Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default StationsTabContainer;

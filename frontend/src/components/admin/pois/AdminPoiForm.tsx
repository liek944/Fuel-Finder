import React from "react";

interface AdminPoiFormProps {
  editFormData: any;
  setEditFormData: (data: any) => void;
  editSubmitting: boolean;
  onSave: () => void;
  onCancel: () => void;
  editPrevOpenRef: React.MutableRefObject<string>;
  editPrevCloseRef: React.MutableRefObject<string>;
}

const AdminPoiForm: React.FC<AdminPoiFormProps> = ({
  editFormData,
  setEditFormData,
  editSubmitting,
  onSave,
  onCancel,
  editPrevOpenRef,
  editPrevCloseRef,
}) => {
  return (
    <div>
      <b>✏️ Edit POI</b>
      <div style={{ marginTop: 8 }}>
        <input
          type="text"
          placeholder="Name"
          value={editFormData.name || ""}
          onChange={(e) =>
            setEditFormData({
              ...editFormData,
              name: e.target.value,
            })
          }
          style={{ width: "100%", padding: 4, marginBottom: 4, fontSize: 12 }}
        />
        <select
          value={editFormData.type || "convenience"}
          onChange={(e) =>
            setEditFormData({
              ...editFormData,
              type: e.target.value,
            })
          }
          style={{ width: "100%", padding: 4, marginBottom: 4, fontSize: 12 }}
        >
          <option value="convenience">Convenience Store</option>
          <option value="repair">Repair Shop</option>
          <option value="car_wash">Car Wash</option>
          <option value="motor_shop">Motor Shop</option>
        </select>
        <input
          type="text"
          placeholder="Address"
          value={editFormData.address || ""}
          onChange={(e) =>
            setEditFormData({
              ...editFormData,
              address: e.target.value,
            })
          }
          style={{ width: "100%", padding: 4, marginBottom: 4, fontSize: 12 }}
        />
        <input
          type="text"
          placeholder="Phone"
          value={editFormData.phone || ""}
          onChange={(e) =>
            setEditFormData({
              ...editFormData,
              phone: e.target.value,
            })
          }
          style={{ width: "100%", padding: 4, marginBottom: 4, fontSize: 12 }}
        />
        <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 2 }}>
          Operating Hours:
        </div>
        <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
          <input
            type="time"
            step="60"
            value={editFormData.operating_hours?.open || "08:00"}
            onChange={(e) =>
              setEditFormData({
                ...editFormData,
                operating_hours: {
                  ...(editFormData.operating_hours || {}),
                  open: e.target.value,
                },
              })
            }
            disabled={
              editFormData?.operating_hours?.open === "00:00" &&
              editFormData?.operating_hours?.close === "23:59"
            }
            style={{
              flex: 1,
              padding: 4,
              fontSize: 11,
              backgroundColor:
                editFormData?.operating_hours?.open === "00:00" &&
                editFormData?.operating_hours?.close === "23:59"
                  ? "#f5f5f5"
                  : undefined,
            }}
          />
          <input
            type="time"
            step="60"
            value={editFormData.operating_hours?.close || "20:00"}
            onChange={(e) =>
              setEditFormData({
                ...editFormData,
                operating_hours: {
                  ...(editFormData.operating_hours || {}),
                  close: e.target.value,
                },
              })
            }
            disabled={
              editFormData?.operating_hours?.open === "00:00" &&
              editFormData?.operating_hours?.close === "23:59"
            }
            style={{
              flex: 1,
              padding: 4,
              fontSize: 11,
              backgroundColor:
                editFormData?.operating_hours?.open === "00:00" &&
                editFormData?.operating_hours?.close === "23:59"
                  ? "#f5f5f5"
                  : undefined,
            }}
          />
        </div>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 11,
            marginTop: 4,
          }}
        >
          <input
            type="checkbox"
            checked={
              editFormData?.operating_hours?.open === "00:00" &&
              editFormData?.operating_hours?.close === "23:59"
            }
            onChange={(e) => {
              const checked = e.target.checked;
              if (checked) {
                editPrevOpenRef.current =
                  editFormData?.operating_hours?.open || "08:00";
                editPrevCloseRef.current =
                  editFormData?.operating_hours?.close || "20:00";
                setEditFormData({
                  ...editFormData,
                  operating_hours: { open: "00:00", close: "23:59" },
                });
              } else {
                setEditFormData({
                  ...editFormData,
                  operating_hours: {
                    open: editPrevOpenRef.current || "08:00",
                    close: editPrevCloseRef.current || "20:00",
                  },
                });
              }
            }}
            disabled={
              editFormData.unknownTime ||
              (editFormData?.operating_hours?.open === "00:00" &&
                editFormData?.operating_hours?.close === "23:59")
            }
          />
          Open 24 hours
        </label>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 11,
            marginTop: 4,
          }}
        >
          <input
            type="checkbox"
            checked={editFormData.unknownTime}
            onChange={(e) => {
              const checked = e.target.checked;
              setEditFormData({
                ...editFormData,
                unknownTime: checked,
                operating_hours: checked
                  ? null
                  : {
                      open: editPrevOpenRef.current || "08:00",
                      close: editPrevCloseRef.current || "20:00",
                    },
              });
            }}
          />
          Unknown time
        </label>
        <div style={{ display: "flex", gap: 4, marginTop: 8 }}>
          <button
            onClick={onSave}
            disabled={editSubmitting}
            style={{
              flex: 1,
              padding: "6px 12px",
              background: "#4CAF50",
              color: "white",
              border: "none",
              borderRadius: 4,
              cursor: editSubmitting ? "not-allowed" : "pointer",
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            {editSubmitting ? "⏳ Saving..." : "💾 Save"}
          </button>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              padding: "6px 12px",
              background: "#999",
              color: "white",
              border: "none",
              borderRadius: 4,
              cursor: "pointer",
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            ✖️ Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminPoiForm;

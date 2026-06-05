import { useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { selectUser } from "../../redux/appSlice";
import { submitWarrantyClaim } from "../../services/warrantyService";
import { isApiSuccess } from "../../utils/apiResponse";
import { useGHNShipping } from "../../hooks/useGHNShipping";

/**
 * Khách đã đăng nhập — gửi yêu cầu bảo hành online (kèm địa chỉ lấy hàng GHN)
 */
const WarrantyClaimSubmitForm = ({ defaultImei = "" }) => {
  const user = useSelector(selectUser);
  const {
    provinces,
    districts,
    wards,
    selectedProvince,
    selectedDistrict,
    selectedWard,
    loadingDistricts,
    loadingWards,
    onProvinceChange,
    onDistrictChange,
    onWardChange,
  } = useGHNShipping(0);

  const [form, setForm] = useState({
    submittedImei: defaultImei,
    issueDescription: "",
    contactName: user?.name || user?.fullName || "",
    contactPhone: user?.phone || "",
    contactEmail: user?.email || "",
    contactAddress: "",
    imageUrl1: "",
    videoUrl: "",
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState("");

  if (!user) {
    return (
      <div className="warranty-claim-submit-login-hint">
        <p style={{ margin: 0, marginBottom: 8, fontWeight: 600 }}>
          Muốn gửi yêu cầu bảo hành kèm link ảnh / video?
        </p>
        <p style={{ margin: 0, fontSize: 14 }}>
          Vui lòng <Link to="/login">đăng nhập</Link> để hiện form gửi ticket cho Sales.
        </p>
      </div>
    );
  }

  const validatePickup = () => {
    if (!form.contactName.trim()) return "Vui lòng nhập họ tên người nhận shipper.";
    if (!form.contactPhone.trim()) return "Vui lòng nhập số điện thoại liên hệ.";
    if (!selectedProvince) return "Vui lòng chọn Tỉnh/Thành phố lấy hàng.";
    if (!selectedDistrict) return "Vui lòng chọn Quận/Huyện lấy hàng.";
    if (!selectedWard) return "Vui lòng chọn Phường/Xã lấy hàng.";
    if (!form.contactAddress.trim()) return "Vui lòng nhập số nhà, tên đường lấy hàng.";
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const pickupErr = validatePickup();
    if (pickupErr) {
      setError(pickupErr);
      return;
    }
    setLoading(true);
    setError("");
    setSuccess(null);
    try {
      const res = await submitWarrantyClaim({
        submittedImei: form.submittedImei.trim(),
        issueDescription: form.issueDescription.trim(),
        contactName: form.contactName.trim(),
        contactPhone: form.contactPhone.trim(),
        contactEmail: form.contactEmail,
        contactAddress: form.contactAddress.trim(),
        contactProvince: selectedProvince.name,
        contactDistrict: selectedDistrict.name,
        contactWard: selectedWard.name,
        pickupToDistrictId: selectedDistrict.id,
        pickupToWardCode: String(selectedWard.code),
        imageUrl1: form.imageUrl1 || undefined,
        videoUrl: form.videoUrl || undefined,
        issueType: "NOT_WORKING",
        customerRequest: "REPAIR",
      });
      if (isApiSuccess(res)) {
        setSuccess(res.data?.claimNumber || "Đã gửi");
      } else {
        setError(res.message || "Gửi thất bại");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Gửi yêu cầu thất bại");
    } finally {
      setLoading(false);
    }
  };

  const formatPickupPreview = () => {
    if (!selectedProvince) return null;
    const parts = [
      form.contactAddress.trim(),
      selectedWard?.name,
      selectedDistrict?.name,
      selectedProvince?.name,
    ].filter(Boolean);
    return parts.join(", ");
  };

  return (
    <div className="warranty-claim-submit-wrap">
      <div className="warranty-claim-submit">
        <h3>Gửi yêu cầu bảo hành online</h3>
        <p style={{ fontSize: 14, marginBottom: 16 }}>
          Điền IMEI, mô tả lỗi và <strong>địa chỉ lấy hàng</strong> (GHN/GHTK sẽ đến địa chỉ này khi Sales
          duyệt thu hồi). Có thể dán link ảnh / video minh chứng.
        </p>
        {success && (
          <div style={{ padding: 12, background: "#ecfdf5", color: "#065f46", borderRadius: 8, marginBottom: 16 }}>
            Đã tạo ticket <strong>#{success}</strong>. Chúng tôi sẽ liên hệ trong 24–48h.
          </div>
        )}
        {error && (
          <div style={{ padding: 12, background: "#fef2f2", color: "#991b1b", borderRadius: 8, marginBottom: 16 }}>
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <p className="warranty-form-section-title">Thiết bị &amp; lỗi</p>
          <label htmlFor="warranty-claim-imei">IMEI / Serial *</label>
          <input
            id="warranty-claim-imei"
            required
            value={form.submittedImei}
            onChange={(e) => setForm({ ...form, submittedImei: e.target.value })}
          />
          <label htmlFor="warranty-claim-issue">Mô tả lỗi *</label>
          <textarea
            id="warranty-claim-issue"
            required
            rows={3}
            value={form.issueDescription}
            onChange={(e) => setForm({ ...form, issueDescription: e.target.value })}
            placeholder='VD: "Máy tự sập nguồn khi sạc"'
          />

          <p className="warranty-form-section-title">Liên hệ &amp; địa chỉ lấy hàng *</p>
          <label htmlFor="warranty-claim-name">Họ tên người nhận shipper *</label>
          <input
            id="warranty-claim-name"
            required
            value={form.contactName}
            onChange={(e) => setForm({ ...form, contactName: e.target.value })}
          />
          <label htmlFor="warranty-claim-phone">Số điện thoại *</label>
          <input
            id="warranty-claim-phone"
            required
            value={form.contactPhone}
            onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
            placeholder="0901234567"
          />
          <label htmlFor="warranty-claim-province">Tỉnh / Thành phố *</label>
          <select
            id="warranty-claim-province"
            required
            value={selectedProvince?.id || ""}
            onChange={(e) => {
              const prov = provinces.find((p) => String(p.provinceId) === e.target.value);
              onProvinceChange(prov?.provinceId || null, prov?.provinceName || "");
            }}
          >
            <option value="">-- Chọn tỉnh/thành --</option>
            {provinces.map((p) => (
              <option key={p.provinceId} value={p.provinceId}>
                {p.provinceName}
              </option>
            ))}
          </select>
          <label htmlFor="warranty-claim-district">Quận / Huyện *</label>
          <select
            id="warranty-claim-district"
            required
            disabled={!selectedProvince || loadingDistricts}
            value={selectedDistrict?.id || ""}
            onChange={(e) => {
              const dist = districts.find((d) => String(d.districtId) === e.target.value);
              onDistrictChange(dist?.districtId || null, dist?.districtName || "");
            }}
          >
            <option value="">{loadingDistricts ? "Đang tải..." : "-- Chọn quận/huyện --"}</option>
            {districts.map((d) => (
              <option key={d.districtId} value={d.districtId}>
                {d.districtName}
              </option>
            ))}
          </select>
          <label htmlFor="warranty-claim-ward">Phường / Xã *</label>
          <select
            id="warranty-claim-ward"
            required
            disabled={!selectedDistrict || loadingWards}
            value={selectedWard?.code || ""}
            onChange={(e) => {
              const ward = wards.find((w) => String(w.wardCode) === e.target.value);
              onWardChange(ward?.wardCode || null, ward?.wardName || "");
            }}
          >
            <option value="">{loadingWards ? "Đang tải..." : "-- Chọn phường/xã --"}</option>
            {wards.map((w) => (
              <option key={w.wardCode} value={w.wardCode}>
                {w.wardName}
              </option>
            ))}
          </select>
          <label htmlFor="warranty-claim-street">Số nhà, tên đường *</label>
          <input
            id="warranty-claim-street"
            required
            value={form.contactAddress}
            onChange={(e) => setForm({ ...form, contactAddress: e.target.value })}
            placeholder="VD: 15 Lê Văn Sỹ, Phường 12"
          />
          {formatPickupPreview() && (
            <p className="warranty-pickup-preview">
              <strong>Địa chỉ lấy hàng:</strong> {formatPickupPreview()}
            </p>
          )}

          <p className="warranty-form-section-title">Minh chứng (tuỳ chọn)</p>
          <label htmlFor="warranty-claim-image">Link ảnh hóa đơn / vỏ hộp</label>
          <input
            id="warranty-claim-image"
            type="url"
            value={form.imageUrl1}
            onChange={(e) => setForm({ ...form, imageUrl1: e.target.value })}
            placeholder="https://drive.google.com/... hoặc https://i.imgur.com/..."
          />
          <label htmlFor="warranty-claim-video">Link video lỗi</label>
          <input
            id="warranty-claim-video"
            type="url"
            value={form.videoUrl}
            onChange={(e) => setForm({ ...form, videoUrl: e.target.value })}
            placeholder="https://youtu.be/... hoặc link Drive video"
          />
          <button
            type="submit"
            disabled={loading}
            style={{
              background: "#ff9f1a",
              color: "#fff",
              border: "none",
              padding: "12px 24px",
              borderRadius: 8,
              fontWeight: 700,
              cursor: loading ? "wait" : "pointer",
            }}
          >
            {loading ? "Đang gửi..." : "Gửi yêu cầu bảo hành"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default WarrantyClaimSubmitForm;

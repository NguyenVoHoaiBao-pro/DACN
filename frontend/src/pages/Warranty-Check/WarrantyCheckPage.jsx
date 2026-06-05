/**
 * WARRANTY CHECK PAGE — Trang Tra Cứu Bảo Hành Công Khai
 *
 * Khách hàng nhập IMEI hoặc Serial Number để kiểm tra:
 * - Máy có phải hàng chính hãng Electro Store không?
 * - Còn bảo hành hay hết hạn?
 *
 * PUBLIC ENDPOINT — Không cần đăng nhập.
 */

import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { checkWarranty } from "../../services/warrantyService";
import { formatDate } from "../../utils/formatters";
import WarrantyClaimSubmitForm from "./WarrantyClaimSubmitForm";
import "./WarrantyCheckPage.css";

// Bảng ánh xạ trạng thái thiết bị (Enum status)
const STATUS_LABELS = {
    AVAILABLE: "Còn hàng",
    RESERVED: "Đã đặt cọc",
    SOLD: "Đã bán",
    IN_REPAIR: "Đang sửa chữa",
    RETURNED: "Đã trả khách",
    DEFECTIVE: "Lỗi NSX",
};

const STATUS_ICONS = {
    AVAILABLE: "🟢",
    RESERVED: "🟡",
    SOLD: "🔵",
    IN_REPAIR: "🟠",
    RETURNED: "🟣",
    DEFECTIVE: "🔴",
};

const WarrantyCheckPage = () => {
    const [searchParams] = useSearchParams();
    const [imeiInput, setImeiInput] = useState("");
    const [result, setResult] = useState(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const codeParam = searchParams.get("code");
        if (codeParam) {
            setImeiInput(codeParam);
            performSearch(codeParam);
        }
    }, [searchParams]);

    const performSearch = async (code) => {
        if (!code) return;

        setLoading(true);
        setError("");
        setResult(null);

        try {
            const json = await checkWarranty(code);
            if (json.success && json.data) {
                setResult(json.data);
            } else {
                setError(json.message || "Không tìm thấy thông tin.");
            }
        } catch (err) {
            if (err.response) {
                // Xử lý lỗi HTTP từ server (400, 500...)
                const serverMsg = err.response.data?.message;
                setError(serverMsg || "Không tìm thấy thông tin. Vui lòng kiểm tra lại thiết bị.");
            } else {
                setError("Lỗi kết nối server. Vui lòng thử lại.");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = () => {
        performSearch(imeiInput.trim());
    };

    const handleKeyPress = (e) => {
        if (e.key === "Enter") {
            handleSearch();
        }
    };

    // Xác định kiểu viền card dựa trên trạng thái
    const getCardBorderClass = () => {
        if (!result) return "";
        // Nếu chưa kích hoạt bảo hành (warrantyStartDate = null) nhưng valid = true => xanh lá
        if (result.warrantyStartDate === null && result.warrantyEndDate === null && result.valid) {
            return "border-green";
        }
        return result.valid ? "border-green" : "border-red";
    };

    // Xác định kiểu message
    const getMessageClass = () => {
        if (!result) return "";
        if (result.warrantyStartDate === null && result.warrantyEndDate === null && result.valid) {
            return "text-yellow";
        }
        return result.valid ? "text-green" : "text-red";
    };

    const getMessageIcon = () => {
        if (!result) return "";
        if (result.warrantyStartDate === null && result.warrantyEndDate === null && result.valid) {
            return "⚡";
        }
        return result.valid ? "✅" : "❌";
    };

    return (
        <div className="warranty-check-page">
            <div className="warranty-back-home-wrap">
                <Link to="/" className="warranty-back-home-btn">
                    ← Quay lại trang chủ
                </Link>
            </div>

            {/* Hero Section */}
            <div className="warranty-hero">
                <div className="warranty-hero-icon">🛡️</div>
                <h1>Tra Cứu Bảo Hành</h1>
                <p>
                    Nhập mã IMEI hoặc Serial Number của thiết bị để kiểm tra tình trạng
                    bảo hành tại Electro Store
                </p>
            </div>

            {/* Search Box */}
            <div className="warranty-search-container">
                <div className="warranty-search-box">
                    <input
                        id="warranty-search-input"
                        type="text"
                        className="warranty-search-input"
                        placeholder="Nhập IMEI hoặc Serial Number..."
                        value={imeiInput}
                        onChange={(e) => setImeiInput(e.target.value)}
                        onKeyDown={handleKeyPress}
                        autoComplete="off"
                    />
                    <button
                        id="warranty-search-btn"
                        className="warranty-search-btn"
                        onClick={handleSearch}
                        disabled={loading || !imeiInput.trim()}
                    >
                        {loading ? (
                            <span className="btn-spinner" />
                        ) : (
                            <>🔍 Tra cứu</>
                        )}
                    </button>
                </div>
            </div>

            {/* Result Card */}
            {result && (
                <div className="warranty-result-container">
                    <div className={`warranty-card ${getCardBorderClass()}`}>
                        {/* Card Header: Ảnh + Tên SP */}
                        <div className="warranty-card-header">
                            {result.imageUrl ? (
                                <img
                                    src={result.imageUrl}
                                    alt={result.productName}
                                    className="warranty-product-image"
                                    onError={(e) => {
                                        e.target.style.display = "none";
                                        e.target.nextElementSibling && (e.target.nextElementSibling.style.display = "flex");
                                    }}
                                />
                            ) : (
                                <div className="warranty-product-image-placeholder">📱</div>
                            )}
                            <div className="warranty-product-info">
                                <h2 className="warranty-product-name">{result.productName}</h2>
                                <p className="warranty-variant-name">{result.variantName}</p>
                                <span
                                    className={`warranty-status-badge badge-${result.status.toLowerCase()}`}
                                >
                                    {STATUS_ICONS[result.status]} {STATUS_LABELS[result.status] || result.status}
                                </span>
                            </div>
                        </div>

                        {/* Card Details */}
                        <div className="warranty-details">
                            {result.imei && (
                                <div className="warranty-detail-item">
                                    <div className="warranty-detail-label">IMEI</div>
                                    <div className="warranty-detail-value">{result.imei}</div>
                                </div>
                            )}
                            {result.serialNumber && (
                                <div className="warranty-detail-item">
                                    <div className="warranty-detail-label">Serial Number</div>
                                    <div className="warranty-detail-value">{result.serialNumber}</div>
                                </div>
                            )}
                            <div className="warranty-detail-item">
                                <div className="warranty-detail-label">Thời hạn bảo hành</div>
                                <div className="warranty-detail-value">
                                    {result.warrantyMonths} tháng
                                </div>
                            </div>

                            {/* Hiển thị ngày bảo hành CHỈ KHI có warrantyStartDate */}
                            {result.warrantyStartDate ? (
                                <div className="warranty-detail-item full-width">
                                    <div className="warranty-detail-label">Thời gian bảo hành</div>
                                    <div className="warranty-period">
                                        <div className="warranty-detail-value">
                                            📅 {formatDate(result.warrantyStartDate)}
                                        </div>
                                        <span className="warranty-period-arrow">→</span>
                                        <div className="warranty-detail-value">
                                            📅 {result.warrantyEndDate ? formatDate(result.warrantyEndDate) : "N/A"}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="warranty-detail-item full-width">
                                    <div className="warranty-detail-label">Trạng thái bảo hành</div>
                                    <div className="warranty-detail-value" style={{ color: "#facc15" }}>
                                        ⚡ Chưa kích hoạt bảo hành
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Message Footer */}
                        <div className={`warranty-message ${getMessageClass()}`}>
                            {getMessageIcon()} {result.message}
                        </div>
                    </div>
                </div>
            )}

            {/* Error State */}
            {error && (
                <div className="warranty-error">
                    <div className="warranty-error-card">
                        <div className="warranty-error-icon">🚫</div>
                        <h3 className="warranty-error-title">Không tìm thấy thiết bị</h3>
                        <p className="warranty-error-message">{error}</p>
                    </div>
                </div>
            )}

            <WarrantyClaimSubmitForm defaultImei={imeiInput} />

            {/* Footer Hint */}
            <div className="warranty-footer-hint">
                <p>💡 Mã IMEI thường nằm trên hộp đựng sản phẩm hoặc trong Cài đặt → Giới thiệu</p>
                <p>Bạn cũng có thể bấm *#06# trên điện thoại để xem mã IMEI</p>
            </div>
        </div>
    );
};

export default WarrantyCheckPage;

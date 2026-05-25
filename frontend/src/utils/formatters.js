/**
 * UTILITY FORMATTERS
 * 
 * Chuẩn hóa format tiền tệ, ngày tháng, số liệu cho toàn bộ ứng dụng.
 * Import hàm này ở bất kỳ component nào cần hiển thị giá, ngày, v.v.
 */

/**
 * Format số tiền theo VND (Việt Nam Đồng)
 * @param {number} value - Số tiền cần format
 * @returns {string} Chuỗi đã format, ví dụ: "1.500.000 ₫"
 */
export const formatMoney = (value) => {
    if (typeof value !== "number" || !isFinite(value)) return "N/A";
    return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
    }).format(value);
};

/**
 * Alias cho formatMoney - dùng ở admin pages
 */
export const formatPrice = formatMoney;

/**
 * Format ngày theo chuẩn Việt Nam (dd/MM/yyyy)
 * @param {string|Date} dateValue - Chuỗi hoặc object Date
 * @returns {string} Chuỗi ngày đã format, ví dụ: "27/02/2026"
 */
export const formatDate = (dateValue) => {
    if (!dateValue) return "N/A";
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return "N/A";
    return new Intl.DateTimeFormat("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    }).format(date);
};

/**
 * Format ngày kèm giờ theo chuẩn Việt Nam (dd/MM/yyyy HH:mm)
 * @param {string|Date} dateValue - Chuỗi hoặc object Date
 * @returns {string} Ví dụ: "27/02/2026 09:30"
 */
export const formatDateTime = (dateValue) => {
    if (!dateValue) return "N/A";
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return "N/A";
    return new Intl.DateTimeFormat("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(date);
};

/**
 * Format số lượng có phân cách hàng nghìn
 * @param {number} value - Số cần format
 * @returns {string} Ví dụ: "1.234"
 */
export const formatNumber = (value) => {
    if (typeof value !== "number" || !isFinite(value)) return "0";
    return new Intl.NumberFormat("vi-VN").format(value);
};

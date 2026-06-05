/** Chuẩn hóa IMEI/Serial để so khớp (bỏ khoảng trắng, gạch, #; không phân biệt hoa thường) */
export const normalizeImeiForCompare = (value) =>
  (value || "").trim().replace(/[\s\-#]/g, "").toLowerCase();

/** Hiển thị IMEI chia cụm 4 ký tự — dễ đối chiếu khi gõ tay */
export const formatImeiGrouped = (imei) => {
  const n = (imei || "").trim().replace(/[\s\-#]/g, "").toUpperCase();
  if (!n) return "—";
  const parts = [];
  for (let i = 0; i < n.length; i += 4) {
    parts.push(n.slice(i, i + 4));
  }
  return parts.join(" - ");
};

export const compareImei = (systemImei, typedImei) =>
  normalizeImeiForCompare(systemImei) === normalizeImeiForCompare(typedImei);

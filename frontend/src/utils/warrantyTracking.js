/** Mã vận đơn tự sinh nội bộ — không phải mã GHN thật. */
export const isPlaceholderReturnTracking = (code) => {
  if (!code) return false;
  const normalized = String(code).trim().toUpperCase();
  return normalized.startsWith("GHTK-BH");
};

/** Mã thu hồi BH hợp lệ từ GHN (có mã và không phải placeholder). */
export const isGhnReturnTracking = (carrier, code) =>
  (carrier || "").toUpperCase().includes("GHN") && code && !isPlaceholderReturnTracking(code);

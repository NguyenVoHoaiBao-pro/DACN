/**
 * Helpers cho ApiResponse backend và Spring Page.
 * Public API: res.data = { status, success, message, data: { content, totalPages, ... } }
 */

/** Backend ApiResponse thành công (success hoặc status 2xx). */
export const isApiSuccess = (res) =>
  res?.success === true || (res?.status >= 200 && res?.status < 300);

/** Lấy object Page hoặc mảng từ nhiều dạng response. */
export const unwrapPageData = (result) => {
  if (!result) return null;
  if (Array.isArray(result)) return { content: result, totalElements: result.length, totalPages: 1 };
  if (Array.isArray(result.content)) return result;
  if (result.data != null) {
    const inner = result.data;
    if (Array.isArray(inner)) return { content: inner, totalElements: inner.length, totalPages: 1 };
    if (Array.isArray(inner?.content)) return inner;
  }
  return null;
};

/** Danh sách phần tử trong trang. */
export const unwrapPageContent = (result) => {
  const page = unwrapPageData(result);
  return page?.content ?? [];
};

/** Meta phân trang cho Shop / list. */
export const unwrapPageMeta = (result) => {
  const page = unwrapPageData(result);
  return {
    totalPages: page?.totalPages ?? 0,
    totalElements: page?.totalElements ?? 0,
    page: page?.number ?? page?.page ?? 0,
    size: page?.size ?? 0,
  };
};

/** Request bị hủy (StrictMode, đổi tab) — không hiển thị lỗi. */
export const isAbortError = (err) =>
  err?.name === "AbortError" ||
  err?.code === "ERR_CANCELED" ||
  err?.message?.includes("aborted");

/** Thông báo lỗi thân thiện từ axios / API. */
export const getApiErrorMessage = (err, fallback = "Không thể tải dữ liệu. Vui lòng thử lại.") => {
  if (isAbortError(err)) return "";
  const data = err?.response?.data;
  if (typeof data === "string" && data.trim()) return data;
  if (data?.message) return data.message;
  if (err?.message && !err.message.includes("Network Error")) return err.message;
  const status = err?.response?.status;
  if (status === 503) return "Dịch vụ tạm thời không khả dụng. Đang thử lại...";
  if (status === 401) return "Phiên đăng nhập đã hết hạn.";
  if (status === 403) return "Bạn không có quyền truy cập.";
  if (status === 404) return "Không tìm thấy dữ liệu.";
  if (status >= 500) return "Lỗi máy chủ. Kiểm tra backend đang chạy.";
  return fallback;
};

import { Chip, Tooltip, Typography } from "@mui/material";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";

/**
 * Hiển thị trạng thái vận chuyển GHN từ webhook (mã API + nhãn tiếng Việt).
 */
export default function GhnStatusBadge({
  status,
  statusDisplay,
  updatedAt,
  variant = "outlined",
  size = "small",
}) {
  if (!status && !statusDisplay) {
    return null;
  }

  const label = statusDisplay || status;
  const tooltip = [
    status ? `Mã GHN: ${status}` : null,
    updatedAt ? `Cập nhật: ${new Date(updatedAt).toLocaleString("vi-VN")}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Tooltip title={tooltip || label}>
      <Chip
        icon={<LocalShippingIcon sx={{ fontSize: 16 }} />}
        label={label}
        size={size}
        variant={variant}
        color="info"
        sx={{ fontWeight: 600, maxWidth: "100%" }}
      />
    </Tooltip>
  );
}

export function GhnStatusInline({ status, statusDisplay, updatedAt }) {
  if (!status && !statusDisplay) {
    return null;
  }
  return (
    <Typography variant="body2" sx={{ mt: 0.5 }}>
      <strong>GHN:</strong> {statusDisplay || status}
      {updatedAt && (
        <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
          ({new Date(updatedAt).toLocaleString("vi-VN")})
        </Typography>
      )}
    </Typography>
  );
}

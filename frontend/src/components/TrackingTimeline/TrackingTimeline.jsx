import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  StepContent,
} from "@mui/material";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import { getTrackingInfo } from "../../services/shippingService";

const TrackingTimeline = ({ trackingCode }) => {
  const [trackingData, setTrackingData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (trackingCode) {
      fetchTracking();
    }
  }, [trackingCode]);

  const fetchTracking = async () => {
    setLoading(true);
    try {
      const res = await getTrackingInfo(trackingCode);
      if (res.status === "success") {
        setTrackingData(res.data);
      } else {
        setError(res.message || "Không thể lấy thông tin vận đơn");
      }
    } catch (err) {
      setError("Lỗi khi tải lịch sử giao hàng");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 2 }}>
        <CircularProgress size={24} sx={{ color: "#f28900" }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Typography variant="body2" color="error" sx={{ fontStyle: "italic", mt: 1 }}>
        {error}
      </Typography>
    );
  }

  if (!trackingData || !trackingData.logs || trackingData.logs.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ fontStyle: "italic", mt: 1 }}>
        Chưa có lịch sử di chuyển cho kiện hàng này.
      </Typography>
    );
  }

  return (
    <Box sx={{ mt: 2, p: 2, bgcolor: "#fff8ef", borderRadius: 2, border: "1px solid #ffe0b2" }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
        <LocalShippingIcon sx={{ color: "#f28900" }} />
        <Typography variant="subtitle2" fontWeight="bold" color="primary.main">
          Hành trình đơn hàng - Vận đơn: {trackingCode}
        </Typography>
      </Box>
      <Stepper orientation="vertical" activeStep={0} sx={{ mt: 1 }}>
        {trackingData.logs.map((log, index) => (
          <Step key={index} active={true} completed={index !== 0}>
            <StepLabel
              StepIconProps={{
                sx: {
                  color: index === 0 ? "#f28900 !important" : "#4caf50 !important",
                },
              }}
            >
              <Typography
                variant="body2"
                fontWeight={index === 0 ? "bold" : "normal"}
                color={index === 0 ? "text.primary" : "text.secondary"}
              >
                {log.statusDisplay}
              </Typography>
            </StepLabel>
            <StepContent>
              <Typography variant="caption" color="text.secondary">
                {log.updatedAt}
              </Typography>
            </StepContent>
          </Step>
        ))}
      </Stepper>
    </Box>
  );
};

export default TrackingTimeline;

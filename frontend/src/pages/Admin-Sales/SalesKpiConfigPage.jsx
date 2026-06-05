import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Grid,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import AdminLayout from "../../components/Admin-Layout/AdminLayout";
import { fetchKpiConfig, updateKpiConfig } from "../../services/salesOpsService";

const SalesKpiConfigPage = () => {
  const [form, setForm] = useState({});
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetchKpiConfig()
      .then(setForm)
      .catch((e) => setError(e.message));
  }, []);

  const handleSave = async () => {
    try {
      const updated = await updateKpiConfig({
        monthlyRevenueTarget: Number(form.monthlyRevenueTarget),
        commissionRateOrganic: Number(form.commissionRateOrganic),
        commissionRateWeb: Number(form.commissionRateWeb),
        commissionRateSalesAssisted: Number(form.commissionRateSalesAssisted),
        commissionRateSalesLink: Number(form.commissionRateSalesLink),
        maxCancelRatePercent: Number(form.maxCancelRatePercent),
      });
      setForm(updated);
      setMsg("Đã lưu cấu hình KPI / hoa hồng");
      setError("");
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    }
  };

  const field = (key, label, helper) => (
    <TextField
      fullWidth
      size="small"
      label={label}
      helperText={helper}
      value={form[key] ?? ""}
      onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
    />
  );

  return (
    <AdminLayout currentPage="Cấu hình KPI Sales">
      <Box sx={{ p: 3, maxWidth: 720 }}>
        <Typography variant="h5" fontWeight="bold" gutterBottom>
          Cấu hình KPI & Hoa hồng Sales
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Tỷ lệ hoa hồng nhập dạng thập phân (VD: 0.01 = 1%). Organic_Web mặc định 0%.
        </Typography>
        {msg && <Alert severity="success" sx={{ mb: 2 }}>{msg}</Alert>}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Paper sx={{ p: 3 }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>{field("monthlyRevenueTarget", "Mục tiêu doanh số tháng (VNĐ)", "VD: 200000000")}</Grid>
            <Grid item xs={12} sm={6}>{field("commissionRateOrganic", "% HH — Khách tự web (Organic)", "0 = không thưởng")}</Grid>
            <Grid item xs={12} sm={6}>{field("commissionRateWeb", "% HH — Web auto-assign (WEB_ASSIGNED)", "0.005 = 0.5%")}</Grid>
            <Grid item xs={12} sm={6}>{field("commissionRateSalesAssisted", "% HH — Sales tư vấn/chat", "0.01 = 1%")}</Grid>
            <Grid item xs={12} sm={6}>{field("commissionRateSalesLink", "% HH — Link giới thiệu", "0.005")}</Grid>
            <Grid item xs={12} sm={6}>{field("maxCancelRatePercent", "Ngưỡng cảnh báo tỷ lệ hủy (%)", "VD: 15")}</Grid>
          </Grid>
          <Button variant="contained" sx={{ mt: 3 }} onClick={handleSave}>
            Lưu cấu hình
          </Button>
        </Paper>
      </Box>
    </AdminLayout>
  );
};

export default SalesKpiConfigPage;

import {
  Add as AddIcon,
  Home as HomeIcon,
  LocationOn as LocationOnIcon,
  Work as WorkIcon,
} from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Snackbar,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import ProfileMenu from "../../components/Profile-Menu/ProfileMenu.jsx";
import { selectUser } from "../../redux/appSlice.js";
import {
  createAddress,
  deleteAddress,
  getAddresses,
  setDefaultAddress,
  updateAddress,
} from "../../services/addressService.js";
import { getDistricts, getProvinces, getWards } from "../../services/shippingService.js";

// --- Form Dialog Component ---
const AddressDialog = ({ open, onClose, address, onSaved }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    receiverName: "",
    phone: "",
    province: "",
    district: "",
    ward: "",
    addressDetail: "",
    isDefault: false,
    label: "",
  });

  // Location data lists
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [wards, setWards] = useState([]);

  // Selected sub-ids for fetching child nodes (Since GHN requires IDs, but storage only has names)
  const [selectedProvinceId, setSelectedProvinceId] = useState("");
  const [selectedDistrictId, setSelectedDistrictId] = useState("");

  const [error, setError] = useState("");

  // Setup initial form when Dialog opens/changes
  useEffect(() => {
    if (open) {
      if (address) {
        setFormData({
          receiverName: address.receiverName || "",
          phone: address.phone || "",
          province: address.province || "",
          district: address.district || "",
          ward: address.ward || "",
          addressDetail: address.addressDetail || "",
          isDefault: address.isDefault || false,
          label: address.label || "",
        });
      } else {
        setFormData({
          receiverName: "",
          phone: "",
          province: "",
          district: "",
          ward: "",
          addressDetail: "",
          isDefault: false,
          label: "Nhà",
        });
        setSelectedProvinceId("");
        setSelectedDistrictId("");
        setDistricts([]);
        setWards([]);
      }
      setError("");
      loadProvinces();
    }
  }, [open, address]);

  // Load provinces and attempt back-fill for Editing
  const loadProvinces = async () => {
    try {
      const data = await getProvinces();
      setProvinces(data);

      if (address && address.province) {
        const found = data.find(
          (p) => p.provinceName.toLowerCase() === address.province.toLowerCase()
        );
        if (found) {
          setSelectedProvinceId(found.provinceId);
          loadDistricts(found.provinceId);
        }
      }
    } catch (err) {
      console.error("Lỗi tải tỉnh:", err);
    }
  };

  const loadDistricts = async (provinceId) => {
    try {
      const data = await getDistricts(provinceId);
      setDistricts(data);

      if (address && address.district) {
        const found = data.find(
          (d) => d.districtName.toLowerCase() === address.district.toLowerCase()
        );
        if (found) {
          setSelectedDistrictId(found.districtId);
          loadWards(found.districtId);
        }
      } else {
        setWards([]);
      }
    } catch (err) {
      console.error("Lỗi tải quận huyện:", err);
    }
  };

  const loadWards = async (districtId) => {
    try {
      const data = await getWards(districtId);
      setWards(data);
    } catch (err) {
      console.error("Lỗi tải xã phường:", err);
    }
  };

  const handleProvinceChange = (e) => {
    const provinceId = e.target.value;
    const item = provinces.find((p) => p.provinceId === provinceId);
    setSelectedProvinceId(provinceId);
    setFormData((p) => ({ ...p, province: item?.provinceName || "", district: "", ward: "" }));
    setDistricts([]);
    setWards([]);
    setSelectedDistrictId("");
    if (provinceId) loadDistricts(provinceId);
  };

  const handleDistrictChange = (e) => {
    const districtId = e.target.value;
    const item = districts.find((d) => d.districtId === districtId);
    setSelectedDistrictId(districtId);
    setFormData((p) => ({ ...p, district: item?.districtName || "", ward: "" }));
    setWards([]);
    if (districtId) loadWards(districtId);
  };

  const handleWardChange = (e) => {
    const wardName = e.target.value;
    setFormData((p) => ({ ...p, ward: wardName }));
  };

  const handleSave = async () => {
    if (
      !formData.receiverName ||
      !formData.phone ||
      !formData.province ||
      !formData.district ||
      !formData.ward ||
      !formData.addressDetail
    ) {
      setError("Vui lòng điền đầy đủ các thông tin bắt buộc.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      if (address) {
        await updateAddress(address.id, formData);
      } else {
        await createAddress(formData);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Lỗi lưu thông tin địa chỉ.");
    } finally {
      setLoading(false);
    }
  };

  const labels = ["Nhà", "Công ty", "Khác"];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>
        {address ? "Cập Nhật Địa Chỉ" : "Thêm Địa Chỉ Mới"}
      </DialogTitle>
      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Họ tên người nhận"
              fullWidth
              required
              value={formData.receiverName}
              onChange={(e) => setFormData({ ...formData, receiverName: e.target.value })}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Số điện thoại"
              fullWidth
              required
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </Grid>

          {/* Location Selectors */}
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth required>
              <InputLabel>Tỉnh/Thành</InputLabel>
              <Select
                value={selectedProvinceId}
                label="Tỉnh/Thành"
                onChange={handleProvinceChange}
              >
                {provinces.map((p) => (
                  <MenuItem key={p.provinceId} value={p.provinceId}>
                    {p.provinceName}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth required disabled={!selectedProvinceId}>
              <InputLabel>Quận/Huyện</InputLabel>
              <Select
                value={selectedDistrictId}
                label="Quận/Huyện"
                onChange={handleDistrictChange}
              >
                {districts.map((d) => (
                  <MenuItem key={d.districtId} value={d.districtId}>
                    {d.districtName}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth required disabled={!selectedDistrictId}>
              <InputLabel>Phường/Xã</InputLabel>
              <Select
                value={formData.ward}
                label="Phường/Xã"
                onChange={handleWardChange}
              >
                {wards.map((w) => (
                  <MenuItem key={w.wardCode} value={w.wardName}>
                    {w.wardName}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12}>
            <TextField
              label="Địa chỉ chi tiết (Số nhà, đường...)"
              fullWidth
              multiline
              rows={2}
              required
              value={formData.addressDetail}
              onChange={(e) => setFormData({ ...formData, addressDetail: e.target.value })}
            />
          </Grid>

          {/* Label Selection */}
          <Grid item xs={12}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Nhãn địa chỉ
            </Typography>
            <Box sx={{ display: "flex", gap: 1 }}>
              {labels.map((l) => (
                <Chip
                  key={l}
                  label={l}
                  onClick={() => setFormData({ ...formData, label: l })}
                  variant={formData.label === l ? "filled" : "outlined"}
                  color={formData.label === l ? "primary" : "default"}
                  icon={l === "Nhà" ? <HomeIcon /> : l === "Công ty" ? <WorkIcon /> : <LocationOnIcon />}
                  sx={{ cursor: "pointer" }}
                />
              ))}
            </Box>
          </Grid>

          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.isDefault}
                  disabled={address && address.isDefault} // Đã là mặc định thì ko uncheck đc
                  onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                />
              }
              label="Đặt làm địa chỉ mặc định"
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={loading}>Thủy</Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={loading}
          sx={{ backgroundColor: "#ee4d2d", "&:hover": { backgroundColor: "#d73112" } }}
        >
          {loading ? <CircularProgress size={24} color="inherit" /> : "Lưu Địa Chỉ"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// --- Main Content: Address List ---
const AddressList = () => {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState(null);

  const fetchAddresses = async () => {
    setLoading(true);
    try {
      const res = await getAddresses();
      setAddresses(res.data || []);
    } catch (err) {
      console.error("Lỗi fetch địa chỉ:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAddresses();
  }, []);

  const handleSetDefault = async (id) => {
    try {
      await setDefaultAddress(id);
      setSnackbar({ open: true, message: "Đã đổi địa chỉ mặc định!", severity: "success" });
      fetchAddresses();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa địa chỉ này?")) return;
    try {
      await deleteAddress(id);
      setSnackbar({ open: true, message: "Đã xóa địa chỉ!", severity: "success" });
      fetchAddresses();
    } catch (err) {
      console.error(err);
    }
  };

  const handleEdit = (address) => {
    setSelectedAddress(address);
    setDialogOpen(true);
  };

  const handleAddNew = () => {
    setSelectedAddress(null);
    setDialogOpen(true);
  };

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h5" component="h1" sx={{ fontWeight: 700 }}>
          Địa Chỉ Của Tôi
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddNew}
          sx={{ backgroundColor: "#ee4d2d", "&:hover": { backgroundColor: "#d73112" } }}
        >
          Thêm địa chỉ mới
        </Button>
      </Box>
      <Divider sx={{ mb: 3 }} />

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 5 }}>
          <CircularProgress />
        </Box>
      ) : addresses.length === 0 ? (
        <Box sx={{ textAlign: "center", py: 5, color: "text.secondary" }}>
          Bạn chưa lưu địa chỉ nhận hàng nào.
        </Box>
      ) : (
        <Grid container spacing={2}>
          {addresses.map((addr) => (
            <Grid item xs={12} key={addr.id}>
              <Card variant="outlined" sx={{ borderRadius: 2, border: addr.isDefault ? "1px solid #ee4d2d" : "1px solid #e0e0e0" }}>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
                    <Box>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                        <Typography variant="subtitle1" fontWeight="bold">
                          {addr.receiverName}
                        </Typography>
                        {addr.label && <Chip label={addr.label} size="small" variant="outlined" color="primary" />}
                        {addr.isDefault && <Chip label="Mặc định" size="small" sx={{ backgroundColor: "#bffaa3", color: "#1b4d07" }} />}
                      </Box>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Số điện thoại: {addr.phone}
                      </Typography>
                      <Typography variant="body2">
                        {addr.addressDetail}
                      </Typography>
                      <Typography variant="body2">
                        {addr.ward}, {addr.district}, {addr.province}
                      </Typography>
                    </Box>

                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1, alignItems: "flex-end" }}>
                      <Box sx={{ display: "flex", gap: 1 }}>
                        <Button size="small" variant="text" onClick={() => handleEdit(addr)}>Sửa</Button>
                        {!addr.isDefault && (
                          <Button size="small" variant="text" color="error" onClick={() => handleDelete(addr.id)}>Xóa</Button>
                        )}
                      </Box>
                      {!addr.isDefault && (
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => handleSetDefault(addr.id)}
                        >
                          Chọn làm mặc định
                        </Button>
                      )}
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Reusable Dialog */}
      <AddressDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        address={selectedAddress}
        onSaved={fetchAddresses}
      />

      {/* Snackbar feedback */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
};

// --- Main Page Wrapper ---
const AddressPage = () => {
  const user = useSelector(selectUser);

  return (
    <Box
      sx={{
        flexGrow: 1,
        p: { xs: 2, md: 3 },
        backgroundColor: "#f9f9f9",
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
      }}
    >
      <Box
        sx={{
          width: "100%",
          maxWidth: 1200,
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          alignItems: "stretch",
          gap: 0,
          border: "1px solid #e0e0e0",
          borderRadius: 2,
          backgroundColor: "#fff",
          boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
          overflow: "hidden",
        }}
      >
        <Box sx={{ width: { xs: "100%", md: 260 }, minWidth: { md: 260 } }}>
          <ProfileMenu activePage="Địa Chỉ" user={user} />
        </Box>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <AddressList />
        </Box>
      </Box>
    </Box>
  );
};

export default AddressPage;

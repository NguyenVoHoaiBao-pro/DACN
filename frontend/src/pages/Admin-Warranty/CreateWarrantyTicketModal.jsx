import React, { useState } from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Box,
    CircularProgress,
    Typography,
    Divider,
    IconButton
} from "@mui/material";
import { Close as CloseIcon, Shield as ShieldIcon } from "@mui/icons-material";
import { createWarrantyTicket, checkWarranty } from "../../services/warrantyService";
import { toast } from "react-toastify";

const CreateWarrantyTicketModal = ({ open, onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        imeiOrSerial: "",
        customerName: "",
        customerPhone: "",
        issueDescription: ""
    });
    
    const [loading, setLoading] = useState(false);
    const [checking, setChecking] = useState(false);
    const [deviceInfo, setDeviceInfo] = useState(null);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
        if (name === "imeiOrSerial") {
            setDeviceInfo(null); // Reset info when typing new IMEI
        }
    };

    const handleCheckDevice = async () => {
        if (!formData.imeiOrSerial) return;
        setChecking(true);
        try {
            const res = await checkWarranty(formData.imeiOrSerial);
            if (res.success && res.data) {
                setDeviceInfo(res.data);
                toast.success("Đã tìm thấy thiết bị!");
            } else {
                toast.warning(res.message || "Không tìm thấy thiết bị.");
                setDeviceInfo(null);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Lỗi kiểm tra thiết bị.");
            setDeviceInfo(null);
        } finally {
            setChecking(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await createWarrantyTicket(formData);
            if (res.success) {
                toast.success("Tạo phiếu bảo hành thành công");
                setFormData({ imeiOrSerial: "", customerName: "", customerPhone: "", issueDescription: "" });
                setDeviceInfo(null);
                onSuccess(); // Refresh list
                onClose();   // Close modal
            } else {
                toast.error(res.message || "Không thể tạo phiếu bảo hành");
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Lỗi tạo phiếu bảo hành");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
            <DialogTitle sx={{ m: 0, p: 2, display: "flex", alignItems: "center", justifyContent: "space-between", bgcolor: "#f8f9fa" }}>
                <Box display="flex" alignItems="center" gap={1}>
                    <ShieldIcon color="primary" />
                    <Typography variant="h6" fontWeight="bold">Tạo phiếu bảo hành</Typography>
                </Box>
                <IconButton onClick={onClose} size="small">
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <Divider />
            <DialogContent sx={{ p: 3 }}>
                <form id="create-ticket-form" onSubmit={handleSubmit}>
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
                        
                        {/* Device Info Fetch */}
                        <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
                            <TextField
                                label="IMEI / Serial Number *"
                                name="imeiOrSerial"
                                value={formData.imeiOrSerial}
                                onChange={handleChange}
                                fullWidth
                                required
                            />
                            <Button
                                variant="outlined"
                                onClick={handleCheckDevice}
                                disabled={checking || !formData.imeiOrSerial}
                                sx={{ height: 56, minWidth: 100 }}
                            >
                                {checking ? <CircularProgress size={24} /> : "Kiểm tra"}
                            </Button>
                        </Box>

                        {deviceInfo && (
                            <Box sx={{ p: 2, bgcolor: "#e3f2fd", borderRadius: 2, border: "1px dashed #2196f3" }}>
                                <Typography variant="subtitle2" color="primary" gutterBottom>Thông tin thiết bị:</Typography>
                                <Typography variant="body2"><strong>Sản phẩm:</strong> {deviceInfo.productName} ({deviceInfo.variantName})</Typography>
                                {deviceInfo.warrantyEndDate && <Typography variant="body2"><strong>Hạn BH:</strong> {deviceInfo.warrantyEndDate}</Typography>}
                            </Box>
                        )}

                        <TextField
                            label="Tên khách hàng *"
                            name="customerName"
                            value={formData.customerName}
                            onChange={handleChange}
                            fullWidth
                            required
                        />
                        <TextField
                            label="Số điện thoại khách hàng *"
                            name="customerPhone"
                            value={formData.customerPhone}
                            onChange={handleChange}
                            fullWidth
                            required
                        />
                        <TextField
                            label="Tình trạng lỗi (Khách báo) *"
                            name="issueDescription"
                            value={formData.issueDescription}
                            onChange={handleChange}
                            fullWidth
                            multiline
                            rows={3}
                            required
                        />
                    </Box>
                </form>
            </DialogContent>
            <Divider />
            <DialogActions sx={{ p: 2, bgcolor: "#f8f9fa" }}>
                <Button onClick={onClose} color="inherit" disabled={loading}>Hủy</Button>
                <Button 
                    type="submit" 
                    form="create-ticket-form" 
                    variant="contained" 
                    color="primary" 
                    disabled={loading}
                    startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
                    sx={{ borderRadius: 2 }}
                >
                    {loading ? "Đang tạo..." : "Tạo phiếu"}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default CreateWarrantyTicketModal;

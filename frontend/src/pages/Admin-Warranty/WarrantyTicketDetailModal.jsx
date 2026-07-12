import React, { useState, useEffect } from "react";
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
    IconButton,
    Grid,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    InputAdornment,
    Chip,
    Stepper,
    Step,
    StepLabel,
    Avatar,
    Alert
} from "@mui/material";
import { 
    Close as CloseIcon, 
    Build as RepairIcon,
    LocalShipping as ReturnedIcon,
    Cancel as CancelledIcon,
    CheckCircle as CompletedIcon,
    PhoneIphone as DeviceIcon,
    Person as PersonIcon,
    AccessTime as TimeIcon,
    Update as UpdateIcon
} from "@mui/icons-material";
import { getWarrantyTicketDetails, updateWarrantyTicketStatus } from "../../services/warrantyService";
import { toast } from "react-toastify";
import { formatDate, formatMoney } from "../../utils/formatters";

// Status configuration
const STATUS_OPTIONS = [
    { value: "PENDING", label: "Chờ kiểm tra", icon: <TimeIcon fontSize="small"/>, color: "warning" },
    { value: "IN_PROGRESS", label: "Đang sửa chữa", icon: <RepairIcon fontSize="small"/>, color: "info" },
    { value: "COMPLETED", label: "Đã sửa xong", icon: <CompletedIcon fontSize="small"/>, color: "success" },
    { value: "RETURNED", label: "Đã trả khách", icon: <ReturnedIcon fontSize="small"/>, color: "secondary" },
    { value: "CANCELLED", label: "Đã hủy", icon: <CancelledIcon fontSize="small"/>, color: "error" },
];

const getStatusColor = (status) => {
    return STATUS_OPTIONS.find(opt => opt.value === status)?.color || "default";
};

// Stepper workflow mapping
const steps = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'RETURNED'];

const WarrantyTicketDetailModal = ({ open, ticketId, onClose, onSuccess }) => {
    const [ticket, setTicket] = useState(null);
    const [loading, setLoading] = useState(false);
    
    // Form fields for update
    const [status, setStatus] = useState("PENDING");
    const [technicianNote, setTechnicianNote] = useState("");
    const [repairCost, setRepairCost] = useState(0);
    const [updating, setUpdating] = useState(false);

    useEffect(() => {
        if (open && ticketId) {
            fetchTicketDetails(ticketId);
        } else {
            setTicket(null);
        }
    }, [open, ticketId]);

    const fetchTicketDetails = async (id) => {
        setLoading(true);
        try {
            const res = await getWarrantyTicketDetails(id);
            if (res.success && res.data) {
                setTicket(res.data);
                setStatus(res.data.status);
                setTechnicianNote(res.data.technicianNote || "");
                setRepairCost(res.data.repairCost || 0);
            } else {
                toast.error(res.message || "Không tải được dữ liệu phiếu.");
                onClose();
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Lỗi tải phiếu bảo hành.");
            onClose();
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async () => {
        setUpdating(true);
        try {
            const res = await updateWarrantyTicketStatus(ticketId, {
                status,
                technicianNote,
                repairCost
            });
            if (res.success) {
                toast.success("Cập nhật phiếu thành công");
                setTicket(res.data); // Update local state with latest data
                if (onSuccess) onSuccess(); // trigger list refresh
            } else {
                toast.error(res.message || "Cập nhật thất bại");
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Lỗi cập nhật phiếu.");
        } finally {
            setUpdating(false);
        }
    };

    if (!open) return null;

    // Helper to calculate active step for Timeline
    const getActiveStep = () => {
        if (!ticket) return 0;
        if (ticket.status === 'CANCELLED') return 0;
        const index = steps.indexOf(ticket.status);
        return index !== -1 ? index : 0;
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth PaperProps={{ sx: { borderRadius: 3, height: '90vh' } }}>
            <DialogTitle component="div" sx={{ m: 0, p: 2, display: "flex", alignItems: "center", justifyContent: "space-between", bgcolor: "#f8f9fa", borderBottom: '1px solid #e0e0e0' }}>
                <Box display="flex" alignItems="center" gap={1.5}>
                    <UpdateIcon color="primary" sx={{ fontSize: 28 }} />
                    <Typography variant="h6" component="span" fontWeight="bold">Chi tiết phiếu bảo hành: {ticket?.ticketCode || "..."}</Typography>
                    {ticket && (
                        <Chip 
                            label={ticket.statusDisplay} 
                            color={getStatusColor(ticket.status)} 
                            size="small" 
                            sx={{ ml: 2, fontWeight: 'bold' }} 
                        />
                    )}
                </Box>
                <IconButton onClick={onClose} size="small">
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ p: 0, bgcolor: "#f4f6f8" }}>
                {loading ? (
                    <Box display="flex" justifyContent="center" alignItems="center" height="400px">
                        <CircularProgress />
                    </Box>
                ) : !ticket ? (
                    <Box display="flex" justifyContent="center" alignItems="center" height="400px">
                        <Typography color="text.secondary">Không tìm thấy thông tin phiếu</Typography>
                    </Box>
                ) : (
                    <Grid container sx={{ height: "100%" }}>
                        {/* CỘT TRÁI (2/3): THÔNG TIN */}
                        <Grid item xs={12} md={8} sx={{ p: 4, bgcolor: "#ffffff" }}>
                            <Typography variant="subtitle1" fontWeight="bold" gutterBottom color="primary.main" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <DeviceIcon/> Báo Cáo Sự Cố từ Khách Hàng
                            </Typography>
                            <Box sx={{ p: 2.5, bgcolor: "#fff3e0", borderRadius: 2, borderLeft: '4px solid #ff9800', mb: 4 }}>
                                <Typography variant="body1" sx={{ whiteSpace: "pre-wrap", color: "#e65100", fontStyle: "italic" }}>
                                    "{ticket.issueDescription}"
                                </Typography>
                            </Box>

                            <Grid container spacing={4}>
                                <Grid item xs={12} sm={6}>
                                    <Typography variant="subtitle2" fontWeight="bold" gutterBottom color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        Thông Tin Thiết Bị
                                    </Typography>
                                    <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                                        <Avatar variant="rounded" sx={{ width: 64, height: 64, bgcolor: "#e3f2fd", color: "#1976d2", fontSize: 32 }}>📱</Avatar>
                                        <Box>
                                            <Typography variant="body1" fontWeight="bold">{ticket.productName}</Typography>
                                            <Typography variant="body2" color="text.secondary">Biến thể: {ticket.variantName}</Typography>
                                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontFamily: 'monospace' }}>IMEI: {ticket.imei}</Typography>
                                            {ticket.serialNumber && <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace' }}>S/N: {ticket.serialNumber}</Typography>}
                                        </Box>
                                    </Box>
                                </Grid>

                                <Grid item xs={12} sm={6}>
                                    <Typography variant="subtitle2" fontWeight="bold" gutterBottom color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <PersonIcon fontSize="small"/> Thông Tin Khách Hàng
                                    </Typography>
                                    <Box sx={{ mt: 2, p: 2, bgcolor: "#f8f9fa", borderRadius: 2 }}>
                                        <Typography variant="body1" fontWeight="bold">{ticket.customerName}</Typography>
                                        <Typography variant="body2" color="text.secondary">{ticket.customerPhone}</Typography>
                                    </Box>
                                </Grid>
                            </Grid>

                            <Divider sx={{ my: 4 }} />
                            
                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={4}>
                                    <Typography variant="body2" color="text.secondary">Nhân viên tiếp nhận</Typography>
                                    <Typography variant="body1" fontWeight="bold">{ticket.createdBy}</Typography>
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                    <Typography variant="body2" color="text.secondary">Thời gian nhận</Typography>
                                    <Typography variant="body1" fontWeight="bold">{formatDate(ticket.receivedAt)}</Typography>
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                    {ticket.resolvedAt && (
                                        <>
                                            <Typography variant="body2" color="text.secondary">Thời gian sửa xong</Typography>
                                            <Typography variant="body1" fontWeight="bold">{formatDate(ticket.resolvedAt)}</Typography>
                                        </>
                                    )}
                                </Grid>
                                {ticket.returnedAt && (
                                    <Grid item xs={12} sm={4}>
                                        <Typography variant="body2" color="text.secondary">Thời gian trả khách</Typography>
                                        <Typography variant="body1" fontWeight="bold">{formatDate(ticket.returnedAt)}</Typography>
                                    </Grid>
                                )}
                                {ticket.repairCost > 0 && (
                                    <Grid item xs={12} sm={4}>
                                        <Typography variant="body2" color="text.secondary">Chi phí sửa chữa</Typography>
                                        <Typography variant="body1" fontWeight="bold" color="error.main">{formatMoney(ticket.repairCost)}</Typography>
                                    </Grid>
                                )}
                            </Grid>
                        </Grid>

                        {/* CỘT PHẢI (1/3): TIMELINE & CẬP NHẬT */}
                        <Grid item xs={12} md={4} sx={{ p: 4, bgcolor: "#f8f9fa", borderLeft: '1px solid #e0e0e0' }}>
                            <Typography variant="subtitle1" fontWeight="bold" gutterBottom color="primary.main">
                                Tiến Độ Sửa Chữa
                            </Typography>

                            {/* Timeline Stepper */}
                            <Box sx={{ my: 4 }}>
                                {ticket.status === 'CANCELLED' ? (
                                    <Alert severity="error" sx={{ mb: 3 }}>Phiếu đã bị hủy</Alert>
                                ) : (
                                    <Stepper activeStep={getActiveStep()} orientation="vertical">
                                        <Step>
                                            <StepLabel>Mở phiếu / Chờ kiểm tra</StepLabel>
                                        </Step>
                                        <Step>
                                            <StepLabel>Đang sửa chữa</StepLabel>
                                        </Step>
                                        <Step>
                                            <StepLabel>Đã sửa xong</StepLabel>
                                        </Step>
                                        <Step>
                                            <StepLabel>Đã trả khách</StepLabel>
                                        </Step>
                                    </Stepper>
                                )}
                            </Box>

                            <Divider sx={{ my: 3 }} />

                            {/* Cập nhật trạng thái Action Controls */}
                            <Typography variant="subtitle2" fontWeight="bold" gutterBottom color="text.secondary" sx={{ mb: 2 }}>
                                Cập Nhật Trạng Thái
                            </Typography>
                            
                            <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                                <FormControl fullWidth size="medium">
                                    <InputLabel>Trạng thái phiếu</InputLabel>
                                    <Select
                                        value={status}
                                        label="Trạng thái phiếu"
                                        onChange={(e) => setStatus(e.target.value)}
                                        sx={{ bgcolor: "#fff" }}
                                    >
                                        {STATUS_OPTIONS.map((opt) => (
                                            <MenuItem key={opt.value} value={opt.value}>
                                                <Box display="flex" alignItems="center" gap={1}>
                                                    {opt.icon} {opt.label}
                                                </Box>
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>

                                <TextField
                                    label="Chi phí sửa chữa (VNĐ)"
                                    type="number"
                                    fullWidth
                                    value={repairCost}
                                    onChange={(e) => setRepairCost(Number(e.target.value))}
                                    InputProps={{
                                        endAdornment: <InputAdornment position="end">đ</InputAdornment>,
                                    }}
                                    sx={{ bgcolor: "#fff" }}
                                />

                                <TextField
                                    label="Ghi chú kỹ thuật viên"
                                    multiline
                                    rows={4}
                                    fullWidth
                                    placeholder="Ví dụ: Đã thay màn hình lô, hẹn khách tuần sau lấy..."
                                    value={technicianNote}
                                    onChange={(e) => setTechnicianNote(e.target.value)}
                                    sx={{ bgcolor: "#fff" }}
                                />

                                <Button 
                                    variant="contained" 
                                    color="primary" 
                                    size="large"
                                    onClick={handleUpdateStatus}
                                    disabled={updating || (status === ticket.status && repairCost === ticket.repairCost && technicianNote === ticket.technicianNote)}
                                    startIcon={updating ? <CircularProgress size={20} color="inherit" /> : <UpdateIcon />}
                                    sx={{ mt: 1, py: 1.5, borderRadius: 2, fontWeight: 'bold' }}
                                >
                                    {updating ? "Đang xử lý..." : "Lưu Thay Đổi"}
                                </Button>
                            </Box>
                        </Grid>
                    </Grid>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default WarrantyTicketDetailModal;

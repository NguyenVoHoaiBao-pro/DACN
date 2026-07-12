import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TablePagination,
    TableRow,
    Typography,
} from "@mui/material";
import {
    ArrowDownward,
    ArrowUpward,
    AccountBalance,
    CalendarToday,
} from "@mui/icons-material";
import AdminLayout from "../../components/Admin-Layout/AdminLayout";
import StatCard from "../../components/Admin-Statistics/StatCard";
import { getFinanceSummary, getFinanceLedger } from "../../services/statisticsService";
import { usePermissions } from "../../hooks/usePermissions";

const formatCurrency = (val) =>
    val?.toLocaleString("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }) || "0 ₫";

const formatDateTime = (iso) => {
    if (!iso) return "—";
    try {
        return new Date(iso).toLocaleString("vi-VN");
    } catch {
        return iso;
    }
};

const STATUS_LABELS = {
    SUCCESS: "Thành công",
    COMPLETED: "Hoàn tất",
    PENDING_APPROVAL: "Chờ duyệt",
    PROCESSING: "Đang xử lý",
    FAILED: "Thất bại",
    AWAITING_MANUAL_TRANSFER: "Chờ chuyển khoản",
    PENDING: "Chờ thanh toán",
};

const AdminFinancePage = () => {
    const navigate = useNavigate();
    const { hasPermission } = usePermissions();
    const isAdmin = hasPermission("REPORT_REVENUE");

    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState(null);
    const [ledger, setLedger] = useState({ entries: [], total: 0 });
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(20);
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [appliedRange, setAppliedRange] = useState({ start: "", end: "" });

    const fetchData = async () => {
        if (!isAdmin) return;
        setLoading(true);
        try {
            const [summaryRes, ledgerRes] = await Promise.all([
                getFinanceSummary(appliedRange.start || undefined, appliedRange.end || undefined),
                getFinanceLedger({
                    startDate: appliedRange.start || undefined,
                    endDate: appliedRange.end || undefined,
                    page,
                    limit: rowsPerPage,
                }),
            ]);
            setSummary(summaryRes);
            setLedger(ledgerRes);
        } catch (err) {
            console.error("Finance dashboard error:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [isAdmin, appliedRange, page, rowsPerPage]);

    const handleApplyFilter = () => {
        setPage(0);
        setAppliedRange({ start: startDate, end: endDate });
    };

    if (!isAdmin) {
        return (
            <AdminLayout currentPage="Finance">
                <Box sx={{ p: 4, textAlign: "center" }}>
                    <Typography variant="h6" color="error">Bạn không có quyền xem sổ cái tài chính</Typography>
                </Box>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout currentPage="Finance">
            <Box sx={{ p: { xs: 2, md: 4 }, bgcolor: "#f8fafc", minHeight: "100vh" }}>
                <Box sx={{ mb: 4, display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 2 }}>
                    <Box>
                        <Typography variant="h4" fontWeight={900} gutterBottom>
                            Sổ cái tài chính
                        </Typography>
                        <Typography variant="body1" color="text.secondary">
                            Theo dõi tiền vào (VNPay/COD) và tiền ra (hoàn tiền)
                        </Typography>
                    </Box>
                    <Button
                        variant="outlined"
                        startIcon={<AccountBalance />}
                        onClick={() => navigate("/admin/refunds")}
                        sx={{ borderRadius: 2, textTransform: "none", fontWeight: 700 }}
                    >
                        Quản lý hoàn tiền
                    </Button>
                </Box>

                <Card sx={{ mb: 3, borderRadius: 4, boxShadow: "0 8px 30px rgba(0,0,0,0.04)" }}>
                    <CardContent sx={{ display: "flex", flexWrap: "wrap", gap: 2, alignItems: "center" }}>
                        <CalendarToday sx={{ color: "text.secondary" }} />
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #e2e8f0" }}
                        />
                        <Typography color="text.secondary">→</Typography>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #e2e8f0" }}
                        />
                        <Button
                            variant="contained"
                            onClick={handleApplyFilter}
                            sx={{ borderRadius: 2, textTransform: "none", fontWeight: 700 }}
                        >
                            Lọc khoảng ngày
                        </Button>
                        {(appliedRange.start || appliedRange.end) && (
                            <Chip
                                label={`${appliedRange.start || "…"} → ${appliedRange.end || "…"}`}
                                onDelete={() => {
                                    setStartDate("");
                                    setEndDate("");
                                    setAppliedRange({ start: "", end: "" });
                                    setPage(0);
                                }}
                                sx={{ fontWeight: 700 }}
                            />
                        )}
                    </CardContent>
                </Card>

                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", lg: "repeat(4, 1fr)" }, gap: 3, mb: 4 }}>
                    <StatCard title="Tiền vào" value={summary?.totalPaymentIn || 0} growth={0} unit="VND" icon={ArrowDownward} color="#10b981" loading={loading} />
                    <StatCard title="Tiền ra (hoàn)" value={summary?.totalRefundOut || 0} growth={0} unit="VND" icon={ArrowUpward} color="#ef4444" loading={loading} />
                    <StatCard title="Dòng tiền ròng" value={summary?.netCashFlow || 0} growth={0} unit="VND" icon={AccountBalance} color="#3b82f6" loading={loading} />
                    <StatCard title="Hoàn tiền chờ" value={summary?.pendingRefundCount || 0} growth={0} icon={AccountBalance} color="#f59e0b" loading={loading} />
                </Box>

                <Card sx={{ borderRadius: 4, boxShadow: "0 10px 40px rgba(0,0,0,0.06)" }}>
                    <CardContent>
                        <Typography variant="h6" fontWeight={900} sx={{ mb: 2 }}>
                            Lịch sử giao dịch
                        </Typography>
                        <TableContainer>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 800 }}>Loại</TableCell>
                                        <TableCell sx={{ fontWeight: 800 }}>Mã tham chiếu</TableCell>
                                        <TableCell sx={{ fontWeight: 800 }}>Mô tả</TableCell>
                                        <TableCell sx={{ fontWeight: 800 }}>PTTT</TableCell>
                                        <TableCell sx={{ fontWeight: 800 }}>Trạng thái</TableCell>
                                        <TableCell sx={{ fontWeight: 800 }} align="right">Số tiền</TableCell>
                                        <TableCell sx={{ fontWeight: 800 }}>Thời gian</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {loading ? (
                                        <TableRow>
                                            <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                                                <CircularProgress size={28} />
                                            </TableCell>
                                        </TableRow>
                                    ) : ledger.entries?.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                                                <Typography color="text.secondary" fontWeight={600}>Chưa có giao dịch</Typography>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        ledger.entries.map((entry) => {
                                            const isIn = entry.direction === "IN";
                                            return (
                                                <TableRow key={entry.id} hover>
                                                    <TableCell>
                                                        <Chip
                                                            size="small"
                                                            label={entry.type === "PAYMENT" ? "Thu" : "Chi"}
                                                            color={isIn ? "success" : "error"}
                                                            sx={{ fontWeight: 800 }}
                                                        />
                                                    </TableCell>
                                                    <TableCell sx={{ fontWeight: 700 }}>{entry.referenceCode}</TableCell>
                                                    <TableCell>{entry.title}</TableCell>
                                                    <TableCell>{entry.method || "—"}</TableCell>
                                                    <TableCell>
                                                        <Chip
                                                            size="small"
                                                            label={STATUS_LABELS[entry.status] || entry.status}
                                                            variant="outlined"
                                                            sx={{ fontWeight: 700 }}
                                                        />
                                                    </TableCell>
                                                    <TableCell
                                                        align="right"
                                                        sx={{
                                                            fontWeight: 900,
                                                            color: isIn ? "success.main" : "error.main",
                                                        }}
                                                    >
                                                        {isIn ? "+" : "−"} {formatCurrency(entry.amount)}
                                                    </TableCell>
                                                    <TableCell variant="caption">{formatDateTime(entry.occurredAt)}</TableCell>
                                                </TableRow>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                        <TablePagination
                            component="div"
                            count={ledger.total || 0}
                            page={page}
                            onPageChange={(_, p) => setPage(p)}
                            rowsPerPage={rowsPerPage}
                            onRowsPerPageChange={(e) => {
                                setRowsPerPage(parseInt(e.target.value, 10));
                                setPage(0);
                            }}
                            labelRowsPerPage="Số dòng:"
                            labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count}`}
                        />
                    </CardContent>
                </Card>
            </Box>
        </AdminLayout>
    );
};

export default AdminFinancePage;

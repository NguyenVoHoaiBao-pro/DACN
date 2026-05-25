import {
  PersonAdd as AddCustomerIcon,
  Block as BlockIcon,
  Edit as EditIcon,
  Email as EmailIcon,
  FilterList as FilterIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
  Search as SearchIcon,
  CheckCircle as VerifiedIcon,
  Visibility as ViewIcon,
} from "@mui/icons-material";
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Toolbar,
  Typography,
} from "@mui/material";
import { useState } from "react";
import AdminLayout from "../../components/Admin-Layout/AdminLayout";

// Mock data khách hàng
const mockCustomers = [
  {
    id: 1,
    name: "Nguyễn Văn An",
    email: "nguyen.van.an@gmail.com",
    phone: "0901234567",
    address: "123 Nguyễn Trãi, Q.1, TP.HCM",
    status: "active",
    verified: true,
    totalOrders: 15,
    totalSpent: 45000000,
    avatar: "https://i.pravatar.cc/60?img=1",
    joinDate: "2024-01-15",
    lastOrder: "2024-10-05",
  },
  {
    id: 2,
    name: "Trần Thị Bình",
    email: "tran.thi.binh@yahoo.com",
    phone: "0987654321",
    address: "456 Lê Lợi, Q.3, TP.HCM",
    status: "active",
    verified: true,
    totalOrders: 8,
    totalSpent: 22000000,
    avatar: "https://i.pravatar.cc/60?img=2",
    joinDate: "2024-02-20",
    lastOrder: "2024-10-03",
  },
  {
    id: 3,
    name: "Lê Minh Cường",
    email: "le.minh.cuong@hotmail.com",
    phone: "0912345678",
    address: "789 Điện Biên Phủ, Q.Bình Thạnh, TP.HCM",
    status: "inactive",
    verified: false,
    totalOrders: 2,
    totalSpent: 3500000,
    avatar: "https://i.pravatar.cc/60?img=3",
    joinDate: "2024-03-10",
    lastOrder: "2024-08-15",
  },
  {
    id: 4,
    name: "Phạm Thu Hương",
    email: "pham.thu.huong@gmail.com",
    phone: "0923456789",
    address: "321 Võ Văn Tần, Q.3, TP.HCM",
    status: "active",
    verified: true,
    totalOrders: 25,
    totalSpent: 78000000,
    avatar: "https://i.pravatar.cc/60?img=4",
    joinDate: "2023-11-05",
    lastOrder: "2024-10-08",
  },
  {
    id: 5,
    name: "Hoàng Văn Đức",
    email: "hoang.van.duc@outlook.com",
    phone: "0934567890",
    address: "654 Cách Mạng Tháng 8, Q.10, TP.HCM",
    status: "blocked",
    verified: false,
    totalOrders: 1,
    totalSpent: 1200000,
    avatar: "https://i.pravatar.cc/60?img=5",
    joinDate: "2024-04-20",
    lastOrder: "2024-05-10",
  },
  {
    id: 6,
    name: "Vũ Thị Lan",
    email: "vu.thi.lan@gmail.com",
    phone: "0945678901",
    address: "987 Hai Bà Trưng, Q.1, TP.HCM",
    status: "active",
    verified: true,
    totalOrders: 12,
    totalSpent: 35000000,
    avatar: "https://i.pravatar.cc/60?img=6",
    joinDate: "2024-01-30",
    lastOrder: "2024-09-28",
  },
];

const CustomerManagementPage = () => {
  const [customers] = useState(mockCustomers);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [verificationFilter, setVerificationFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Filter customers
  const filteredCustomers = customers.filter((customer) => {
    const matchesSearch =
      customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.phone.includes(searchQuery);

    const matchesStatus =
      statusFilter === "all" || customer.status === statusFilter;

    const matchesVerification =
      verificationFilter === "all" ||
      (verificationFilter === "verified" && customer.verified) ||
      (verificationFilter === "unverified" && !customer.verified);

    return matchesSearch && matchesStatus && matchesVerification;
  });

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  // Get status config
  const getStatusConfig = (status) => {
    switch (status) {
      case "active":
        return { label: "Hoạt động", color: "success" };
      case "inactive":
        return { label: "Không hoạt động", color: "default" };
      case "blocked":
        return { label: "Đã chặn", color: "error" };
      default:
        return { label: "Không xác định", color: "default" };
    }
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  return (
    <AdminLayout currentPage="Khách hàng">
      <Box sx={{ p: 3 }}>
        {/* Header Section */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Quản Lý Khách Hàng
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Quản lý thông tin khách hàng, theo dõi hoạt động mua sắm và chăm sóc
            khách hàng
          </Typography>
        </Box>

        {/* Stats Cards */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: "flex", gap: 3, mb: 3 }}>
            <Card sx={{ flex: 1, borderRadius: 3 }}>
              <CardContent>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <Avatar sx={{ bgcolor: "#e3f2fd", color: "#1976d2" }}>
                    <PersonIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="h6" fontWeight="bold">
                      {customers.length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Tổng khách hàng
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>

            <Card sx={{ flex: 1, borderRadius: 3 }}>
              <CardContent>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <Avatar sx={{ bgcolor: "#e8f5e8", color: "#2e7d32" }}>
                    <VerifiedIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="h6" fontWeight="bold">
                      {customers.filter((c) => c.verified).length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Đã xác thực
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>

            <Card sx={{ flex: 1, borderRadius: 3 }}>
              <CardContent>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <Avatar sx={{ bgcolor: "#fff3e0", color: "#f57c00" }}>
                    <BlockIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="h6" fontWeight="bold">
                      {customers.filter((c) => c.status === "blocked").length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Bị chặn
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Box>
        </Box>

        {/* Toolbar */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Toolbar sx={{ px: 0 }}>
              {/* Search */}
              <TextField
                placeholder="Tìm kiếm khách hàng..."
                variant="outlined"
                size="small"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                sx={{ minWidth: 300, mr: 2 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />

              {/* Status Filter */}
              <FormControl size="small" sx={{ minWidth: 150, mr: 2 }}>
                <InputLabel>Trạng thái</InputLabel>
                <Select
                  value={statusFilter}
                  label="Trạng thái"
                  onChange={(e) => setStatusFilter(e.target.value)}
                  startAdornment={<FilterIcon sx={{ mr: 1 }} />}
                >
                  <MenuItem value="all">Tất cả</MenuItem>
                  <MenuItem value="active">Hoạt động</MenuItem>
                  <MenuItem value="inactive">Không hoạt động</MenuItem>
                  <MenuItem value="blocked">Bị chặn</MenuItem>
                </Select>
              </FormControl>

              {/* Verification Filter */}
              <FormControl size="small" sx={{ minWidth: 150, mr: 2 }}>
                <InputLabel>Xác thực</InputLabel>
                <Select
                  value={verificationFilter}
                  label="Xác thực"
                  onChange={(e) => setVerificationFilter(e.target.value)}
                >
                  <MenuItem value="all">Tất cả</MenuItem>
                  <MenuItem value="verified">Đã xác thực</MenuItem>
                  <MenuItem value="unverified">Chưa xác thực</MenuItem>
                </Select>
              </FormControl>

              <Box sx={{ flexGrow: 1 }} />

              {/* Add Customer Button */}
              <Button
                variant="contained"
                startIcon={<AddCustomerIcon />}
                sx={{
                  bgcolor: "#ff9f1a",
                  "&:hover": { bgcolor: "#e68a00" },
                }}
              >
                Thêm Khách Hàng
              </Button>
            </Toolbar>
          </CardContent>
        </Card>

        {/* Customers Table */}
        <Card>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Khách hàng</TableCell>
                  <TableCell>Liên hệ</TableCell>
                  <TableCell>Địa chỉ</TableCell>
                  <TableCell align="center">Trạng thái</TableCell>
                  <TableCell align="center">Đơn hàng</TableCell>
                  <TableCell align="right">Tổng chi tiêu</TableCell>
                  <TableCell align="center">Ngày tham gia</TableCell>
                  <TableCell align="center">Thao tác</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredCustomers
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((customer) => {
                    const statusConfig = getStatusConfig(customer.status);
                    return (
                      <TableRow key={customer.id} hover>
                        <TableCell>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 2,
                            }}
                          >
                            <Avatar src={customer.avatar} alt={customer.name} />
                            <Box>
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 1,
                                }}
                              >
                                <Typography
                                  variant="subtitle2"
                                  fontWeight="medium"
                                >
                                  {customer.name}
                                </Typography>
                                {customer.verified && (
                                  <VerifiedIcon
                                    sx={{
                                      color: "#2e7d32",
                                      fontSize: 16,
                                    }}
                                  />
                                )}
                              </Box>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                ID: {customer.id}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box
                            sx={{
                              display: "flex",
                              flexDirection: "column",
                              gap: 0.5,
                            }}
                          >
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                              }}
                            >
                              <EmailIcon
                                sx={{ fontSize: 14, color: "text.secondary" }}
                              />
                              <Typography variant="body2">
                                {customer.email}
                              </Typography>
                            </Box>
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                              }}
                            >
                              <PhoneIcon
                                sx={{ fontSize: 14, color: "text.secondary" }}
                              />
                              <Typography variant="body2">
                                {customer.phone}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography
                            variant="body2"
                            sx={{
                              maxWidth: 200,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {customer.address}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={statusConfig.label}
                            size="small"
                            color={statusConfig.color}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Typography variant="body2" fontWeight="medium">
                            {customer.totalOrders}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            đơn hàng
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="subtitle2" fontWeight="medium">
                            {formatCurrency(customer.totalSpent)}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Typography variant="body2">
                            {new Date(customer.joinDate).toLocaleDateString(
                              "vi-VN"
                            )}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Mua gần nhất:{" "}
                            {new Date(customer.lastOrder).toLocaleDateString(
                              "vi-VN"
                            )}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Box
                            sx={{
                              display: "flex",
                              justifyContent: "center",
                              gap: 0.5,
                            }}
                          >
                            <IconButton
                              size="small"
                              color="primary"
                              title="Xem chi tiết"
                            >
                              <ViewIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              color="warning"
                              title="Chỉnh sửa"
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              color="error"
                              title={
                                customer.status === "blocked"
                                  ? "Bỏ chặn"
                                  : "Chặn"
                              }
                            >
                              <BlockIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pagination */}
          <TablePagination
            component="div"
            count={filteredCustomers.length}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[5, 10, 25]}
            labelRowsPerPage="Số dòng mỗi trang:"
            labelDisplayedRows={({ from, to, count }) =>
              `${from}–${to} của ${count !== -1 ? count : `hơn ${to}`}`
            }
          />
        </Card>
      </Box>
    </AdminLayout>
  );
};

export default CustomerManagementPage;

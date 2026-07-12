import React from "react";
import { Box, Typography, Chip, IconButton, InputBase, Avatar } from "@mui/material";
import { Search, NotificationsNone, Dashboard as DashboardIcon, Timeline, WbSunny, NightsStay } from "@mui/icons-material";
import AdminLayout from "../../components/Admin-Layout/AdminLayout";
import AIControlPanel from "../../components/Admin-Layout/AIControlPanel";
import StatisticsDashboard from "../../components/Admin-Statistics/StatisticsDashboard";
import SalesStaffHomePage from "../Admin-Sales/SalesStaffHomePage";
import WarehouseStaffHomePage from "../Admin-Warehouse/WarehouseStaffHomePage";
import { usePermissions } from "../../hooks/usePermissions";
import { useSelector } from "react-redux";
import { selectUser } from "../../redux/appSlice";

/**
 * Main Dashboard Page for Admin Area
 * Now powered by the high-performance StatisticsDashboard component.
 */
const DashboardPage = () => {
  const { hasPermission, isWarehouseUser, isSalesUser, isAdminUser } = usePermissions();
  const isAdmin = hasPermission("REPORT_REVENUE");
  const isSales = hasPermission("REPORT_SALES");
  const showSalesHome = isSalesUser && !isAdminUser;
  const showWarehouseHome = isWarehouseUser && !isAdminUser && !isSalesUser;
  const currentUser = useSelector(selectUser);

  // Dynamic greeting based on time of day
  const hours = new Date().getHours();
  const isMorning = hours >= 5 && hours < 12;
  const isAfternoon = hours >= 12 && hours < 18;
  const greeting = isMorning ? "Chào buổi sáng" : isAfternoon ? "Chào buổi chiều" : "Chào buổi tối";
  const GreetingIcon = isMorning || isAfternoon ? WbSunny : NightsStay;

  return (
    <AdminLayout currentPage="Dashboard">
      <Box sx={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
        position: "relative",
        pb: 8
      }}>


        {/* Title Bar Section with Personal Greetings */}
        <Box sx={{ px: { xs: 2, md: 4 }, mt: 3, mb: 4, display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 3 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Avatar 
                sx={{ 
                    width: 50, 
                    height: 50, 
                    boxShadow: "0 8px 30px rgba(0,0,0,0.1)",
                    border: "2px solid white",
                    background: "linear-gradient(135deg, #ff9f1a 0%, #f97316 100%)",
                    fontSize: "1.2rem",
                    fontWeight: 900
                }}
            >
                {currentUser?.name ? currentUser.name[0].toUpperCase() : "A"}
            </Avatar>
            <Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.2 }}>
                <GreetingIcon sx={{ color: isMorning || isAfternoon ? "#f59e0b" : "#6366f1", fontSize: 18 }} />
                <Typography variant="body2" color="text.secondary" fontWeight={800} sx={{ opacity: 0.8, letterSpacing: 0.2 }}>
                    {greeting},
                </Typography>
              </Box>
              <Typography variant="h5" fontWeight={950} color="#1e293b" sx={{ letterSpacing: -0.5, mb: 0.2, lineHeight: 1.1 }}>
                {currentUser?.name || "Administrator"}
              </Typography>
              <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ opacity: 0.6 }}>
                {showWarehouseHome
                  ? "Tổng quan nhập — xuất kho & tồn hàng."
                  : showSalesHome
                    ? "KPI cá nhân & lối tắt nghiệp vụ Sales."
                    : "Hệ thống báo cáo hiệu suất kinh doanh thời gian thực."}
              </Typography>
            </Box>
          </Box>
          {!showWarehouseHome && (
            <Box sx={{ display: "flex", gap: 1.5 }}>
              <Chip
                icon={<DashboardIcon sx={{ fontSize: "1rem !important" }} />}
                label="Báo cáo sống"
                sx={{ fontWeight: 850, borderRadius: 2.5, bgcolor: "#3b82f615", color: "#3b82f6", border: "1px solid #3b82f630" }}
              />
              <Chip
                icon={<Timeline sx={{ fontSize: "1rem !important" }} />}
                label="Phân tích sâu"
                sx={{ fontWeight: 850, borderRadius: 2.5, bgcolor: "#8b5cf615", color: "#8b5cf6", border: "1px solid #8b5cf630" }}
              />
            </Box>
          )}
        </Box>

        {!showSalesHome && !showWarehouseHome && (
          <Box sx={{ px: { xs: 2, md: 4 }, mb: 4 }}>
            <AIControlPanel />
          </Box>
        )}

        <Box sx={{ px: { xs: 2, md: 4 } }}>
          {showWarehouseHome ? (
            <WarehouseStaffHomePage />
          ) : showSalesHome ? (
            <SalesStaffHomePage />
          ) : (
            <StatisticsDashboard isAdmin={isAdmin} isSales={isSales} />
          )}
        </Box>

      </Box>
    </AdminLayout>
  );
};

export default DashboardPage;

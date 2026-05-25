import {
  AttachMoney,
  Receipt,
  Group,
  TrendingUp,
  Assessment
} from "@mui/icons-material";
import {
  Box,
  Button,
  Grid,
  Typography,
  Card,
  CardContent,
  Tab,
  Tabs
} from "@mui/material";
import { useEffect, useState } from "react";
import AdminLayout from "../../components/Admin-Layout/AdminLayout";
import StatCard from "../../components/Admin-Statistics/StatCard";
import RevenueChart from "../../components/Admin-Statistics/RevenueChart";
import OrderStatusChart from "../../components/Admin-Statistics/OrderStatusChart";
import { getOverviewStats, getRevenueChart, getOrderStatusStats, getConversionRates, getCustomerSegments } from "../../services/statisticsService";
import { usePermissions } from "../../hooks/usePermissions";
import ConversionRateTable from "../../components/Admin-Statistics/ConversionRateTable";
import CustomerSegmentsChart from "../../components/Admin-Statistics/CustomerSegmentsChart";

const AnalyticsPage = () => {
  const { hasPermission } = usePermissions();
  const isAdmin = hasPermission("REPORT_REVENUE");
  const [selectedTab, setSelectedTab] = useState(0);
  const [loading, setLoading] = useState(true);

  const [overview, setOverview] = useState(null);
  const [revenueData, setRevenueData] = useState(null);
  const [orderStatusData, setOrderStatusData] = useState(null);
  const [conversionRateData, setConversionRateData] = useState(null);
  const [customerSegmentsData, setCustomerSegmentsData] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (isAdmin) {
        // Fetch core stats together safely
        const [overviewRes, revenueRes, statusRes] = await Promise.all([
          getOverviewStats().catch(e => { console.error("Stats Overview failed:", e); return null; }),
          getRevenueChart('month').catch(e => { console.error("Revenue Chart failed:", e); return null; }),
          getOrderStatusStats().catch(e => { console.error("Order Status failed:", e); return null; })
        ]);
        setOverview(overviewRes);
        setRevenueData(revenueRes);
        setOrderStatusData(statusRes);

        // Fetch Customer Behavior stats independently to prevent general Dashboard crash on 401/500
        getConversionRates()
          .then(setConversionRateData)
          .catch(error => console.warn("⚠️ [Analytics] Failed to fetch Conversion Rates:", error.message));
          
        getCustomerSegments()
          .then(setCustomerSegmentsData)
          .catch(error => console.warn("⚠️ [Analytics] Failed to fetch Customer Segments:", error.message));

      } else {
        const [statusRes] = await Promise.all([getOrderStatusStats()]);
        setOrderStatusData(statusRes);
      }
    } catch (error) {
      console.error("Error fetching analytics data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [isAdmin]);

  return (
    <AdminLayout currentPage="Analytics">
      <Box sx={{ p: 4, bgcolor: "#f8fafc", minHeight: "100vh" }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" fontWeight={800} color="text.primary">
            Business Intelligence
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Deep dive into your sales, revenue, and customer behavior.
          </Typography>
        </Box>

        <Box sx={{ mb: 4 }}>
          <Tabs
            value={selectedTab}
            onChange={(e, val) => setSelectedTab(val)}
            sx={{
              "& .MuiTab-root": { textTransform: "none", fontWeight: 700, fontSize: "1rem" }
            }}
          >
            <Tab label="Overview" />
            <Tab label="Revenue Reports" />
            <Tab label="Order Status" />
            {isAdmin && <Tab label="Customer Behavior" />}
          </Tabs>
        </Box>

        {selectedTab === 0 && (
          <Grid container spacing={4}>
            {isAdmin && (
              <>
                <Grid item xs={12} sm={6} md={3}>
                  <StatCard
                    title="Total Revenue"
                    value={overview?.totalRevenue || 0}
                    growth={overview?.revenueGrowthPercent || 0}
                    unit="$"
                    icon={AttachMoney}
                    color="#3b82f6"
                    loading={loading}
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <StatCard
                    title="Total Orders"
                    value={overview?.totalOrders || 0}
                    growth={overview?.orderGrowthPercent || 0}
                    icon={Receipt}
                    color="#8b5cf6"
                    loading={loading}
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <StatCard
                    title="Total Customers"
                    value={overview?.totalCustomers || 0}
                    growth={overview?.customerGrowthPercent || 0}
                    icon={Group}
                    color="#ec4899"
                    loading={loading}
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <StatCard
                    title="Average Order"
                    value={overview ? (overview.totalRevenue / overview.totalOrders || 0) : 0}
                    growth={5.2} // Example static for now
                    unit="$"
                    icon={Assessment}
                    color="#10b981"
                    loading={loading}
                  />
                </Grid>
                <Grid item xs={12} lg={8}>
                  <RevenueChart data={revenueData} loading={loading} />
                </Grid>
                <Grid item xs={12} lg={4}>
                  <OrderStatusChart data={orderStatusData} loading={loading} />
                </Grid>
              </>
            )}
            {!isAdmin && (
              <Grid item xs={12} md={6}>
                <OrderStatusChart data={orderStatusData} loading={loading} />
              </Grid>
            )}
          </Grid>
        )}

        {selectedTab === 1 && (
          <Box>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Revenue Deep Dive</Typography>
            <Card sx={{ borderRadius: 4, bgcolor: "white" }}>
              <CardContent sx={{ p: 4 }}>
                <RevenueChart data={revenueData} loading={loading} />
              </CardContent>
            </Card>
          </Box>
        )}

        {selectedTab === 2 && (
          <Box sx={{ maxWidth: 600 }}>
            <OrderStatusChart data={orderStatusData} loading={loading} />
          </Box>
        )}

        {selectedTab === 3 && isAdmin && (
          <Grid container spacing={4}>
            <Grid item xs={12} lg={8}>
              <ConversionRateTable data={conversionRateData} loading={loading} />
            </Grid>
            <Grid item xs={12} lg={4}>
              <CustomerSegmentsChart data={customerSegmentsData} loading={loading} />
            </Grid>
          </Grid>
        )}
      </Box>
    </AdminLayout>
  );
};

export default AnalyticsPage;

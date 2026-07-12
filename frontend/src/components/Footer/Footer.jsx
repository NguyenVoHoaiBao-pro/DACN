import MailOutlineIcon from "@mui/icons-material/MailOutline";
import PhoneIcon from "@mui/icons-material/Phone";
import PlaceIcon from "@mui/icons-material/Place";
import SupportAgentIcon from "@mui/icons-material/SupportAgent";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import SecurityIcon from "@mui/icons-material/Security";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import PaymentIcon from "@mui/icons-material/Payment";
import { Box, Button, Grid, TextField, Typography } from "@mui/material";

// Component con cho các mục thông tin nhanh ở trên cùng
const QuickItem = ({ icon, title, subtitle }) => (
  <Box sx={{ display: "flex", gap: 1.5, alignItems: "center", justifyContent: "flex-start" }}>
    <Box
      sx={{
        width: 38,
        height: 38,
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "#ff3f3f",
        color: "#fff",
        flexShrink: 0
      }}
    >
      {icon}
    </Box>
    <Box>
      <Typography sx={{ fontWeight: 700, color: "#fff", fontSize: 13, whiteSpace: "nowrap" }}>{title}</Typography>
      <Typography sx={{ color: "#bdbdbd", fontSize: 11, whiteSpace: "nowrap" }}>
        {subtitle}
      </Typography>
    </Box>
  </Box>
);

// Component con cho mỗi link ở các cột
const LinkItem = ({ label, href = "#" }) => (
  <Typography
    component="a"
    href={href}
    sx={{
      color: "#e9e9e9",
      textDecoration: "none",
      fontSize: 14,
      position: "relative",
      pl: "14px",
      "&:hover": { color: "#ffffff" },
      "&::before": {
        content: '"›"',
        position: "absolute",
        left: 0,
        color: "#ff8a00",
      },
    }}
  >
    {label}
  </Typography>
);

const Footer = () => {
  return (
    <Box component="footer">
      {/* Top quick info bar */}
      <Box sx={{ bgcolor: "#3a3d40", py: 4, px: { xs: 2, md: 6, lg: 10 } }}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "repeat(1, 1fr)", sm: "repeat(2, 1fr)", md: "repeat(4, 1fr)", lg: "repeat(8, 1fr)" },
            gap: 2
          }}
        >
          <QuickItem
            icon={<PlaceIcon fontSize="small" />}
            title="Địa Chỉ"
            subtitle="Q4, Hồ Chí Minh"
          />
          <QuickItem
            icon={<MailOutlineIcon fontSize="small" />}
            title="Gửi Email"
            subtitle="hotro@electro.vn"
          />
          <QuickItem
            icon={<PhoneIcon fontSize="small" />}
            title="Điện Thoại"
            subtitle="1900 1234 5678"
          />
          <QuickItem
            icon={<SupportAgentIcon fontSize="small" />}
            title="Zalo / Tư Vấn"
            subtitle="0909 123 456"
          />
          <QuickItem
            icon={<AccessTimeIcon fontSize="small" />}
            title="Giờ Hoạt Động"
            subtitle="08:00 - 22:00"
          />
          <QuickItem
            icon={<SecurityIcon fontSize="small" />}
            title="Bảo Hành"
            subtitle="12 Tháng Đổi Trả"
          />
          <QuickItem
            icon={<LocalShippingIcon fontSize="small" />}
            title="Giao Hàng"
            subtitle="Miễn Phí Toàn Quốc"
          />
          <QuickItem
            icon={<PaymentIcon fontSize="small" />}
            title="Thanh Toán"
            subtitle="An Toàn, Góp 0%"
          />
        </Box>
      </Box>

      {/* Main footer columns */}
      <Box sx={{ bgcolor: "#2f3234", py: 7, px: { xs: 2, md: 6, lg: 10 } }}>
        <Grid container spacing={4} justifyContent="space-between">
          {/* Newsletter Column */}
          <Grid item xs={12} md={3}>
            <Typography
              sx={{ fontWeight: 800, mb: 2, color: "#ff8a00", fontSize: 18 }}
            >
              Đăng Ký Nhận Tin
            </Typography>
            <Typography
              sx={{
                color: "#bdbdbd",
                mb: 3,
                fontSize: 14,
                maxWidth: "100%",
              }}
            >
              Đăng ký nhận bản tin để cập nhật những sản phẩm mới nhất và các chương trình khuyến mãi hấp dẫn từ Electro Store.
            </Typography>
            <Box
              component="form"
              sx={{
                display: "flex",
                alignItems: "center",
                background: "#fff",
                borderRadius: "999px",
                p: "4px",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                maxWidth: "100%",
                overflow: "hidden"
              }}
            >
              <TextField
                variant="standard"
                placeholder="Nhập email của bạn"
                sx={{
                  flex: 1,
                  "& .MuiInput-underline:before": { borderBottom: "none" },
                  "& .MuiInput-underline:after": { borderBottom: "none" },
                  "& .MuiInput-underline:hover:not(.Mui-disabled):before": {
                    borderBottom: "none",
                  },
                  "& .MuiInputBase-input": { p: "8px 16px" },
                }}
              />
              <Button
                sx={{
                  bgcolor: "#ff9800",
                  color: "#fff",
                  fontWeight: "bold",
                  borderRadius: "999px",
                  px: 2.5,
                  py: 1,
                  textTransform: "none",
                  whiteSpace: "nowrap",
                  "&:hover": { bgcolor: "#f57c00" },
                  ml: "auto"
                }}
              >
                Đăng Ký
              </Button>
            </Box>
          </Grid>

          {/* Other Link Columns */}
          <Grid item xs={12} sm={4} md={3}>
            <LinkColumn
              title="Chăm Sóc Khách Hàng"
              links={[
                "Liên Hệ",
                "Đổi Trả Hàng",
                "Bản Đồ Trang Web",
                "Đánh Giá Khách Hàng",
                "Tài Khoản Của Tôi",
                "Trung Tâm Hỗ Trợ"
              ]}
            />
          </Grid>
          <Grid item xs={12} sm={4} md={3}>
            <LinkColumn
              title="Thông Tin"
              links={[
                { label: "Về Chúng Tôi", href: "/about" },
                { label: "Thông Tin Giao Hàng" },
                { label: "Chính Sách Bảo Mật" },
                { label: "Điều Khoản & Điều Kiện" },
                { label: "Tra Cứu Bảo Hành", href: "/warranty-check" },
                { label: "Chat Với Nhân Viên", href: "/chat-nhan-vien" },
                { label: "Câu Hỏi Thường Gặp", href: "/faq" },
              ]}
            />
          </Grid>
          <Grid item xs={12} sm={4} md={3}>
            <LinkColumn
              title="Tiện Ích Khác"
              links={[
                "Thương Hiệu",
                "Thẻ Quà Tặng",
                "Đối Tác Liên Kết",
                "Lịch Sử Đơn Hàng",
                "Theo Dõi Đơn Hàng",
              ]}
            />
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};

// Component con để tái sử dụng cho các cột link
const LinkColumn = ({ title, links }) => (
  <Box sx={{ display: "flex", flexDirection: "column" }}>
    <Typography
      sx={{ fontWeight: 800, mb: 2, color: "#ff8a00", fontSize: 18 }}
    >
      {title}
    </Typography>
    <Box sx={{ display: "grid", gap: 1.5 }}>
      {links.map((link) => {
        if (typeof link === "string") {
          return <LinkItem key={link} label={link} />;
        }
        return <LinkItem key={link.label} label={link.label} href={link.href || "#"} />;
      })}
    </Box>
  </Box>
);

export default Footer;

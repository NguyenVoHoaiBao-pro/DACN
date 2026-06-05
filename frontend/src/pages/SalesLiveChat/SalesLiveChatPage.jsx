import { Box, Container, Typography } from "@mui/material";
import StoreLiveChatPanel from "../../components/LiveChat/StoreLiveChatPanel";

const SalesLiveChatPage = () => {
  return (
    <Box sx={{ py: 4, bgcolor: "#f4f6f9", minHeight: "60vh" }}>
      <Container maxWidth="md">
        <Typography variant="h4" fontWeight="bold" gutterBottom textAlign="center">
          Chat với nhân viên tư vấn
        </Typography>
        <Typography
          variant="body1"
          color="text.secondary"
          textAlign="center"
          sx={{ mb: 3, maxWidth: 560, mx: "auto" }}
        >
          Kết nối trực tiếp với đội ngũ Sales — hỏi giá, cấu hình, tồn kho và đặt hàng được hướng dẫn ngay.
          (Khác với trợ lý AI ở góc màn hình.)
        </Typography>
        <StoreLiveChatPanel />
      </Container>
    </Box>
  );
};

export default SalesLiveChatPage;

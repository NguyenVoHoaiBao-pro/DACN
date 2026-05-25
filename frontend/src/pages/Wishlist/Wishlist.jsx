import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import {
  Box,
  Button,
  Container,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  addToCart,
  removeFromWishlist,
  selectWishlist,
} from "../../redux/appSlice";
import { formatMoney } from "../../utils/formatters";

const Wishlist = () => {
  const wishlist = useSelector(selectWishlist);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  return (
    <Container sx={{ py: 4, maxWidth: "1200px" }}>
      <Typography
        variant="h4"
        component="h1"
        gutterBottom
        sx={{ fontWeight: 700, color: "#333" }}
      >
        ❤️ Sản Phẩm Yêu Thích
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {wishlist.length > 0
          ? `Bạn có ${wishlist.length} sản phẩm trong danh sách yêu thích`
          : "Danh sách yêu thích trống"}
      </Typography>
      <TableContainer
        component={Paper}
        sx={{
          borderRadius: 3,
          boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
          overflow: "hidden",
        }}
      >
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: "#f8f9fa" }}>
              <TableCell sx={{ width: "8%", fontWeight: 700 }}>Ảnh</TableCell>
              <TableCell sx={{ width: "35%", fontWeight: 700 }}>
                Tên Sản Phẩm
              </TableCell>
              <TableCell sx={{ width: "15%", fontWeight: 700 }}>
                Danh Mục
              </TableCell>
              <TableCell sx={{ width: "15%", fontWeight: 700 }}>
                Đơn Giá
              </TableCell>
              <TableCell sx={{ width: "17%", fontWeight: 700 }}></TableCell>
              <TableCell sx={{ width: "10%", fontWeight: 700 }} align="center">
                Xóa
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {wishlist.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 2,
                    }}
                  >
                    <Typography variant="h1" sx={{ opacity: 0.3 }}>
                      💔
                    </Typography>
                    <Typography variant="h6" color="text.secondary">
                      Chưa có sản phẩm yêu thích nào
                    </Typography>
                    <Button
                      variant="contained"
                      color="warning"
                      onClick={() => navigate("/shop")}
                      sx={{ borderRadius: 5, textTransform: "none", mt: 1 }}
                    >
                      Khám phá sản phẩm
                    </Button>
                  </Box>
                </TableCell>
              </TableRow>
            ) : (
              wishlist.map((product) => (
                <TableRow
                  key={product.id}
                  sx={{
                    cursor: "pointer",
                    transition: "background 0.2s",
                    "&:hover": { bgcolor: "#fff8f0" },
                  }}
                  onClick={() =>
                    navigate(`/product/${product.id}`, {
                      state: { product: product.originalData || product },
                    })
                  }
                >
                  <TableCell>
                    <img
                      src={product.image}
                      alt={product.name}
                      style={{
                        width: 56,
                        height: 56,
                        objectFit: "contain",
                        borderRadius: 8,
                        border: "1px solid #eee",
                        background: "#fff",
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 600,
                        color: "#333",
                        "&:hover": { color: "#f28900" },
                      }}
                    >
                      {product.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" sx={{ color: "#888" }}>
                      {product.category || "—"}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 700, color: "#f28900" }}
                    >
                      {formatMoney(product.price)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<ShoppingCartIcon />}
                      sx={{
                        bgcolor: "#f28900",
                        borderRadius: 5,
                        textTransform: "none",
                        fontWeight: 600,
                        boxShadow: "none",
                        "&:hover": {
                          bgcolor: "#e67c00",
                          boxShadow: "0 4px 12px rgba(242,137,0,0.3)",
                        },
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        dispatch(
                          addToCart({
                            id: product.id.toString(),
                            name: product.name,
                            price: product.price,
                            image: product.image,
                          }),
                        );
                      }}
                    >
                      Thêm vào giỏ
                    </Button>
                  </TableCell>
                  <TableCell align="center">
                    <IconButton
                      color="error"
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        dispatch(removeFromWishlist(product.id));
                      }}
                      sx={{
                        "&:hover": {
                          bgcolor: "#ffebee",
                        },
                      }}
                    >
                      <DeleteOutlineIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Container>
  );
};

export default Wishlist;

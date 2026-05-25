import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import { Fab, Tooltip } from "@mui/material";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import "./ScrollToTop.css";

const SCROLL_THRESHOLD = 320;

const ScrollToTop = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > SCROLL_THRESHOLD);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  if (!visible) return null;

  return createPortal(
    <Tooltip title="Cuộn lên đầu trang" placement="left">
      <Fab
        size="medium"
        className="scroll-to-top-fab"
        onClick={scrollToTop}
        aria-label="Cuộn lên đầu trang"
        sx={{
          position: "fixed",
          bottom: 96,
          right: 24,
          left: "auto",
          zIndex: 1399,
          bgcolor: "#fff",
          color: "#FF7A00",
          border: "2px solid #FF7A00",
          boxShadow: "0 6px 20px rgba(255, 122, 0, 0.25)",
          "&:hover": {
            bgcolor: "#FF7A00",
            color: "#fff",
          },
        }}
      >
        <KeyboardArrowUpIcon />
      </Fab>
    </Tooltip>,
    document.body
  );
};

export default ScrollToTop;

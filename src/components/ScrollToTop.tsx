import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const ScrollToTop = () => {
  const { pathname, key } = useLocation();

  useEffect(() => {
    const scrollToTop = () => {
      window.scrollTo({ top: 0, left: 0 });
      document.getElementById("app-scroll-container")?.scrollTo({ top: 0, left: 0 });
    };

    scrollToTop();
    requestAnimationFrame(scrollToTop);
  }, [pathname, key]);

  return null;
};

export default ScrollToTop;

import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { useTranslation } from "react-i18next";

const logo = "/session-select/logotyp_1.svg";

export const Navbar = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const { t } = useTranslation();

  useEffect(() => {
    const handleScroll = () => {
      // Show navbar after scrolling down 100px
      setIsVisible(window.scrollY > 100);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setIsMenuOpen(false);
  };

  const scrollToBooking = () => {
    // If not on home page, navigate to home first
    if (location.pathname !== "/") {
      window.location.href = "/session-select";
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    setIsMenuOpen(false);
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-transform duration-300 ${
        isVisible ? "translate-y-0" : "-translate-y-full"
      }`}
      style={{
        backgroundColor: "rgba(0, 0, 0, 0.85)",
        backdropFilter: "blur(10px)",
      }}
    >
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" onClick={scrollToTop} className="flex items-center hover:opacity-80 transition-opacity">
          <img
            src={logo}
            alt="Ready Pixel Go Logo"
            className="h-12 w-auto"
          />
        </Link>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-8">
          <Link
            to="/"
            onClick={scrollToTop}
            className="text-white hover:text-blue-300 transition-colors font-medium"
          >
            {t("nav.home")}
          </Link>
          <button
            onClick={scrollToBooking}
            className="text-white hover:text-blue-300 transition-colors font-medium"
          >
            {t("nav.bookNow")}
          </button>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="md:hidden text-white p-2 hover:bg-white/10 rounded-lg transition-colors"
          aria-label="Toggle menu"
        >
          {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div
          className="md:hidden border-t border-white/10"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.95)" }}
        >
          <div className="px-6 py-4 flex flex-col gap-4">
            <Link
              to="/"
              onClick={scrollToTop}
              className="text-white hover:text-blue-300 transition-colors font-medium py-2"
            >
              {t("nav.home")}
            </Link>
            <button
              onClick={scrollToBooking}
              className="text-white hover:text-blue-300 transition-colors font-medium py-2 text-left"
            >
              {t("nav.bookNow")}
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};

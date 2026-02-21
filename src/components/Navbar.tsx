import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, ChevronDown, ChevronUp } from "lucide-react";
import { useTranslation } from "react-i18next";

const logo = "/logotyp_1.svg";

export const Navbar = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isVillkorOpen, setIsVillkorOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
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
    setIsVillkorOpen(false);
  };

  const handleBooking = () => {
    if (location.pathname === "/") {
      window.dispatchEvent(new CustomEvent("open-booking-modal"));
    } else {
      navigate("/?action=book");
    }
    setIsMenuOpen(false);
    setIsVillkorOpen(false);
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

        {/* Always show Hamburger Menu Button */}
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="text-white p-2 hover:bg-white/10 rounded-lg transition-colors"
          aria-label="Toggle menu"
        >
          {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Expandable Menu */}
      {isMenuOpen && (
        <div
          className="border-t border-white/10"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.95)" }}
        >
          <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col gap-4">
            <Link
              to="/"
              onClick={scrollToTop}
              className="text-white hover:text-blue-300 transition-colors font-medium py-2"
            >
              Huvudsida
            </Link>
            <button
              onClick={handleBooking}
              className="text-white hover:text-blue-300 transition-colors font-medium py-2 text-left"
            >
              Boka nu
            </button>
            
            {/* Villkor Dropdown */}
            <div className="flex flex-col">
              <button
                onClick={() => setIsVillkorOpen(!isVillkorOpen)}
                className="flex items-center justify-between text-white hover:text-blue-300 transition-colors font-medium py-2 text-left"
              >
                Villkor
                {isVillkorOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              
              {isVillkorOpen && (
                <div className="flex flex-col gap-3 pl-4 mt-2 border-l-2 border-white/20">
                  <Link
                    to="/integritetspolicy"
                    onClick={scrollToTop}
                    className="text-white/80 hover:text-blue-300 transition-colors text-sm py-1"
                  >
                    Integritetspolicy
                  </Link>
                  <Link
                    to="/anvandarvillkor"
                    onClick={scrollToTop}
                    className="text-white/80 hover:text-blue-300 transition-colors text-sm py-1"
                  >
                    Användarvillkor
                  </Link>
                  <Link
                    to="/bokningspolicy"
                    onClick={scrollToTop}
                    className="text-white/80 hover:text-blue-300 transition-colors text-sm py-1"
                  >
                    Bokning / Betalningspolicy
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

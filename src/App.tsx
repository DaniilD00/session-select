import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { lazy, Suspense, ReactNode } from "react";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import "./i18n/config";
import { LanguageSwitcher } from "./components/LanguageSwitcher";
import { Navbar } from "./components/Navbar";
import { CookieConsent } from "./components/CookieConsent";
import { LocationProvider } from "./contexts/LocationContext";
import { LocationSuggestionBanner } from "./components/LocationSuggestionBanner";

// Lazy-loaded routes (not needed on initial page load)
const BookingSuccess = lazy(() => import("./pages/BookingSuccess"));
const StayTuned = lazy(() => import("./pages/StayTuned"));
const AdminWaitlist = lazy(() => import("./pages/AdminWaitlist"));
const AdminSchedule = lazy(() => import("./pages/AdminSchedule"));
const Discount = lazy(() => import("./pages/Discount"));
const Unsubscribe = lazy(() => import("./pages/Unsubscribe"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const BookingPolicy = lazy(() => import("./pages/BookingPolicy"));
const Review = lazy(() => import("./pages/Review"));

const queryClient = new QueryClient();

const s = (node: ReactNode) => (
  <Suspense fallback={<div className="min-h-screen" />}>{node}</Suspense>
);

// Public pages shared by every location. Rendered at the root (Solna) and again
// under "/ronneby" (Ronneby). The LocationProvider derives which location is
// active from the path, so the same elements render location-specific content.
const publicRoutes: { path: string; element: ReactNode }[] = [
  { path: "/", element: <Index /> },
  { path: "/launch", element: s(<StayTuned />) },
  { path: "/discount", element: s(<Discount />) },
  { path: "/booking-success", element: s(<BookingSuccess />) },
  { path: "/unsubscribe", element: s(<Unsubscribe />) },
  { path: "/integritetspolicy", element: s(<PrivacyPolicy />) },
  { path: "/anvandarvillkor", element: s(<TermsOfService />) },
  { path: "/bokningspolicy", element: s(<BookingPolicy />) },
  { path: "/review", element: s(<Review />) },
];

const withPrefix = (prefix: string, path: string) =>
  path === "/" ? prefix : `${prefix}${path}`;

// "/solna" is an alias for the root Solna site — redirect so the root stays
// canonical for SEO instead of duplicating content.
const RedirectStripPrefix = ({ prefix }: { prefix: string }) => {
  const { pathname, search, hash } = useLocation();
  const target = pathname.slice(prefix.length) || "/";
  return <Navigate to={`${target}${search}${hash}`} replace />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <CookieConsent />
      <LanguageSwitcher />
      <BrowserRouter>
        <LocationProvider>
          <Navbar />
          <LocationSuggestionBanner />
          <Routes>
            {/* Solna (root) */}
            {publicRoutes.map((r) => (
              <Route key={`solna${r.path}`} path={r.path} element={r.element} />
            ))}

            {/* Ronneby */}
            {publicRoutes.map((r) => (
              <Route
                key={`ronneby${r.path}`}
                path={withPrefix("/ronneby", r.path)}
                element={r.element}
              />
            ))}

            {/* "/solna" alias -> root */}
            <Route path="/solna" element={<Navigate to="/" replace />} />
            <Route path="/solna/*" element={<RedirectStripPrefix prefix="/solna" />} />

            {/* Admin (location passed explicitly per route) */}
            <Route path="/admin" element={s(<AdminWaitlist locationId="solna" />)} />
            <Route path="/admin-ronneby" element={s(<AdminWaitlist locationId="ronneby" />)} />
            <Route path="/admin101" element={s(<AdminSchedule locationId="solna" />)} />
            <Route path="/admin102" element={s(<AdminSchedule locationId="ronneby" />)} />

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </LocationProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

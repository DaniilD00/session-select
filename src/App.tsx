import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import "./i18n/config";
import { LanguageSwitcher } from "./components/LanguageSwitcher";
import { Navbar } from "./components/Navbar";
import { CookieConsent } from "./components/CookieConsent";

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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <CookieConsent />
      <LanguageSwitcher />
      <BrowserRouter>
        <Navbar />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/launch" element={<Suspense fallback={<div className="min-h-screen" />}><StayTuned /></Suspense>} />
          <Route path="/discount" element={<Suspense fallback={<div className="min-h-screen" />}><Discount /></Suspense>} />
          <Route path="/admin" element={<Suspense fallback={<div className="min-h-screen" />}><AdminWaitlist /></Suspense>} />
          <Route path="/admin101" element={<Suspense fallback={<div className="min-h-screen" />}><AdminSchedule /></Suspense>} />
          <Route path="/booking-success" element={<Suspense fallback={<div className="min-h-screen" />}><BookingSuccess /></Suspense>} />
          <Route path="/unsubscribe" element={<Suspense fallback={<div className="min-h-screen" />}><Unsubscribe /></Suspense>} />
          <Route path="/integritetspolicy" element={<Suspense fallback={<div className="min-h-screen" />}><PrivacyPolicy /></Suspense>} />
          <Route path="/anvandarvillkor" element={<Suspense fallback={<div className="min-h-screen" />}><TermsOfService /></Suspense>} />
          <Route path="/bokningspolicy" element={<Suspense fallback={<div className="min-h-screen" />}><BookingPolicy /></Suspense>} />
          <Route path="/review" element={<Suspense fallback={<div className="min-h-screen" />}><Review /></Suspense>} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

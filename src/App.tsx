import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import BookingSuccess from "./pages/BookingSuccess";
import StayTuned from "./pages/StayTuned";
import AdminWaitlist from "./pages/AdminWaitlist";
import AdminSchedule from "./pages/AdminSchedule";
import Discount from "./pages/Discount";
import Unsubscribe from "./pages/Unsubscribe";
import "./i18n/config";
import { LanguageSwitcher } from "./components/LanguageSwitcher";
import { Navbar } from "./components/Navbar";
import { CookieConsent } from "./components/CookieConsent";

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
          <Route path="/launch" element={<StayTuned />} />
          <Route path="/discount" element={<Discount />} />
          <Route path="/admin" element={<AdminWaitlist />} />
          <Route path="/admin101" element={<AdminSchedule />} />
          <Route path="/booking-success" element={<BookingSuccess />} />
          <Route path="/unsubscribe" element={<Unsubscribe />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

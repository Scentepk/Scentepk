import React, { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import AnnouncementBar from "../components/AnnouncementBar";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import ScrollToTop from "../components/ScrollToTop";

export default function MainLayout() {
  const location = useLocation();

  // Scroll to top upon page navigation
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="flex flex-col min-h-screen bg-[#0D0D0C] text-[#F2EEE7] selection:bg-[#BFA27A] selection:text-[#0D0D0C]">
      <AnnouncementBar />
      <Navbar />
      <main className="flex-grow">
        <Outlet />
      </main>
      <Footer />
      <ScrollToTop />
    </div>
  );
}

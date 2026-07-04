// Theme support v2
import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { RoleOverrideProvider } from "@/hooks/useRoleOverride";
import { PendingSpendProvider } from "@/contexts/PendingSpendContext";
import { MaintenanceProvider } from "@/contexts/MaintenanceContext";
import { useEquippedTheme } from "@/hooks/useEquippedTheme";
import CheerCelebration from "@/components/CheerCelebration";
import PointsPopAnimation from "@/components/PointsPopAnimation";
import AuthLayout from "@/components/AuthLayout";
import ScrollToTop from "@/components/ScrollToTop";
import MaintenanceGate from "@/components/MaintenanceGate";
import ErrorBoundary from "@/components/ErrorBoundary";

const ThemeApplier = () => {
  const { user } = useAuth();
  useEquippedTheme(user?.id);
  return null;
};

const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const Admin = lazy(() => import("./pages/Admin"));
const Community = lazy(() => import("./pages/Community"));
const MemberProfile = lazy(() => import("./pages/MemberProfile"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Inbox = lazy(() => import("./pages/Inbox"));
const Shop = lazy(() => import("./pages/Shop"));
const Journal = lazy(() => import("./pages/Journal"));
const Activity = lazy(() => import("./pages/Activity"));
const Construction = lazy(() => import("./pages/Construction"));
const Clubs = lazy(() => import("./pages/Clubs"));
const ClubManage = lazy(() => import("./pages/ClubManage"));
const OAuthConsent = lazy(() => import("./pages/OAuthConsent"));
import HomeRedirect from "@/components/HomeRedirect";
import ClubGate from "@/components/ClubGate";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      gcTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <RoleOverrideProvider>
        <PendingSpendProvider>
        <Toaster />
        <Sonner />
        <ThemeApplier />
        <MaintenanceProvider>
        <BrowserRouter>
          <ScrollToTop />
          <CheerCelebration />
          <PointsPopAnimation />
          <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-background cozy-bg-pattern"><div className="book"><div/><div/><div/><div/><div/></div></div>}>
            <ErrorBoundary>
            <Routes>
              <Route element={<MaintenanceGate />}>
                <Route path="/.lovable/oauth/consent" element={<OAuthConsent />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/construction" element={<Construction />} />
                <Route element={<AuthLayout />}>
                  <Route path="/" element={<HomeRedirect />} />
                  <Route path="/index" element={<HomeRedirect />} />
                  <Route path="/dashboard" element={<HomeRedirect />} />
                  <Route path="/clubs" element={<Clubs />} />
                  <Route path="/c/:clubId" element={<ClubGate />}>
                    <Route index element={<Index />} />
                    <Route path="lounge" element={<Community />} />
                    <Route path="inbox" element={<Inbox />} />
                    <Route path="shop" element={<Shop />} />
                    <Route path="journal" element={<Journal />} />
                    <Route path="activity" element={<Activity />} />
                    <Route path="member/:userId" element={<MemberProfile />} />
                    <Route path="admin" element={<Admin />} />
                    <Route path="manage" element={<ClubManage />} />
                  </Route>
                </Route>
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
            </ErrorBoundary>
          </Suspense>
        </BrowserRouter>
        </MaintenanceProvider>
        </PendingSpendProvider>
        </RoleOverrideProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
  </ThemeProvider>
);

export default App;

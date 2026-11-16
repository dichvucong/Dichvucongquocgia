import { type ReactNode, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import Home from '@/pages/home';
import TimDuLieu from '@/pages/tim-du-lieu';
import TraCuuDuLieu from '@/pages/tra-cuu-du-lieu';
import AnSinhXaHoi from '@/pages/an-sinh-xa-hoi';
import { ROUTES } from '@/lib/routes';
import {
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';

const queryClient = new QueryClient();

function Router() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        <Route path={ROUTES.home} component={Home} />
        <Route path={ROUTES.dataCategories} component={TimDuLieu} />
        <Route path={ROUTES.dataLookup} component={TraCuuDuLieu} />
        <Route path={ROUTES.socialSecurityLookup} component={AnSinhXaHoi} />
        <Route path="/admin" component={AdminRedirect} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function AdminRedirect() {
  useEffect(() => {
    window.location.replace('/admin/');
  }, []);
  return <p className="p-6 text-center text-sm text-[#5e5450]">Đang chuyển đến trang quản trị riêng…</p>;
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function PublicProviders() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Router />
        <Toaster />
        <Analytics />
        <SpeedInsights />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

function App() {
  return (
    <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
      <PublicProviders />
    </WouterRouter>
  );
}

export default App;

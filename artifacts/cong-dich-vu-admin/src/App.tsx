import { type ReactNode, useEffect, useRef } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { ClerkProvider, Show, useClerk } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { Analytics } from '@vercel/analytics/react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import AdminLandingPage from '@/pages/admin/admin-landing';
import AdminImagesPage from '@/pages/admin/admin-images';
import AdminProfilesPage from '@/pages/admin/admin-profiles';
import { SignInPage, SignUpPage } from '@/pages/admin/auth-pages';
import NotFound from '@/pages/not-found';
import { Route, Switch, Redirect, useLocation, Router as WouterRouter } from 'wouter';
import { basePath, clerkAppearance, clerkLocalization, stripBase } from '@/lib/clerk';

const queryClient = new QueryClient();
const clerkPubKey = publishableKeyFromHost(window.location.hostname, import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

function ClerkQueryCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const previousUserId = useRef<string | null | undefined>(undefined);
  useEffect(() => addListener(({ user }) => {
    const userId = user?.id ?? null;
    if (previousUserId.current !== undefined && previousUserId.current !== userId) qc.clear();
    previousUserId.current = userId;
  }), [addListener, qc]);
  return null;
}

function LandingRoute() {
  return (
    <>
      <Show when="signed-in"><Redirect to="/images" /></Show>
      <Show when="signed-out"><AdminLandingPage /></Show>
    </>
  );
}

function ImagesRoute() {
  return (
    <>
      <Show when="signed-in"><AdminImagesPage /></Show>
      <Show when="signed-out"><Redirect to="/" /></Show>
    </>
  );
}

function ProfilesRoute() {
  return (
    <>
      <Show when="signed-in"><AdminProfilesPage /></Show>
      <Show when="signed-out"><Redirect to="/" /></Show>
    </>
  );
}

function ClerkRoutes() {
  const [, setLocation] = useLocation();
  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      localization={clerkLocalization}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <ClerkQueryCacheInvalidator />
      <Router />
    </ClerkProvider>
  );
}

function Router() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={LandingRoute} />
        <Route path="/images" component={ImagesRoute} />
        <Route path="/profiles" component={ProfilesRoute} />
        <Route path="/sign-in/*?" component={SignInPage} />
        <Route path="/sign-up/*?" component={SignUpPage} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={basePath}>
          <ClerkRoutes />
        </WouterRouter>
        <Toaster />
        <Analytics />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

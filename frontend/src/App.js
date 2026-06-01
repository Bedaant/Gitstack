import React, { useEffect, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate, useParams, useLocation } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { ThemeProvider } from "next-themes";
import { ClerkProvider } from "@clerk/clerk-react";
import { Toaster } from "./components/ui/sonner";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { RequireAuth } from "./components/RequireAuth";
import { ErrorBoundary } from "react-error-boundary";
import { AlertTriangle } from "lucide-react";
import { NewsletterPopup } from "./components/ui/NewsletterPopup";
import { trackPageView } from "./utils/analytics";

const CLERK_KEY = process.env.REACT_APP_CLERK_PUBLISHABLE_KEY;

// Eager-loaded: critical path pages
import HomePage from "./pages/HomePage";
import NotFound from "./pages/NotFound";

// Lazy-loaded: all other pages (reduces initial bundle size)
const DeadToolDetector = React.lazy(() => import("./pages/DeadToolDetector"));
const StackGenerator = React.lazy(() => import("./pages/StackGenerator"));
const RoastMyStack = React.lazy(() => import("./pages/RoastMyStack"));
const RepoTranslator = React.lazy(() => import("./pages/RepoTranslator"));
const IdeaExists = React.lazy(() => import("./pages/IdeaExists"));
const FounderStacks = React.lazy(() => import("./pages/FounderStacks"));
const ErrorExplainer = React.lazy(() => import("./pages/ErrorExplainer"));
const ToolsPage = React.lazy(() => import("./pages/ToolsPage"));
const ToolDetailPage = React.lazy(() => import("./pages/ToolDetailPage"));
const GitHubRepoPage = React.lazy(() => import("./pages/GitHubRepoPage"));
const CollectionsPage = React.lazy(() => import("./pages/CollectionsPage"));
const CollectionDetailPage = React.lazy(() => import("./pages/CollectionDetailPage"));
const TopicToolsPage = React.lazy(() => import("./pages/TopicToolsPage"));
const Dashboard = React.lazy(() => import("./pages/Dashboard"));
const RepoOfTheDayPage = React.lazy(() => import("./pages/RepoOfTheDayPage"));
const ComparisonPage = React.lazy(() => import("./pages/ComparisonPage"));
const PublicStackPage = React.lazy(() => import("./pages/PublicStackPage"));
const UserProfilePage = React.lazy(() => import("./pages/UserProfilePage"));
const UnsubscribePage = React.lazy(() => import("./pages/UnsubscribePage"));
const PreferencesPage = React.lazy(() => import("./pages/PreferencesPage"));
const MarketplacePage = React.lazy(() => import("./pages/MarketplacePage"));
const MarketplaceProductPage = React.lazy(() => import("./pages/MarketplaceProductPage"));
const SellPage = React.lazy(() => import("./pages/SellPage"));
const AlternativesPage = React.lazy(() => import("./pages/AlternativesPage"));
const EmbedRepoPage = React.lazy(() => import("./pages/EmbedRepoPage"));
const RepoXrayPage = React.lazy(() => import("./pages/RepoXrayPage"));
const ReadmeBadgePage = React.lazy(() => import("./pages/ReadmeBadgePage"));
import { TermsPage, PrivacyPage, AboutPage } from "./pages/LegalPage";
const BlogListPage = React.lazy(() => import("./pages/BlogListPage"));
const BlogPostPage = React.lazy(() => import("./pages/BlogPostPage"));
const FaqPage = React.lazy(() => import("./pages/FaqPage"));
const SolutionFinder = React.lazy(() => import("./pages/SolutionFinder"));
const SolutionsIndexPage = React.lazy(() => import("./pages/SolutionsIndexPage"));
const SolutionsCategoryPage = React.lazy(() => import("./pages/SolutionsCategoryPage"));

const MeRedirect = () => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/" replace />;
  return <Navigate to={`/u/${user.user_id}`} replace />;
};

const RepoRedirect = () => {
  const { owner, repo } = useParams();
  return <Navigate to={`/r/${owner}/${repo}`} replace />;
};

const RepoShortlink = () => {
  const { owner, repo } = useParams();
  // Validate GitHub username/repo format to avoid catching unrelated two-segment paths
  const isValid = /^[\w.-]+$/.test(owner) && /^[\w.-]+$/.test(repo);
  if (!isValid) return <NotFound />;
  return <Navigate to={`/r/${owner}/${repo}`} replace />;
};

const ErrorFallback = ({ error, resetErrorBoundary }) => {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="neo-card p-8 max-w-md w-full text-center">
        <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-red-500" />
        <h1 className="text-2xl font-black uppercase mb-2">Something went wrong</h1>
        <p className="text-sm text-muted-foreground mb-4">{error.message}</p>
        <button
          onClick={resetErrorBoundary}
          className="neo-btn neo-btn-primary px-6 py-2 font-black text-sm"
        >
          Try Again
        </button>
      </div>
    </div>
  );
};

const RouteTracker = () => {
  const location = useLocation();
  useEffect(() => {
    trackPageView(location.pathname + location.search);
  }, [location]);
  return null;
};

const AppRouter = () => {
  return (
    <>
      <RouteTracker />
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-pulse text-muted-foreground font-mono text-sm">Loading...</div></div>}>
      <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/dead-tool-detector" element={<DeadToolDetector />} />
      <Route path="/stack-generator" element={<StackGenerator />} />
      <Route path="/roast-my-stack" element={<RoastMyStack />} />
      <Route path="/repo-translator" element={<RepoTranslator />} />
      <Route path="/idea-exists" element={<IdeaExists />} />
      <Route path="/founder-stacks" element={<FounderStacks />} />
      <Route path="/error-explainer" element={<ErrorExplainer />} />
      <Route path="/tools" element={<ToolsPage />} />
      <Route path="/tools/:toolId" element={<ToolDetailPage />} />
      <Route path="/r/:owner/:repo" element={<GitHubRepoPage />} />
      <Route path="/repo/:owner/:repo" element={<RepoRedirect />} />
      <Route path="/repo-of-the-day" element={<RepoOfTheDayPage />} />
      <Route path="/compare" element={<ComparisonPage />} />
      <Route path="/collections" element={<CollectionsPage />} />
      <Route path="/collections/:collectionId" element={<CollectionDetailPage />} />
      <Route path="/topics/:topicId" element={<TopicToolsPage />} />
      <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
      <Route path="/u/me" element={<MeRedirect />} />
      <Route path="/marketplace" element={<MarketplacePage />} />
      <Route path="/marketplace/sell" element={<Navigate to="/sell" replace />} />
      <Route path="/marketplace/:productId" element={<MarketplaceProductPage />} />
      <Route path="/sell" element={<RequireAuth><SellPage /></RequireAuth>} />
      <Route path="/alternatives/:tool" element={<AlternativesPage />} />
      <Route path="/embed/r/:owner/:repo" element={<EmbedRepoPage />} />
      <Route path="/repo-xray" element={<RepoXrayPage />} />
      <Route path="/readme-badge" element={<ReadmeBadgePage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/blog" element={<BlogListPage />} />
      <Route path="/blog/:slug" element={<BlogPostPage />} />
      <Route path="/faq" element={<FaqPage />} />
      <Route path="/solution-finder" element={<SolutionFinder />} />
      <Route path="/solutions" element={<SolutionsIndexPage />} />
      <Route path="/solutions/:category" element={<SolutionsCategoryPage />} />
      <Route path="/u/:userId" element={<UserProfilePage />} />
      <Route path="/s/:slug" element={<PublicStackPage />} />
      {/* gitstack.pro/:owner/:repo shortlink — must be last before the 404 catch-all */}
      <Route path="/:owner/:repo" element={<RepoShortlink />} />
      <Route path="/unsubscribe" element={<UnsubscribePage />} />
      <Route path="/preferences" element={<PreferencesPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
    </Suspense>
    </>
  );
};

function App() {
  // Warm up the backend on first load (prevents Render cold-start delays)
  useEffect(() => {
    fetch(`${process.env.REACT_APP_BACKEND_URL}/api/health`).catch(() => {});
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <HelmetProvider>
        <ClerkProvider publishableKey={CLERK_KEY}>
          <BrowserRouter>
            <AuthProvider>
              <ErrorBoundary FallbackComponent={ErrorFallback}>
                <AppRouter />
                <NewsletterPopup />
              </ErrorBoundary>
              <Toaster position="bottom-right" />
            </AuthProvider>
          </BrowserRouter>
        </ClerkProvider>
      </HelmetProvider>
    </ThemeProvider>
  );
}

export default App;


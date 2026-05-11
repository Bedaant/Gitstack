import React, { useEffect } from "react";
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

// Pages
import HomePage from "./pages/HomePage";
import DeadToolDetector from "./pages/DeadToolDetector";
import StackGenerator from "./pages/StackGenerator";
import RoastMyStack from "./pages/RoastMyStack";
import RepoTranslator from "./pages/RepoTranslator";
import IdeaExists from "./pages/IdeaExists";
import FounderStacks from "./pages/FounderStacks";
import ErrorExplainer from "./pages/ErrorExplainer";
import ToolsPage from "./pages/ToolsPage";
import ToolDetailPage from "./pages/ToolDetailPage";
import GitHubRepoPage from "./pages/GitHubRepoPage";
import CollectionsPage from "./pages/CollectionsPage";
import CollectionDetailPage from "./pages/CollectionDetailPage";
import TopicToolsPage from "./pages/TopicToolsPage";
import Dashboard from "./pages/Dashboard";
import RepoOfTheDayPage from "./pages/RepoOfTheDayPage";
import ComparisonPage from "./pages/ComparisonPage";
import PublicStackPage from "./pages/PublicStackPage";
import NotFound from "./pages/NotFound";
import UserProfilePage from "./pages/UserProfilePage";
import UnsubscribePage from "./pages/UnsubscribePage";
import PreferencesPage from "./pages/PreferencesPage";
import MarketplacePage from "./pages/MarketplacePage";
import MarketplaceProductPage from "./pages/MarketplaceProductPage";
import SellPage from "./pages/SellPage";
import AlternativesPage from "./pages/AlternativesPage";
import EmbedRepoPage from "./pages/EmbedRepoPage";
import RepoXrayPage from "./pages/RepoXrayPage";
import ReadmeBadgePage from "./pages/ReadmeBadgePage";
import { TermsPage, PrivacyPage, AboutPage } from "./pages/LegalPage";
import BlogListPage from "./pages/BlogListPage";
import BlogPostPage from "./pages/BlogPostPage";
import FaqPage from "./pages/FaqPage";

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
      <Route path="/u/:userId" element={<UserProfilePage />} />
      <Route path="/s/:slug" element={<PublicStackPage />} />
      {/* gitstack.pro/:owner/:repo shortlink — must be last before the 404 catch-all */}
      <Route path="/:owner/:repo" element={<RepoShortlink />} />
      <Route path="/unsubscribe" element={<UnsubscribePage />} />
      <Route path="/preferences" element={<PreferencesPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
    </>
  );
};

function App() {
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


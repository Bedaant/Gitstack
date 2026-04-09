import React from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Toaster } from "./components/ui/sonner";
import { AuthProvider } from "./context/AuthContext";
import { AuthCallback } from "./components/AuthCallback";

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
import TopicToolsPage from "./pages/TopicToolsPage";
import Dashboard from "./pages/Dashboard";

const AppRouter = () => {
  const location = useLocation();
  
  if (location.hash?.includes('session_id=')) {
    return <AuthCallback />;
  }

  return (
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
      <Route path="/repo/:owner/:repo" element={<GitHubRepoPage />} />
      <Route path="/collections" element={<CollectionsPage />} />
      <Route path="/collections/:collectionId" element={<CollectionsPage />} />
      <Route path="/topics/:topicId" element={<TopicToolsPage />} />
      <Route path="/dashboard" element={<Dashboard />} />
    </Routes>
  );
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRouter />
        <Toaster position="bottom-right" />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

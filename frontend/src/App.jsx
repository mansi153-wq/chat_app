import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { SocketProvider } from "./context/SocketContext";
import AuthPage from "./pages/AuthPage";
import ChatPage from "./pages/ChatPage";
import LandingPage from "./pages/LandingPage";

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#09090e" }}>
      <span className="loader" />
    </div>
  );
  return user ? children : <Navigate to="/auth" replace />;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  // If logged in, skip landing/auth and go straight to chat
  return !user ? children : <Navigate to="/chat" replace />;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Landing page — shown to non-logged-in users */}
          <Route path="/" element={<PublicRoute><LandingPage /></PublicRoute>} />

          {/* Auth page */}
          <Route path="/auth" element={<PublicRoute><AuthPage /></PublicRoute>} />

          {/* Chat app — protected */}
          <Route path="/chat/*" element={
            <PrivateRoute>
              <SocketProvider>
                <ChatPage />
              </SocketProvider>
            </PrivateRoute>
          } />

          {/* Fallback — logged in users go to chat, others to landing */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

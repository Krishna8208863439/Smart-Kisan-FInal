import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { AuthProvider } from "./context/AuthContext";
import { GoogleOAuthProvider } from "@react-oauth/google";
import ErrorBoundary from "./components/ErrorBoundary";

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

if (!clientId || clientId === "YOUR_GOOGLE_OAUTH_WEB_CLIENT_ID") {
  console.error(
    "VITE_GOOGLE_CLIENT_ID is not set correctly. Please edit frontend/.env " +
      "and put your actual Google OAuth Web Client ID."
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <GoogleOAuthProvider clientId={clientId || ""}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </GoogleOAuthProvider>
    </ErrorBoundary>
  </React.StrictMode>
);

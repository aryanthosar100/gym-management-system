// src/routes/ProtectedRoute.js
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    // send them to login and remember where they were going
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return children;
}

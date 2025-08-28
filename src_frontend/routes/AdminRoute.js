// src/routes/AdminRoute.js
import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function AdminRoute({ children }) {
  const { role } = useAuth();
  if (role !== "admin") return <Navigate to="/" replace />;
  return children;
}

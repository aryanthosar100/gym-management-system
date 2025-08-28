// src/routes/MemberRoute.js
import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function MemberRoute({ children }) {
  const { role } = useAuth();
  if (role !== "member") return <Navigate to="/" replace />;
  return children;
}

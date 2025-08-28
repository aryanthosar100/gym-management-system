import React from "react";
import { Routes, Route } from "react-router-dom";

import Home from "./screens/Home";
import Login from "./screens/Login";
import Signup from "./screens/Signup";
import AdminDashboard from "./screens/AdminDashboard";
import MemberDashboard from "./screens/MemberDashboard";
import AddMember from "./screens/AddMember";
import AdminAddMember from "./screens/AdminAddMember";
import ProtectedRoute from "./routes/ProtectedRoute";
import AdminRoute from "./routes/AdminRoute";
import MemberRoute from "./routes/MemberRoute";
import Members from "./screens/Members";
import ActiveMembers from "./screens/ActiveMembers";
import Payments from "./screens/Payments"; 
import AddPayment from "./screens/AddPayment";

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/members" element={<Members />} />
      <Route path="/admin/add-member" element={<AdminAddMember />} />
      <Route path="/admin/active" element={<ActiveMembers />} />
      <Route path="/admin/payments" element={<Payments />} />
      <Route path="/admin/add-payment" element={<AddPayment />} />
      {/* Admin */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/add-member"
        element={
          <ProtectedRoute>
            <AdminRoute>
              <AddMember />
            </AdminRoute>
          </ProtectedRoute>
        }
      />

      {/* Member */}
      <Route
        path="/member"
        element={
          <ProtectedRoute>
            <MemberRoute>
              <MemberDashboard />
            </MemberRoute>
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<h1>404 - Page Not Found</h1>} />
    </Routes>
  );
}

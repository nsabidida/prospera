import { Navigate, Route, Routes } from "react-router-dom";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import Organization from "./pages/Organization";
import Leaderboard from "./pages/Leaderboard";
import RedeemCode from "./pages/RedeemCode";
import Profile from "./pages/Profile";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminCodes from "./pages/admin/AdminCodes";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminContent from "./pages/admin/AdminContent";
import Layout from "./components/Layout";
import { RequireAuth, RequireAdmin } from "./components/RouteGuards";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      <Route
        path="/app"
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="organization" element={<Organization />} />
        <Route path="leaderboard" element={<Leaderboard />} />
        <Route path="redeem" element={<RedeemCode />} />
        <Route path="profile" element={<Profile />} />
      </Route>

      <Route
        path="/hq"
        element={
          <RequireAdmin>
            <Layout admin />
          </RequireAdmin>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="codes" element={<AdminCodes />} />
        <Route path="settings" element={<AdminSettings />} />
        <Route path="content" element={<AdminContent />} />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

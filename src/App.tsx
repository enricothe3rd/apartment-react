import { BrowserRouter as Router, Routes, Route } from "react-router";
import SignIn from "./pages/AuthPages/SignIn";
import SignUp from "./pages/AuthPages/SignUp";
import NotFound from "./pages/OtherPage/NotFound";
import AppLayout from "./layout/AppLayout";
import { ScrollToTop } from "./components/common/ScrollToTop";
import ProtectedRoute from "./routes/ProtectedRoute";
import Dashboard from "./pages/property-management/Dashboard";
import Expenses from "./pages/property-management/Expenses";
import Leases from "./pages/property-management/Leases";
import Maintenance from "./pages/property-management/Maintenance";
import Notifications from "./pages/property-management/Notifications";
import Payments from "./pages/property-management/Payments";
import Properties from "./pages/property-management/Properties";
import Reports from "./pages/property-management/Reports";
import Settings from "./pages/property-management/Settings";
import Tenants from "./pages/property-management/Tenants";

export default function App() {
  return (
    <>
      <Router>
        <ScrollToTop />
        <Routes>
          {/* Dashboard Layout */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route index path="/" element={<Dashboard />} />
              <Route path="/properties" element={<Properties />} />
              <Route path="/properties/:propertyId" element={<Properties />} />
              <Route path="/tenants" element={<Tenants />} />
              <Route path="/tenants/:tenantId" element={<Tenants />} />
              <Route path="/leases" element={<Leases />} />
              <Route path="/leases/new" element={<Leases />} />
              <Route path="/payments" element={<Payments />} />
              <Route path="/payments/:paymentId" element={<Payments />} />
              <Route path="/maintenance" element={<Maintenance />} />
              <Route path="/expenses" element={<Expenses />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
          </Route>

          {/* Auth Layout */}
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />

          {/* Fallback Route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </>
  );
}

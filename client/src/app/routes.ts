import { createBrowserRouter, redirect } from "react-router";
import AppLayout from "./components/Layout";
import Login from "./pages/Login";
import LandingPage from "./pages/LandingPage";
import Dashboard from "./pages/Dashboard";
import Account from "./pages/Account";
import Configure from "./pages/Configure";
import { getDashboardMe } from "@/api/auth";

const protectedLoader = async () => {
  const me = await getDashboardMe();
  if (!me) {
    return redirect("/login");
  }
  return null;
};

const publicLoader = async () => {
  const me = await getDashboardMe();
  if (me) {
    return redirect("/dashboard");
  }
  return null;
};

export const router = createBrowserRouter([
  {
    path: "/",
    Component: LandingPage,
  },
  {
    path: "/login",
    Component: Login,
    loader: publicLoader,
  },
  {
    path: "/dashboard",
    Component: AppLayout,
    loader: protectedLoader,
    children: [
      {
        index: true,
        Component: Dashboard,
      },
      {
        path: "account",
        Component: Account,
      },
      {
        path: "configure",
        Component: Configure,
      },
    ],
  },
]);

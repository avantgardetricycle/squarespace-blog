import { createBrowserRouter, redirect } from "react-router";
import AppLayout from "./components/Layout";
import Login from "./pages/Login";
import LandingPage from "./pages/LandingPage";
import Dashboard from "./pages/Dashboard";
import Account from "./pages/Account";
import Configure from "./pages/Configure";
import Comments from "./pages/Comments";
import Checkout from "./pages/Checkout";
import CheckoutSuccess from "./pages/CheckoutSuccess";
import Analytics from "./pages/Analytics";
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
    path: "/checkout",
    Component: Checkout,
  },
  {
    path: "/checkout/success",
    Component: CheckoutSuccess,
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
      {
        path: "comments",
        Component: Comments,
      },
      {
        path: "analytics",
        Component: Analytics,
      },
    ],
  },
]);

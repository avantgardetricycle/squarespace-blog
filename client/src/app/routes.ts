import { createBrowserRouter, redirect, type LoaderFunctionArgs } from "react-router";
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
import SupportPortal from "./pages/SupportPortal";
import { getDashboardMe } from "@/api/auth";

const protectedLoader = async ({ request }: LoaderFunctionArgs) => {
  const me = await getDashboardMe();
  if (!me) {
    const u = new URL(request.url);
    return redirect("/login?returnTo=" + encodeURIComponent(u.pathname + u.search));
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
    path: "/support",
    Component: SupportPortal,
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

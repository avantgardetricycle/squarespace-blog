import { RouterProvider } from "react-router";
import { router } from "./routes";
import { Toaster } from "@/app/components/ui/sonner";
import { CookieConsent } from "@/app/components/CookieConsent";

export default function App() {
  return (
    <>
      <RouterProvider router={router} />
      <Toaster />
      <CookieConsent />
    </>
  );
}

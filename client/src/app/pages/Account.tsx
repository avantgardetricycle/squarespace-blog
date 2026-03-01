import { useState, useEffect } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/app/components/ui/alert-dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { CreditCard } from "lucide-react";
import { toast } from "sonner";
import { getDashboardMe, updateProfile, cancelSubscription, createPortalSession, type DashboardMe } from "@/api/auth";

export default function Account() {
  const [me, setMe] = useState<DashboardMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalLoadingButton, setPortalLoadingButton] = useState<"changePlan" | "updatePayment" | null>(null);

  useEffect(() => {
    getDashboardMe().then((data) => {
      setMe(data ?? null);
      if (data?.user) {
        setName(data.user.name ?? "");
      }
      setLoading(false);
    });
  }, []);

  const handleCancelSubscription = async () => {
    setCanceling(true);
    try {
      const result = await cancelSubscription();
      if (result.success) {
        setMe((prev) =>
          prev?.subscription
            ? {
                ...prev,
                subscription: { ...prev.subscription, cancelAtPeriodEnd: true },
              }
            : prev
        );
        setShowCancelModal(false);
        toast.success("Your subscription will cancel at the end of your billing period.");
      } else {
        toast.error(result.error ?? "Failed to cancel subscription");
      }
    } finally {
      setCanceling(false);
    }
  };

  const handleOpenPortal = (button: "changePlan" | "updatePayment") => async () => {
    setPortalLoading(true);
    setPortalLoadingButton(button);
    try {
      const { url, error } = await createPortalSession();
      if (url) {
        window.location.href = url;
      } else {
        toast.error(error ?? "Failed to open billing portal");
        setPortalLoading(false);
        setPortalLoadingButton(null);
      }
    } catch {
      setPortalLoading(false);
      setPortalLoadingButton(null);
    }
  };

  const handleSaveProfile = async () => {
    if (!me) return;
    setSaving(true);
    try {
      const updated = await updateProfile({ name: name.trim() || null });
      if (updated) {
        setMe((prev) =>
          prev ? { ...prev, user: { ...prev.user, name: updated.name } } : null
        );
        toast.success("Profile updated!");
      } else {
        toast.error("Failed to update profile");
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-pulse text-[#6b6b6b]">Loading...</div>
      </div>
    );
  }

  if (!me) {
    return null;
  }

  const planKey = me.subscription?.plan ?? "pro";
  const planDisplay = planKey.charAt(0).toUpperCase() + planKey.slice(1);
  const cadence = me.subscription?.cadence ?? "monthly";
  const cadenceDisplay = cadence.charAt(0).toUpperCase() + cadence.slice(1);
  const priceDisplay = me.subscription?.priceDisplay ?? "—";
  const statusDisplay = me.subscription?.status
    ? me.subscription.status.charAt(0).toUpperCase() + me.subscription.status.slice(1)
    : "—";
  const currentPeriodEnd = me.subscription?.currentPeriodEnd
    ? new Date(me.subscription.currentPeriodEnd).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "—";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-heading font-bold tracking-tight text-[#0a0a0a]">
          Account Settings
        </h1>
        <p className="text-[#6b6b6b]">
          Manage your account details and subscription plan.
        </p>
      </div>

      <div className="space-y-6">
        {/* Profile Card */}
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>
              Update your contact information.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Update your name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" value={me.user.email} disabled />
              <p className="text-[0.8rem] text-[#6b6b6b]">
                Your email address is managed via your Squarespace account.
              </p>
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={handleSaveProfile} disabled={saving || portalLoading}>
              {saving ? "Saving…" : "Save Changes"}
            </Button>
          </CardFooter>
        </Card>

        {/* Subscription Card */}
        <Card>
          <CardHeader>
            <CardTitle>Current Plan</CardTitle>
            <CardDescription>
              You are currently subscribed to the {planDisplay} plan.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="flex items-center space-x-4 rounded-md border p-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[#5B4FE8]/10">
                <CreditCard className="w-5 h-5 text-[#5B4FE8]" />
              </div>
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium leading-none">
                  {planDisplay} Plan
                </p>
                <p className="text-xs text-[#6b6b6b]">
                  {cadenceDisplay} • {priceDisplay} • {statusDisplay}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenPortal("changePlan")}
                disabled={portalLoading || !me.subscription}
              >
                {portalLoadingButton === "changePlan" ? "Opening…" : "Change Plan"}
              </Button>
            </div>
            <div className="text-sm text-[#6b6b6b]">
              {me.subscription?.cancelAtPeriodEnd ? (
                <>
                  Your subscription will end on{" "}
                  <span className="font-medium text-[#0a0a0a]">{currentPeriodEnd}</span>.
                  You'll keep access until then.
                </>
              ) : (
                <>
                  Your next billing date is{" "}
                  <span className="font-medium text-[#0a0a0a]">{currentPeriodEnd}</span>.
                </>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex justify-between border-t pt-6">
            {me.subscription?.cancelAtPeriodEnd ? (
              <p className="text-sm text-amber-600">Cancellation scheduled for end of period</p>
            ) : (
              <>
                <Button
                  variant="ghost"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => setShowCancelModal(true)}
                  disabled={canceling || portalLoading}
                >
                  Cancel Subscription
                </Button>
                <AlertDialog open={showCancelModal} onOpenChange={setShowCancelModal}>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Cancel subscription?</AlertDialogTitle>
                      <AlertDialogDescription>
                        You'll keep access until the end of your billing period. Your subscription
                        will not renew after that date.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={canceling}>Keep subscription</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={(e) => {
                          e.preventDefault();
                          handleCancelSubscription();
                        }}
                        disabled={canceling}
                        className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                      >
                        {canceling ? "Canceling…" : "Yes, cancel"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
            <Button
              variant="outline"
              onClick={handleOpenPortal("updatePayment")}
              disabled={portalLoading || !me.subscription}
            >
              {portalLoadingButton === "updatePayment" ? "Opening…" : "Update Payment Method"}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
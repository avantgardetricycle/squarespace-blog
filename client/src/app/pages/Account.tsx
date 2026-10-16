import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router";
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
import { getDashboardMe, updateProfile, cancelSubscription, resumeSubscription, createPortalSession, deleteAccount, type DashboardMe } from "@/api/auth";
import { ResubscribePlanModal } from "@/app/components/ResubscribePlanModal";
import { getPlanDisplayName } from "@/lib/planLabels";
import { betaChargeWaitsUntilAccessEnds, formatSubscriptionDate, hasActiveSubscription, isResubscribableStatus } from "@/lib/subscription";

export default function Account() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const checkoutSuccessToastShown = useRef(false);
  const [me, setMe] = useState<DashboardMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [showResubscribeModal, setShowResubscribeModal] = useState(false);
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

  useEffect(() => {
    if (checkoutSuccessToastShown.current) return;
    if (searchParams.get("checkout") !== "success") return;
    checkoutSuccessToastShown.current = true;
    toast.success("Checkout complete. Your subscription will activate in a moment.");
    const next = new URLSearchParams(searchParams);
    next.delete("checkout");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

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

  const handleRestoreSubscription = async () => {
    setRestoring(true);
    try {
      const result = await resumeSubscription();
      if (result.success) {
        setMe((prev) =>
          prev?.subscription
            ? {
                ...prev,
                subscription: { ...prev.subscription, cancelAtPeriodEnd: false },
              }
            : prev
        );
        toast.success("Your subscription will renew on your next billing date.");
      } else {
        toast.error(result.error ?? "Failed to restore subscription");
      }
    } finally {
      setRestoring(false);
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

  const handleDeleteAccount = async () => {
    if (!me) return;
    setDeletingAccount(true);
    try {
      const result = await deleteAccount(confirmEmail.trim());
      if (result.success) {
        toast.success("Your account has been deleted.");
        navigate("/login");
        return;
      }
      toast.error(result.error);
    } finally {
      setDeletingAccount(false);
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

  const planKey = me.subscription?.plan ?? "professional";
  const planDisplay =
    me.subscription?.planDisplay ?? getPlanDisplayName(planKey);
  const cadence = me.subscription?.cadence ?? "monthly";
  const cadenceDisplay = cadence.charAt(0).toUpperCase() + cadence.slice(1);
  const priceDisplay = me.subscription?.priceDisplay ?? "—";
  const subscriptionActive = hasActiveSubscription(me.subscription);
  const statusDisplay = me.subscription?.status
    ? me.subscription.status.charAt(0).toUpperCase() + me.subscription.status.slice(1)
    : "—";
  const currentPeriodEnd = formatSubscriptionDate(me.subscription?.currentPeriodEnd) ?? "—";
  const scheduledCancel = Boolean(subscriptionActive && me.subscription?.cancelAtPeriodEnd);
  const subscriptionExpired = !subscriptionActive;
  const isBeta = me.subscription?.source === "beta";
  const betaActive = Boolean(isBeta && subscriptionActive);
  const betaChargeLater = betaActive && betaChargeWaitsUntilAccessEnds(me.subscription?.currentPeriodEnd);
  const openSubscribeModal = () => setShowResubscribeModal(true);
  const canResubscribe = subscriptionExpired && isResubscribableStatus(me.subscription?.status);
  const deleteEmailMatches =
    confirmEmail.trim().toLowerCase() === me.user.email.trim().toLowerCase();

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
              {betaActive
                ? "You have complimentary beta access to BetterBlog."
                : isBeta && subscriptionExpired
                  ? "Your beta access has ended."
                  : subscriptionExpired
                    ? canResubscribe
                      ? `Your ${planDisplay} plan has been canceled.`
                      : `Your ${planDisplay} plan needs a payment update.`
                    : `You are currently subscribed to the ${planDisplay} plan.`}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="flex items-center space-x-4 rounded-md border p-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[#5B4FE8]/10">
                <CreditCard className="w-5 h-5 text-[#5B4FE8]" />
              </div>
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium leading-none">
                  {betaActive ? `${planDisplay} · Beta` : `${planDisplay} Plan`}
                </p>
                <p className="text-xs text-[#6b6b6b]">
                  {betaActive
                    ? `Free until ${currentPeriodEnd}`
                    : `${cadenceDisplay} • ${priceDisplay} • ${statusDisplay}`}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={isBeta ? openSubscribeModal : handleOpenPortal("changePlan")}
                disabled={portalLoading || !me.subscription || (!isBeta && subscriptionExpired)}
              >
                {portalLoadingButton === "changePlan" ? "Opening…" : "Change Plan"}
              </Button>
            </div>
            <div className="text-sm text-[#6b6b6b]">
              {betaActive ? (
                <>
                  Beta access ends on{" "}
                  <span className="font-medium text-[#0a0a0a]">{currentPeriodEnd}</span>.
                  The {planDisplay} plan is included until then.{" "}
                  {betaChargeLater
                    ? "Choose a plan to keep BetterBlog after that date. You won't be charged until beta access ends."
                    : "Choose a plan to keep BetterBlog. You'll be billed today."}
                </>
              ) : subscriptionExpired ? (
                currentPeriodEnd !== "—" ? (
                  <>
                    {isBeta ? "Beta access ended on" : "Your subscription ended on"}{" "}
                    <span className="font-medium text-[#0a0a0a]">{currentPeriodEnd}</span>.
                    {canResubscribe
                      ? " Resubscribe to continue using BetterBlog."
                      : " Update your payment method to continue using BetterBlog."}
                  </>
                ) : (
                  <>
                    Your subscription has ended.
                    {canResubscribe
                      ? " Resubscribe to continue using BetterBlog."
                      : " Update your payment method to continue using BetterBlog."}
                  </>
                )
              ) : scheduledCancel ? (
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
            {betaActive ? (
              <p className="text-sm text-[#6b6b6b]">No card on file yet.</p>
            ) : subscriptionExpired || scheduledCancel ? (
              <p className="text-sm text-amber-600">
                {scheduledCancel
                  ? "Cancellation scheduled for end of period"
                  : canResubscribe
                    ? "Subscription canceled"
                    : "Payment past due"}
              </p>
            ) : (
              <>
                <Button
                  variant="ghost"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => setShowCancelModal(true)}
                  disabled={canceling || portalLoading || restoring}
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
            {betaActive ? (
              <Button onClick={openSubscribeModal} disabled={portalLoading}>
                Update Payment Method
              </Button>
            ) : scheduledCancel ? (
              <Button
                onClick={() => void handleRestoreSubscription()}
                disabled={restoring || portalLoading}
              >
                {restoring ? "Restoring…" : "Restore Subscription"}
              </Button>
            ) : canResubscribe ? (
              <Button
                onClick={() => setShowResubscribeModal(true)}
                disabled={portalLoading}
              >
                Resubscribe
              </Button>
            ) : (
              <Button
                variant={subscriptionExpired ? "default" : "outline"}
                onClick={handleOpenPortal("updatePayment")}
                disabled={portalLoading || restoring || !me.subscription}
              >
                {portalLoadingButton === "updatePayment" ? "Opening…" : "Update Payment Method"}
              </Button>
            )}
          </CardFooter>
        </Card>

        <Card className="border-red-200">
          <CardHeader>
            <CardTitle>Danger zone</CardTitle>
            <CardDescription>
              Permanently delete your BetterBlog account and everything stored for it.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-[#6b6b6b]">
              This immediately deletes your blogs, comments, analytics, leads, support history, and
              billing. Your Squarespace content is not affected. This cannot be undone.
            </p>
          </CardContent>
          <CardFooter className="border-t pt-6">
            <Button
              variant="ghost"
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={() => setShowDeleteModal(true)}
              disabled={deletingAccount}
            >
              Delete account
            </Button>
            <AlertDialog
              open={showDeleteModal}
              onOpenChange={(open) => {
                if (deletingAccount) return;
                setShowDeleteModal(open);
                if (!open) setConfirmEmail("");
              }}
            >
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete account?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This permanently deletes your blogs, comments, analytics, leads, support
                    history, and billing. Your Squarespace content stays on Squarespace. This
                    cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="grid gap-2">
                  <Label htmlFor="confirm-email">Type {me.user.email} to confirm</Label>
                  <Input
                    id="confirm-email"
                    value={confirmEmail}
                    onChange={(e) => setConfirmEmail(e.target.value)}
                    autoComplete="off"
                    disabled={deletingAccount}
                  />
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={deletingAccount}>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={(e) => {
                      e.preventDefault();
                      void handleDeleteAccount();
                    }}
                    disabled={deletingAccount || !deleteEmailMatches}
                    className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                  >
                    {deletingAccount ? "Deleting…" : "Delete my account"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardFooter>
        </Card>
      </div>
      <ResubscribePlanModal
        open={showResubscribeModal}
        onOpenChange={setShowResubscribeModal}
        defaultPlanKey={me.subscription?.plan}
        defaultCadence={me.subscription?.cadence}
        subscribeDuringBeta={betaActive}
        betaAccessUntil={me.subscription?.currentPeriodEnd}
      />
    </div>
  );
}
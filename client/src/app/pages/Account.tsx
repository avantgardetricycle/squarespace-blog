import { useState, useEffect } from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { CreditCard } from "lucide-react";
import { toast } from "sonner";
import { getAccount, getSubscription, updateProfile } from "@/api/stubs";

export default function Account() {
  const [profile, setProfile] = useState<Awaited<ReturnType<typeof getAccount>> | null>(null);
  const [subscription, setSubscription] = useState<Awaited<ReturnType<typeof getSubscription>> | null>(null);
  const [name, setName] = useState("");

  useEffect(() => {
    getAccount().then((a) => {
      setProfile(a);
      setName(a.name);
    });
    getSubscription().then(setSubscription);
  }, []);

  const handleSaveProfile = async () => {
    const updated = await updateProfile({ name });
    setProfile(updated);
    toast.success("Profile updated!");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900">Account Settings</h1>
        <p className="text-neutral-500">Manage your account details and subscription plan.</p>
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
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" value={profile?.email ?? ""} disabled />
              <p className="text-[0.8rem] text-neutral-500">Your email address is managed via your Squarespace account.</p>
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={handleSaveProfile}>Save Changes</Button>
          </CardFooter>
        </Card>

        {/* Subscription Card */}
        <Card>
          <CardHeader>
            <CardTitle>Current Plan</CardTitle>
            <CardDescription>
              You are currently subscribed to the {subscription?.plan ?? "Pro"} plan.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="flex items-center space-x-4 rounded-md border p-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-neutral-100">
                <CreditCard className="w-5 h-5 text-neutral-900" />
              </div>
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium leading-none">{subscription?.plan ?? "Pro Plan"}</p>
                <p className="text-xs text-neutral-500">{subscription?.price ?? "$19.00/month"}</p>
              </div>
              <Button variant="outline" size="sm">
                Change Plan
              </Button>
            </div>
            <div className="text-sm text-neutral-500">
              Your next billing date is <span className="font-medium text-neutral-900">{subscription?.nextBillingDate ?? "—"}</span>.
            </div>
          </CardContent>
          <CardFooter className="flex justify-between border-t pt-6">
            <Button variant="ghost" className="text-red-600 hover:text-red-700 hover:bg-red-50">
              Cancel Subscription
            </Button>
            <Button variant="outline">Update Payment Method</Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
/**
 * Stub API functions for account/user - return mock data until real API is wired.
 */

export interface AccountProfile {
  id: string;
  name: string;
  email: string;
  memberSince: string;
}

export interface Subscription {
  status: "active" | "cancelled" | "past_due";
  plan: string;
  price: string;
  nextBillingDate: string;
}

export async function getAccount(): Promise<AccountProfile> {
  return {
    id: "user_123456",
    name: "Jane Doe",
    email: "jane@example.com",
    memberSince: "October 2023",
  };
}

export async function updateProfile(data: Partial<Pick<AccountProfile, "name">>): Promise<AccountProfile> {
  const account = await getAccount();
  return { ...account, ...data };
}

export async function getSubscription(): Promise<Subscription> {
  return {
    status: "active",
    plan: "Pro Plan",
    price: "$19.00/month",
    nextBillingDate: "March 1, 2024",
  };
}

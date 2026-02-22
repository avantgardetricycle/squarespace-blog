import { useState } from "react";
import { Link } from "react-router";
import { 
  Settings, 
  User, 
  Copy, 
  Check, 
  ExternalLink, 
  ArrowRight,
  Globe
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Separator } from "@/app/components/ui/separator";
import { toast } from "sonner";

export default function Dashboard() {
  const [copied, setCopied] = useState(false);
  const [siteUrl, setSiteUrl] = useState("https://my-awesome-blog.squarespace.com");
  
  const scriptTag = `<script src="https://cdn.betterblog.com/v1/bundle.js" data-id="user_123456"></script>`;

  const handleCopy = () => {
    navigator.clipboard.writeText(scriptTag);
    setCopied(true);
    toast.success("Script code copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveUrl = () => {
    toast.success("Squarespace URL updated!");
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-heading font-bold tracking-tight text-neutral-900 flex items-center gap-2">
          Welcome to <span className="bg-gradient-to-r from-blue-700 to-green-600 bg-clip-text text-transparent">BetterBlog</span>
        </h1>
        <p className="text-neutral-500 text-lg">Manage your blog customization and Squarespace integration.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <Card className="md:col-span-2 border-neutral-200 shadow-sm">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Get straight to what matters.</CardDescription>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-4">
            <Link to="/dashboard/configure" className="block group">
              <div className="border border-neutral-200 rounded-xl p-6 hover:border-blue-600 hover:shadow-md transition-all duration-200 h-full flex flex-col bg-white hover:bg-blue-50/30">
                <div className="bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors text-blue-700">
                  <Settings className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-lg mb-2 text-neutral-900">Customize Blog</h3>
                <p className="text-neutral-500 text-sm mb-4 flex-1 group-hover:text-neutral-600">
                  Adjust layout, typography, and colors to match your brand perfectly.
                </p>
                <div className="flex items-center text-sm font-medium text-blue-600 group-hover:translate-x-1 transition-transform">
                  Open Editor <ArrowRight className="w-4 h-4 ml-1" />
                </div>
              </div>
            </Link>

            <Link to="/dashboard/account" className="block group">
              <div className="border border-neutral-200 rounded-xl p-6 hover:border-green-600 hover:shadow-md transition-all duration-200 h-full flex flex-col bg-white hover:bg-green-50/30">
                <div className="bg-green-100 w-12 h-12 rounded-full flex items-center justify-center mb-4 group-hover:bg-green-600 group-hover:text-white transition-colors text-green-700">
                  <User className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-lg mb-2 text-neutral-900">Manage Account</h3>
                <p className="text-neutral-500 text-sm mb-4 flex-1 group-hover:text-neutral-600">
                  Update your subscription, billing details, and personal profile.
                </p>
                <div className="flex items-center text-sm font-medium text-green-600 group-hover:translate-x-1 transition-transform">
                  View Account <ArrowRight className="w-4 h-4 ml-1" />
                </div>
              </div>
            </Link>
          </CardContent>
        </Card>

        {/* Account Info Card */}
        <Card className="border-neutral-200 shadow-sm bg-blue-50/30">
          <CardHeader>
            <CardTitle>Account Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-neutral-500">Subscription</p>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 border border-green-200">
                  Active
                </span>
                <span className="text-sm font-semibold">Pro Plan</span>
              </div>
            </div>
            
            <Separator className="bg-blue-100" />
            
            <div className="space-y-1">
              <p className="text-sm font-medium text-neutral-500">Email</p>
              <p className="text-sm">jane@example.com</p>
            </div>

            <Separator className="bg-blue-100" />

            <div className="space-y-1">
              <p className="text-sm font-medium text-neutral-500">Member Since</p>
              <p className="text-sm">October 2023</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Setup Instructions */}
      <Card className="border-neutral-200 shadow-sm overflow-hidden">
        <CardHeader className="bg-neutral-50 border-b border-neutral-100">
          <CardTitle>Squarespace Integration</CardTitle>
          <CardDescription>
            Follow these steps to connect your custom blog design to your Squarespace site.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8 pt-8">
          
          {/* Step 1 */}
          <div className="flex gap-4">
            <div className="flex-none">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white font-bold text-sm shadow-sm ring-4 ring-blue-50">
                1
              </div>
            </div>
            <div className="space-y-3 flex-1">
              <h3 className="font-semibold text-neutral-900">Connect your site</h3>
              <p className="text-sm text-neutral-500">
                Enter the full URL of your Squarespace website so we can verify the installation.
              </p>
              <div className="flex gap-2 max-w-md">
                <div className="relative flex-1">
                  <Globe className="absolute left-2.5 top-2.5 h-4 w-4 text-neutral-500" />
                  <Input 
                    value={siteUrl} 
                    onChange={(e) => setSiteUrl(e.target.value)}
                    className="pl-9 focus-visible:ring-blue-600"
                    placeholder="https://your-site.squarespace.com"
                  />
                </div>
                <Button onClick={handleSaveUrl} variant="default" className="bg-blue-600 hover:bg-blue-700">Save</Button>
              </div>
            </div>
          </div>

          <Separator />

          {/* Step 2 */}
          <div className="flex gap-4">
            <div className="flex-none">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white font-bold text-sm shadow-sm ring-4 ring-blue-50">
                2
              </div>
            </div>
            <div className="space-y-3 flex-1">
              <h3 className="font-semibold text-neutral-900">Install the code snippet</h3>
              <p className="text-sm text-neutral-500">
                Copy the code below and paste it into your Squarespace site's 
                <span className="font-medium text-neutral-900"> Settings &gt; Advanced &gt; Code Injection &gt; Header</span>.
              </p>
              
              <div className="relative group">
                <div className="absolute right-2 top-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-8 px-2 bg-neutral-800 hover:bg-neutral-700 text-white border-none"
                    onClick={handleCopy}
                  >
                    {copied ? (
                      <>
                        <Check className="h-3.5 w-3.5 mr-1.5 text-green-400" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5 mr-1.5" />
                        Copy Code
                      </>
                    )}
                  </Button>
                </div>
                <pre className="overflow-x-auto rounded-lg bg-neutral-950 p-4 text-sm text-blue-100 font-mono border border-neutral-800 shadow-inner">
                  <code>{scriptTag}</code>
                </pre>
              </div>
              
              <div className="bg-blue-50 text-blue-800 text-sm p-3 rounded-md border border-blue-100 flex gap-2 items-start">
                <div className="mt-0.5">ℹ️</div>
                <p>
                  Note: Code Injection is a premium feature on Squarespace. You need a Business or Commerce plan to use this plugin.
                </p>
              </div>
            </div>
          </div>
          
          <Separator />

          {/* Step 3 */}
          <div className="flex gap-4">
            <div className="flex-none">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-600 text-white font-bold text-sm shadow-sm ring-4 ring-green-50">
                3
              </div>
            </div>
            <div className="space-y-3 flex-1">
              <h3 className="font-semibold text-neutral-900">Verify Installation</h3>
              <p className="text-sm text-neutral-500">
                Once you've added the code, visit your blog page to see your new design in action.
              </p>
              <Button variant="outline" className="gap-2 border-green-200 text-green-700 hover:bg-green-50 hover:text-green-800 hover:border-green-300" asChild>
                <a href={siteUrl} target="_blank" rel="noopener noreferrer">
                  Open My Site <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>

        </CardContent>
      </Card>
    </div>
  );
}

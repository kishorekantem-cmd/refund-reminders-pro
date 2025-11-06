import { useNavigate } from "react-router-dom";
import { ArrowLeft, Mail, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { NotificationSettings } from "@/components/NotificationSettings";

const Settings = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [appVersion, setAppVersion] = useState("v1.0.3");
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  useEffect(() => {
    const fetchAppVersion = async () => {
      const { data } = await supabase
        .from("config")
        .select("value")
        .eq("key", "app_version")
        .maybeSingle();
      
      if (data?.value) {
        setAppVersion(data.value);
      }
    };

    fetchAppVersion();
  }, []);

  const handleContactSupport = () => {
    const subject = encodeURIComponent("Refundly Support Request");
    const body = encodeURIComponent(
      `Hi ReFundly Team,\n\nI need help with:\n\n[Please describe your issue here]\n\nApp Version: ${appVersion}\nDevice: [auto-fill or user to enter manually]`
    );
    window.location.href = `mailto:refundly.help@gmail.com?subject=${subject}&body=${body}`;
  };

  const handleSignOut = async () => {
    console.log('handleSignOut called');
    try {
      console.log('Calling signOut function...');
      await signOut();
      console.log('signOut completed, user should be null now');
      toast.success("Logged out successfully");
      navigate("/auth");
    } catch (error) {
      console.error('Logout error:', error);
      toast.error("Failed to logout");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <div className="max-w-2xl mx-auto pb-20">
        <div className="mb-6 flex items-center gap-3">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            size="icon"
            className="flex-shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-3xl font-bold">Settings</h1>
        </div>

        <div className="space-y-4">
          <NotificationSettings />

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>About & Support</CardTitle>
              <CardDescription>ReFundly — Smart Refund Tracker</CardDescription>
            </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col items-center space-y-4 py-4">
              <Button
                onClick={handleContactSupport}
                className="w-full max-w-xs"
                size="lg"
              >
                <Mail className="mr-2 h-5 w-5" />
                Contact Support
              </Button>
              
              <Button
                onClick={() => setShowLogoutDialog(true)}
                variant="destructive"
                className="w-full max-w-xs"
                size="lg"
              >
                <LogOut className="mr-2 h-5 w-5" />
                Logout
              </Button>
              
              <div className="text-center space-y-1 text-sm text-muted-foreground">
                <p>Contact: refundly.help@gmail.com</p>
                <p>Version: {appVersion}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        </div>
      </div>

      {/* Logout Confirmation Dialog */}
      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Logout</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to logout? You'll need to sign in again to access your returns.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                setShowLogoutDialog(false);
                handleSignOut();
              }}
            >
              Logout
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Settings;

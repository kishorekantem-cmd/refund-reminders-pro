import { useNavigate } from "react-router-dom";
import { ArrowLeft, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const Settings = () => {
  const navigate = useNavigate();
  const [appVersion, setAppVersion] = useState("v1.0.3");

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
          <h1 className="text-3xl font-bold">Settings</h1>
        </div>

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
              
              <div className="text-center space-y-1 text-sm text-muted-foreground">
                <p>Contact: refundly.help@gmail.com</p>
                <p>Version: {appVersion}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;

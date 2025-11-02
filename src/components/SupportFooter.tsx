import { useEffect, useState } from "react";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const SupportFooter = () => {
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
    <div className="mt-8 pb-6 border-t border-border pt-6">
      <div className="text-center space-y-3">
        <Button
          onClick={handleContactSupport}
          variant="outline"
          size="sm"
          className="mx-auto"
        >
          <Mail className="mr-2 h-4 w-4" />
          Contact Support
        </Button>
        
        <div className="text-xs text-muted-foreground space-y-1">
          <p>ReFundly — Smart Refund Tracker</p>
          <p>refundly.help@gmail.com • {appVersion}</p>
        </div>
      </div>
    </div>
  );
};

export default SupportFooter;

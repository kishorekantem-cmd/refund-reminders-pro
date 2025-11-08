import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, BellOff, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { requestNotificationPermission, checkAndScheduleNotifications, isNativeApp } from "@/utils/notifications";

export const NotificationSettings = () => {
  const [notificationStatus, setNotificationStatus] = useState<"granted" | "denied" | "default">("default");
  const isNative = isNativeApp();

  useEffect(() => {
    if ("Notification" in window) {
      setNotificationStatus(Notification.permission);
    }
  }, []);

  const handleEnableNotifications = async () => {
    if (isNative) {
      // Native app - show instructions to enable in device settings
      toast.error("Push notifications require device permissions. Go to your device Settings → Apps → ReFundly → Notifications and enable them.", { duration: 8000 });
      setNotificationStatus("denied");
      return;
    }
    
    const granted = await requestNotificationPermission();
    if (granted) {
      setNotificationStatus("granted");
      toast.success("Notifications enabled!");
      await checkAndScheduleNotifications();
    } else {
      setNotificationStatus("denied");
      toast.error("Notification permission denied. Please enable in browser settings.");
    }
  };

  const handleTestNotification = async () => {
    if (Notification.permission === "granted") {
      new Notification("🎉 Test Notification", {
        body: "Notifications are working! You'll receive alerts for overdue returns and refund reminders.",
        icon: '/icon-192x192.png',
        badge: '/icon-192x192.png',
      });
      toast.success("Test notification sent!");
    } else {
      toast.error("Please enable notifications first");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Notifications
        </CardTitle>
        <CardDescription>
          Get reminders for overdue returns and refund status
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Push Notifications</p>
            <p className="text-sm text-muted-foreground">
              Status: {notificationStatus === "granted" ? "✓ Enabled" : notificationStatus === "denied" ? "✗ Denied" : "○ Not Set"}
            </p>
          </div>
          {notificationStatus !== "granted" && (
            <Button onClick={handleEnableNotifications} variant="default">
              <Bell className="w-4 h-4 mr-2" />
              Enable
            </Button>
          )}
          {notificationStatus === "granted" && (
            <Button onClick={handleTestNotification} variant="outline">
              Test
            </Button>
          )}
        </div>

        {notificationStatus === "denied" && (
          <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm flex items-start gap-2">
            <BellOff className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>
              {isNative ? (
                <>Notifications are blocked. Go to your device Settings → Apps → ReFundly → Notifications and turn them on.</>
              ) : (
                <>Notifications are blocked. Please enable them in your browser settings.</>
              )}
            </span>
          </div>
        )}

        {isNative && (
          <div className="p-3 rounded-lg bg-muted text-muted-foreground text-sm flex items-start gap-2">
            <Smartphone className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>Note: Native push notifications are not yet available in this version. Manual reminders can be set from the home screen.</span>
          </div>
        )}

        <div className="space-y-2 pt-2 border-t">
          <p className="text-sm font-medium">You'll receive notifications for:</p>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>⚠️ Overdue returns</li>
            <li>⏳ Returns due within 3 days</li>
            <li>⚠️ Refund status checks (3+ days after return)</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

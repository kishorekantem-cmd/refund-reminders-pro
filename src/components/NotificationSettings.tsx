import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, BellOff } from "lucide-react";
import { toast } from "sonner";
import { requestNotificationPermission, checkAndScheduleNotifications } from "@/utils/notifications";

export const NotificationSettings = () => {
  const [notificationStatus, setNotificationStatus] = useState<"granted" | "denied" | "default">("default");

  useEffect(() => {
    if ("Notification" in window) {
      setNotificationStatus(Notification.permission);
    }
  }, []);

  const handleEnableNotifications = async () => {
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
          <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            <BellOff className="w-4 h-4 inline mr-2" />
            Notifications are blocked. Please enable them in your browser settings.
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

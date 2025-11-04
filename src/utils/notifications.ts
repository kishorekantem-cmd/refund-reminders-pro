import { supabase } from "@/integrations/supabase/client";

export const requestNotificationPermission = async () => {
  if (!("Notification" in window)) {
    console.log("This browser does not support notifications");
    return false;
  }

  if (Notification.permission === "granted") {
    return true;
  }

  if (Notification.permission !== "denied") {
    const permission = await Notification.requestPermission();
    return permission === "granted";
  }

  return false;
};

export const checkAndScheduleNotifications = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: returns } = await supabase
    .from('returns')
    .select('*')
    .eq('user_id', user.id)
    .eq('refund_received', false);

  if (!returns) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  returns.forEach((returnItem) => {
    if (returnItem.return_date) {
      const returnDate = new Date(returnItem.return_date);
      returnDate.setHours(0, 0, 0, 0);
      
      // Check if return date is overdue
      if (returnDate < today) {
        showNotification(
          '⚠️ Return Overdue',
          `Return deadline passed for ${returnItem.store_name}. Return amount: $${returnItem.amount}`
        );
      } 
      // Check if return date is within 3 days
      else {
        const threeDaysFromNow = new Date(today);
        threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
        
        if (returnDate <= threeDaysFromNow) {
          showNotification(
            '⏳ Pending Return',
            `Return deadline approaching for ${returnItem.store_name} on ${returnDate.toLocaleDateString()}. Amount: $${returnItem.amount}`
          );
        }
      }
    }

    // Check if returned but no refund received for 3+ days
    if (returnItem.returned_date) {
      const returnedDate = new Date(returnItem.returned_date);
      returnedDate.setHours(0, 0, 0, 0);
      
      const threeDaysAgo = new Date(today);
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      
      if (returnedDate <= threeDaysAgo && !returnItem.refund_received) {
        showNotification(
          '⚠️ Check Refund Status',
          `It's been 3+ days since you returned to ${returnItem.store_name}. Check your refund status for $${returnItem.amount}`
        );
      }
    }
  });
};

export const showNotification = (title: string, body: string) => {
  if (Notification.permission === "granted") {
    const options = {
      body,
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png',
      vibrate: [200, 100, 200],
      tag: 'refundly-notification',
      requireInteraction: false,
    };

    new Notification(title, options);
  }
};

/**
 * Browser Notification Service for GigShield
 */

export const requestNotificationPermission = async () => {
  if (!("Notification" in window)) {
    console.log("This browser does not support desktop notification");
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

export const sendNotification = (title, options = {}) => {
  if (Notification.permission === "granted") {
    const defaultOptions = {
      icon: "/shield.svg", // Ensure this exists or use a web link
      badge: "/shield.svg",
      tag: "gigshield-alert",
      ...options,
    };
    return new Notification(title, defaultOptions);
  }
};

export const notifyClaimTriggered = (amount, event) => {
  sendNotification("⚡ Claim Auto-Triggered!", {
    body: `Disruption detected: ${event}. A claim for ₹${amount} has been initiated.`,
    vibrate: [200, 100, 200],
  });
};

export const notifyPaymentReceived = (amount) => {
  sendNotification("💰 Payout Received!", {
    body: `₹${amount} has been credited to your UPI wallet. Check your history for details.`,
    vibrate: [100, 50, 100],
  });
};

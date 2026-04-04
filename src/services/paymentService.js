/**
 * Simulated UPI QR Payment Service
 */

// Generate a mock UPI URI for testing
// Example: upi://pay?pa=gigshield@upi&pn=GigShield&am=30&cu=INR
export const getUPIPaymentUri = (amount, planName) => {
  const pa = "gigshield@upi"; // Mock VPA
  const pn = "GigShield Insurance";
  return `upi://pay?pa=${pa}&pn=${pn}&am=${amount}&cu=INR&tn=Payment for ${planName} Plan`;
};

// Mock verification function
export const verifyUPIPayment = async (amount) => {
  return new Promise((resolve) => {
    // Simulate a brief "verifying..." delay
    setTimeout(() => {
      resolve({
        success: true,
        transactionId: "UPI_TXN_" + Math.random().toString(36).substr(2, 9),
      });
    }, 2000);
  });
};

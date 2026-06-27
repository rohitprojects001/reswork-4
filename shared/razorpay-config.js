/* =========================================================
   RAZORPAY CONFIG — fill this in with YOUR Razorpay key
   =========================================================
   How to get your key:
   1. Go to https://dashboard.razorpay.com/signup and create a free account
      (needs basic business details; you can start in TEST MODE instantly,
      no documents needed for testing — documents are only needed later
      to accept REAL live payments and withdraw money to your bank).
   2. Once logged in, make sure the toggle top-left says "Test Mode".
   3. Go to Settings → API Keys → "Generate Test Key".
   4. Copy the "Key Id" (starts with rzp_test_...) and paste it below.

   TEST MODE lets you test the whole flow with fake card numbers —
   see README for test card details. No real money moves in test mode.

   When you're ready to accept REAL payments:
   1. Complete KYC/business verification on Razorpay (takes 1-2 days)
   2. Switch the toggle to "Live Mode", generate a LIVE key
   3. Replace the key below with the live one (starts with rzp_live_...)
   ========================================================= */

export const RAZORPAY_KEY_ID = "rzp_test_T6YlLzOZMLZ05s";

export const STORE_DETAILS = {
  name: "RESWORK",
  description: "Streetwear Order Payment",
  themeColor: "#0a0a0a",
};

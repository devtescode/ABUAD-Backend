const express = require("express");

const router = express.Router();

const paymentController = require(
  "../Controllers/payment.controller"
);

const { verifyToken } = require("../middleware/auth");

// ==========================================
// CUSTOMER STARTS PAYMENT
// ==========================================

router.post(
  "/initialize",
  verifyToken,
  paymentController.initializePayment
);


// ==========================================
// PAYSTACK WEBHOOK
// ==========================================
//
// IMPORTANT:
// DO NOT put your normal `protect` middleware
// here.
//
// Paystack calls this endpoint directly.
//

router.post(
  "/webhook",
  paymentController.paystackWebhook
);


// ==========================================
// CUSTOMER CALLBACK VERIFICATION
// ==========================================

router.get(
  "/verify/:reference",
  verifyToken,
  paymentController.verifyPayment
);


module.exports = router;
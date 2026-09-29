const express = require("express");

const router = express.Router();

const bookingController = require(
  "../Controllers/booking.controller"
);

const { verifyToken } = require(
  "../middleware/auth"
);

// ======================================================
// CUSTOMER CREATES BOOKING
// ======================================================

router.post(
  "/createbookings",
  verifyToken,
  bookingController.createBooking
);

module.exports = router;
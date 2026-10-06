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

router.get(
  "/my-bookings",
  verifyToken,  
  bookingController.getCustomerBookings
);

router.get(
  "/provider-bookings",
  verifyToken,
  bookingController.getProviderBookings
);

router.patch(
  "/:bookingId/complete",
  verifyToken,
  bookingController.completeBooking
);
module.exports = router;
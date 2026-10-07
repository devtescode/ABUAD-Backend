const express = require("express");

const router = express.Router();

const {
  createReview,
  getProviderReviews,
  getCustomerReviews,
  getBookingReview,
} = require("../Controllers/review.controllers");

const { verifyToken } = require("../middleware/auth");


// Customer submits review
router.post(
  "/addreviews",
  verifyToken,
  createReview
);


// Provider reviews
router.get(
  "/provider/:providerId",
  getProviderReviews
);


// Customer's reviews
router.get(
  "/my-reviews",
  verifyToken,
  getCustomerReviews
);


// Check booking review
router.get(
  "/booking/:bookingId",
  verifyToken,
  getBookingReview
);


module.exports = router;
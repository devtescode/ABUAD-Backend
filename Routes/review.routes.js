const express = require("express");

const router = express.Router();

const {
  createReview,
  getProviderReviews,
  getCustomerReviews,
  getBookingReview,
  deleteReview,
  updateReview,
  getMyProviderProfile,
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

router.delete(
  "/deletereview/:reviewId",
  verifyToken,
  deleteReview
);

router.put(
  "/updatereview/:reviewId",
  verifyToken,
  updateReview
);

// Provider views own profile
router.get(
  "/my-profile",
  verifyToken,
  getMyProviderProfile
);



module.exports = router;
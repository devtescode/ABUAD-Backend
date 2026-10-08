const Review = require("../Models/review.models");
const Booking = require("../Models/booking.models");
const User = require("../Models/user.models");


// =====================================================
// CREATE REVIEW
// =====================================================
module.exports.createReview = async (req, res) => {
  try {
    const customerId =
      req.user?._id ||
      req.user?.id ||
      req.user?.userId ||
      req.user?.user_id;

    if (!customerId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const { bookingId, rating, comment } = req.body;

    if (!bookingId) {
      return res.status(400).json({
        success: false,
        message: "Booking ID is required.",
      });
    }

    const numericRating = Number(rating);

    if (
      !numericRating ||
      numericRating < 1 ||
      numericRating > 5
    ) {
      return res.status(400).json({
        success: false,
        message: "Rating must be between 1 and 5.",
      });
    }

    // -----------------------------------------------
    // Find booking
    // -----------------------------------------------
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found.",
      });
    }

    // -----------------------------------------------
    // Make sure this customer owns the booking
    // -----------------------------------------------
    if (String(booking.customer) !== String(customerId)) {
      return res.status(403).json({
        success: false,
        message: "You can only review your own booking.",
      });
    }

    // -----------------------------------------------
    // Only completed bookings can be reviewed
    // -----------------------------------------------
    if (booking.status !== "completed") {
      return res.status(400).json({
        success: false,
        message: "You can only review a completed booking.",
      });
    }

    // -----------------------------------------------
    // Prevent duplicate reviews
    // -----------------------------------------------
    const existingReview = await Review.findOne({
      booking: booking._id,
    });

    if (existingReview) {
      return res.status(409).json({
        success: false,
        message: "You have already reviewed this booking.",
      });
    }
    console.log("Prevent duplicate reviews:", existingReview);

    // -----------------------------------------------
    // Create review
    // -----------------------------------------------
    const review = await Review.create({
      booking: booking._id,
      customer: booking.customer,
      provider: booking.provider,
      service: booking.service,
      rating: numericRating,
      comment: comment?.trim() || "",
    });
    console.log("Review created:", review);

    const populatedReview = await Review.findById(review._id)
      .populate("customer", "name fullName email avatar profileImage")
      .populate("provider", "name fullName email avatar profileImage")
      .populate("service", "title category image price")
      .populate("booking", "date time status");

    return res.status(201).json({
      success: true,
      message: "Review submitted successfully.",
      review: populatedReview,
    });
  } catch (error) {
    console.error("CREATE REVIEW ERROR:", error);

    // Handle duplicate booking review
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "You have already reviewed this booking.",
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message || "Unable to submit review.",
    });
  }
};


// =====================================================
// GET PROVIDER REVIEWS
// =====================================================
module.exports.getProviderReviews = async (req, res) => {
  try {
    const { providerId } = req.params;

    if (!providerId) {
      return res.status(400).json({
        success: false,
        message: "Provider ID is required.",
      });
    }

    const reviews = await Review.find({
      provider: providerId,
    })
      .populate(
        "customer",
        "name fullName avatar profileImage"
      )
      .populate(
        "service",
        "title category image price"
      )
      .sort({ createdAt: -1 })
      .lean();

    const totalReviews = reviews.length;

    const totalRating = reviews.reduce(
      (sum, review) => sum + Number(review.rating || 0),
      0
    );

    const averageRating =
      totalReviews > 0
        ? Number((totalRating / totalReviews).toFixed(1))
        : 0;

    return res.status(200).json({
      success: true,
      count: totalReviews,
      averageRating,
      reviews,
    });
  } catch (error) {
    console.error("GET PROVIDER REVIEWS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Unable to load provider reviews.",
    });
  }
};


// =====================================================
// GET CUSTOMER REVIEWS
// =====================================================
module.exports.getCustomerReviews = async (req, res) => {
  try {
    const customerId =
      req.user?._id ||
      req.user?.id ||
      req.user?.userId ||
      req.user?.user_id;

    if (!customerId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const reviews = await Review.find({
      customer: customerId,
    })
      .populate(
        "provider",
        "name fullName avatar profileImage"
      )
      .populate(
        "service",
        "title category image price"
      )
      .populate(
        "booking",
        "date time status"
      )
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: reviews.length,
      reviews,
    });
  } catch (error) {
    console.error("GET CUSTOMER REVIEWS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Unable to load your reviews.",
    });
  }
};


// =====================================================
// CHECK IF BOOKING HAS REVIEW
// =====================================================
module.exports.getBookingReview = async (req, res) => {
  try {
    const { bookingId } = req.params;

    const review = await Review.findOne({
      booking: bookingId,
    })
      .populate(
        "customer",
        "name fullName avatar profileImage"
      )
      .populate(
        "provider",
        "name fullName avatar profileImage"
      )
      .populate(
        "service",
        "title category image price"
      )
      .lean();

    return res.status(200).json({
      success: true,
      hasReview: !!review,
      review: review || null,
    });
  } catch (error) {
    console.error("GET BOOKING REVIEW ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Unable to check review.",
    });
  }
};

module.exports.deleteReview = async (req, res) => {
  try {
    const customerId =
      req.user?._id ||
      req.user?.id ||
      req.user?.userId ||
      req.user?.user_id;

    if (!customerId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const { reviewId } = req.params;

    const review = await Review.findById(reviewId);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found.",
      });
    }

    if (String(review.customer) !== String(customerId)) {
      return res.status(403).json({
        success: false,
        message: "You can only delete your own review.",
      });
    }

    await Review.findByIdAndDelete(reviewId);

    return res.status(200).json({
      success: true,
      message: "Review deleted successfully.",
    });
  } catch (error) {
    console.error("DELETE REVIEW ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Unable to delete review.",
    });
  }
};


module.exports.updateReview = async (req, res) => {
  try {
    const customerId =
      req.user?._id ||
      req.user?.id ||
      req.user?.userId ||
      req.user?.user_id;

    if (!customerId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const { reviewId } = req.params;
    const { rating, comment } = req.body;

    const review = await Review.findById(reviewId);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found.",
      });
    }

    if (String(review.customer) !== String(customerId)) {
      return res.status(403).json({
        success: false,
        message: "You can only edit your own review.",
      });
    }

    const numericRating = Number(rating);

    if (
      !numericRating ||
      numericRating < 1 ||
      numericRating > 5
    ) {
      return res.status(400).json({
        success: false,
        message: "Rating must be between 1 and 5.",
      });
    }

    review.rating = numericRating;
    review.comment = comment?.trim() || "";

    await review.save();

    const updatedReview = await Review.findById(review._id)
      .populate(
        "provider",
        "name fullName avatar profileImage"
      )
      .populate(
        "service",
        "title category image price"
      )
      .populate(
        "booking",
        "date time status"
      );

    return res.status(200).json({
      success: true,
      message: "Review updated successfully.",
      review: updatedReview,
    });
  } catch (error) {
    console.error("UPDATE REVIEW ERROR:", error);

    return res.status(500).json({
      success: false,
      message:
        error.message || "Unable to update review.",
    });
  }
};


module.exports.getMyProviderProfile = async (req, res) => {
  try {
    const providerId =
      req.user?._id ||
      req.user?.id ||
      req.user?.userId ||
      req.user?.user_id;

    if (!providerId) {
      return res.status(401).json({
        success: false,
        message: "Provider authentication required.",
      });
    }

    const provider = await User.findOne({
      _id: providerId,
      role: "provider",
    }).select(
      "-password -resetPasswordToken -resetPasswordExpires"
    );

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: "Provider not found.",
      });
    }

    return res.status(200).json({
      success: true,
      provider,
    });
  } catch (error) {
    console.error(
      "Get my provider profile error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch provider profile.",
    });
  }
};

const Review = require("../Models/review.models");
const Booking = require("../Models/booking.models");
const User = require("../Models/user.models");

module.exports.getAllReviews = async (req, res) => {
  try {
    const reviews = await Review.find({})
      .populate(
        "customer",
        "name fullName email avatar profileImage"
      )
      .populate(
        "provider",
        "name fullName email avatar profileImage"
      )
      .populate(
        "service",
        "title category image price"
      )
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: reviews.length,
      reviews,
    });
  } catch (error) {
    console.error(
      "GET ALL REVIEWS ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Unable to load all reviews.",
    });
  }
};


// controllers/adminReviewController.js
module.exports.hideReview = async (req, res) => {
  try {
    const review = await Review.findByIdAndUpdate(
      req.params.id,
      { isHidden: true },
      { new: true }
    ).populate("customer provider service");

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found.",
      });
    }

    res.json({ success: true, review });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

module.exports.unhideReview = async (req, res) => {
  try {
    const review = await Review.findByIdAndUpdate(
      req.params.id,
      { isHidden: false },
      { new: true }
    ).populate("customer provider service");

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found.",
      });
    }

    res.json({ success: true, review });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
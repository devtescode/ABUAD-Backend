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
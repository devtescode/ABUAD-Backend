const mongoose = require("mongoose");

const Booking = require("../Models/booking.models");
const Service = require("../Models/service.models");

// ======================================================
// CREATE BOOKING
// ======================================================

module.exports.createBooking = async (req, res) => {
  try {
    // ==========================================
    // GET CUSTOMER ID FROM AUTH MIDDLEWARE
    // ==========================================

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

    // ==========================================
    // GET REQUEST DATA
    // ==========================================

    const {
      serviceId,
      date,
      time,
      location,
      note,
    } = req.body;

    // ==========================================
    // BASIC VALIDATION
    // ==========================================

    if (!serviceId) {
      return res.status(400).json({
        success: false,
        message: "Service ID is required.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(serviceId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid service ID.",
      });
    }

    if (!date) {
      return res.status(400).json({
        success: false,
        message: "Booking date is required.",
      });
    }

    if (!time) {
      return res.status(400).json({
        success: false,
        message: "Booking time is required.",
      });
    }

    if (!location || !location.trim()) {
      return res.status(400).json({
        success: false,
        message: "Booking location is required.",
      });
    }

    // ==========================================
    // FIND SERVICE
    // ==========================================

    const service = await Service.findById(serviceId);

    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Service not found.",
      });
    }

    // ==========================================
    // CHECK SERVICE STATUS
    // ==========================================

    /*
     * Your service system may use different names.
     * This allows approved/active services.
     */

    if (
      service.status &&
      !["approved", "active"].includes(
        String(service.status).toLowerCase()
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "This service is currently unavailable for booking.",
      });
    }

    // ==========================================
    // GET PROVIDER FROM SERVICE
    // ==========================================

    if (!service.provider) {
      return res.status(400).json({
        success: false,
        message:
          "This service does not have a provider.",
      });
    }

    // ==========================================
    // GET PRICE FROM DATABASE
    // ==========================================

    const amount = Number(service.price);

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        message:
          "This service does not have a valid price.",
      });
    }

    // ==========================================
    // CREATE BOOKING
    // ==========================================

    const booking = await Booking.create({
      customer: customerId,

      provider: service.provider,

      service: service._id,

      date: String(date).trim(),

      time: String(time).trim(),

      location: String(location).trim(),

      note: note
        ? String(note).trim()
        : "",

      amount,

      status: "pending",

      paymentStatus: "unpaid",
    });

    // ==========================================
    // RETURN FULL BOOKING
    // ==========================================

    const populatedBooking =
      await Booking.findById(booking._id)
        .populate(
          "customer",
          "name email avatar"
        )
        .populate(
          "provider",
          "name email avatar profileImage role status paystack"
        )
        .populate(
          "service",
          "title category price duration description image status provider"
        );

    return res.status(201).json({
      success: true,

      message:
        "Booking created successfully.",

      booking: populatedBooking,
    });
  } catch (error) {
    console.error(
      "CREATE BOOKING ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Unable to create booking.",
    });
  }
};
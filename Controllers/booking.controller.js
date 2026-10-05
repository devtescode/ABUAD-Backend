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


/**
 * --------------------------------------------------
 * GET CUSTOMER BOOKINGS
 *
 * GET /bookings/my-bookings
 *
 * Returns the authenticated customer's real bookings
 * including real Paystack payment information.
 * --------------------------------------------------
 */
module.exports.getCustomerBookings = async (req, res) => {
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

    if (!mongoose.Types.ObjectId.isValid(customerId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid customer ID.",
      });
    }

    const bookings = await Booking.find({
      customer: customerId,
    })
      .populate(
        "customer",
        "name fullName email avatar profileImage"
      )
      .populate(
        "provider",
        "name fullName email avatar profileImage role"
      )
      .populate(
        "service",
        "title name category price duration description image imageUrl status provider"
      )
      .sort({ createdAt: -1 })
      .lean();

    const formattedBookings = bookings.map((booking) => {
      const provider = booking.provider || {};
      const service = booking.service || {};

      const payment = booking.payment || {};

      /**
       * --------------------------------------------------
       * REAL PAYMENT STATUS
       * --------------------------------------------------
       *
       * paymentStatus comes directly from the database,
       * which is updated by the Paystack webhook/verification.
       */
      let paymentStatus = booking.paymentStatus || "unpaid";

      /**
       * --------------------------------------------------
       * FRONTEND STATUS
       * --------------------------------------------------
       *
       * Keep your existing frontend Booking interface
       * compatible while exposing the real payment status.
       */
      let frontendStatus = booking.status || "pending";

      if (paymentStatus === "paid") {
        frontendStatus = "paid";
      } else if (
        paymentStatus === "pending" &&
        booking.status === "pending"
      ) {
        frontendStatus = "payment_pending";
      }

      if (booking.status === "completed") {
        frontendStatus = "completed";
      }

      if (booking.status === "cancelled") {
        frontendStatus = "cancelled";
      }

      return {
        /**
         * Existing frontend booking fields
         */
        id: String(booking._id),

        serviceId: service?._id
          ? String(service._id)
          : booking.service
            ? String(booking.service)
            : "",

        serviceName:
          service.title ||
          service.name ||
          "Service",

        providerId: provider?._id
          ? String(provider._id)
          : booking.provider
            ? String(booking.provider)
            : "",

        providerName:
          provider.name ||
          provider.fullName ||
          "Provider",

        providerAvatar:
          provider.avatar ||
          provider.profileImage ||
          "/images/avatar-placeholder.png",

        customerName:
          booking.customer?.name ||
          booking.customer?.fullName ||
          "Customer",

        date: booking.date || "",

        time: booking.time || "",

        location: booking.location || "",

        price: Number(booking.amount || service.price || 0),

        notes: booking.note || "",

        status: frontendStatus,

        createdAt: booking.createdAt
          ? new Date(booking.createdAt).toISOString()
          : "",

        /**
         * --------------------------------------------------
         * REAL PAYMENT INFORMATION
         * --------------------------------------------------
         */
        payment: {
          status: paymentStatus,

          reference:
            payment.reference ||
            booking.paymentReference ||
            null,

          transactionId:
            payment.transactionId || null,

          amount:
            payment.amount !== null &&
              payment.amount !== undefined
              ? Number(payment.amount) / 100
              : Number(booking.amount || 0),

          currency:
            payment.currency || "NGN",

          channel:
            payment.channel || null,

          gatewayResponse:
            payment.gatewayResponse || null,

          paidAt:
            payment.paidAt
              ? new Date(payment.paidAt).toISOString()
              : null,
        },

        /**
         * Payment reference kept separately as well
         * for easy frontend access.
         */
        paymentReference:
          booking.paymentReference || null,

        paymentStatus,

        /**
         * --------------------------------------------------
         * SERVICELY SPLIT
         * --------------------------------------------------
         */
        platformFee: Number(
          booking.platformFee || 0
        ),

        providerAmount: Number(
          booking.providerAmount || 0
        ),

        /**
         * Useful booking details
         */
        bookingStatus:
          booking.status || "pending",

        serviceDetails: {
          title:
            service.title ||
            service.name ||
            "Service",

          category:
            service.category || "",

          duration:
            service.duration || "",

          description:
            service.description || "",

          image:
            service.image ||
            service.imageUrl ||
            null,
        },
      };
    });

    return res.status(200).json({
      success: true,
      count: formattedBookings.length,
      bookings: formattedBookings,
    });
  } catch (error) {
    console.error(
      "GET CUSTOMER BOOKINGS ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Unable to load customer bookings.",
    });
  }
};

module.exports.getProviderBookings = async (req, res) => {
  try {
    const providerId =
      req.user?._id ||
      req.user?.id ||
      req.user?.userId ||
      req.user?.user_id;

    if (!providerId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const bookings = await Booking.find({
      provider: providerId,
    })
      .populate(
        "customer",
        "name email avatar profileImage phoneNumber gender"
      )
      .populate(
        "provider",
        "name email avatar profileImage"
      )
      .populate(
        "service",
        "title category price duration description image"
      )
      .sort({ createdAt: -1 });

    const formattedBookings = bookings.map((booking) => {
      const customer = booking.customer || {};
      const provider = booking.provider || {};
      const service = booking.service || {};

      return {
        id: String(booking._id),

        // EXACT SERVICE BOOKED
        serviceId: service?._id
          ? String(service._id)
          : String(booking.service || ""),

        serviceName:
          service.title ||
          service.name ||
          "Service",

        // IMAGE OF THE SERVICE THE CUSTOMER BOOKED
        serviceImage:
          service.image || "",

        providerId: provider?._id
          ? String(provider._id)
          : String(booking.provider || ""),

        providerName:
          provider.name ||
          "Provider",

        providerAvatar:
          provider.avatar ||
          provider.profileImage ||
          "",

        customerId: customer?._id
          ? String(customer._id)
          : String(booking.customer || ""),

        customerName:
          customer.name ||
          "Customer",

        customerEmail:
          customer.email ||
          "",

        customerAvatar:
          customer.avatar ||
          customer.profileImage ||
          "",

        customerPhone:
          customer.phoneNumber ||
          "",
        customerGender:
          customer.gender ||
          "",

        date: booking.date,

        time: booking.time,

        location:
          booking.location || "",

        price:
          Number(booking.amount) || 0,

        notes:
          booking.note || "",

        status:
          booking.status || "pending",

        paymentStatus:
          booking.paymentStatus || "unpaid",

        paymentReference:
          booking.paymentReference || null,

        platformFee:
          Number(booking.platformFee) || 0,

        providerAmount:
          Number(booking.providerAmount) || 0,

        createdAt:
          booking.createdAt,

        updatedAt:
          booking.updatedAt,
      };
    });

    return res.status(200).json({
      success: true,
      bookings: formattedBookings,
      count: formattedBookings.length,
    });
  } catch (error) {
    console.error(
      "GET PROVIDER BOOKINGS ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Unable to load provider bookings.",
    });
  }
};
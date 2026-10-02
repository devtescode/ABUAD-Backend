const axios = require("axios");
const crypto = require("crypto");
const mongoose = require("mongoose");

const Booking = require("../Models/booking.models");

const PAYSTACK_SECRET_KEY =
  process.env.PAYSTACK_SECRET_KEY;

const paystack = axios.create({
  baseURL: "https://api.paystack.co",

  headers: {
    Authorization:
      `Bearer ${PAYSTACK_SECRET_KEY}`,

    "Content-Type":
      "application/json",
  },
});

// ======================================================
// INITIALIZE PAYMENT
// ======================================================

module.exports.initializePayment =
  async (req, res) => {
    try {
      if (!PAYSTACK_SECRET_KEY) {
        return res.status(500).json({
          success: false,
          message:
            "Paystack secret key is not configured.",
        });
      }

      const customerId =
        req.user?._id ||
        req.user?.id ||
        req.user?.userId ||
        req.user?.user_id;

      if (!customerId) {
        return res.status(401).json({
          success: false,
          message:
            "Authentication required.",
        });
      }

      const { bookingId } = req.body;

      if (!bookingId) {
        return res.status(400).json({
          success: false,
          message:
            "Booking ID is required.",
        });
      }

      if (
        !mongoose.Types.ObjectId.isValid(
          bookingId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid booking ID.",
        });
      }

      // ==========================================
      // GET BOOKING
      // ==========================================

      const booking =
        await Booking.findById(bookingId)
          .populate(
            "customer",
            "name email"
          )
          .populate(
            "provider",
            "name email role paystack status"
          )
          .populate(
            "service",
            "title category price duration status provider"
          );

      if (!booking) {
        return res.status(404).json({
          success: false,
          message:
            "Booking not found.",
        });
      }

      // ==========================================
      // CUSTOMER OWNERSHIP
      // ==========================================

      if (
        String(booking.customer._id) !==
        String(customerId)
      ) {
        return res.status(403).json({
          success: false,
          message:
            "You are not allowed to pay for this booking.",
        });
      }

      // ==========================================
      // ALREADY PAID
      // ==========================================

      if (
        booking.paymentStatus === "paid"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "This booking has already been paid for.",
        });
      }

      // ==========================================
      // PROVIDER
      // ==========================================

      const provider =
        booking.provider;

      if (!provider) {
        return res.status(400).json({
          success: false,
          message:
            "Provider not found.",
        });
      }

      if (
        provider.role !== "provider"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "The selected user is not a service provider.",
        });
      }

      if (
        provider.status !== "active"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "This provider is currently unavailable.",
        });
      }

      // ==========================================
      // PAYSTACK SUBACCOUNT
      // ==========================================

      const subaccountCode =
        provider.paystack?.subaccountCode;

      if (!subaccountCode) {
        return res.status(400).json({
          success: false,
          message:
            "This provider has not completed their payment account setup.",
        });
      }

      if (
        !provider.paystack?.isVerified
      ) {
        return res.status(400).json({
          success: false,
          message:
            "This provider's payment account has not been verified.",
        });
      }

      // ==========================================
      // BOOKING AMOUNT
      // ==========================================

      const amount =
        Number(booking.amount);

      if (
        !Number.isFinite(amount) ||
        amount <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid booking amount.",
        });
      }

      // ==========================================
      // CUSTOMER EMAIL
      // ==========================================

      const customerEmail =
        booking.customer?.email ||
        req.user?.email;

      if (!customerEmail) {
        return res.status(400).json({
          success: false,
          message:
            "Customer email is required.",
        });
      }

      // ==========================================
      // NAIRA → KOBO
      // ==========================================

      const amountInKobo =
        Math.round(amount * 100);

      // ==========================================
      // REFERENCE
      // ==========================================

      const reference =
        `SERVICELY-${booking._id}-${Date.now()}`;

      // ==========================================
      // SAVE PAYMENT STATE
      // ==========================================

      booking.paymentReference =
        reference;

      booking.paymentStatus =
        "pending";

      await booking.save();

      // ==========================================
      // PAYSTACK
      // ==============
      // ============================

      console.log("PROVIDER PAYSTACK DATA:", {
        providerId: provider._id,
        providerName: provider.name,
        subaccountCode: provider.paystack?.subaccountCode,
        isVerified: provider.paystack?.isVerified,
      });

      // TEMPORARY SUBACCOUNT CHECK
      try {
        const subaccountTest = await paystack.get(
          `/subaccount/${encodeURIComponent(subaccountCode)}`
        );

        console.log(
          "PAYSTACK SUBACCOUNT CHECK:",
          subaccountTest.data
        );
      } catch (error) {
        console.error(
          "PAYSTACK SUBACCOUNT CHECK ERROR:",
          error.response?.data || error.message
        );
      }

      const response =
        await paystack.post(
          "/transaction/initialize",
          {
            email: customerEmail,

            amount: amountInKobo,

            reference,

            callback_url:
              process.env.PAYSTACK_CALLBACK_URL ||
              "https://servicely-ng.vercel.app/payment/verify",

            subaccount:
              subaccountCode,

            metadata: {
              bookingId:
                String(booking._id),

              customerId:
                String(customerId),

              providerId:
                String(provider._id),

              serviceId:
                String(
                  booking.service._id
                ),
            },
          }
        );

      if (
        !response.data?.status
      ) {
        booking.paymentStatus =
          "failed";

        await booking.save();

        return res.status(400).json({
          success: false,
          message:
            response.data?.message ||
            "Unable to initialize payment.",
        });
      }

      return res.status(200).json({
        success: true,

        message:
          "Payment initialized successfully.",

        authorization_url:
          response.data.data
            .authorization_url,

        access_code:
          response.data.data
            .access_code,

        reference:
          response.data.data
            .reference,
      });

    } catch (error) {
      console.error(
        "PAYSTACK INITIALIZATION ERROR:",
        error.response?.data ||
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.response?.data
            ?.message ||
          "Unable to initialize payment.",
      });
    }
  };

// ======================================================
// PAYSTACK WEBHOOK
// ======================================================

module.exports.paystackWebhook =
  async (req, res) => {
    try {
      if (!PAYSTACK_SECRET_KEY) {
        return res.sendStatus(500);
      }

      const signature =
        req.headers[
        "x-paystack-signature"
        ];

      if (!signature) {
        return res.sendStatus(401);
      }

      if (!req.rawBody) {
        console.error(
          "Paystack webhook raw body is missing."
        );

        return res.sendStatus(400);
      }

      const hash =
        crypto
          .createHmac(
            "sha512",
            PAYSTACK_SECRET_KEY
          )
          .update(req.rawBody)
          .digest("hex");

      const signatureBuffer =
        Buffer.from(
          signature,
          "utf8"
        );

      const hashBuffer =
        Buffer.from(
          hash,
          "utf8"
        );

      if (
        signatureBuffer.length !==
        hashBuffer.length ||
        !crypto.timingSafeEqual(
          signatureBuffer,
          hashBuffer
        )
      ) {
        return res.sendStatus(401);
      }

      const event = req.body;

      console.log(
        "PAYSTACK WEBHOOK:",
        event.event
      );

      if (
        event.event !==
        "charge.success"
      ) {
        return res.sendStatus(200);
      }

      const payment =
        event.data;

      if (
        !payment ||
        payment.status !== "success"
      ) {
        return res.sendStatus(200);
      }

      const reference =
        payment.reference;

      if (!reference) {
        return res.sendStatus(200);
      }

      // ==========================================
      // FIND BOOKING
      // ==========================================

      const booking =
        await Booking.findOne({
          paymentReference:
            reference,
        })
          .populate(
            "provider",
            "name email role paystack status"
          )
          .populate(
            "customer",
            "name email"
          )
          .populate(
            "service",
            "title price provider"
          );

      if (!booking) {
        console.warn(
          "Booking not found:",
          reference
        );

        return res.sendStatus(200);
      }

      // ==========================================
      // IDEMPOTENCY
      // ==========================================

      if (
        booking.paymentStatus ===
        "paid"
      ) {
        return res.sendStatus(200);
      }

      // ==========================================
      // VERIFY AMOUNT
      // ==========================================

      const expectedAmount =
        Math.round(
          Number(
            booking.amount
          ) * 100
        );

      if (
        Number(payment.amount) !==
        expectedAmount
      ) {
        console.error(
          "PAYMENT AMOUNT MISMATCH"
        );

        booking.paymentStatus =
          "failed";

        await booking.save();

        return res.sendStatus(200);
      }

      // ==========================================
      // PROVIDER
      // ==========================================

      const provider =
        booking.provider;

      if (!provider) {
        return res.sendStatus(200);
      }

      const expectedSubaccount =
        provider.paystack?.subaccountCode;

      const webhookSubaccounts =
        payment.split?.shares?.subaccounts || [];

      const matchingSubaccount =
        webhookSubaccounts.some(
          (item) =>
            item.subaccount_code ===
            expectedSubaccount
        );

      if (
        expectedSubaccount &&
        webhookSubaccounts.length > 0 &&
        !matchingSubaccount
      ) {
        console.error(
          "SUBACCOUNT MISMATCH:",
          {
            expected: expectedSubaccount,
            received: webhookSubaccounts,
          }
        );

        return res.sendStatus(200);
      }

     

      // ==========================================
      // SAVE PAYMENT
      // ==========================================

      booking.paymentStatus =
        "paid";

      booking.status =
        "confirmed";

      booking.payment = {
        reference:
          payment.reference,

        transactionId:
          payment.id
            ? String(payment.id)
            : null,

        amount:
          payment.amount,

        currency:
          payment.currency ||
          "NGN",

        channel:
          payment.channel ||
          null,

        gatewayResponse:
          payment.gateway_response ||
          null,

        paidAt:
          payment.paid_at
            ? new Date(
              payment.paid_at
            )
            : new Date(),
      };

      await booking.save();

      console.log(
        "PAYMENT SUCCESS:",
        reference
      );

      return res.sendStatus(200);
    } catch (error) {
      console.error(
        "PAYSTACK WEBHOOK ERROR:",
        error
      );

      return res.sendStatus(500);
    }
  };

// ======================================================
// VERIFY PAYMENT
// ======================================================

module.exports.verifyPayment =
  async (req, res) => {
    try {
      if (!PAYSTACK_SECRET_KEY) {
        return res.status(500).json({
          success: false,
          verified: false,
          message:
            "Paystack secret key is not configured.",
        });
      }

      const { reference } =
        req.params;

      if (!reference) {
        return res.status(400).json({
          success: false,
          verified: false,
          message:
            "Payment reference is required.",
        });
      }

      const booking =
        await Booking.findOne({
          paymentReference:
            reference,
        }).populate(
          "customer",
          "name email"
        );

      if (!booking) {
        return res.status(404).json({
          success: false,
          verified: false,
          message:
            "Booking not found.",
        });
      }

      const customerId =
        req.user?._id ||
        req.user?.id ||
        req.user?.userId ||
        req.user?.user_id;

      if (
        customerId &&
        String(
          booking.customer._id
        ) !==
        String(customerId)
      ) {
        return res.status(403).json({
          success: false,
          verified: false,
          message:
            "You are not allowed to verify this payment.",
        });
      }

      // ==========================================
      // ASK PAYSTACK
      // ==========================================

      const response =
        await paystack.get(
          `/transaction/verify/${encodeURIComponent(
            reference
          )}`
        );

      const payment =
        response.data?.data;

      if (
        !response.data?.status ||
        !payment
      ) {
        return res.status(400).json({
          success: false,
          verified: false,
          message:
            response.data?.message ||
            "Unable to verify transaction.",
        });
      }

      if (
        payment.status !==
        "success"
      ) {
        return res.status(400).json({
          success: false,
          verified: false,
          status:
            payment.status,
          message:
            "Payment has not been completed.",
        });
      }

      // ==========================================
      // AMOUNT CHECK
      // ==========================================

      const expectedAmount =
        Math.round(
          Number(
            booking.amount
          ) * 100
        );

      if (
        Number(payment.amount) !==
        expectedAmount
      ) {
        return res.status(400).json({
          success: false,
          verified: false,
          message:
            "Payment amount does not match booking amount.",
        });
      }

      // ==========================================
      // UPDATE
      // ==========================================

      booking.paymentStatus =
        "paid";

      booking.status =
        "confirmed";

      booking.payment = {
        reference:
          payment.reference,

        transactionId:
          payment.id
            ? String(payment.id)
            : null,

        amount:
          payment.amount,

        currency:
          payment.currency ||
          "NGN",

        channel:
          payment.channel ||
          null,

        gatewayResponse:
          payment.gateway_response ||
          null,

        paidAt:
          payment.paid_at
            ? new Date(
              payment.paid_at
            )
            : new Date(),
      };

      await booking.save();

      return res.status(200).json({
        success: true,
        verified: true,

        message:
          "Payment verified successfully.",

        booking: {
          id:
            booking._id,

          paymentStatus:
            booking.paymentStatus,

          status:
            booking.status,
        },

        transaction: {
          reference:
            payment.reference,

          amount:
            payment.amount,

          currency:
            payment.currency,

          channel:
            payment.channel,

          paidAt:
            payment.paid_at,
        },
      });
    } catch (error) {
      console.error(
        "PAYSTACK VERIFY ERROR:",
        error.response?.data ||
        error
      );

      return res.status(500).json({
        success: false,
        verified: false,
        message:
          error.response?.data
            ?.message ||
          "Unable to verify payment.",
      });
    }
  };
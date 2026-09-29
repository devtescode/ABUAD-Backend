const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
    {
        // ==========================================
        // CUSTOMER
        // ==========================================

        customer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },

        // ==========================================
        // PROVIDER
        // ==========================================

        provider: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },

        // ==========================================
        // SERVICE
        // ==========================================

        service: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Service",
            required: true,
            index: true,
        },

        // ==========================================
        // BOOKING DATE
        // ==========================================

        date: {
            type: String,
            required: true,
            trim: true,
        },

        // ==========================================
        // BOOKING TIME
        // ==========================================

        time: {
            type: String,
            required: true,
            trim: true,
        },

        // ==========================================
        // LOCATION
        // ==========================================

        location: {
            type: String,
            required: true,
            trim: true,
        },

        // ==========================================
        // CUSTOMER NOTE
        // ==========================================

        note: {
            type: String,
            trim: true,
            maxlength: 1000,
            default: "",
        },

        // ==========================================
        // BOOKING STATUS
        // ==========================================

        status: {
            type: String,
            enum: [
                "pending",
                "confirmed",
                "in_progress",
                "completed",
                "cancelled",
                "rejected",
            ],
            default: "pending",
            index: true,
        },

        // ==========================================
        // PAYMENT STATUS
        // ==========================================

        paymentStatus: {
            type: String,
            enum: [
                "unpaid",
                "pending",
                "paid",
                "failed",
                "refunded",
            ],
            default: "unpaid",
            index: true,
        },

        // ==========================================
        // PAYSTACK REFERENCE
        // ==========================================

        paymentReference: {
            type: String,
            default: null,
            index: true,
        },

        // ==========================================
        // PAYMENT DETAILS
        // ==========================================

        payment: {
            reference: {
                type: String,
                default: null,
            },

            transactionId: {
                type: String,
                default: null,
            },

            amount: {
                type: Number,
                default: null,
            },

            currency: {
                type: String,
                default: "NGN",
            },

            channel: {
                type: String,
                default: null,
            },

            gatewayResponse: {
                type: String,
                default: null,
            },

            paidAt: {
                type: Date,
                default: null,
            },
        },

        // ==========================================
        // BOOKING PRICE SNAPSHOT
        // ==========================================
        //
        // This is the service price at the time
        // the customer makes the booking.
        //

        amount: {
            type: Number,
            required: true,
            min: 0,
        },

        // ==========================================
        // SERVICELY PLATFORM FEE
        // ==========================================

        platformFee: {
            type: Number,
            default: 0,
            min: 0,
        },

        // ==========================================
        // PROVIDER EARNING
        // ==========================================

        providerAmount: {
            type: Number,
            default: 0,
            min: 0,
        },

        // ==========================================
        // REVIEW
        // ==========================================

        review: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Review",
            default: null,
        },

        // ==========================================
        // CANCELLATION
        // ==========================================

        cancelledBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },

        cancellationReason: {
            type: String,
            trim: true,
            maxlength: 500,
            default: "",
        },
    },
    {
        timestamps: true,
    }
);


// ==========================================
// CALCULATE SERVICELY 10% / PROVIDER 90%
// ==========================================

bookingSchema.pre("validate", function () {
    if (typeof this.amount === "number" && Number.isFinite(this.amount)) {
        this.platformFee = Math.round(this.amount * 0.10);
        this.providerAmount = Math.round(this.amount * 0.90);
    } else {
        this.platformFee = 0;
        this.providerAmount = 0;
    }
});

module.exports = mongoose.model("Booking", bookingSchema);
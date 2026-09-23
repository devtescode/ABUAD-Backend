const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const Userschema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Full name is required"],
            trim: true,
            minlength: [2, "Name must be at least 2 characters"],
        },

        matricNo: {
            type: String,
            required: [true, "Matric number is required"],
            unique: true,
            trim: true,
            uppercase: true,
        },

        email: {
            type: String,
            required: [true, "Email address is required"],
            unique: true,
            lowercase: true,
            trim: true,
        },

        gender: {
            type: String,
            required: [true, "Gender is required"],
            enum: {
                values: ["male", "female"],
                message: "Gender must be male or female",
            },
        },

        phoneNumber: {
            type: String,
            required: [true, "Phone number is required"],
            unique: true,
            trim: true,
        },

        password: {
            type: String,
            required: [true, "Password is required"],
            minlength: [6, "Password must be at least 6 characters"],
        },

        role: {
            type: String,
            enum: ["customer", "provider"],
            required: [true, "User role is required"],
        },

        status: {
            type: String,
            enum: ["active", "pending", "suspended", "rejected",],
            default: "active",
        },
          // =========================
        // PROVIDER PROFILE
        // =========================

        avatar: {
            type: String,
            default: "",
        },

        about: {
            type: String,
            trim: true,
            maxlength: [500, "About section cannot exceed 500 characters"],
            default: "",
        },

        location: {
            type: String,
            trim: true,
            default: "",
        },

        // startingPrice: {
        //     type: Number,
        //     min: [0, "Starting price cannot be negative"],
        //     default: 0,
        // },
         // -----------------------------------------
        // SAVED PROVIDERS
        // -----------------------------------------

        savedProviders: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
            },
        ],
    },
    {
        timestamps: true,
    }
);

Userschema.pre("save", async function () {
    if (!this.isModified("password")) return;

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

Userschema.methods.toJSON = function () {
    const user = this.toObject();
    delete user.password;
    return user;
};

module.exports = mongoose.model("User", Userschema);
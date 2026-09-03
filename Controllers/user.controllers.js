const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");
const User = require("../Models/user.models");

dotenv.config();


// ============================================================
// GENERATE JWT TOKEN
// Token expires after 2 hours
// ============================================================
const generateToken = (user) => {
    return jwt.sign(
        {
            id: user._id.toString(),
            role: user.role,
        },
        process.env.JWT_SECRET,
        {
            expiresIn: "2h",
        }
    );
};


// ============================================================
// SANITIZE USER
// Never send password to frontend
// ============================================================
const sanitizeUser = (user) => {
    return {
        id: user._id.toString(),
        name: user.name,
        matricNo: user.matricNo,
        email: user.email,
        phoneNumber: user.phoneNumber,
        gender: user.gender,
        role: user.role,
        status: user.status,
    };
};


// ============================================================
// USER WELCOME
// ============================================================
module.exports.userwelcome = async (req, res) => {
    return res.status(200).json({
        success: true,
        message: "Welcome to Servicely Backend",
    });
};


// ============================================================
// USER SIGNUP
// ============================================================
module.exports.usersignup = async (req, res) => {
    try {
        const {
            name,
            matricNo,
            email,
            phoneNumber,
            gender,
            password,
            role,
        } = req.body;


        // ========================================================
        // VALIDATE REQUIRED FIELDS
        // ========================================================
        if (
            !name ||
            !matricNo ||
            !email ||
            !phoneNumber ||
            !gender ||
            !password ||
            !role
        ) {
            return res.status(400).json({
                success: false,
                message: "All fields are required",
            });
        }


        // ========================================================
        // VALIDATE ROLE
        // Only customer and provider can register publicly
        // ========================================================
        if (!["customer", "provider"].includes(role)) {
            return res.status(400).json({
                success: false,
                message: "Invalid account role",
            });
        }


        // ========================================================
        // VALIDATE GENDER
        // ========================================================
        const normalizedGender = gender.trim().toLowerCase();

        if (!["male", "female"].includes(normalizedGender)) {
            return res.status(400).json({
                success: false,
                message: "Gender must be male or female",
                field: "gender",
            });
        }


        // ========================================================
        // VALIDATE PASSWORD
        // ========================================================
        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 6 characters",
                field: "password",
            });
        }


        // ========================================================
        // NORMALIZE NAME
        // ========================================================
        const normalizedName = name.trim();


        if (normalizedName.length < 2) {
            return res.status(400).json({
                success: false,
                message: "Name must be at least 2 characters",
                field: "name",
            });
        }


        // ========================================================
        // NORMALIZE EMAIL
        // ========================================================
        const normalizedEmail = email.trim().toLowerCase();


        // ========================================================
        // NORMALIZE MATRIC NUMBER
        // ========================================================
        const normalizedMatricNo = matricNo
            .trim()
            .toUpperCase();


        // ========================================================
        // NORMALIZE PHONE NUMBER
        // ========================================================
        let normalizedPhone = phoneNumber
            .trim()
            .replace(/\D/g, "");


        // Remove +234 / 234 prefix
        if (normalizedPhone.startsWith("234")) {
            normalizedPhone = normalizedPhone.substring(3);
        }


        // Remove leading 0
        if (normalizedPhone.startsWith("0")) {
            normalizedPhone = normalizedPhone.substring(1);
        }


        // ========================================================
        // VALIDATE NIGERIAN PHONE NUMBER
        // ========================================================
        if (normalizedPhone.length !== 10) {
            return res.status(400).json({
                success: false,
                message: "Enter a valid 10-digit Nigerian phone number",
                field: "phoneNumber",
            });
        }


        // Store phone number as +234XXXXXXXXXX
        normalizedPhone = `+234${normalizedPhone}`;


        // ========================================================
        // CHECK IF EMAIL ALREADY EXISTS
        // ========================================================
        const existingEmail = await User.findOne({
            email: normalizedEmail,
        });

        if (existingEmail) {
            return res.status(409).json({
                success: false,
                message: "This email is already registered",
                field: "email",
            });
        }


        // ========================================================
        // CHECK IF MATRIC NUMBER ALREADY EXISTS
        // ========================================================
        const existingMatric = await User.findOne({
            matricNo: normalizedMatricNo,
        });

        if (existingMatric) {
            return res.status(409).json({
                success: false,
                message: "This matric number is already registered",
                field: "matricNo",
            });
        }


        // ========================================================
        // CHECK IF PHONE NUMBER ALREADY EXISTS
        // ========================================================
        const existingPhone = await User.findOne({
            phoneNumber: normalizedPhone,
        });

        if (existingPhone) {
            return res.status(409).json({
                success: false,
                message: "This phone number is already registered",
                field: "phoneNumber",
            });
        }


        // ========================================================
        // ACCOUNT STATUS
        //
        // Customer → active
        // Provider → pending
        // ========================================================
        const status =
            role === "provider"
                ? "pending"
                : "active";


        // ========================================================
        // CREATE USER
        //
        // Password will be hashed by the User model's
        // pre-save middleware.
        // ========================================================
        const user = await User.create({
            name: normalizedName,
            matricNo: normalizedMatricNo,
            email: normalizedEmail,
            phoneNumber: normalizedPhone,
            gender: normalizedGender,
            password,
            role,
            status,
        });


        console.log("User created:", user._id);


        // ========================================================
        // IMPORTANT:
        //
        // DO NOT GENERATE TOKEN HERE.
        //
        // Signup only creates the account.
        // The user must login separately.
        // ========================================================

        return res.status(201).json({
            success: true,
            message:
                role === "provider"
                    ? "Provider account created successfully. Please login to continue."
                    : "Customer account created successfully. Please login to continue.",
        });

    } catch (error) {
        console.error("Signup error:", error);


        // ========================================================
        // HANDLE DUPLICATE MONGODB INDEX
        // ========================================================
        if (error.code === 11000) {
            const field =
                Object.keys(error.keyPattern || {})[0];


            return res.status(409).json({
                success: false,
                message: `${field || "Information"} is already registered`,
                field: field || null,
            });
        }


        // ========================================================
        // MONGOOSE VALIDATION ERROR
        // ========================================================
        if (error.name === "ValidationError") {
            const firstError =
                Object.values(error.errors)[0];


            return res.status(400).json({
                success: false,
                message:
                    firstError?.message ||
                    "Invalid user information",
            });
        }


        // ========================================================
        // SERVER ERROR
        // ========================================================
        return res.status(500).json({
            success: false,
            message: "Something went wrong during signup",
        });
    }
};


// ============================================================
// USER LOGIN
// ============================================================
module.exports.login = async (req, res) => {
    try {
        const {
            email,
            password,
            role,
        } = req.body;


        // ========================================================
        // VALIDATE REQUIRED FIELDS
        // ========================================================
        if (!email || !password || !role) {
            return res.status(400).json({
                success: false,
                message: "Email, password and role are required",
            });
        }


        // ========================================================
        // VALIDATE ROLE
        // Admin login is handled separately
        // ========================================================
        if (!["customer", "provider"].includes(role)) {
            return res.status(400).json({
                success: false,
                message: "Invalid account role",
            });
        }


        // ========================================================
        // NORMALIZE EMAIL
        // ========================================================
        const normalizedEmail = email
            .trim()
            .toLowerCase();


        // ========================================================
        // FIND USER
        // ========================================================
        const user = await User.findOne({
            email: normalizedEmail,
        });


        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password",
            });
        }


        // ========================================================
        // CHECK ROLE
        // ========================================================
        if (user.role !== role) {
            return res.status(401).json({
                success: false,
                message:
                    `This account is registered as a ${user.role}`,
            });
        }


        // ========================================================
        // CHECK SUSPENDED ACCOUNT
        // ========================================================
        if (user.status === "suspended") {
            return res.status(403).json({
                success: false,
                message: "Your account has been suspended",
            });
        }


        // ========================================================
        // COMPARE PASSWORD
        // ========================================================
        const passwordMatch = await bcrypt.compare(
            password,
            user.password
        );


        if (!passwordMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password",
            });
        }


        // ========================================================
        // GENERATE JWT
        //
        // Token expires after 2 hours.
        // ========================================================
        const token = generateToken(user);


        // ========================================================
        // LOGIN SUCCESSFUL
        // ========================================================
        return res.status(200).json({
            success: true,
            message: "Login successful",
            token,
            user: sanitizeUser(user),
        });

    } catch (error) {
        console.error("Login error:", error);


        // ========================================================
        // SERVER ERROR
        // ========================================================
        return res.status(500).json({
            success: false,
            message: "Something went wrong during login",
        });
    }
};


// ============================================================
// GET CURRENT USER
// ============================================================
module.exports.getCurrentUser = async (req, res) => {
    try {

        // req.user comes from verifyToken middleware
        const user = await User.findById(
            req.user.id
        ).select("-password");


        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }


        return res.status(200).json({
            success: true,
            user: sanitizeUser(user),
        });

    } catch (error) {
        console.error(
            "Get current user error:",
            error
        );


        return res.status(500).json({
            success: false,
            message: "Something went wrong",
        });
    }
};
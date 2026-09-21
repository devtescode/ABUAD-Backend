const User = require("../Models/user.models");

// ===============================
// UPDATE PROVIDER PROFILE
// ===============================
module.exports.updateProviderProfile = async (req, res) => {
    try {
        const userId = req.user.id;

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        // Make sure only providers can update this profile
        if (user.role !== "provider") {
            return res.status(403).json({
                success: false,
                message: "Only providers can update this profile",
            });
        }

        // =========================
        // PROVIDER PROFILE IMAGE
        // =========================
        if (req.file) {
            // Cloudinary returns the uploaded image URL in req.file.path
            user.avatar = req.file.path;
        }

        // =========================
        // PROVIDER INFORMATION
        // =========================
        if (req.body.name !== undefined) {
            user.name = req.body.name.trim();
        }

        if (req.body.about !== undefined) {
            user.about = req.body.about.trim();
        }

        if (req.body.location !== undefined) {
            user.location = req.body.location.trim();
        }

        if (req.body.startingPrice !== undefined) {
            const price = Number(req.body.startingPrice);

            if (Number.isNaN(price) || price < 0) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid starting price",
                });
            }

            user.startingPrice = price;
        }

        const updatedUser = await user.save();
        
        return res.status(200).json({
            success: true,
            message: "Provider profile updated successfully",
            user: updatedUser,
        });
        console.log("Provider profile updated:", updatedUser);

    } catch (error) {
        console.error("Update provider profile error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to update provider profile",
            error: error.message,
        });
    }
};
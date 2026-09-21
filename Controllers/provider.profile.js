const User = require("../Models/user.models");
const cloudinary = require("../config/cloudinary");

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
            const uploadedImage = await new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream(
                    {
                        folder: "usercreative/providers",
                        resource_type: "image",
                    },
                    (error, result) => {
                        if (error) {
                            reject(error);
                        } else {
                            resolve(result);
                        }
                    }
                );

                stream.end(req.file.buffer);
            });

            user.avatar = uploadedImage.secure_url;
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

        // if (req.body.startingPrice !== undefined) {
        //     const price = Number(req.body.startingPrice);

        //     if (Number.isNaN(price) || price < 0) {
        //         return res.status(400).json({
        //             success: false,
        //             message: "Invalid starting price",
        //         });
        //     }

        //     user.startingPrice = price;
        // }

        await user.save();

        // Never send password back
        const updatedUser = await User.findById(user._id).select(
            "-password"
        );

        console.log("Provider profile updated:", updatedUser);

        return res.status(200).json({
            success: true,
            message: "Provider profile updated successfully",
            user: updatedUser,
        });

    } catch (error) {
        console.error(
            "Update provider profile error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Failed to update provider profile",
        });
    }
};

const User = require("../Models/user.models");

// ==========================================
// GET PROVIDER AVAILABILITY
// ==========================================

module.exports.getProviderAvailability = async (req, res) => {
    try {
        const provider = await User.findOne({
            _id: req.user.id,
            role: "provider",
        }).select("availability");

        if (!provider) {
            return res.status(404).json({
                message: "Provider not found",
            });
        }

        return res.status(200).json({
            availability: provider.availability || [],
        });

    } catch (error) {
        console.error(
            "Get provider availability error:",
            error
        );

        return res.status(500).json({
            message: "Failed to fetch availability",
        });
    }
};


// ==========================================
// UPDATE PROVIDER AVAILABILITY
// ==========================================

module.exports.updateProviderAvailability = async (req, res) => {
    try {
        const { availability } = req.body;

        // -----------------------------
        // Validate array
        // -----------------------------

        if (!Array.isArray(availability)) {
            return res.status(400).json({
                message:
                    "Availability must be an array",
            });
        }

        // -----------------------------
        // Validate each day
        // -----------------------------

        for (const item of availability) {

            if (!item.day) {
                return res.status(400).json({
                    message:
                        "Every availability item must have a day",
                });
            }

            // If unavailable, no need to
            // validate the working hours.
            if (!item.available) {
                continue;
            }

            // -----------------------------
            // Start and end are required
            // -----------------------------

            if (!item.start || !item.end) {
                return res.status(400).json({
                    message:
                        `${item.day} must have a start and end time`,
                });
            }

            // -----------------------------
            // 8 AM - 6 PM restriction
            // -----------------------------

            if (
                item.start < "08:00" ||
                item.start > "18:00"
            ) {
                return res.status(400).json({
                    message:
                        `${item.day} start time must be between 8:00 AM and 6:00 PM`,
                });
            }

            if (
                item.end < "08:00" ||
                item.end > "18:00"
            ) {
                return res.status(400).json({
                    message:
                        `${item.day} end time must be between 8:00 AM and 6:00 PM`,
                });
            }

            // -----------------------------
            // End must be after start
            // -----------------------------

            if (item.end <= item.start) {
                return res.status(400).json({
                    message:
                        `${item.day} end time must be later than start time`,
                });
            }
        }

        // -----------------------------
        // Find logged-in provider
        // -----------------------------

        const provider = await User.findOne({
            _id: req.user.id,
            role: "provider",
        });

        if (!provider) {
            return res.status(404).json({
                message: "Provider not found",
            });
        }

        // -----------------------------
        // Save availability
        // -----------------------------

        provider.availability = availability;

        await provider.save();  
        console.log(
            "Provider availability updated successfully:",
            provider.availability
        );

        return res.status(200).json({
            message:
                "Availability updated successfully",

            availability:
                provider.availability,
        });

    } catch (error) {
        console.error(
            "Update provider availability error:",
            error
        );

        return res.status(500).json({
            message:
                "Failed to update availability",
        });
    }
};


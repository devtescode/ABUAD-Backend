const mongoose = require("mongoose");
const User = require("../Models/user.models");

// =====================================================
// SAVE / UNSAVE PROVIDER
// =====================================================

module.exports.toggleSavedProvider = async (req, res) => {
    try {
        const customerId = req.user.id;
        const { providerId } = req.params;

        // ---------------------------------------------
        // Validate provider ID
        // ---------------------------------------------

        if (!mongoose.Types.ObjectId.isValid(providerId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid provider ID",
            });
        }

        // ---------------------------------------------
        // Find customer
        // ---------------------------------------------

        const customer = await User.findById(customerId);

        if (!customer) {
            return res.status(404).json({
                success: false,
                message: "Customer not found",
            });
        }

        // ---------------------------------------------
        // Make sure requester is customer
        // ---------------------------------------------

        if (customer.role !== "customer") {
            return res.status(403).json({
                success: false,
                message: "Only customers can save providers",
            });
        }

        // ---------------------------------------------
        // Find provider
        // ---------------------------------------------

        const provider = await User.findById(providerId);

        if (!provider) {
            return res.status(404).json({
                success: false,
                message: "Provider not found",
            });
        }

        if (provider.role !== "provider") {
            return res.status(400).json({
                success: false,
                message: "Selected user is not a provider",
            });
        }

        // ---------------------------------------------
        // Check if already saved
        // ---------------------------------------------

        const alreadySaved = customer.savedProviders.some(
            (id) => id.toString() === providerId
        );

        if (alreadySaved) {
            // Remove provider
            customer.savedProviders =
                customer.savedProviders.filter(
                    (id) => id.toString() !== providerId
                );

            await customer.save();

            return res.status(200).json({
                success: true,
                saved: false,
                message: "Provider removed from saved list",
                providerId,
            });
        }

        // ---------------------------------------------
        // Save provider
        // ---------------------------------------------

        customer.savedProviders.push(provider._id);

        await customer.save();

        return res.status(200).json({
            success: true,
            saved: true,
            message: "Provider saved successfully",
            providerId,
        });
    } catch (error) {
        console.error(
            "Toggle saved provider error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Failed to update saved provider",
        });
    }
};

// =====================================================
// GET SAVED PROVIDERS
// =====================================================

module.exports.getSavedProviders = async (req, res) => {
    try {
        const customerId = req.user.id;

        const customer = await User.findById(customerId)
            .select("savedProviders role")
            .populate({
                path: "savedProviders",
                select: `
                    name
                    email
                    avatar
                    about
                    location
                    status
                    role
                    createdAt
                `,
            });

        if (!customer) {
            return res.status(404).json({
                success: false,
                message: "Customer not found",
            });
        }

        if (customer.role !== "customer") {
            return res.status(403).json({
                success: false,
                message: "Only customers can view saved providers",
            });
        }

        return res.status(200).json({
            success: true,
            savedProviders: customer.savedProviders || [],
        });
    } catch (error) {
        console.error(
            "Get saved providers error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Failed to fetch saved providers",
        });
    }
};
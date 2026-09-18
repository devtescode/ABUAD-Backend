const User = require("../Models/user.models");

// ========================================================
// GET PENDING PROVIDERS
// GET /api/admin/providers?status=pending
// ========================================================

module.exports.getPendingProviders = async (req, res) => {
    try {
        const providers = await User.find({
            role: "provider",
            status: "pending",
        })
            .select("-password")
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            count: providers.length,
            providers,
        });

    } catch (error) {
        console.error(
            "Get pending providers error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Failed to fetch pending providers",
        });
    }
};


// ========================================================
// APPROVE PROVIDER
// PATCH /api/admin/providers/:id/approve
// ========================================================

module.exports.approveProvider = async (req, res) => {
    try {
        const { id } = req.params;

        // Find only a provider that is currently pending
        const provider = await User.findOne({
            _id: id,
            role: "provider",
            status: "pending",
        });

        if (!provider) {
            return res.status(404).json({
                success: false,
                message:
                    "Pending provider application not found",
            });
        }

        // Change status from pending to approved
        provider.status = "approved";

        await provider.save();

        return res.status(200).json({
            success: true,
            message:
                "Provider approved successfully",
            provider: {
                id: provider._id,
                name: provider.name,
                email: provider.email,
                role: provider.role,
                status: provider.status,
            },
        });

    } catch (error) {
        console.error(
            "Approve provider error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Failed to approve provider",
        });
    }
};


// ========================================================
// REJECT PROVIDER
// PATCH /api/admin/providers/:id/reject
// ========================================================

module.exports.rejectProvider = async (req, res) => {
    try {
        const { id } = req.params;

        // Find only a provider that is currently pending
        const provider = await User.findOne({
            _id: id,
            role: "provider",
            status: "pending",
        });

        if (!provider) {
            return res.status(404).json({
                success: false,
                message:
                    "Pending provider application not found",
            });
        }

        // Change status from pending to rejected
        provider.status = "rejected";

        await provider.save();

        return res.status(200).json({
            success: true,
            message:
                "Provider rejected successfully",
            provider: {
                id: provider._id,
                name: provider.name,
                email: provider.email,
                role: provider.role,
                status: provider.status,
            },
        });

    } catch (error) {
        console.error(
            "Reject provider error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Failed to reject provider",
        });
    }
};
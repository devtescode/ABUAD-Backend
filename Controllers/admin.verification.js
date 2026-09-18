const User = require("../Models/user.models");
const mongoose = require("mongoose");

// ========================================================
// GET PROVIDERS
//
// GET /verification/providers
// GET /verification/providers?status=pending
// GET /verification/providers?status=active
// GET /verification/providers?status=rejected
// GET /verification/providers?status=suspended
//
// If no status is provided, all providers are returned.
// ========================================================

module.exports.getProviders = async (req, res) => {
    try {
        const { status } = req.query;

        // Always get providers only
        const filter = {
            role: "provider",
        };

        // Allowed provider statuses
        const allowedStatuses = [
            "pending",
            "active",
            "rejected",
            "suspended",
        ];

        // If a status was provided, validate it
        if (status) {
            if (!allowedStatuses.includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid provider status",
                    allowedStatuses,
                });
            }

            filter.status = status;
        }

        const providers = await User.find(filter)
            .select("-password")
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            count: providers.length,
            providers,
        });

    } catch (error) {
        console.error("Get providers error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch providers",
        });
    }
};


// ========================================================
// APPROVE PROVIDER
//
// PATCH /verification/providers/:id/approve
//
// pending → active
// ========================================================

module.exports.approveProvider = async (req, res) => {
    try {
        const { id } = req.params;

        console.log("Approve provider ID:", id);

        // Validate MongoDB ObjectId
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid provider ID",
            });
        }

        // Find pending provider
        const provider = await User.findOne({
            _id: id,
            role: "provider",
            status: "pending",
        });

        if (!provider) {
            return res.status(404).json({
                success: false,
                message: "Pending provider application not found",
            });
        }

        // IMPORTANT:
        // "active" means approved in your database.
        // Do NOT use "approved" because it is not in your schema enum.
        provider.status = "active";

        await provider.save();

        return res.status(200).json({
            success: true,
            message: "Provider approved successfully",
            provider: {
                id: provider._id,
                name: provider.name,
                email: provider.email,
                role: provider.role,
                status: provider.status,
            },
        });

    } catch (error) {
        console.error("Approve provider error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to approve provider",
            error: error.message,
        });
    }
};


// ========================================================
// REJECT PROVIDER
//
// PATCH /verification/providers/:id/reject
//
// pending → rejected
// ========================================================

module.exports.rejectProvider = async (req, res) => {
    try {
        const { id } = req.params;

        console.log("Reject provider ID:", id);

        // Validate MongoDB ObjectId
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid provider ID",
            });
        }

        // Find pending provider
        const provider = await User.findOne({
            _id: id,
            role: "provider",
            status: "pending",
        });

        if (!provider) {
            return res.status(404).json({
                success: false,
                message: "Pending provider application not found",
            });
        }

        // Change status to rejected
        provider.status = "rejected";

        await provider.save();

        return res.status(200).json({
            success: true,
            message: "Provider rejected successfully",
            provider: {
                id: provider._id,
                name: provider.name,
                email: provider.email,
                role: provider.role,
                status: provider.status,
            },
        });

    } catch (error) {
        console.error("Reject provider error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to reject provider",
            error: error.message,
        });
    }
};


// ========================================================
// RESTORE REJECTED PROVIDER
//
// PATCH /verification/providers/:id/restore
//
// rejected → active
//
// This allows the admin to change a rejected provider
// back to active/approved.
// ========================================================

module.exports.restoreProvider = async (req, res) => {
    try {
        const { id } = req.params;

        console.log("Restore provider ID:", id);

        // Validate MongoDB ObjectId
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid provider ID",
            });
        }

        // Find rejected provider
        const provider = await User.findOne({
            _id: id,
            role: "provider",
            status: "rejected",
        });

        if (!provider) {
            return res.status(404).json({
                success: false,
                message: "Rejected provider not found",
            });
        }

        // Restore provider to active
        provider.status = "active";

        await provider.save();

        return res.status(200).json({
            success: true,
            message: "Provider restored and approved successfully",
            provider: {
                id: provider._id,
                name: provider.name,
                email: provider.email,
                role: provider.role,
                status: provider.status,
            },
        });

    } catch (error) {
        console.error("Restore provider error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to restore provider",
            error: error.message,
        });
    }
};


// ========================================================
// SUSPEND PROVIDER
//
// PATCH /verification/providers/:id/suspend
//
// active → suspended
// ========================================================

module.exports.suspendProvider = async (req, res) => {
    try {
        const { id } = req.params;

        console.log("Suspend provider ID:", id);

        // Validate MongoDB ObjectId
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid provider ID",
            });
        }

        // Find active provider
        const provider = await User.findOne({
            _id: id,
            role: "provider",
            status: "active",
        });

        if (!provider) {
            return res.status(404).json({
                success: false,
                message: "Active provider not found",
            });
        }

        // Suspend provider
        provider.status = "suspended";

        await provider.save();

        return res.status(200).json({
            success: true,
            message: "Provider suspended successfully",
            provider: {
                id: provider._id,
                name: provider.name,
                email: provider.email,
                role: provider.role,
                status: provider.status,
            },
        });

    } catch (error) {
        console.error("Suspend provider error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to suspend provider",
            error: error.message,
        });
    }
};


// ========================================================
// UNSUSPEND PROVIDER
//
// PATCH /verification/providers/:id/unsuspend
//
// suspended → active
// ========================================================

module.exports.unsuspendProvider = async (req, res) => {
    try {
        const { id } = req.params;

        console.log("Unsuspend provider ID:", id);

        // Validate MongoDB ObjectId
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid provider ID",
            });
        }

        // Find suspended provider
        const provider = await User.findOne({
            _id: id,
            role: "provider",
            status: "suspended",
        });

        if (!provider) {
            return res.status(404).json({
                success: false,
                message: "Suspended provider not found",
            });
        }

        // Restore provider to active
        provider.status = "active";

        await provider.save();

        return res.status(200).json({
            success: true,
            message: "Provider unsuspended successfully",
            provider: {
                id: provider._id,
                name: provider.name,
                email: provider.email,
                role: provider.role,
                status: provider.status,
            },
        });

    } catch (error) {
        console.error("Unsuspend provider error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to unsuspend provider",
            error: error.message,
        });
    }
};

const User = require("../Models/user.models");
const Service = require("../Models/service.models");

/**
 * GET /admin/providers
 * Get all registered providers
 */
module.exports.getAllProviders = async (req, res) => {
  try {
    const providers = await User.find({
      role: "provider",
    })
      .select("-password")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      providers,
    });
  } catch (error) {
    console.error(
      "Get all providers error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch providers.",
    });
  }
};


/**
 * GET /admin/providers/:id
 * Get one provider's profile
 */



module.exports.getAdminProviderProfile = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Provider ID is required.",
      });
    }

    console.log("=================================");
    console.log("ADMIN PROVIDER PROFILE");
    console.log("Provider ID:", id);

    // Find the provider regardless of their current status.
    const provider = await User.findOne({
      _id: id,
      role: "provider",
    })
      .select(
        "-password -resetPasswordToken -resetPasswordExpires"
      )
      .lean();

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: "Provider not found.",
      });
    }

    console.log("Provider found:", {
      id: provider._id,
      name: provider.fullName || provider.name,
      status: provider.status,
      verified: provider.verified,
    });

    /*
     * ADMIN VIEW:
     *
     * Return ALL services belonging to this provider.
     *
     * We intentionally do not filter by status because
     * the admin needs to see:
     *
     * active
     * pending
     * suspended
     * rejected
     *
     * The status returned here is the current value
     * stored in MongoDB.
     */
    const services = await Service.find({
      provider: id,
    })
      .sort({ createdAt: -1 })
      .lean();

    console.log(
      "Services fetched:",
      services.length
    );

    console.log(
      "Service statuses:",
      services.map((service) => ({
        id: service._id,
        title: service.title,
        status: service.status,
      }))
    );

    console.log("=================================");

    return res.status(200).json({
      success: true,

      provider,

      services,

      // Helpful for debugging/verification
      serviceCount: services.length,
    });
  } catch (error) {
    console.error(
      "Get admin provider profile error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to load provider profile.",
    });
  }
};






/**
 * GET /admin/providers/:id/services
 * Get all services/posts made by a provider
 */
module.exports.getProviderServices = async (req, res) => {
  try {
    const { id } = req.params;

    const provider = await User.findOne({
      _id: id,
      role: "provider",
    }).select("_id fullName name email avatar profileImage");

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: "Provider not found.",
      });
    }

    const services = await Service.find({
      provider: id,
    })
      .populate(
        "provider",
        "fullName name email avatar profileImage"
      )
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      provider,
      services,
      count: services.length,
    });
  } catch (error) {
    console.error(
      "Get provider services error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch provider services.",
    });
  }
};


/**
 * PATCH /admin/providers/:id/suspend
 * Suspend a provider
 */
module.exports.suspendProvider = async (req, res) => {
  try {
    const { id } = req.params;

    const provider = await User.findOne({
      _id: id,
      role: "provider",
    });

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: "Provider not found.",
      });
    }

    provider.status = "suspended";

    await provider.save();

    // Suspend all provider services
    await Service.updateMany(
      { provider: id },
      {
        $set: {
          status: "suspended",
        },
      }
    );

    return res.status(200).json({
      success: true,
      message: "Provider suspended successfully.",
      provider,
    });
  } catch (error) {
    console.error(
      "Suspend provider error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to suspend provider.",
    });
  }
};


/**
 * PATCH /admin/providers/:id/unsuspend
 * Restore a suspended provider
 */

module.exports.unsuspendProvider = async (req, res) => {
  try {
    const { id } = req.params;

    const provider = await User.findOne({
      _id: id,
      role: "provider",
    });

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: "Provider not found.",
      });
    }

    provider.status = "active";

    await provider.save();

    // Restore suspended services
    await Service.updateMany(
      {
        provider: id,
        status: "suspended",
      },
      {
        $set: {
          status: "approved",
        },
      }
    );

    return res.status(200).json({
      success: true,
      message: "Provider unsuspended successfully.",
      provider,
    });
  } catch (error) {
    console.error(
      "Unsuspend provider error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to unsuspend provider.",
    });
  }
};


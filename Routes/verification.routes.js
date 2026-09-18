const express = require("express");

const router = express.Router();

const {
    getPendingProviders,
    approveProvider,
    rejectProvider,
} = require("../Controllers/admin.verification");

const { adminAuth } = require("../middleware/adminauth");

// ========================================================
// GET PENDING PROVIDERS
// ========================================================

router.get(
    "/providers",
    adminAuth,
    getPendingProviders
);


// ========================================================
// APPROVE PROVIDER
// ========================================================

router.patch(
    "/providers/:id/approve",
    adminAuth,
    approveProvider
);


// ========================================================
// REJECT PROVIDER
// ========================================================

router.patch(
    "/providers/:id/reject",
    adminAuth,
    rejectProvider
);


module.exports = router;
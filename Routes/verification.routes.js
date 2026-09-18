const express = require("express");
const router = express.Router();

const {
    getProviders,
    approveProvider,
    rejectProvider,
    restoreProvider,
    suspendProvider,
    unsuspendProvider,
} = require("../Controllers/admin.verification");

// Add your actual admin authentication middleware here
const { adminAuth } = require("../middleware/adminauth");

// ========================================================
// GET PROVIDERS
// ========================================================

router.get(
    "/providers",
    adminAuth,
    getProviders
);

// ========================================================
// PENDING → ACTIVE
// ========================================================

router.patch(
    "/providers/:id/approve",
    adminAuth,
    approveProvider
);

// ========================================================
// PENDING → REJECTED
// ========================================================

router.patch(
    "/providers/:id/reject",
    adminAuth,
    rejectProvider
);

// ========================================================
// REJECTED → ACTIVE
// ========================================================

router.patch(
    "/providers/:id/restore",
    adminAuth,
    restoreProvider
);

// ========================================================
// ACTIVE → SUSPENDED
// ========================================================

router.patch(
    "/providers/:id/suspend",
    adminAuth,
    suspendProvider
);

// ========================================================
// SUSPENDED → ACTIVE
// ========================================================

router.patch(
    "/providers/:id/unsuspend",
    adminAuth,
    unsuspendProvider
);

module.exports = router;
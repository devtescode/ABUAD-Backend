
const express = require("express");

const {
  adminExists,
  registerAdmin,
  loginAdmin,
} = require("../Controllers/admin.controllers");

const { getAllUsers } = require("../Controllers/admin.getallusers");

const {
  getAllProviders,
  getAdminProviderProfile,
  getProviderServices,
  suspendProvider,
  unsuspendProvider,
} = require("../Controllers/admin.getproviderinfo");

const { adminAuth } = require("../middleware/adminauth");

const router = express.Router();

/*
|--------------------------------------------------------------------------
| Admin Authentication
|--------------------------------------------------------------------------
*/

router.get("/exists", adminExists);

router.post("/register", registerAdmin);

router.post("/login", loginAdmin);


/*
|--------------------------------------------------------------------------
| Admin Users
|--------------------------------------------------------------------------
*/

router.get(
  "/getallusers",
  adminAuth,
  getAllUsers
);


/*
|--------------------------------------------------------------------------
| Provider Management
|--------------------------------------------------------------------------
*/

// Get all providers
router.get(
  "/providers",
  adminAuth,
  getAllProviders
);

// Get one provider
router.get(
  "/providers/:id",
  adminAuth,
  getAdminProviderProfile
);

// Get all services/posts from a provider
router.get(
  "/providers/:id/services",
  adminAuth,
  getProviderServices
);

// Suspend provider
router.patch(
  "/providers/:id/suspend",
  adminAuth,
  suspendProvider
);

// Unsuspend provider
router.patch(
  "/providers/:id/unsuspend",
  adminAuth,
  unsuspendProvider
);



module.exports = router;


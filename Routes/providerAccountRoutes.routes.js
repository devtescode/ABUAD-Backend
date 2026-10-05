const express = require("express");
const router = express.Router();

const {getProviderAccount, getPaystackBanks, setupProviderAccount, refreshProviderPaystackStatus} = require("../Controllers/providerAccountRoutes.controllers");
const { verifyToken } = require("../middleware/auth");

router.get(
  "/account",
  verifyToken,
  getProviderAccount
);

router.get(
  "/banks",
  verifyToken,
  getPaystackBanks
);

router.post(
  "/account",
  verifyToken,
  setupProviderAccount
);

router.get(
  "/refresh-paystack-status",
  verifyToken,
  refreshProviderPaystackStatus
);

module.exports = router
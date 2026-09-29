const express = require("express");
const router = express.Router();

const {getProviderAccount, getPaystackBanks, setupProviderAccount} = require("../Controllers/providerAccountRoutes.controllers");
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

module.exports = router
const axios = require("axios");
const mongoose = require("mongoose");
const User = require("../Models/user.models");

const PAYSTACK_SECRET_KEY =
  process.env.PAYSTACK_SECRET_KEY;

const PAYSTACK_BASE_URL = "https://api.paystack.co";

/**
 * Get the authenticated user's ID.
 *
 * Different authentication middleware/JWT payloads
 * may expose the ID using different property names.
 */
const getAuthenticatedUserId = (req) => {
  return (
    req.user?._id ||
    req.user?.id ||
    req.user?.userId ||
    req.user?.user_id ||
    null
  );
};

/**
 * Common Paystack headers
 */
const paystackHeaders = {
  Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
  "Content-Type": "application/json",
};

/**
 * GET PROVIDER PAYMENT ACCOUNT
 *
 * GET /provider-account/account
 */
module.exports.getProviderAccount = async (req, res) => {
  try {
    const providerId = getAuthenticatedUserId(req);

    console.log(
      "GET PROVIDER ACCOUNT - req.user:",
      req.user
    );

    console.log(
      "GET PROVIDER ACCOUNT - providerId:",
      providerId
    );

    if (!providerId) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication failed. Provider ID was not found.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(providerId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid provider ID.",
      });
    }

    const provider = await User.findById(providerId).select(
      "name fullName email role paystack"
    );

    if (!provider) {
      console.log(
        "Provider/User not found with ID:",
        providerId
      );

      return res.status(404).json({
        success: false,
        message: "Provider not found",
      });
    }

    if (provider.role !== "provider") {
      return res.status(403).json({
        success: false,
        message:
          "Only providers can access this page",
      });
    }

    const paystack = provider.paystack || {};

    return res.status(200).json({
      success: true,

      account: {
        accountName: paystack.accountName || "",
        accountNumber: paystack.accountNumber || "",
        bankCode: paystack.bankCode || "",
        bankName: paystack.bankName || "",
        isVerified: Boolean(paystack.isVerified),
        hasSubaccount: Boolean(
          paystack.subaccountCode
        ),
      },
    });
  } catch (error) {
    console.error(
      "Get provider account error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to load payment account",
    });
  }
};


/**
 * GET PAYSTACK BANKS
 *
 * GET /provider-account/banks
 */
module.exports.getPaystackBanks = async (
  req,
  res
) => {
  try {
    if (!PAYSTACK_SECRET_KEY) {
      console.error(
        "PAYSTACK_SECRET_KEY is missing."
      );

      return res.status(500).json({
        success: false,
        message:
          "Paystack configuration is missing on the server.",
      });
    }

    const response = await axios.get(
      `${PAYSTACK_BASE_URL}/bank`,
      {
        params: {
          country: "nigeria",
          perPage: 100,
        },

        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    return res.status(200).json({
      success: true,
      banks: response.data?.data || [],
    });
  } catch (error) {
    console.error(
      "Get Paystack banks error:",
      error.response?.data ||
        error.message
    );

    return res.status(500).json({
      success: false,
      message:
        error.response?.data?.message ||
        "Failed to load banks",
    });
  }
};


/**
 * VERIFY + SAVE PROVIDER PAYMENT ACCOUNT
 *
 * POST /provider-account/account
 */
module.exports.setupProviderAccount = async (
  req,
  res
) => {
  try {
    /**
     * --------------------------------------------------
     * 1. CHECK AUTHENTICATION
     * --------------------------------------------------
     */

    const providerId =
      getAuthenticatedUserId(req);

    console.log(
      "SETUP PROVIDER ACCOUNT - req.user:",
      req.user
    );

    console.log(
      "SETUP PROVIDER ACCOUNT - providerId:",
      providerId
    );

    if (!providerId) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication failed. Provider ID was not found.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(providerId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid provider ID.",
      });
    }

    /**
     * --------------------------------------------------
     * 2. GET REQUEST DATA
     * --------------------------------------------------
     */

    const {
      bankCode,
      bankName,
      accountNumber,
    } = req.body;

    const cleanBankCode = String(
      bankCode || ""
    ).trim();

    const cleanBankName = String(
      bankName || ""
    ).trim();

    const cleanAccountNumber = String(
      accountNumber || ""
    )
      .replace(/\D/g, "")
      .trim();

    if (!cleanBankCode) {
      return res.status(400).json({
        success: false,
        message: "Please select your bank.",
      });
    }

    if (!cleanAccountNumber) {
      return res.status(400).json({
        success: false,
        message:
          "Please enter your account number.",
      });
    }

    if (
      !/^\d{10}$/.test(cleanAccountNumber)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Account number must contain exactly 10 digits.",
      });
    }

    /**
     * --------------------------------------------------
     * 3. CHECK PAYSTACK CONFIGURATION
     * --------------------------------------------------
     */

    if (!PAYSTACK_SECRET_KEY) {
      console.error(
        "PAYSTACK_SECRET_KEY is missing."
      );

      return res.status(500).json({
        success: false,
        message:
          "Paystack configuration is missing on the server.",
      });
    }

    /**
     * --------------------------------------------------
     * 4. FIND PROVIDER
     * --------------------------------------------------
     */

    const provider = await User.findById(
      providerId
    );

    console.log(
      "FOUND PROVIDER:",
      provider
        ? {
            id: provider._id,
            email: provider.email,
            role: provider.role,
          }
        : null
    );

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: "Provider not found",
      });
    }

    /**
     * --------------------------------------------------
     * 5. VERIFY USER ROLE
     * --------------------------------------------------
     */

    if (provider.role !== "provider") {
      return res.status(403).json({
        success: false,
        message:
          "Only providers can setup payment accounts",
      });
    }

    /**
     * --------------------------------------------------
     * 6. RESOLVE BANK ACCOUNT WITH PAYSTACK
     * --------------------------------------------------
     *
     * This confirms that the account number belongs
     * to the selected bank and returns the account name.
     */

    let resolveResponse;

    try {
      resolveResponse = await axios.get(
        `${PAYSTACK_BASE_URL}/bank/resolve`,
        {
          params: {
            account_number:
              cleanAccountNumber,

            bank_code: cleanBankCode,
          },

          headers: {
            Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          },
        }
      );
    } catch (error) {
      console.error(
        "Paystack account resolve error:",
        error.response?.data ||
          error.message
      );

      return res.status(400).json({
        success: false,
        message:
          error.response?.data?.message ||
          "Unable to verify this bank account. Please check your bank and account number.",
      });
    }

    if (!resolveResponse.data?.status) {
      return res.status(400).json({
        success: false,
        message:
          resolveResponse.data?.message ||
          "Unable to verify this bank account.",
      });
    }

    const resolvedAccount =
      resolveResponse.data?.data || {};

    const resolvedAccountName =
      resolvedAccount.account_name;

    if (!resolvedAccountName) {
      return res.status(400).json({
        success: false,
        message:
          "Paystack could not retrieve the account name.",
      });
    }

    console.log(
      "Paystack resolved account:",
      {
        accountName:
          resolvedAccountName,
        accountNumber:
          cleanAccountNumber,
        bankCode:
          cleanBankCode,
      }
    );

    /**
     * --------------------------------------------------
     * 7. UPDATE EXISTING PAYSTACK SUBACCOUNT
     * --------------------------------------------------
     */

    const existingSubaccountCode =
      provider.paystack?.subaccountCode;

    if (existingSubaccountCode) {
      console.log(
        "Existing Paystack subaccount found:",
        existingSubaccountCode
      );

      try {
        const updateResponse =
          await axios.put(
            `${PAYSTACK_BASE_URL}/subaccount/${existingSubaccountCode}`,
            {
              business_name:
                provider.name ||
                provider.fullName ||
                resolvedAccountName,

              settlement_bank:
                cleanBankCode,

              account_number:
                cleanAccountNumber,

              percentage_charge: 10,

              primary_contact_email:
                provider.email,

              primary_contact_name:
                resolvedAccountName,
            },
            {
              headers:
                paystackHeaders,
            }
          );

        if (
          !updateResponse.data?.status
        ) {
          return res.status(400).json({
            success: false,
            message:
              updateResponse.data?.message ||
              "Failed to update Paystack account.",
          });
        }

        /**
         * Preserve any other paystack fields
         * already stored on the provider.
         */
        provider.paystack = {
          ...(provider.paystack || {}),

          accountName:
            resolvedAccountName,

          accountNumber:
            cleanAccountNumber,

          bankCode:
            cleanBankCode,

          bankName:
            cleanBankName,

          subaccountCode:
            existingSubaccountCode,

          isVerified: true,
        };

        await provider.save();

        console.log(
          "Provider Paystack account updated successfully."
        );

        return res.status(200).json({
          success: true,

          message:
            "Payment account updated successfully",

          account: {
            accountName:
              resolvedAccountName,

            accountNumber:
              cleanAccountNumber,

            bankCode:
              cleanBankCode,

            bankName:
              cleanBankName,

            isVerified: true,

            hasSubaccount: true,
          },
        });
      } catch (error) {
        console.error(
          "Paystack subaccount update error:",
          error.response?.data ||
            error.message
        );

        return res.status(400).json({
          success: false,
          message:
            error.response?.data?.message ||
            "Failed to update Paystack account.",
        });
      }
    }

    /**
     * --------------------------------------------------
     * 8. CREATE NEW PAYSTACK SUBACCOUNT
     * --------------------------------------------------
     *
     * Servicely keeps 10%.
     * Provider receives the remaining 90%.
     */

    console.log(
      "Creating new Paystack subaccount..."
    );

    let subaccountResponse;

    try {
      subaccountResponse =
        await axios.post(
          `${PAYSTACK_BASE_URL}/subaccount`,
          {
            business_name:
              provider.name ||
              provider.fullName ||
              resolvedAccountName,

            settlement_bank:
              cleanBankCode,

            account_number:
              cleanAccountNumber,

            percentage_charge: 10,

            primary_contact_email:
              provider.email,

            primary_contact_name:
              resolvedAccountName,
          },
          {
            headers:
              paystackHeaders,
          }
        );
    } catch (error) {
      console.error(
        "Paystack subaccount creation error:",
        error.response?.data ||
          error.message
      );

      return res.status(400).json({
        success: false,
        message:
          error.response?.data?.message ||
          "Failed to create Paystack subaccount.",
      });
    }

    if (
      !subaccountResponse.data?.status
    ) {
      return res.status(400).json({
        success: false,
        message:
          subaccountResponse.data?.message ||
          "Failed to create Paystack subaccount.",
      });
    }

    const paystackData =
      subaccountResponse.data?.data;

    if (
      !paystackData?.subaccount_code
    ) {
      console.error(
        "Paystack response did not contain subaccount_code:",
        paystackData
      );

      return res.status(400).json({
        success: false,
        message:
          "Paystack did not return a valid subaccount.",
      });
    }

    /**
     * --------------------------------------------------
     * 9. SAVE PAYSTACK ACCOUNT TO USER
     * --------------------------------------------------
     */

    provider.paystack = {
      ...(provider.paystack || {}),

      accountName:
        resolvedAccountName,

      accountNumber:
        cleanAccountNumber,

      bankCode:
        cleanBankCode,

      bankName:
        cleanBankName,

      subaccountCode:
        paystackData.subaccount_code,

      isVerified: true,
    };

    await provider.save();

    console.log(
      "Provider payout account saved successfully:",
      {
        providerId:
          provider._id,

        subaccountCode:
          paystackData.subaccount_code,
      }
    );

    /**
     * --------------------------------------------------
     * 10. SEND SUCCESS RESPONSE
     * --------------------------------------------------
     */

    return res.status(200).json({
      success: true,

      message:
        "Payment account verified and saved successfully",

      account: {
        accountName:
          resolvedAccountName,

        accountNumber:
          cleanAccountNumber,

        bankCode:
          cleanBankCode,

        bankName:
          cleanBankName,

        isVerified: true,

        hasSubaccount: true,
      },
    });
  } catch (error) {
    console.error(
      "Setup provider account error:",
      error.response?.data ||
        error.message ||
        error
    );

    const paystackMessage =
      error.response?.data?.message;

    return res.status(500).json({
      success: false,

      message:
        paystackMessage ||
        error.message ||
        "Unable to setup payment account",
    });
  }
};
const axios = require("axios");
const mongoose = require("mongoose");
const User = require("../Models/user.models");

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_BASE_URL = "https://api.paystack.co";

/**
 * --------------------------------------------------
 * GET AUTHENTICATED USER ID
 * --------------------------------------------------
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
 * --------------------------------------------------
 * PAYSTACK HEADERS
 * --------------------------------------------------
 */
const paystackHeaders = {
  Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
  "Content-Type": "application/json",
};

/**
 * --------------------------------------------------
 * GET PROVIDER PAYMENT ACCOUNT
 *
 * GET /provider-account/account
 * --------------------------------------------------
 */
module.exports.getProviderAccount = async (req, res) => {
  try {
    const providerId = getAuthenticatedUserId(req);

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
      return res.status(404).json({
        success: false,
        message: "Provider not found.",
      });
    }

    if (provider.role !== "provider") {
      return res.status(403).json({
        success: false,
        message:
          "Only providers can access this page.",
      });
    }

    let paystack = provider.paystack || {};

    /**
     * --------------------------------------------------
     * SYNCHRONIZE VERIFICATION STATUS WITH PAYSTACK
     * --------------------------------------------------
     */
    if (
      PAYSTACK_SECRET_KEY &&
      paystack.subaccountCode
    ) {
      try {
        const response = await axios.get(
          `${PAYSTACK_BASE_URL}/subaccount/${encodeURIComponent(
            paystack.subaccountCode
          )}`,
          {
            headers: paystackHeaders,
          }
        );

        const paystackData = response.data?.data;

        if (
          response.data?.status &&
          paystackData
        ) {
          const paystackIsVerified =
            Boolean(paystackData.is_verified);

          provider.paystack = {
            ...(provider.paystack || {}),
            isVerified: paystackIsVerified,
          };

          await provider.save();

          paystack = provider.paystack;
        }
      } catch (error) {
        console.error(
          "Paystack verification sync error:",
          error.response?.data ||
            error.message
        );
      }
    }

    return res.status(200).json({
      success: true,

      account: {
        accountName:
          paystack.accountName || "",

        accountNumber:
          paystack.accountNumber || "",

        bankCode:
          paystack.bankCode || "",

        bankName:
          paystack.bankName || "",

        isVerified:
          Boolean(paystack.isVerified),

        hasSubaccount:
          Boolean(paystack.subaccountCode),

        subaccountCode:
          paystack.subaccountCode || null,
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
        "Failed to load payment account.",
    });
  }
};

/**
 * --------------------------------------------------
 * GET PAYSTACK BANKS
 *
 * GET /provider-account/banks
 * --------------------------------------------------
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
          Authorization:
            `Bearer ${PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    return res.status(200).json({
      success: true,
      banks:
        response.data?.data || [],
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
        "Failed to load banks.",
    });
  }
};

/**
 * --------------------------------------------------
 * SETUP / UPDATE PROVIDER PAYMENT ACCOUNT
 *
 * POST /provider-account/account
 * --------------------------------------------------
 *
 * BEHAVIOR
 *
 * SAME BANK + SAME ACCOUNT
 * → Do NOT update Paystack
 * → Do NOT create another subaccount
 * → Keep existing subaccount
 *
 * DIFFERENT BANK OR ACCOUNT
 * → Update existing Paystack subaccount
 *
 * NO SUBACCOUNT
 * → Create new Paystack subaccount
 *
 * PAYSTACK VERIFICATION
 * → Always use Paystack's real status
 * --------------------------------------------------
 */
module.exports.setupProviderAccount = async (
  req,
  res
) => {
  try {
    /**
     * --------------------------------------------------
     * 1. AUTHENTICATION
     * --------------------------------------------------
     */

    const providerId =
      getAuthenticatedUserId(req);

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

    if (
      !mongoose.Types.ObjectId.isValid(
        providerId
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid provider ID.",
      });
    }

    /**
     * --------------------------------------------------
     * 2. REQUEST DATA
     * --------------------------------------------------
     */

    const {
      bankCode,
      bankName,
      accountNumber,
    } = req.body;

    const cleanBankCode =
      String(bankCode || "").trim();

    const cleanBankName =
      String(bankName || "").trim();

    const cleanAccountNumber =
      String(accountNumber || "")
        .replace(/\D/g, "")
        .trim();

    if (!cleanBankCode) {
      return res.status(400).json({
        success: false,
        message:
          "Please select your bank.",
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
      !/^\d{10}$/.test(
        cleanAccountNumber
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Account number must contain exactly 10 digits.",
      });
    }

    /**
     * --------------------------------------------------
     * 3. PAYSTACK CONFIGURATION
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

    const provider =
      await User.findById(providerId);

    if (!provider) {
      return res.status(404).json({
        success: false,
        message:
          "Provider not found.",
      });
    }

    /**
     * --------------------------------------------------
     * 5. VERIFY ROLE
     * --------------------------------------------------
     */

    if (provider.role !== "provider") {
      return res.status(403).json({
        success: false,
        message:
          "Only providers can setup payment accounts.",
      });
    }

    /**
     * --------------------------------------------------
     * 6. RESOLVE BANK ACCOUNT
     * --------------------------------------------------
     *
     * This confirms that:
     *
     * Bank + Account Number
     *
     * actually exists and returns the real
     * account name.
     */

    let resolveResponse;

    try {
      resolveResponse =
        await axios.get(
          `${PAYSTACK_BASE_URL}/bank/resolve`,
          {
            params: {
              account_number:
                cleanAccountNumber,

              bank_code:
                cleanBankCode,
            },

            headers: {
              Authorization:
                `Bearer ${PAYSTACK_SECRET_KEY}`,
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

    if (
      !resolveResponse.data?.status
    ) {
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
      String(
        resolvedAccount.account_name ||
          ""
      ).trim();

    if (!resolvedAccountName) {
      return res.status(400).json({
        success: false,
        message:
          "Paystack could not retrieve the account name.",
      });
    }

    console.log(
      "PAYSTACK RESOLVED ACCOUNT:",
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
     * 7. EXISTING PAYSTACK ACCOUNT
     * --------------------------------------------------
     */

    const existingPaystack =
      provider.paystack || {};

    const existingSubaccountCode =
      existingPaystack.subaccountCode ||
      null;

    const existingAccountNumber =
      String(
        existingPaystack.accountNumber ||
          ""
      )
        .replace(/\D/g, "")
        .trim();

    const existingBankCode =
      String(
        existingPaystack.bankCode || ""
      ).trim();

    /**
     * --------------------------------------------------
     * 8. CHECK IF SAME ACCOUNT
     * --------------------------------------------------
     *
     * IMPORTANT:
     *
     * We compare BOTH:
     *
     * - Bank code
     * - Account number
     *
     * This prevents a false match where the same
     * account number somehow exists under another bank.
     */

    const sameAccountDetails =
      Boolean(existingSubaccountCode) &&
      existingAccountNumber ===
        cleanAccountNumber &&
      existingBankCode ===
        cleanBankCode;

    /**
     * --------------------------------------------------
     * 9. SAME ACCOUNT
     * --------------------------------------------------
     *
     * If the provider submits exactly the same
     * bank/account details:
     *
     * DO NOT UPDATE PAYSTACK.
     *
     * DO NOT CREATE A NEW SUBACCOUNT.
     */

    if (sameAccountDetails) {
      console.log(
        "SAME PAYSTACK ACCOUNT DETAILS."
      );

      console.log(
        "NO PAYSTACK UPDATE REQUIRED."
      );

      let currentIsVerified =
        Boolean(
          existingPaystack.isVerified
        );

      /**
       * Fetch the current real Paystack status.
       */
      try {
        const statusResponse =
          await axios.get(
            `${PAYSTACK_BASE_URL}/subaccount/${encodeURIComponent(
              existingSubaccountCode
            )}`,
            {
              headers:
                paystackHeaders,
            }
          );

        if (
          statusResponse.data?.status &&
          statusResponse.data?.data
        ) {
          const currentData =
            statusResponse.data.data;

          currentIsVerified =
            Boolean(
              currentData.is_verified
            );
        }
      } catch (error) {
        console.error(
          "Unable to refresh Paystack status:",
          error.response?.data ||
            error.message
        );
      }

      /**
       * Keep local database synchronized.
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

        isVerified:
          currentIsVerified,
      };

      await provider.save();

      console.log(
        "EXISTING SUBACCOUNT KEPT:",
        existingSubaccountCode
      );

      return res.status(200).json({
        success: true,

        message:
          currentIsVerified
            ? "Your payment account is already connected and verified."
            : "Your payment account is already connected. Paystack verification is pending.",

        account: {
          accountName:
            resolvedAccountName,

          accountNumber:
            cleanAccountNumber,

          bankCode:
            cleanBankCode,

          bankName:
            cleanBankName,

          isVerified:
            currentIsVerified,

          hasSubaccount: true,

          subaccountCode:
            existingSubaccountCode,
        },
      });
    }

    /**
     * --------------------------------------------------
     * 10. DIFFERENT ACCOUNT
     * --------------------------------------------------
     *
     * At this point:
     *
     * - The provider has a subaccount
     * - BUT the bank/account has changed
     *
     * Therefore update the existing Paystack
     * subaccount.
     */

    let finalSubaccountCode =
      existingSubaccountCode;

    let paystackSubaccount = null;

    if (existingSubaccountCode) {
      console.log(
        "DIFFERENT BANK/ACCOUNT DETECTED."
      );

      console.log(
        "UPDATING EXISTING PAYSTACK SUBACCOUNT:",
        existingSubaccountCode
      );

      try {
        const updateResponse =
          await axios.put(
            `${PAYSTACK_BASE_URL}/subaccount/${encodeURIComponent(
              existingSubaccountCode
            )}`,
            {
              business_name:
                provider.name ||
                provider.fullName ||
                resolvedAccountName,

              settlement_bank:
                cleanBankCode,

              account_number:
                cleanAccountNumber,

              /**
               * Servicely = 10%
               * Provider = 90%
               */
              percentage_charge: 10,

              primary_contact_email:
                provider.email,

              primary_contact_name:
                resolvedAccountName,

              active: true,
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

        paystackSubaccount =
          updateResponse.data?.data;

        finalSubaccountCode =
          paystackSubaccount?.subaccount_code ||
          existingSubaccountCode;

        console.log(
          "PAYSTACK SUBACCOUNT UPDATED:",
          {
            subaccountCode:
              finalSubaccountCode,

            isVerified:
              paystackSubaccount?.is_verified,
          }
        );
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
     * 11. CREATE NEW SUBACCOUNT
     * --------------------------------------------------
     *
     * Only happens when provider has NEVER
     * had a Paystack subaccount.
     */

    if (!existingSubaccountCode) {
      console.log(
        "NO EXISTING PAYSTACK SUBACCOUNT."
      );

      console.log(
        "CREATING NEW PAYSTACK SUBACCOUNT..."
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

              /**
               * Servicely = 10%
               * Provider = 90%
               */
              percentage_charge: 10,

              primary_contact_email:
                provider.email,

              primary_contact_name:
                resolvedAccountName,

              active: true,
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

      paystackSubaccount =
        subaccountResponse.data?.data;

      finalSubaccountCode =
        paystackSubaccount?.subaccount_code;

      if (!finalSubaccountCode) {
        console.error(
          "Paystack response did not contain subaccount_code:",
          paystackSubaccount
        );

        return res.status(400).json({
          success: false,
          message:
            "Paystack did not return a valid subaccount.",
        });
      }

      console.log(
        "NEW PAYSTACK SUBACCOUNT CREATED:",
        {
          subaccountCode:
            finalSubaccountCode,

          isVerified:
            paystackSubaccount?.is_verified,
        }
      );
    }

    /**
     * --------------------------------------------------
     * 12. FETCH ACTUAL PAYSTACK STATUS
     * --------------------------------------------------
     *
     * Never assume verification.
     */
    try {
      const statusResponse =
        await axios.get(
          `${PAYSTACK_BASE_URL}/subaccount/${encodeURIComponent(
            finalSubaccountCode
          )}`,
          {
            headers:
              paystackHeaders,
          }
        );

      if (
        statusResponse.data?.status &&
        statusResponse.data?.data
      ) {
        paystackSubaccount =
          statusResponse.data.data;
      }
    } catch (error) {
      console.error(
        "Paystack subaccount status check error:",
        error.response?.data ||
          error.message
      );
    }

    /**
     * --------------------------------------------------
     * 13. REAL PAYSTACK VERIFICATION STATUS
     * --------------------------------------------------
     */

    const paystackIsVerified =
      Boolean(
        paystackSubaccount?.is_verified
      );

    /**
     * --------------------------------------------------
     * 14. SAVE PROVIDER ACCOUNT
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
        finalSubaccountCode,

      /**
       * This is Paystack's REAL status.
       */
      isVerified:
        paystackIsVerified,
    };

    await provider.save();

    console.log(
      "PROVIDER PAYSTACK ACCOUNT SAVED:",
      {
        providerId:
          provider._id,

        subaccountCode:
          finalSubaccountCode,

        isVerified:
          paystackIsVerified,
      }
    );

    /**
     * --------------------------------------------------
     * 15. RESPONSE MESSAGE
     * --------------------------------------------------
     */

    const message =
      paystackIsVerified
        ? "Payment account saved and verified successfully."
        : "Payment account saved successfully. Paystack verification is pending.";

    /**
     * --------------------------------------------------
     * 16. FINAL RESPONSE
     * --------------------------------------------------
     */

    return res.status(200).json({
      success: true,

      message,

      account: {
        accountName:
          resolvedAccountName,

        accountNumber:
          cleanAccountNumber,

        bankCode:
          cleanBankCode,

        bankName:
          cleanBankName,

        isVerified:
          paystackIsVerified,

        hasSubaccount:
          Boolean(
            finalSubaccountCode
          ),

        subaccountCode:
          finalSubaccountCode,
      },
    });
  } catch (error) {
    console.error(
      "SETUP PROVIDER ACCOUNT ERROR:",
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
        "Unable to setup payment account.",
    });
  }
};
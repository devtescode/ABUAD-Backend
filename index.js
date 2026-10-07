const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
require("dotenv").config();
const cors = require("cors");

// Routes
const userRoutes = require("./Routes/user.routes");
const adminRoutes = require("./Routes/admin.routes");
const providerRoutes = require("./Routes/provider.routes");
const verificationRoutes = require("./Routes/verification.routes");
const portfolioRoutes = require("./Routes/provider.portfolio.routes");
const availabilityRoutes = require("./Routes/availability.routes");
const providerAccountRoutes = require("./Routes/providerAccountRoutes.routes");
const paymentRoutes = require("./Routes/payment.routes");
const bookingsRoutes = require("./Routes/booking.routes");
const reviewRoutes = require("./Routes/review.routes");

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 4500;
const URI = process.env.URI;

/*
|--------------------------------------------------------------------------
| CORS
|--------------------------------------------------------------------------
*/

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

/*
|--------------------------------------------------------------------------
| BODY PARSERS
|--------------------------------------------------------------------------
|
| IMPORTANT FOR PAYSTACK WEBHOOK
|
| Paystack webhook signature verification requires the original
| request body. The verify function stores the raw Buffer in
| req.rawBody before express converts it to JSON.
|
*/

app.use(
  express.json({
    limit: "200mb",

    verify: (req, res, buf) => {
      req.rawBody = Buffer.from(buf);
    },
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "200mb",
  })
);

/*
|--------------------------------------------------------------------------
| DATABASE
|--------------------------------------------------------------------------
*/

mongoose
  .connect(URI)
  .then(() => {
    console.log(
      "Database connected successfully usercreative Backend"
    );
  })
  .catch((err) => {
    console.error("Database connection error:", err);
  });

/*
|--------------------------------------------------------------------------
| API ROUTES
|--------------------------------------------------------------------------
*/

app.use("/usercreative", userRoutes);

app.use("/admin", adminRoutes);

app.use("/provider", providerRoutes);

app.use("/verification", verificationRoutes);

app.use("/portfolio", portfolioRoutes);

app.use("/availability", availabilityRoutes);

app.use("/provider-account", providerAccountRoutes);

app.use("/bookings", bookingsRoutes)

app.use("/reviews", reviewRoutes)

/*
|--------------------------------------------------------------------------
| PAYMENTS
|--------------------------------------------------------------------------
|
| Includes:
|
| POST /payments/initialize
| POST /payments/webhook
| GET  /payments/verify/:reference
|
| IMPORTANT:
| The webhook route must NOT use the normal protect/auth middleware
| because Paystack does not have a Servicely login token.
|
*/

app.use("/payments", paymentRoutes);

/*
|--------------------------------------------------------------------------
| HOME / HEALTH CHECK
|--------------------------------------------------------------------------
*/

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Welcome to usercreative Backend",
  });
});

/*
|--------------------------------------------------------------------------
| 404 HANDLER
|--------------------------------------------------------------------------
*/

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    path: req.originalUrl,
  });
});

/*
|--------------------------------------------------------------------------
| GLOBAL ERROR HANDLER
|--------------------------------------------------------------------------
*/

app.use((err, req, res, next) => {
  console.error("Error:", err);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

/*
|--------------------------------------------------------------------------
| START SERVER
|--------------------------------------------------------------------------
*/

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
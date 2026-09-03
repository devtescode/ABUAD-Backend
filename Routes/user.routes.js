const express = require("express")
const { usersignup, login } = require("../Controllers/user.controllers")
const router = express.Router()
// const upload = require("../middleware/upload");
// const { verifyToken } = require("../middleware/auth");



router.post("/signup", usersignup)
router.post("/login", login)



module.exports = router
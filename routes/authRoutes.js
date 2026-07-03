const express = require('express');
const {
  register,
  login,
  logout,
  getMe,
  updateMe,
  updatePassword,
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);

router.use(protect); // كل اللي تحت محتاج تسجيل دخول
router.get('/me', getMe);
router.patch('/update-me', updateMe);
router.patch('/update-password', updatePassword);

module.exports = router;

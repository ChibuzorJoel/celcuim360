/**
 * controllers/auth.controller.js - Student Authentication
 */

const Registration = require('../models/Registration');
const jwt = require('jsonwebtoken');

/**
 * Student Login
 * POST /api/auth/login
 */
exports.studentLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required"
      });
    }

    // Find user and force include password
    const user = await Registration.findOne({ 
      email: email.toLowerCase().trim() 
    }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    // Use model's checkPassword method
    const isMatch = await user.checkPassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    // Check if account is approved
    if (user.status !== 'approved' && user.status !== 'verified') {
      return res.status(403).json({
        success: false,
        message: "Your account is still under review. Please wait for admin approval."
      });
    }

    // Generate JWT Token
    const token = jwt.sign(
      { 
        id: user._id, 
        email: user.email, 
        role: 'student',
        fullName: user.fullName 
      },
      process.env.JWT_SECRET || 'celcium360_strong_secret_2026',
      { expiresIn: '7d' }        // Longer expiry for students
    );

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        status: user.status,
        category: user.category
      }
    });

  } catch (error) {
    console.error("Student Login Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error. Please try again later."
    });
  }
};

/**
 * Get Current Student Profile (Protected)
 * GET /api/auth/me
 */
exports.getMe = async (req, res) => {
  try {
    const user = await Registration.findById(req.user.id)
      .select('-password -__v');

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
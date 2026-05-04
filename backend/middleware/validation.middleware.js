/**
 * middleware/validation.middleware.js - Request validation
 */

const validateRegistration = (req, res, next) => {
    const { fullName, email, phone, category, assessmentScore, assessmentTotal } = req.body;
  
    // Validate required fields
    if (!fullName || !fullName.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Full name is required'
      });
    }
  
    if (!email || !/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Valid email is required'
      });
    }
  
    if (!phone || !phone.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      });
    }
  
    if (!category || !['nysc', 'graduate'].includes(category)) {
      return res.status(400).json({
        success: false,
        message: 'Valid category is required'
      });
    }
  
    // Validate files
    if (!req.files || !req.files.photo) {
      return res.status(400).json({
        success: false,
        message: 'Photo is required'
      });
    }
  
    if (category === 'nysc') {
      if (!req.files.statement) {
        return res.status(400).json({
          success: false,
          message: 'Statement of Result is required for NYSC category'
        });
      }
      if (!req.files.callUpLetter) {
        return res.status(400).json({
          success: false,
          message: 'NYSC Call-Up Letter is required'
        });
      }
    }
  
    if (!req.files.paymentProof) {
      return res.status(400).json({
        success: false,
        message: 'Payment proof is required'
      });
    }
  
    // Validate assessment data
    if (!assessmentScore || !assessmentTotal) {
      return res.status(400).json({
        success: false,
        message: 'Assessment data is incomplete'
      });
    }
  
    next();
  };
  
  module.exports = { validateRegistration };
  
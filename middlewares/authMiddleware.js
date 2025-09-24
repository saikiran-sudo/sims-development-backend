const jwt = require("jsonwebtoken");
const User = require('../models/CoreUser/User');
const AdminProfile = require('../models/CoreUser/AdminProfile');
const Admin = require('../models/CoreUser/Admin');
// const redisClient = require('../config/redisClient');


exports.protect = async (req, res, next) => {
  
  let token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    // const blacklisted = await redisClient.get(`blacklist:${token}`);
    // if (blacklisted) return res.status(401).json({ message: "Token has been revoked" });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    let user = await User.findById(decoded.id).select("-password");
    
    if (!user) {
      user = await Admin.findById(decoded.id).select("-password");
    }
    
    req.user = user;

    
    if (!req.user) return res.status(404).json({ message: "User not found" });
    next();
  } catch (err) {
    console.error('Token validation error:', err);
    res.status(401).json({ message: "Token validation failed", error: err.message });
  }
};
// const protect = async (req, res, next) => {
//   let token = req.headers.authorization?.split(' ')[1];

//   if (!token) {
//     return res.status(401).json({ message: 'No token, not authorized' });
//   }

//   try {
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     req.user = await User.findById(decoded.id).select('-password');
//     next();
//   } catch {
//     return res.status(401).json({ message: 'Token failed' });
//   }
// };



exports.checkRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied: Insufficient or missing role' });
    }
    next();
  };
};


exports.verifyToken = (req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ message: "No token provided" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(403).json({ message: "Invalid or expired token" });
  }
};

exports.authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }
    next();
  };
};

// role-based access middleware
exports.adminOnly = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied: Admins only' });
  }
  next();
};

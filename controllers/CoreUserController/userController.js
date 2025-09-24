const User = require('../../models/CoreUser/User');
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Admin = require('../../models/CoreUser/Admin');

exports.register = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: "User already exists" });

    
    const newUser = new User({ email, password, role });
    await newUser.save();

    res.status(201).json({ message: "User registered successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { user_id, password } = req.body;

    const user = await User.findOne({ user_id });
    // console.log(user);
    const userprofile = {
      _id: user._id,
      user_id: user.user_id,
      full_name: user.full_name,
      email: user.email,
      phone: user.phone,
      profileImage: user.profileImage,
      role: user.role,
      subjects_taught: user.subjects_taught,
      assigned_classes: user.assigned_classes,
      is_active: user.is_active,
      renewalDate: user.renewalDate,
      class_id: user.class_id,
      section: user.section,
      status: user.status,
    }
    
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const isMatch = await user.matchPassword(password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "30d" });

    user.last_login = new Date();
    await user.save();

    res.status(200).json({ token, role: user.role ,userprofile});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findOne({ user_id: req.user.user_id }).select("-password");
    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current password and new password are required" });
    }
    
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const admin = await Admin.findOne({users:req.user.id});
    admin.password = newPassword;
    
    await user.changePassword(currentPassword, newPassword);
    await admin.save();
    
    res.status(200).json({ message: "Password changed successfully" });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

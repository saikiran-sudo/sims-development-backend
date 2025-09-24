const Admin = require("../../models/CoreUser/Admin");
const User = require('../../models/CoreUser/User');
const bcrypt = require("bcryptjs");
const Student = require("../../models/CoreUser/Student");
const Teacher = require("../../models/CoreUser/Teacher");
const Parent = require("../../models/CoreUser/Parent");
const AdminStaff = require("../../models/CoreUser/AdminStaff");
const cloudinary = require('cloudinary').v2;
const { sendEmail } = require('../../utils/email');
const PasswordResetToken = require('../../models/CoreUser/PasswordResetToken');

// Generate a random 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP to email
exports.sendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    // Check if email exists in the system
    const existingAdmin = await Admin.findOne({ email });
    if (!existingAdmin) {
      return res.status(404).json({ message: "Email not found in our system" });
    }

    // Generate OTP and token
    const otp = generateOTP();
    const token = require('crypto').randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Delete any existing reset tokens for this email
    await PasswordResetToken.deleteMany({ email });

    // Store OTP and token in database
    const resetToken = new PasswordResetToken({
      email,
      token,
      otp,
      expiresAt,
      userType: 'admin',
      used: false
    });

    await resetToken.save();

    // Email content
    const subject = "OTP Verification - School Management System";
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333; text-align: center;">OTP Verification</h2>
        <p>Hello,</p>
        <p>You have requested an OTP for your School Management System account.</p>
        <div style="background-color: #f4f4f4; padding: 20px; text-align: center; margin: 20px 0;">
          <h1 style="color: #007bff; font-size: 32px; margin: 0; letter-spacing: 5px;">${otp}</h1>
        </div>
        <p><strong>This OTP will expire in 5 minutes.</strong></p>
        <p>If you didn't request this OTP, please ignore this email.</p>
        <p>Best regards,<br>School Management System Team</p>
      </div>
    `;

    // Send email
    const emailResult = await sendEmail({
      to: email,
      subject,
      html,
      text: `Your OTP is: ${otp}. This OTP will expire in 5 minutes.`
    });

    // For development, if email fails, we still have the OTP stored in Redis
    // The OTP will be logged in console for testing purposes
    if (emailResult.otp) {
      console.log(`=== DEVELOPMENT MODE ===`);
      console.log(`Email: ${email}`);
      console.log(`OTP: ${otp}`);
      console.log(`=== END DEVELOPMENT MODE ===`);
    }

    res.status(200).json({ 
      message: "OTP sent successfully to your email",
      email: email,
      // For development, include OTP in response if email failed
      ...(emailResult.otp && { developmentOtp: otp })
    });

  } catch (error) {
    console.error('Error sending OTP:', error);
    res.status(500).json({ message: "Failed to send OTP. Please try again." });
  }
};

// Verify OTP
exports.verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required" });
    }

    // Find the reset token in database
    const resetToken = await PasswordResetToken.findOne({
      email,
      otp,
      used: false,
      expiresAt: { $gt: new Date() }
    });

    if (!resetToken) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    // Mark OTP as used
    resetToken.used = true;
    await resetToken.save();

    // Get admin details
    const admin = await Admin.findOne({ email }).select('-password');
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    res.status(200).json({ 
      message: "OTP verified successfully",
      admin: admin
    });

  } catch (error) {
    console.error('Error verifying OTP:', error);
    res.status(500).json({ message: "Failed to verify OTP. Please try again." });
  }
};


exports.createAdmin = async (req, res) => {
  try {
    const { schoolName, email, userId, password, planType, contactNumber, profileImage } = req.body;

    // if (password !== confirm_password) {
    //   return res.status(400).json({ message: "Passwords do not match" });
    // }

    
    const now = new Date();
    let renewalDate;
    if (planType === "monthly") {
      renewalDate = new Date(now.setDate(now.getDate() + 30));
    } else if (planType === "yearly") {
      renewalDate = new Date(now.setFullYear(now.getFullYear() + 1));
    }

    const newUser = await User.create({
      user_id: userId,
      full_name: schoolName,
      phone: contactNumber,
      profileImage: profileImage,
      email,
      password, 
      role: 'admin',
      is_active: true,
      renewalDate: renewalDate,
      status: "Active",
    });

    const newAdmin = await Admin.create({
      schoolName,
      email,
      userId,
      password, 
      planType,
      contactNumber,
      profileImage, 
      renewalDate,
      status: "Active",
      users: newUser._id,
    });
    



    res.status(201).json(newAdmin);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


exports.getAllAdmins = async (req, res) => {
  const admins = await Admin.find().select("-password");
  res.json(admins);
};


exports.updateAdmin = async (req, res) => {
  try {
    const { password, status, planType, contactNumber, profileImage,email } = req.body;
    const admin = await Admin.findById(req.params.id);
    if (!admin) return res.status(404).json({ message: "Admin not found" });

    // Store the original password before any modifications
    let hashedPassword = null;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    if (status) admin.status = status;
    if (planType) {
      admin.planType = planType;
      const now = new Date();
      admin.renewalDate =
        planType === "monthly"
          ? new Date(now.setDate(now.getDate() + 30))
          : new Date(now.setFullYear(now.getFullYear() + 1));
    }
    if (contactNumber !== undefined) admin.contactNumber = contactNumber;
    if (profileImage !== undefined) admin.profileImage = profileImage;
    if (email !== undefined) admin.email = email;
    // Update password if provided
    if (hashedPassword) {
      admin.password = hashedPassword;
    }

    await admin.save();
    
    // Update the corresponding User document
    const userUpdateData = {};
    if (status) userUpdateData.status = status;
    if (planType) userUpdateData.planType = planType;
    if (contactNumber !== undefined) userUpdateData.phone = contactNumber;
    if (profileImage !== undefined) userUpdateData.profileImage = profileImage;
    if (email !== undefined) userUpdateData.email = email;
    // Update the User document
    if (Object.keys(userUpdateData).length > 0) {
      await User.findByIdAndUpdate(admin.users, userUpdateData);
    }
    
    // Handle password update separately to avoid double hashing
    if (hashedPassword) {
      // Use updateOne to bypass pre-save middleware
      await User.updateOne(
        { _id: admin.users },
        { $set: { password: hashedPassword } }
      );
    }
    res.json(admin);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};


exports.updateAdminStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const admin = await Admin.findById(req.params.id);
    if (!admin) return res.status(404).json({ message: "Admin not found" });

    admin.status = status;
    await admin.save();

    
    await User.findOneAndUpdate(
      { user_id: admin.userId },
      { status }
    );

    
    const Student = require("../../models/CoreUser/Student");
    const Teacher = require("../../models/CoreUser/Teacher");
    const Parent = require("../../models/CoreUser/Parent");

    
    await Student.updateMany({}, { status });
    await User.updateMany({ role: "student" }, { status });

    
    await Teacher.updateMany({}, { status });
    await User.updateMany({ role: "teacher" }, { status });

    
    await Parent.updateMany({}, { status });
    await User.updateMany({ role: "parent" }, { status });

    res.json(admin);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};


exports.deleteAdmin = async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id);
    if (!admin) return res.status(404).json({ message: "Admin not found" });

    const imageUrl = admin.profileImage;
    const publicId = imageUrl.split('/').pop().split('.')[0];

    if (publicId) {
      cloudinary.config({
        // secure: true,
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
      });

      // await deleteImageFromCloudinary(imageUrl);
      await cloudinary.uploader.destroy(publicId);
    }

    await admin.deleteOne();
    res.json({ message: "Admin deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


exports.getUserCounts = async (req, res) => {
  try {
    const studentCount = await Student.countDocuments();
    const teacherCount = await Teacher.countDocuments();
    const parentCount = await Parent.countDocuments();
    const staffCount = await AdminStaff.countDocuments();
    res.json({ studentCount, teacherCount, parentCount, staffCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


exports.getStudentTeacherParentCounts = async (req, res) => {
  try {
    const studentCount = await Student.countDocuments();
    const teacherCount = await Teacher.countDocuments();
    const parentCount = await Parent.countDocuments();
    res.json({ studentCount, teacherCount, parentCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


exports.updateExpiredAdminStatuses = async () => {
  const now = new Date();
  const expiredAdmins = await Admin.find({ renewalDate: { $lt: now }, status: 'Active' });
  for (const admin of expiredAdmins) {
    admin.status = 'Inactive';
    await admin.save();
  }
};

// Reset password after OTP verification
exports.resetPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
      return res.status(400).json({ message: "Email and new password are required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters long" });
    }

    // Find admin by email
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update admin password
    admin.password = hashedPassword;
    await admin.save();

    // Update corresponding User document password
    await User.findByIdAndUpdate(admin.users, { password: hashedPassword });

    // Send confirmation email
    const subject = "Password Reset Successful - School Management System";
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #28a745; text-align: center;">Password Reset Successful</h2>
        <p>Hello,</p>
        <p>Your password has been successfully reset for your School Management System account.</p>
        <p>If you didn't perform this action, please contact support immediately.</p>
        <p>Best regards,<br>School Management System Team</p>
      </div>
    `;

    await sendEmail({
      to: email,
      subject,
      html,
      text: "Your password has been successfully reset. If you didn't perform this action, please contact support immediately."
    });

    res.status(200).json({ message: "Password reset successfully" });

  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ message: "Failed to reset password. Please try again." });
  }
};

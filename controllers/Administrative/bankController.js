const BankDetails = require("../../models/AdministrativeSchema/BankDetails");
const cloudinary = require("../../config/cloudinary");
const fs = require("fs");
const Parent = require("../../models/CoreUser/Parent");


exports.uploadBankDetails = async (req, res) => {
  try {

    const { bankName,accountHolderName, accountNumber, ifscCode, upiId, qrFileName} = req.body;

    const data = await BankDetails.create({
      bankName,
      accountHolderName,
      accountNumber,
      ifscCode,
      upiId,
      qrFileName,
      admin_id: req.user._id,
    });

    res.status(201).json(data);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};


exports.getLatestBankDetails = async (req, res) => {
  try {
    // const latest = await BankDetails.findOne().sort({ createdAt: -1 });
    const all = await BankDetails.find({ admin_id: req.user._id });
    res.json(all);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
exports.getLatestBankDetailsUnderMyAdmin = async (req, res) => {
  try {
    // const latest = await BankDetails.findOne().sort({ createdAt: -1 });
    const parent = await Parent.findOne({ users: req.user._id });
    const all = await BankDetails.find({ admin_id: parent.admin_id });
    res.json(all);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
exports.deleteBankDetails = async (req, res) => {
  try {
    const deleted = await BankDetails.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Bank details not found' });

    const imageUrl = deleted.qrFileName;
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
    res.json({ message: 'Bank details deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
exports.updateBankDetails = async (req, res) => {
  try {
    const updated = await BankDetails.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ message: 'Bank details not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

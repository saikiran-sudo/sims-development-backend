const mongoose = require('mongoose');

const PersonalDiarySchema = new mongoose.Schema({
  teacherId: { type: String, required: true },
  date: { type: String, required: true },
  title: { type: String, required: true },
  content: { type: String, required: true },
  
}, { timestamps: true });

module.exports = mongoose.model('PersonalDiary', PersonalDiarySchema); 
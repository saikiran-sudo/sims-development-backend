const mongoose = require("mongoose");

const { Schema } = mongoose;

const ExamSchema = new Schema(
  {
    exam_id: {
      type: String,
      required: true,
      unique: true,
    },
    exam_name: {
      type: String,
      enum: ["Mid-Term", "Final", "Unit Test", "Quarterly", "Half-Yearly", "Annual"],
    },
    academic_year: {
      type: String, 
    },
    start_date: {
      type: Date,
    },
    end_date: {
      type: Date,
    },
    syllabus_file: {
      type: String, 
      default: null,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    admin_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      required: true,
    },
  },
  {
    collection: "exams",
  }
);

module.exports = mongoose.model("Exam", ExamSchema);

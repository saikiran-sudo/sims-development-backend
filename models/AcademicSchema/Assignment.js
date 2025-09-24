const mongoose = require("mongoose");

const AssignmentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  class: {
    // type:String,
    // required:true
    type: mongoose.Schema.Types.ObjectId,
    ref: "Class",
    required: true,
  },
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Subject",
    required: true
  },
  teacher_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Teacher"
  },
  dueDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ["Pending", "Submitted", "Late"],
    default:"Pending"
  },
  submissions: {
    type: Number,
    default: 0
  },
  graded: {
    type: Number,
  },
  description: {
    type: String,
    required: true
  },
  section: {
    type: String,
    required: true
  },
  admin_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true,
  },

});

module.exports = mongoose.model("Assignment", AssignmentSchema);

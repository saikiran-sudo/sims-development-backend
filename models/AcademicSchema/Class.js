const mongoose = require('mongoose');

const ClassSchema = new mongoose.Schema({
  class_name: {
    type: String,
    required: true
  },
  strength: {
    type: Number,
    default: 0
  },
  section:{
    type: String,
    required: true
  },
  supervisor:{
    type:String
  },
  teachers_details:[
    {
      name: {
        type: String,
        required: true
      },
      empId: {
        type: String,
        required: true
      },
      subjects: [{
        type: String
      }]
    }
  ],
  admin_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true,
  },
  // academic_year: {
  //   type: String,
  //   required: true,
  // },
  // class_teacher_id: {
  //   type: mongoose.Schema.Types.ObjectId,
  //   ref: 'Teacher',
  //   required: true,
  // },
  // room_number: {
  //   type: String,
  //   required: true,
  // },
  // subjects: [
  //   {
  //     subject_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },
  //     teachers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' }],
  //   },
  // ],
}, { timestamps: true });

// Create a compound unique index for class_name + section + admin_id
// This allows multiple sections of the same class but prevents duplicates within the same admin
ClassSchema.index({ class_name: 1, section: 1, admin_id: 1 }, { unique: true });

module.exports = mongoose.model('Class', ClassSchema);
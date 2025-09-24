const Fee = require('../../models/AdministrativeSchema/Fee');
const Attendance = require('../../models/Attendance_PerformanceSchema/StudentAttendance');
const Mark = require('../../models/Attendance_PerformanceSchema/Mark');
const Student = require('../../models/CoreUser/Student');

exports.getParentDashboard = async (req, res) => {
  try {
    const parentId = req.user._id;
    const parent = await require('../../models/CoreUser/Parent').findOne({ parent_id: parentId });

    const students = await Student.find({ parent_id: parent._id });

    const data = [];

    for (let student of students) {
      const fee = await Fee.find({ student_id: student._id });
      const attendance = await Attendance.find({ student_id: student._id });
      const marks = await Mark.find({ student_id: student._id });

      data.push({
        student,
        fee,
        attendance,
        marks,
      });
    }

    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

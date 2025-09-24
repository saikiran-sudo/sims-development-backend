const StudentAttendance = require('../../models/Attendance_PerformanceSchema/StudentAttendance');
const ExcelJS = require('exceljs');
const moment = require('moment');
const Teacher = require('../../models/CoreUser/Teacher');
const Student = require('../../models/CoreUser/Student');
const Parent = require('../../models/CoreUser/Parent');


exports.markAttendance = async (req, res) => {
    try {
        const { student_id, date, status, checkIn, checkOut, comment,admin_id } = req.body;

        const attendance = new StudentAttendance({
            student_id,
            date,
            status,
            checkIn,
            checkOut,
            comment,
            proofImage: req.file?.path || undefined,
            admin_id: admin_id,
        });

        await attendance.save();

        if (status === 'Absent') {
            const student = await Student.findById(student_id).populate('parent_id');
            // const parentPhone = student.parent_id.phone;
            const parentEmail = student.parent_id.email;

            
            // await twilioClient.messages.create({
            //     body: `Your child ${student.full_name} was absent on ${date}.`,
            //     from: process.env.TWILIO_PHONE_NUMBER,
            //     to: `+91${parentPhone}`,
            // });

            
            await transporter.sendMail({
                to: parentEmail,
                subject: "Student Absence Notification",
                text: `Your child ${student.full_name} was absent on ${date}.`,
            });
        }

        res.status(201).json(attendance);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

exports.markAttendanceUnderMyAdmin = async (req, res) => {
    try {
        const { student_id, date, status, checkIn, checkOut, comment } = req.body;
        const teacher = await Teacher.findOne({ users: req.user._id });
        if (!teacher) {
            return res.status(404).json({ message: 'Teacher not found' });
        }
        const attendance = new StudentAttendance({
            student_id,
            date,
            status,
            checkIn,
            checkOut,
            comment,
            proofImage: req.file?.path || undefined,
            admin_id: teacher.admin_id,
        });
        await attendance.save();
        res.status(201).json(attendance);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
}


exports.getAllAttendance = async (req, res) => {
    try {
        const records = await StudentAttendance.find({ admin_id: req.user._id })
            .populate('student_id', 'full_name admission_number');
        res.json(records);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
exports.getAllAttendanceUnderMyAdmin = async (req, res) => {
  try {
    const teacher = await Teacher.findOne({ users: req.user._id });
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }
    const records = await StudentAttendance.find({ admin_id: teacher.admin_id })
        .populate('student_id', 'full_name admission_number');
    res.json(records);
  } catch (err) {
    console.error('Error in getAllAttendanceUnderMyAdmin:', err);
    res.status(500).json({ message: err.message });
  }
};


exports.getAttendanceByStudent = async (req, res) => {
    try {
        const records = await StudentAttendance.find({ student_id: req.params.studentId, admin_id: req.user._id });
        res.json(records);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.getAttendanceByStudentUnderMyAdmin = async (req, res) => {
  try {
    const student = await Student.findOne({ users: req.user._id });
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
      const records = await StudentAttendance.find({ student_id: student._id });
      res.json(records);
  } catch (err) {
      res.status(500).json({ message: err.message });
  }
};

exports.getAttendanceByStudentUnderParent = async (req, res) => {
  try {
    const parent = await Parent.findOne({ users: req.user._id }).populate('children');
    if (!parent) {
      return res.status(404).json({ message: 'Parent not found' });
    }
    
    // Check if the requested student is one of the parent's children
    const studentId = req.params.studentId;
    const isChildOfParent = parent.children.some(child => child._id.toString() === studentId);
    
    if (!isChildOfParent) {
      return res.status(403).json({ message: 'Access denied. Student is not your child.' });
    }
    
    const records = await StudentAttendance.find({ student_id: studentId });
    res.json(records);
  } catch (err) {
      res.status(500).json({ message: err.message });
  }
};


exports.updateAttendance = async (req, res) => {
    try {
        const { status, checkIn, checkOut, comment,admin_id } = req.body;
        const record = await StudentAttendance.findById(req.params.id);
        if (!record) return res.status(404).json({ message: 'Attendance record not found' });

        if (status) record.status = status;
        if (checkIn !== undefined) record.checkIn = checkIn;
        if (checkOut !== undefined) record.checkOut = checkOut;
        if (comment !== undefined) record.comment = comment;
        if (req.file) record.proofImage = req.file.path;
        record.admin_id = admin_id;
        await record.save();
        res.json(record);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};


exports.deleteAttendance = async (req, res) => {
    try {
        const record = await StudentAttendance.findById(req.params.id);
        if (!record) return res.status(404).json({ message: 'Record not found' });

        await record.deleteOne();
        res.json({ message: 'Attendance record deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.getMonthlyReport = async (req, res) => {
  const { studentId, month, year } = req.query;

  const startDate = moment(`${year}-${month}-01`).startOf('month').toDate();
  const endDate = moment(startDate).endOf('month').toDate();

  try {
    const records = await StudentAttendance.find({
      student_id: studentId,
      date: { $gte: startDate, $lte: endDate },
      admin_id: req.user._id,
    });

    const summary = {
      totalDays: records.length,
      present: records.filter(r => r.status === 'Present').length,
      absent: records.filter(r => r.status === 'Absent').length,
      late: records.filter(r => r.status === 'Late').length,
    };

    res.json({ records, summary });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.exportAttendanceExcel = async (req, res) => {
  const { studentId } = req.params;
  const records = await StudentAttendance.find({ student_id: studentId,admin_id: req.user._id });

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Attendance');

  worksheet.columns = [
    { header: 'Date', key: 'date' },
    { header: 'Status', key: 'status' },
    { header: 'Remarks', key: 'remarks' },
  ];

  records.forEach(r => worksheet.addRow({ ...r.toObject(), date: r.date.toDateString() }));

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=attendance.xlsx');

  await workbook.xlsx.write(res);
  res.end();
};


exports.getAttendanceByDate = async (req, res) => {
  try {
    const { date, class: classFilter, section } = req.query;
    if (!date) return res.status(400).json({ message: 'Date is required' });
    const start = moment(date).startOf('day').toDate();
    const end = moment(date).endOf('day').toDate();
    
    // Build query for attendance records
    const attendanceQuery = {
      date: { $gte: start, $lte: end },
      admin_id: req.user._id
    };
    
    const records = await StudentAttendance.find(attendanceQuery)
      .populate({
        path: 'student_id',
        select: 'full_name admission_number class_id section',
        match: {
          ...(classFilter && { class_id: parseInt(classFilter) }),
          ...(section && { section: section })
        }
      });
    
    // Filter out records where student doesn't match class/section criteria
    const filteredRecords = records.filter(record => record.student_id !== null);
    
    res.json(filteredRecords);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


exports.setBulkAttendance = async (req, res) => {
  try {
    const { date, records } = req.body; 
    if (!date || !Array.isArray(records)) {
      return res.status(400).json({ message: 'Date and records array are required' });
    }
    const start = moment(date).startOf('day').toDate();
    const end = moment(date).endOf('day').toDate();
    const results = [];
    for (const rec of records) {
      let attendance = await StudentAttendance.findOne({
        student_id: rec.student_id,
        date: { $gte: start, $lte: end },
        admin_id: req.user._id
      });
      if (attendance) {
        attendance.status = rec.status;
        if (rec.checkIn !== undefined) attendance.checkIn = rec.checkIn;
        if (rec.checkOut !== undefined) attendance.checkOut = rec.checkOut;
        if (rec.comment !== undefined) attendance.comment = rec.comment;
        await attendance.save();
      } else {
        attendance = new StudentAttendance({
          student_id: rec.student_id,
          date,
          status: rec.status,
          checkIn: rec.checkIn,
          checkOut: rec.checkOut,
          comment: rec.comment || '',
          admin_id: req.user._id,
        });
        await attendance.save();
      }
      results.push(attendance);
    }
    res.json({ updated: results.length, records: results });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getAttendanceByDateRangeUnderMyAdmin = async (req, res) => {
  try {
    const { startDate, endDate, class_id, section } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Start date and end date are required' });
    }

    const teacher = await Teacher.findOne({ users: req.user._id });
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }

    const start = moment(startDate).startOf('day').toDate();
    const end = moment(endDate).endOf('day').toDate();
    
    // Build query for attendance records
    const attendanceQuery = {
      date: { $gte: start, $lte: end },
      admin_id: teacher.admin_id
    };
    
    const records = await StudentAttendance.find(attendanceQuery)
      .populate({
        path: 'student_id',
        select: 'full_name admission_number class_id section',
        match: {
          ...(class_id && { class_id: parseInt(class_id) }),
          ...(section && { section: section })
        }
      });
    
    // Filter out records where student doesn't match class/section criteria
    const filteredRecords = records.filter(record => record.student_id !== null);
    
    res.json(filteredRecords);
  } catch (err) {
    console.error('Error in getAttendanceByDateRangeUnderMyAdmin:', err);
    res.status(500).json({ message: err.message });
  }
};

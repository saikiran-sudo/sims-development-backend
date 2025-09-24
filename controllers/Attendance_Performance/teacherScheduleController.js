const TeacherSchedule = require('../../models/Attendance_PerformanceSchema/TeacherSchedule');
const mongoose = require('mongoose');
const Student = require('../../models/CoreUser/Student');
const Teacher = require('../../models/CoreUser/Teacher');

exports.getSchedulesByTeacher = async (req, res) => {
  try {
    const { teacherId } = req.params;

    if (!teacherId) {
      return res.status(400).json({ error: 'Teacher ID is required' });
    }



    const schedules = await TeacherSchedule.find({ teacherId: teacherId });

    res.json(schedules);
  } catch (err) {
    console.error('Error in getSchedulesByTeacher:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.createSchedule = async (req, res) => {
  try {
    const { teacherId, dayOfWeek, period, subject, startTime, endTime, admin_id, teacher_id } = req.body;

    const teacher = await Teacher.findOne({ users: req.user._id });

    // Validate required fields
    if (!teacherId || !dayOfWeek || !period || !subject || !startTime || !endTime) {
      return res.status(400).json({
        error: 'All fields are required: teacherId, dayOfWeek, classId, subject, startTime, endTime'
      });
    }
    const classTeacherInfo = teacher.class_teacher;

    const classesInfo = classTeacherInfo.split('-');
    const className = classesInfo[0];
    const sectionName = classesInfo[1];


    const schedule = new TeacherSchedule({
      teacherId,
      dayOfWeek,
      period,
      className,
      sectionName,
      subject,
      startTime,
      endTime,
      createdAt: new Date(),
      admin_id: teacher.admin_id,
      teacher_id: teacher._id
    });

    await schedule.save();

    res.status(201).json(schedule);
  } catch (err) {
    console.error('Error in createSchedule:', err);
    res.status(400).json({ error: err.message });
  }
};
exports.getRegularSchedulesUnderStudent = async (req, res) => {
  console.log('working fine');
  try {
    const student = await Student.findOne({ users: req.user._id });
    

    if (!student) {
      return res.status(400).json({ error: 'Student not found' });
    }

    const classStudentInfo = student.class_id;
    const sectionStudentInfo = student.section;

    const regularSchedules = await TeacherSchedule.find({
      className: classStudentInfo,
      sectionName: sectionStudentInfo,
      admin_id: student.admin_id
    });
  
    if (regularSchedules.length === 0) {
      return res.status(400).json({ error: 'Regular schedules not found' });
    }
    res.json(regularSchedules);

    // const teacherSchedules = await TeacherSchedule.find({admin_id: student.admin_id});
  } catch (err) {
    console.error('Error in getRegularSchedulesUnderStudent:', err);
    res.status(500).json({ error: err.message });
  }
}

exports.updateSchedule = async (req, res) => {
  try {
    const { scheduleId } = req.params;

    const updateData = req.body;

    if (!mongoose.Types.ObjectId.isValid(scheduleId)) {
      return res.status(400).json({ error: 'Invalid schedule ID format' });
    }


    const schedule = await TeacherSchedule.findByIdAndUpdate(
      scheduleId,
      updateData,
      { new: true, runValidators: true }
    );

    if (!schedule) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    res.json(schedule);
  } catch (err) {
    console.error('Error in updateSchedule:', err);
    res.status(400).json({ error: err.message });
  }
};

exports.deleteSchedule = async (req, res) => {
  try {
    const { scheduleId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(scheduleId)) {
      return res.status(400).json({ error: 'Invalid schedule ID format' });
    }



    const schedule = await TeacherSchedule.findByIdAndDelete(scheduleId);

    if (!schedule) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    res.json({ message: 'Schedule deleted successfully' });
  } catch (err) {
    console.error('Error in deleteSchedule:', err);
    res.status(400).json({ error: err.message });
  }
};

exports.getAllSchedules = async (req, res) => {
  try {

    const { period, teacherId } = req.query;
    let filter = {};

    if (period) {
      filter.period = period;
    }

    if (teacherId) {
      filter.teacherId = teacherId;
    }

    const schedules = await TeacherSchedule.find(filter).sort({ dayOfWeek: 1, startTime: 1 });

    res.json(schedules);
  } catch (err) {
    console.error('Error in getAllSchedules:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.getSchedulesByStudent = async (req, res) => {
  try {
    const { studentId } = req.params;

    if (!studentId) {
      return res.status(400).json({ error: 'Student ID is required' });
    }


    // First, get the student's class ID
    const Student = require('../../models/CoreUser/Student');
    const student = await Student.findOne({ user_id: studentId });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    if (!student.class_id) {
      return res.status(404).json({ error: 'Student is not assigned to any class' });
    }

    const teacher = await Teacher.findOne({ admin_id: student.admin_id })


    // Get all schedules for the student's class
    // const schedules = await TeacherSchedule.find({ classId: student.class_id, admin_id: teacher.admin_id})
    //   .sort({ dayOfWeek: 1, startTime: 1 });
    const schedules = await TeacherSchedule.find({ period: student.class_id, admin_id: teacher.admin_id })
      .sort({ dayOfWeek: 1, startTime: 1 });

    res.json(schedules);
  } catch (err) {
    console.error('Error in getSchedulesByStudent:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.getSchedulesByStudentForHomePage = async (req, res) => {
  try {
    const { studentId } = req.params;

    if (!studentId) {
      return res.status(400).json({ error: 'Student ID is required' });
    }


    // First, get the student's class ID

    const student = await Student.findOne({ user_id: studentId });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    if (!student.class_id) {
      return res.status(404).json({ error: 'Student is not assigned to any class' });
    }

    const teacher = await Teacher.findOne({ admin_id: student.admin_id })


    // Get all schedules for the student's class
    // const schedules = await TeacherSchedule.find({ classId: student.class_id, admin_id: teacher.admin_id,createdAt:{$gte: new Date(new Date().setDate(new Date().getDate() - 1))}})
    //   .sort({ dayOfWeek: 1, startTime: 1 });
    const schedules = await TeacherSchedule.find({ period: student.class_id, admin_id: teacher.admin_id, createdAt: { $gte: new Date(new Date().setDate(new Date().getDate() - 1)) } })
      .sort({ dayOfWeek: 1, startTime: 1 });

    res.json(schedules);
  } catch (err) {
    console.error('Error in getSchedulesByStudent:', err);
    res.status(500).json({ error: err.message });
  }
};
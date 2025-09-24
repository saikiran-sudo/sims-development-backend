const Teacher = require('../../models/CoreUser/Teacher');
const User = require('../../models/CoreUser/User');
const Student = require('../../models/CoreUser/Student');
const { deleteImageFromCloudinary } = require('../../config/cloudinary');
const cloudinary = require('cloudinary').v2;
const bcrypt = require("bcryptjs");



exports.createTeacher = async (req, res) => {
  try {
    const {
      user_id,
      full_name,
      email,
      password,
      phone,
      address,
      qualification,
      class_teacher,
      profile_image,
      // teacher_id
      admin_id
    } = req.body;

    
    // const subjects_taught = JSON.parse(req.body.subjects_taught || '[]');
    // const assigned_classes = JSON.parse(req.body.assigned_classes || '[]');

    

    // let profile_image = {};
    // if (req.files['profile_image']) {
    //   const img = req.files['profile_image'][0];
    //   profile_image = {
    //     public_id: img.filename,
    //     url: img.path,
    //   };
    // }

    // const certificates = [];
    // if (req.files['certificates']) {
    //   req.files['certificates'].forEach(file => {
    //     certificates.push({
    //       public_id: file.filename,
    //       url: file.path,
    //     });
    //   });
    // }
    const newTeacher = await User.create({
      user_id,
      full_name,
      email,
      password, 
      phone,
      role: 'teacher',
      // subjects_taught,
      // assigned_classes,
      profileImage: profile_image,
      status: "Active",
    });

    const teacher = await Teacher.create({
      user_id,
      full_name,
      email,
      password, 
      role: 'teacher',
      phone,
      address,
      qualification,
      // subjects_taught,
      // assigned_classes,
      class_teacher,
      profile_image,
      users: newTeacher._id,
      status: "Active",
      admin_id, // Store the admin's id
    });



    // await teacher.save();
    res.status(201).json(teacher, newTeacher);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};


exports.getAllTeachers = async (req, res) => {
  try {
    // Only return teachers created by the logged-in admin
    const teachers = await Teacher.find({ admin_id: req.user._id }).populate('user_id', 'email full_name');
    res.json(teachers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


exports.getTeacherById = async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.id).populate('teacher_id', 'email');
    if (!teacher) return res.status(404).json({ message: 'Teacher not found' });
    res.json(teacher);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


exports.updateTeacher = async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.id);
    console.log(req.params.id);
    if (!teacher) return res.status(404).json({ message: 'Teacher not found' });

    const {
      full_name,
      phone,
      // subjects_taught, 
      // assigned_classes, 
      class_teacher,
      email,
      password,
      address,
      profile_image
    } = req.body;
    console.log(req.body);

    
    const updatesToApply = { ...req.body };

    
    
    // if (subjects_taught !== undefined) { 
    //   updatesToApply.subjects_taught = subjects_taught;
    // }
    // if (assigned_classes !== undefined) { 
    //   updatesToApply.assigned_classes = assigned_classes;
    // }

    
    Object.assign(teacher, updatesToApply);

    const updatedTeacher = await teacher.save();
    res.json(updatedTeacher);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};


exports.deleteTeacher = async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.id);
    if (!teacher) return res.status(404).json({ message: 'Teacher not found' });

    
    // if (teacher.profile_image?.public_id) {
    //   await cloudinary.uploader.destroy(teacher.profile_image.public_id);
    // }

    // for (let cert of teacher.certificates || []) {
    //   if (cert.public_id) await cloudinary.uploader.destroy(cert.public_id);
    // }
    const imageUrl = teacher.profile_image;
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

    if (teacher.users) {
      await User.findByIdAndDelete(teacher.users);
    }

    await teacher.deleteOne();
    res.json({ message: 'Teacher deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getTeacherProfile = async (req, res) => {
  try {
    
    const teacherProfile = await Teacher.findOne({ user_id: req.user.user_id });

    if (!teacherProfile) {
      return res.status(404).json({ message: "Teacher profile not found" });
    }

    if (teacherProfile.status !== 'Active') {
      return res.status(403).json({ message: 'Teacher account is inactive' });
    }

    res.status(200).json(teacherProfile);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


exports.getTeacherDashboard = async (req, res) => {
  try {
    const teacherProfile = await Teacher.findOne({ users: req.user._id });

    if (!teacherProfile) {
      return res.status(404).json({ message: "Teacher profile not found" });
    }

    
    const Assignment = require('../../models/AcademicSchema/Assignment');
    const AssignmentSubmission = require('../../models/AcademicSchema/AssignmentSubmission');
    const StudentAttendance = require('../../models/Attendance_PerformanceSchema/StudentAttendance');
    const Result = require('../../models/Attendance_PerformanceSchema/Result');
    const Class = require('../../models/AcademicSchema/Class');
    const Student = require('../../models/CoreUser/Student');

    
    const assignedClasses = teacherProfile.assigned_classes || [];

    
    const assignments = await Assignment.find({
      teacher_id: teacherProfile._id
    }).populate('class', 'class_name');

    
    const assignmentIds = assignments.map(assignment => assignment._id);
    const submissions = await AssignmentSubmission.find({
      assignment_id: { $in: assignmentIds }
    }).populate('student_id', 'full_name');

    
    const classIds = assignedClasses.map(classId => classId.toString());
    const students = await Student.find({
      class_id: { $in: classIds }
    });
    const studentIds = students.map(student => student._id);

    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const attendanceData = await StudentAttendance.find({
      student_id: { $in: studentIds },
      date: { $gte: thirtyDaysAgo }
    });

    
    const examResults = await Result.find({
      student_id: { $in: studentIds }
    }).populate('exam_id', 'exam_name subject');

    
    const totalStudents = students.length;
    const totalAssignments = assignments.length;
    const pendingSubmissions = submissions.filter(sub => !sub.grade || sub.grade === 'Incomplete').length;
    const gradedSubmissions = submissions.filter(sub => sub.grade && sub.grade !== 'Incomplete').length;

    
    const totalAttendanceRecords = attendanceData.length;
    const presentRecords = attendanceData.filter(record => record.status === 'Present').length;
    const attendancePercentage = totalAttendanceRecords > 0 ? (presentRecords / totalAttendanceRecords) * 100 : 0;

    
    const classGrades = {};
    examResults.forEach(result => {
      const student = students.find(s => s._id.toString() === result.student_id.toString());
      if (student && student.class_id) {
        const classId = student.class_id.toString();
        if (!classGrades[classId]) {
          classGrades[classId] = { total: 0, count: 0 };
        }
        if (result.marks && result.maxMarks) {
          classGrades[classId].total += (result.marks / result.maxMarks) * 100;
          classGrades[classId].count += 1;
        }
      }
    });

    
    const classes = await Class.find({ _id: { $in: Object.keys(classGrades) } });
    const classNames = {};
    classes.forEach(cls => {
      classNames[cls._id.toString()] = cls.class_name || cls.grade;
    });

    const averageGradesByClass = Object.keys(classGrades).map(classId => ({
      name: classNames[classId] || `Class ${classId}`,
      grade: classGrades[classId].count > 0 ? Math.round(classGrades[classId].total / classGrades[classId].count) : 0
    }));

    
    const recentAssignments = assignments.slice(0, 8).map(assignment => {
      const assignmentSubmissions = submissions.filter(sub =>
        sub.assignment_id.toString() === assignment._id.toString()
      );
      const totalSubs = assignmentSubmissions.length;
      const completedSubs = assignmentSubmissions.filter(sub =>
        sub.grade && sub.grade !== 'Incomplete'
      ).length;

      let status = 'Pending';
      if (completedSubs === totalSubs && totalSubs > 0) {
        status = 'Completed';
      } else if (new Date(assignment.dueDate) < new Date()) {
        status = 'Late';
      }

      return {
        id: assignment._id,
        assignment: assignment.title,
        class: assignment.class?.class_name || 'Unknown Class',
        dueDate: assignment.dueDate,
        status: status
      };
    });

    
    const weeklyAttendance = [];
    for (let i = 3; i >= 0; i--) {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - (i * 7));
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      const weekAttendance = attendanceData.filter(record => {
        const recordDate = new Date(record.date);
        return recordDate >= weekStart && recordDate <= weekEnd;
      });

      const weekPresent = weekAttendance.filter(record => record.status === 'Present').length;
      const weekAbsent = weekAttendance.filter(record => record.status === 'Absent').length;

      weeklyAttendance.push({
        name: `Week ${4 - i}`,
        present: weekPresent,
        absent: weekAbsent
      });
    }

    const dashboardData = {
      statistics: {
        totalClasses: assignedClasses.length,
        totalStudents: totalStudents,
        totalAssignments: totalAssignments,
        pendingSubmissions: pendingSubmissions,
        gradedSubmissions: gradedSubmissions,
        attendancePercentage: Math.round(attendancePercentage)
      },
      assignments: recentAssignments,
      gradeChart: averageGradesByClass,
      attendanceChart: weeklyAttendance
    };

    res.status(200).json(dashboardData);
  } catch (err) {
    console.error('Error fetching teacher dashboard:', err);
    res.status(500).json({ message: err.message });
  }
};

exports.getTeacherCount = async (req, res) => {
  try {
    let adminIdToFilter;

    if (req.user.role === 'admin') {
      adminIdToFilter = req.user._id;
    } else if (req.user.role === 'super_admin') {
      // Superadmin can see all teachers
      adminIdToFilter = null;
    } else {
      return res.status(403).json({ message: 'Unauthorized user' });
    }

    const query = adminIdToFilter ? { admin_id: adminIdToFilter } : {};
    const count = await Teacher.countDocuments(query);
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


exports.searchTeachers = async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) return res.json([]);
    const teachers = await Teacher.find({admin_id: req.user._id,
      $or: [
        { user_id: { $regex: query, $options: 'i' } },
        { full_name: { $regex: query, $options: 'i' } }
      ]
    }).select('user_id full_name');
    res.json(teachers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
exports.getTeacherByUserId = async (req, res) => {
  try {
    console.log('Looking for teacher with user_id:', req.params.userId);
    // Try to find by user_id first (string field)
    let teacher = await Teacher.findOne({ user_id: req.params.userId })
      .populate('users', 'full_name user_id');
    
    // If not found, try to find by users reference
    if (!teacher) {
      console.log('Not found by user_id, trying users reference');
      teacher = await Teacher.findOne({ users: req.params.userId })
        .populate('users', 'full_name user_id');
    }
    
    if (!teacher) {
      console.log('Teacher not found for user_id:', req.params.userId);
      return res.status(404).json({ message: 'Teacher not found' });
    }
    
    console.log('Found teacher:', teacher.full_name, 'ID:', teacher._id);
    res.json(teacher);
  } catch (err) {
    console.error('Error in getTeacherByUserId:', err);
    res.status(500).json({ message: err.message });
  }
};
// module.exports = {
//   createTeacher,
//   // other controller functions
// };
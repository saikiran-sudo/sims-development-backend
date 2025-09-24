const AssignmentSubmission = require('../../models/AcademicSchema/AssignmentSubmission');
const Assignment = require('../../models/AcademicSchema/Assignment');
const Student = require('../../models/CoreUser/Student');
const { sendEmail } = require('../../utils/email');
const { sendSMS } = require('../../utils/sms');
const ExcelJS = require('exceljs');
const Teacher = require('../../models/CoreUser/Teacher');

exports.submitAssignment = async (req, res) => {
  try {
    const { assignment_id, files, description,admin_id } = req.body;

    // For students, we need to get the admin_id from their student profile
    let submissionAdminId = admin_id;
    if (req.user.role === 'student') {
      const Student = require('../../models/CoreUser/Student');
      const student = await Student.findOne({ user_id: req.user.user_id });
      if (student && student.admin_id) {
        submissionAdminId = student.admin_id;
      } else {
        console.error('Student not found or admin_id missing for user_id:', req.user.user_id);
        return res.status(400).json({ message: 'Student profile not found or admin_id missing' });
      }
    }

    const newSubmission = new AssignmentSubmission({
      assignment_id,
      student_id: req.user._id, // This should be the User's ObjectId
      files,
      description,
      admin_id: submissionAdminId
    });

    await newSubmission.save();

    // Update the assignment status to "Submitted" for this student
    const assignment = await Assignment.findById(assignment_id);
    if (assignment) {
      assignment.status = "Submitted";
      await assignment.save();
    }

    res.status(201).json(newSubmission);
  } catch (error) {
    console.error('Error in submitAssignment:', error);
    res.status(400).json({ message: error.message });
  }
};

exports.getSubmissionsForAssignment = async (req, res) => {
  try {
    console.log('Getting submissions for assignment ID:', req.params.assignmentId);
    console.log('User ID:', req.user._id);
    
    // For teachers, we need to get their admin_id from their teacher profile
    let adminId = req.user._id;
    if (req.user.role === 'teacher') {
      const Teacher = require('../../models/CoreUser/Teacher');
      const teacher = await Teacher.findOne({ users: req.user._id });
      if (teacher) {
        adminId = teacher.admin_id;
      }
    }
    
    console.log('Using admin_id for filtering:', adminId);
    
    const submissions = await AssignmentSubmission.find({ assignment_id: req.params.assignmentId, admin_id: adminId })
      .populate('student_id', 'user_id full_name');

    console.log('Found submissions:', submissions.length);
    res.json(submissions);
  } catch (error) {
    console.error('Error in getSubmissionsForAssignment:', error);
    res.status(500).json({ message: error.message });
  }
};
exports.gradeSubmission = async (req, res) => {
  try {
    const { grade, remarks,admin_id } = req.body;
    console.log('Grading submission with data:', { grade, remarks, admin_id });
    console.log('Submission ID:', req.params.id);

    const submission = await AssignmentSubmission.findById(req.params.id).populate('student_id');
    if (!submission) return res.status(404).json({ message: 'Submission not found' });

    submission.grade = grade;
    submission.remarks = remarks;
    submission.admin_id = admin_id;
    await submission.save();

    
    const student = submission.student_id;
    const message = `📘 Your assignment has been graded.\nGrade: ${grade}\nRemarks: ${remarks || 'N/A'}`;

    if (student.email) {
      await sendEmail({
        to: student.email,
        subject: 'Assignment Graded',
        text: message,
      });
    }

    if (student.phone) {
      await sendSMS(student.phone, message);
    }

    res.json({ message: 'Graded and student notified', submission });
  } catch (error) {
    console.error('Error in gradeSubmission:', error);
    res.status(500).json({ message: error.message });
  }
};
exports.gradeSubmissionUnderMyAdmin = async (req, res) => {
  try {
    const teacher = await Teacher.findOne({users:req.user._id});
    if (!teacher) return res.status(404).json({ message: 'Teacher not found' });
    const { grade, remarks } = req.body;

    const submission = await AssignmentSubmission.findById(req.params.id).populate('student_id');
    if (!submission) return res.status(404).json({ message: 'Submission not found' });

    submission.grade = grade;
    submission.remarks = remarks;
    submission.admin_id = teacher.admin_id;
    await submission.save();

    
    const student = submission.student_id;
    const message = `📘 Your assignment has been graded.\nGrade: ${grade}\nRemarks: ${remarks || 'N/A'}`;

    if (student.email) {
      await sendEmail({
        to: student.email,
        subject: 'Assignment Graded',
        text: message,
      });
    }

    if (student.phone) {
      await sendSMS(student.phone, message);
    }

    res.json({ message: 'Graded and student notified', submission });
  } catch (error) {
    console.error('Error in gradeSubmission:', error);
    res.status(500).json({ message: error.message });
  }
};
exports.exportGradesToExcel = async (req, res) => {
  try {
    const { assignmentId } = req.params;

    const submissions = await AssignmentSubmission.find({ assignment_id: assignmentId })
      .populate('student_id', 'full_name email');

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Assignment Grades');

    
    sheet.columns = [
      { header: 'Student Name', key: 'name', width: 30 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Grade', key: 'grade', width: 10 },
      { header: 'Remarks', key: 'remarks', width: 40 },
      { header: 'Submitted At', key: 'submitted', width: 20 },
    ];

    submissions.forEach((sub) => {
      sheet.addRow({
        name: sub.student_id.full_name,
        email: sub.student_id.email,
        grade: sub.grade || 'N/A',
        remarks: sub.remarks || '',
        submitted: sub.submitted_at.toLocaleString(),
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="grades_${assignmentId}.xlsx"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(500).json({ message: 'Failed to export grades', error: error.message });
  }
};


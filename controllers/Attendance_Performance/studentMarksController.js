const StudentMarks = require('../../models/Attendance_PerformanceSchema/StudentMarks');

exports.addMarks = async (req, res) => {
  try {
    const marks = await StudentMarks.create(req.body);
    res.status(201).json(marks);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.getMarksByStudent = async (req, res) => {
  try {
    const marks = await StudentMarks.find({ student_id: req.params.studentId })
      .populate('exam_id subject_id');
    res.json(marks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


exports.updateMarks = async (req, res) => {
  const { student_id, exam_id, subject_id, marks_obtained, max_marks, grade, remarks } = req.body;
  if (!student_id || !exam_id || !subject_id) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  try {
    const mark = await StudentMarks.findOne({ student_id, exam_id, subject_id });
    if (!mark) {
      return res.status(404).json({ error: 'Mark record not found' });
    }
    if (marks_obtained !== undefined) mark.marks_obtained = marks_obtained;
    if (max_marks !== undefined) mark.max_marks = max_marks;
    if (grade !== undefined) mark.grade = grade;
    if (remarks !== undefined) mark.remarks = remarks;
    await mark.save();
    res.json(mark);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update marks' });
  }
};

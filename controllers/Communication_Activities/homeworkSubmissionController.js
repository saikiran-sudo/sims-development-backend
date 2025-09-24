const HomeworkSubmission = require('../../models/Communication_Activities/HomeworkSubmission');

exports.submitHomework = async (req, res) => {
  try {
    const { assignment_id } = req.body;

    const submission = new HomeworkSubmission({
      assignment_id,
      student_id: req.user._id,
      file_url: req.file.path,
    });

    await submission.save();
    res.status(201).json(submission);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.getSubmissionsForAssignment = async (req, res) => {
  try {
    const submissions = await HomeworkSubmission.find({ assignment_id: req.params.assignmentId })
      .populate('student_id', 'full_name');
    res.json(submissions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

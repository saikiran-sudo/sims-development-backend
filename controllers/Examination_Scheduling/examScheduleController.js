const ExamSchedule = require('../../models/Examination_Scheduling/ExamSchedule');


exports.createSchedule = async (req, res) => {
  try {
    const { classId, examType, subjectSlots,admin_id } = req.body;

    
    const newSchedule = new ExamSchedule({
      classId,
      examType,
      subjectSlots,
      admin_id
    });

    
    const savedSchedule = await newSchedule.save();

    res.status(201).json({
      success: true,
      message: 'Exam schedule created successfully',
      data: savedSchedule
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error creating exam schedule',
      error: error.message
    });
  }
};


exports.getAllSchedules = async (req, res) => {
  try {
    const { classId } = req.query;
    let query = {};

    // Only filter by admin_id if the user is an admin
    if (req.user.role === 'admin' || req.user.role === 'superadmin') {
      query.admin_id = req.user._id;
    }

    if (classId) {
      query.classId = classId;
    }

    const schedules = await ExamSchedule.find(query).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: schedules.length,
      data: schedules
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching exam schedules',
      error: error.message
    });
  }
};


exports.getScheduleById = async (req, res) => {
  try {
    const schedule = await ExamSchedule.findById(req.params.id);

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Exam schedule not found'
      });
    }

    res.status(200).json({
      success: true,
      data: schedule
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching exam schedule',
      error: error.message
    });
  }
};


exports.updateSchedule = async (req, res) => {
  try {
    const { classId, examType, subjectSlots } = req.body;

    const updatedSchedule = await ExamSchedule.findByIdAndUpdate(
      req.params.id,
      {
        classId,
        examType,
        subjectSlots,
        updatedAt: Date.now()
      },
      { new: true, runValidators: true }
    );

    if (!updatedSchedule) {
      return res.status(404).json({
        success: false,
        message: 'Exam schedule not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Exam schedule updated successfully',
      data: updatedSchedule
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error updating exam schedule',
      error: error.message
    });
  }
};


exports.deleteSchedule = async (req, res) => {
  try {
    const deletedSchedule = await ExamSchedule.findByIdAndDelete(req.params.id);

    if (!deletedSchedule) {
      return res.status(404).json({
        success: false,
        message: 'Exam schedule not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Exam schedule deleted successfully',
      data: deletedSchedule
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting exam schedule',
      error: error.message
    });
  }
};


exports.getSchedulesByClassAndType = async (req, res) => {
  try {
    const { classId } = req.params;
    const schedules = await ExamSchedule.find({ classId });

    
    const categorized = {
      "Formative Assessment": schedules.filter(s => 
        s.examType.includes("Formative Assessment")
      ),
      "Summative Assessment": schedules.filter(s => 
        s.examType.includes("Summative Assessment")
      )
    };

    
    Object.values(categorized).forEach(category => {
      category.sort((a, b) => {
        const aDateTime = new Date(`${a.subjectSlots[0].date}T${a.subjectSlots[0].time}`);
        const bDateTime = new Date(`${b.subjectSlots[0].date}T${b.subjectSlots[0].time}`);
        return aDateTime - bDateTime;
      });
    });

    res.status(200).json({
      success: true,
      data: categorized
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching categorized schedules',
      error: error.message
    });
  }
};

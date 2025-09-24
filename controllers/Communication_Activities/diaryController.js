const HomeworkDiary = require('../../models/Communication_Activities/HomeworkDiary');
const PersonalDiary = require('../../models/Communication_Activities/PersonalDiary');
const Student = require('../../models/CoreUser/Student');
const Teacher = require('../../models/CoreUser/Teacher');


exports.getHomework = async (req, res) => {
  try {
    
    const teacherId = (req.user && (req.user.user_id || req.user._id)) || req.query.teacherId || req.body.teacherId;
    if (!teacherId) {
      return res.status(400).json({ message: 'Teacher ID not found in user data' });
    }
    
    const entries = await HomeworkDiary.find({ teacherId }).sort({ date: -1 });
    res.json(entries);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


exports.getHomeworkByClassSection = async (req, res) => {
  try {
    const { classId, section } = req.params;
    if (!classId || !section) {
      return res.status(400).json({ message: 'Class and section are required' });
    }

    const classNumber = classId.match(/\d+/)[0];
    const entries = await HomeworkDiary.find({
      classSelected: classNumber,
      sectionSelected: section
    }).sort({ date: -1 });
  
    res.json(entries);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
exports.getHomeworkByClassSectionUnderMyAdmin = async (req, res) => {
  try {
    // const { classId, section } = req.params;
    
    // if (!classId || !section) {
    //   return res.status(400).json({ message: 'Class and section are required' });
    // }
    
    const student = await Student.findOne({ users: req.user._id });
    
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    console.log('class id is ',student.class_id);

    // const classNumber = classId.match(/\d+/)[0];
    
    // First, let's check what homework entries exist without filters
    // const allEntries = await HomeworkDiary.find({}).limit(5);
    
    // Check for entries with just class and section (without admin filter)
    // const classSectionEntries = await HomeworkDiary.find({
    //   classSelected: student.class_id,
    //   sectionSelected: student.section
    // }).sort({ date: -1 });
    
    // Check for entries with just admin_id
    // const adminEntries = await HomeworkDiary.find({
    //   admin_id: student.admin_id
    // }).sort({ date: -1 });

    
    // Now try the specific query
    const entries = await HomeworkDiary.find({
      classSelected: student.class_id,
      sectionSelected: student.section,
      admin_id: student.admin_id
    }).sort({ date: -1 });
    
    res.json(entries);
  } catch (err) {
    console.error('Error in getHomeworkByClassSectionUnderMyAdmin:', err);
    res.status(500).json({ message: err.message });
  }
};

exports.createHomework = async (req, res) => {
  try {
    
    const teacherId = (req.user && (req.user.user_id || req.user._id)) || req.body.teacherId;
    if (!teacherId) {
      return res.status(400).json({ message: 'Teacher ID not found in user data' });
    }
    const teacher = await Teacher.findOne({users: req.user._id});
    const entry = await HomeworkDiary.create({
      ...req.body,
      teacherId,
      admin_id: teacher.admin_id
    });
    res.status(201).json(entry);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.updateHomework = async (req, res) => {
  try {
    
    const teacherId = (req.user && (req.user.user_id || req.user._id)) || req.body.teacherId;
    if (!teacherId) {
      return res.status(400).json({ message: 'Teacher ID not found in user data' });
    }
    
    
    const existingEntry = await HomeworkDiary.findById(req.params.id);
    if (!existingEntry) {
      return res.status(404).json({ message: 'Homework entry not found' });
    }
    
    if (existingEntry.teacherId !== teacherId) {
      return res.status(403).json({ message: 'Access denied: You can only update your own homework entries' });
    }
    
    const updated = await HomeworkDiary.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.deleteHomework = async (req, res) => {
  try {
    
    const teacherId = (req.user && (req.user.user_id || req.user._id)) || req.body.teacherId;
    if (!teacherId) {
      return res.status(400).json({ message: 'Teacher ID not found in user data' });
    }
    
    
    const existingEntry = await HomeworkDiary.findById(req.params.id);
    if (!existingEntry) {
      return res.status(404).json({ message: 'Homework entry not found' });
    }
    
    if (existingEntry.teacherId !== teacherId) {
      return res.status(403).json({ message: 'Access denied: You can only delete your own homework entries' });
    }
    
    const deleted = await HomeworkDiary.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


exports.getPersonal = async (req, res) => {
  try {
    
    const teacherId = (req.user && (req.user.user_id || req.user._id)) || req.query.teacherId || req.body.teacherId;
    if (!teacherId) {
      return res.status(400).json({ message: 'Teacher ID not found in user data' });
    }
    
    const notes = await PersonalDiary.find({ teacherId }).sort({ date: -1 });
    res.json(notes);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createPersonal = async (req, res) => {
  try {
    
    const teacherId = (req.user && (req.user.user_id || req.user._id)) || req.body.teacherId;
    if (!teacherId) {
      return res.status(400).json({ message: 'Teacher ID not found in user data' });
    }
    
    const note = await PersonalDiary.create({
      ...req.body,
      teacherId
    });
    res.status(201).json(note);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.updatePersonal = async (req, res) => {
  try {
    
    const teacherId = (req.user && (req.user.user_id || req.user._id)) || req.body.teacherId;
    if (!teacherId) {
      return res.status(400).json({ message: 'Teacher ID not found in user data' });
    }
    
    
    const existingNote = await PersonalDiary.findById(req.params.id);
    if (!existingNote) {
      return res.status(404).json({ message: 'Personal note not found' });
    }
    
    if (existingNote.teacherId !== teacherId) {
      return res.status(403).json({ message: 'Access denied: You can only update your own personal notes' });
    }
    
    const updated = await PersonalDiary.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.deletePersonal = async (req, res) => {
  try {
    
    const teacherId = (req.user && (req.user.user_id || req.user._id)) || req.body.teacherId;
    if (!teacherId) {
      return res.status(400).json({ message: 'Teacher ID not found in user data' });
    }
    
    
    const existingNote = await PersonalDiary.findById(req.params.id);
    if (!existingNote) {
      return res.status(404).json({ message: 'Personal note not found' });
    }
    
    if (existingNote.teacherId !== teacherId) {
      return res.status(403).json({ message: 'Access denied: You can only delete your own personal notes' });
    }
    
    const deleted = await PersonalDiary.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


exports.getHomeworkForParent = async (req, res) => {
  try {
    
    const userId = req.user._id; 
    if (!userId) {
      return res.status(400).json({ message: 'User ID not found in user data' });
    }

    console.log('Looking for parent with user ID:', userId);

    
    const Parent = require('../../models/CoreUser/Parent');
    const parent = await Parent.findOne({ users: userId }).populate('children');
    
    if (!parent) {
      console.log('Parent not found for user ID:', userId);
      return res.status(404).json({ message: 'Parent profile not found' });
    }

    console.log('Found parent:', parent.full_name, 'with children:', parent.children?.length || 0);

    if (!parent.children || parent.children.length === 0) {
      return res.json({
        children: [],
        homeworkByChild: {}
      });
    }

    
    const entries = await HomeworkDiary.find({}).sort({ date: -1 });

    
    const homeworkByChild = {};
    parent.children.forEach(child => {
      
      homeworkByChild[child._id] = entries.filter(entry => 
        entry.homeworkItems.some(item => {
          
          if (item.class_id && child.class_id) {
            return item.class_id.toString() === child.class_id.toString();
          }
          
          return item.subject && child.class_id?.name && 
                 item.subject.toLowerCase().includes(child.class_id.name.toLowerCase());
        })
      );
    });

    res.json({
      children: parent.children,
      homeworkByChild
    });
  } catch (err) {
    console.error('Error in getHomeworkForParent:', err);
    res.status(500).json({ message: err.message });
  }
};
const Resource = require('../../models/Library_Management/Resource');
const Teacher = require('../../models/CoreUser/Teacher');
const Student = require('../../models/CoreUser/Student');

exports.getAllResources = async (req, res) => {
  try {
    const resources = await Resource.find({ admin_id: req.user._id }).sort({ createdAt: -1 });
    res.json(resources);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
exports.getAllResourcesUnderMyAdmin = async (req, res) => {
  try { 
    const teacher = await Teacher.findOne({ users: req.user._id });
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }
    const resources = await Resource.find({ admin_id: teacher.admin_id }).sort({ createdAt: -1 });
    if (!resources) {
      return res.status(404).json({ message: 'No resources found' });
    }
    res.json(resources);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getAllResourcesByStudent = async (req, res) => {
  try { 
    const student = await Student.findOne({ users: req.user._id });
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    const resources = await Resource.find({ admin_id: student.admin_id }).sort({ createdAt: -1 });
    if (!resources) {
      return res.status(404).json({ message: 'No resources found' });
    }
    res.json(resources);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


exports.getResourceById = async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);
    if (!resource) return res.status(404).json({ message: 'Resource not found' });
    res.json(resource);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


exports.createResource = async (req, res) => {
  try {
    const resource = await Resource.create({ ...req.body, admin_id: req.user._id });
    res.status(201).json(resource);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};
exports.createResourceUnderMyAdmin = async (req, res) => {
  try {
    const teacher = await Teacher.findOne({ users: req.user._id });
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }
    const resource = await Resource.create({ ...req.body, admin_id: teacher.admin_id });
    res.status(201).json(resource);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}
// exports.createResourceUnderMyAdmin = async (req, res) => {
//   try {
//     const resource = await Resource.create({ ...req.body, admin_id: req.user._id });
//     res.status(201).json(resource);
//   } catch (err) {
//     res.status(400).json({ message: err.message });
//   }
// }

exports.updateResource = async (req, res) => {
  try {
    const resource = await Resource.findByIdAndUpdate(req.params.id, { ...req.body, admin_id: req.user._id }, { new: true });
    if (!resource) return res.status(404).json({ message: 'Resource not found' });
    res.json(resource);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};
exports.updateResourceUnderMyAdmin = async (req, res) => {
  try {
    const teacher = await Teacher.findOne({ users: req.user._id });
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }
    const resource = await Resource.findByIdAndUpdate(req.params.id, { ...req.body, admin_id: teacher.admin_id }, { new: true });
    if (!resource) return res.status(404).json({ message: 'Resource not found' });
    res.json(resource);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};


exports.deleteResource = async (req, res) => {
  try {
    const resource = await Resource.findByIdAndDelete(req.params.id);
    if (!resource) return res.status(404).json({ message: 'Resource not found' });
    res.json({ message: 'Resource deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}; 
const Student = require('../models/CoreUser/Student');
const Parent = require('../models/CoreUser/Parent');

/**
 * Add a student to a parent's children array
 * @param {string} parentId - Parent's ObjectId
 * @param {string} studentId - Student's ObjectId
 */
const addStudentToParent = async (parentId, studentId) => {
  try {
    await Parent.findByIdAndUpdate(
      parentId,
      { 
        $addToSet: { children: studentId },
        $inc: { childrenCount: 1 }
      },
      { new: true }
    );
  } catch (error) {
    console.error('Error adding student to parent:', error);
    throw error;
  }
};

/**
 * Remove a student from a parent's children array
 * @param {string} parentId - Parent's ObjectId
 * @param {string} studentId - Student's ObjectId
 */
const removeStudentFromParent = async (parentId, studentId) => {
  try {
    await Parent.findByIdAndUpdate(
      parentId,
      { 
        $pull: { children: studentId },
        $inc: { childrenCount: -1 }
      },
      { new: true }
    );
  } catch (error) {
    console.error('Error removing student from parent:', error);
    throw error;
  }
};

/**
 * Update parent-child relationships when student's parents change
 * @param {string} studentId - Student's ObjectId
 * @param {Array} newParentIds - Array of new parent ObjectIds
 */
const updateStudentParents = async (studentId, newParentIds) => {
  try {
    // Get current student to find old parents
    const student = await Student.findById(studentId);
    if (!student) {
      throw new Error('Student not found');
    }

    const oldParentIds = student.parent_id || [];

    // Remove student from old parents
    for (const oldParentId of oldParentIds) {
      if (oldParentId && !newParentIds.includes(oldParentId.toString())) {
        await removeStudentFromParent(oldParentId, studentId);
      }
    }

    // Add student to new parents
    for (const newParentId of newParentIds) {
      if (newParentId && !oldParentIds.includes(newParentId.toString())) {
        await addStudentToParent(newParentId, studentId);
      }
    }
  } catch (error) {
    console.error('Error updating student parents:', error);
    throw error;
  }
};

/**
 * Get all students for a parent with populated data
 * @param {string} parentId - Parent's ObjectId
 * @returns {Array} Array of student objects
 */
const getParentStudents = async (parentId) => {
  try {
    const parent = await Parent.findById(parentId).populate({
      path: 'children',
      select: 'full_name admission_number class_id email contact status'
    });
    return parent ? parent.children : [];
  } catch (error) {
    console.error('Error getting parent students:', error);
    throw error;
  }
};

/**
 * Get all parents for a student with populated data
 * @param {string} studentId - Student's ObjectId
 * @returns {Array} Array of parent objects
 */
const getStudentParents = async (studentId) => {
  try {
    const student = await Student.findById(studentId).populate({
      path: 'parent_id',
      select: 'full_name email phone address'
    });
    return student ? student.parent_id : [];
  } catch (error) {
    console.error('Error getting student parents:', error);
    throw error;
  }
};

module.exports = {
  addStudentToParent,
  removeStudentFromParent,
  updateStudentParents,
  getParentStudents,
  getStudentParents
}; 
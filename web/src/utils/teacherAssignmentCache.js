const STORAGE_KEY = 'mm_teacher_class_assignments';

export function readTeacherAssignmentCache() {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    const parsed = value ? JSON.parse(value) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeTeacherAssignmentCache(assignments) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(assignments));
}

export function saveTeacherAssignmentCache(assignment) {
  const classId = Number(assignment.class_id);
  const teacherId = Number(assignment.teacher_id);

  if (!classId || !teacherId) return;

  const nextAssignment = {
    class_id: classId,
    class_name: assignment.class_name || '',
    section: assignment.section || '',
    teacher_id: teacherId,
    teacher_name: assignment.teacher_name || '',
  };

  const next = [
    ...readTeacherAssignmentCache().filter((item) => Number(item.class_id) !== classId),
    nextAssignment,
  ];

  writeTeacherAssignmentCache(next);
}

export function removeTeacherAssignmentCache(classId) {
  const next = readTeacherAssignmentCache().filter((item) => Number(item.class_id) !== Number(classId));
  writeTeacherAssignmentCache(next);
}

export function mergeClassAssignments(classes, teachers) {
  const cache = readTeacherAssignmentCache();

  return classes.map((classItem) => {
    const cached = cache.find((item) => Number(item.class_id) === Number(classItem.id));
    const teacherId =
      classItem.assigned_teacher_id ||
      classItem.teacher_id ||
      classItem.teacher?.id ||
      classItem.assigned_teacher?.id ||
      cached?.teacher_id;

    const teacher = teachers.find((item) => Number(item.id) === Number(teacherId));

    return {
      ...classItem,
      assigned_teacher_id: teacherId || '',
      assigned_teacher_name:
        classItem.assigned_teacher_name ||
        classItem.teacher_name ||
        classItem.teacher?.name ||
        classItem.assigned_teacher?.name ||
        teacher?.name ||
        cached?.teacher_name ||
        '',
    };
  });
}

export function mergeTeacherAssignments(teachers) {
  const cache = readTeacherAssignmentCache();

  return teachers.map((teacher) => {
    const existing = Array.isArray(teacher.assigned_classes) ? teacher.assigned_classes : [];
    const cachedClasses = cache
      .filter((item) => Number(item.teacher_id) === Number(teacher.id))
      .map((item) => ({
        id: item.class_id,
        name: item.class_name,
        section: item.section,
      }));

    const merged = [...existing];

    cachedClasses.forEach((cachedClass) => {
      if (!merged.some((item) => Number(item.id) === Number(cachedClass.id))) {
        merged.push(cachedClass);
      }
    });

    return { ...teacher, assigned_classes: merged };
  });
}

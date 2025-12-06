import axios from "axios";

const normalizeEnrollmentRecord = (raw = {}, fallbackStudentId = null) => {
  if (!raw || typeof raw !== "object") {
    return {
      enrollmentId: null,
      studentId: fallbackStudentId,
      courseId: null,
      subjectId: null,
      classId: null,
      enrollmentDate: null,
      isActive: true,
      raw: {},
    };
  }

  const enrollmentId =
    raw.EnrollmentID ?? raw.enrollmentID ?? raw.id ?? raw.Id ?? null;
  const studentId =
    raw.StudentID ??
    raw.studentID ??
    raw.studentId ??
    raw.UserID ??
    raw.userID ??
    raw.userId ??
    fallbackStudentId ??
    null;
  const courseId =
    raw.CourseID ?? raw.courseID ?? raw.courseId ?? raw.CourseId ?? null;
  const subjectId =
    raw.SubjectID ?? raw.subjectID ?? raw.subjectId ?? raw.SubjectId ?? null;
  const classId =
    raw.ClassID ?? raw.classID ?? raw.classId ?? raw.ClassId ?? null;
  const enrollmentDate =
    raw.EnrollmentDate ?? raw.enrollmentDate ?? raw.Date ?? raw.date ?? null;
  const isActive =
    raw.IsActive ?? raw.isActive ?? raw.Active ?? raw.active ?? true;

  return {
    enrollmentId,
    studentId,
    courseId,
    subjectId,
    classId,
    enrollmentDate,
    isActive,
    raw,
  };
};

// Create a single enrollment record
export const createEnrollment = async (enrollmentPayload) => {
  try {
    const response = await axios.post("/Enrollments", enrollmentPayload);
    return normalizeEnrollmentRecord(
      response.data,
      enrollmentPayload?.StudentID
    );
  } catch (error) {
    console.error("Failed to create enrollment via API", error);
    // Don't throw here; let callers decide. Return null to indicate failure.
    return null;
  }
};

// Create multiple enrollments for a student (one per course id).
// courseIds can be array of strings or numbers.
export const createEnrollmentsForStudent = async (
  studentId,
  courseIds = [],
  options = {}
) => {
  if (!studentId) return [];
  const created = [];

  const defaultDate = options.EnrollmentDate || new Date().toISOString();

  for (const rawId of courseIds) {
    const courseId = Number(rawId);
    if (!courseId && courseId !== 0) continue;

    const payload = {
      StudentID: studentId,
      CourseID: courseId,
      EnrollmentDate: defaultDate,
      IsActive: options.IsActive !== undefined ? !!options.IsActive : true,
    };

    const res = await createEnrollment(payload);
    if (res) created.push(res);
  }

  return created;
};

// List enrollments for a given student. Returns an array of
// { EnrollmentID, StudentID, CourseID, EnrollmentDate, ... }
export const getEnrollmentsByStudent = async (studentId) => {
  if (studentId === undefined || studentId === null) return [];
  const idStr = String(studentId).trim();
  if (!idStr) return [];

  try {
    const response = await axios.get(`/Enrollments/Student/${idStr}`);
    const raw = Array.isArray(response.data)
      ? response.data
      : response.data?.enrollments || response.data?.Enrollments || [];
    return raw.map((entry) => normalizeEnrollmentRecord(entry, studentId));
  } catch (error) {
    console.error("Failed to fetch enrollments for student", error);
    return [];
  }
};

// Delete an enrollment by its id
export const deleteEnrollment = async (enrollmentId) => {
  if (enrollmentId === undefined || enrollmentId === null) return false;
  const idStr = String(enrollmentId).trim();
  if (!idStr) return false;

  try {
    await axios.delete(`/Enrollments/${idStr}`);
    return true;
  } catch (error) {
    console.error("Failed to delete enrollment", error);
    return false;
  }
};

export const updateEnrollment = async (enrollmentId, updates = {}) => {
  if (enrollmentId === undefined || enrollmentId === null) return null;
  const idStr = String(enrollmentId).trim();
  if (!idStr) return null;

  try {
    const response = await axios.patch(`/Enrollments/${idStr}`, updates);
    return response.data;
  } catch (patchError) {
    // Some backends may not support PATCH; fall back to PUT with the same payload.
    try {
      const response = await axios.put(`/Enrollments/${idStr}`, updates);
      return response.data;
    } catch (putError) {
      console.error("Failed to update enrollment", putError);
      throw putError;
    }
  }
};

export const getEnrollmentById = async (enrollmentId) => {
  if (enrollmentId === undefined || enrollmentId === null) return null;
  const idStr = String(enrollmentId).trim();
  if (!idStr) return null;

  try {
    const response = await axios.get(`/Enrollments/${idStr}`);
    return normalizeEnrollmentRecord(response.data);
  } catch (error) {
    console.error("Failed to fetch enrollment", error);
    throw error;
  }
};

export const updateEnrollmentClass = async (
  enrollmentId,
  nextClassId,
  overrides = {}
) => {
  const existing = await getEnrollmentById(enrollmentId);
  if (!existing || existing.enrollmentId === null) {
    throw new Error("Enrollment not found");
  }

  const payload = {
    EnrollmentID: existing.enrollmentId,
    StudentID: existing.studentId,
    CourseID: existing.courseId,
    SubjectID: existing.subjectId,
    ClassID: nextClassId ?? null,
    EnrollmentDate:
      overrides.EnrollmentDate ??
      existing.enrollmentDate ??
      new Date().toISOString(),
    IsActive: overrides.IsActive ?? existing.isActive ?? true,
  };

  const response = await axios.put(
    `/Enrollments/${existing.enrollmentId}`,
    payload
  );
  return normalizeEnrollmentRecord(
    response.data ?? payload,
    existing.studentId
  );
};

export const setEnrollmentActiveStatus = async (
  enrollmentId,
  isActive,
  context = {}
) => {
  const payload = { IsActive: Boolean(isActive) };
  const numericId = Number(enrollmentId);
  if (!Number.isNaN(numericId)) {
    payload.EnrollmentID = numericId;
  } else if (enrollmentId !== undefined && enrollmentId !== null) {
    payload.EnrollmentID = enrollmentId;
  }

  const studentId =
    context.StudentID ??
    context.studentID ??
    context.studentId ??
    context.UserID ??
    context.userID ??
    context.userId ??
    null;
  if (studentId !== null && studentId !== undefined) {
    payload.StudentID = studentId;
  }

  const courseId =
    context.CourseID ??
    context.courseID ??
    context.courseId ??
    context.CourseId ??
    null;
  if (courseId !== null && courseId !== undefined) {
    payload.CourseID = courseId;
  }

  const subjectId =
    context.SubjectID ??
    context.subjectID ??
    context.subjectId ??
    context.SubjectId ??
    null;
  if (subjectId !== null && subjectId !== undefined) {
    payload.SubjectID = subjectId;
  }

  const enrollmentDate =
    context.EnrollmentDate ?? context.enrollmentDate ?? null;
  if (enrollmentDate) {
    payload.EnrollmentDate = enrollmentDate;
  }

  return updateEnrollment(enrollmentId, payload);
};

export default {
  createEnrollment,
  createEnrollmentsForStudent,
  getEnrollmentsByStudent,
  deleteEnrollment,
  updateEnrollment,
  getEnrollmentById,
  updateEnrollmentClass,
  setEnrollmentActiveStatus,
};

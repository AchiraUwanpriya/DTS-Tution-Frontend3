// src/components/attendance/QRScanner.jsx
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { useLocation, useParams } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { recordAttendance } from "../../services/attendanceService";
import { getStudentById } from "../../services/studentService";
import {
  getTeacherCourses,
  getTeacherCourseStudents,
} from "../../services/courseService";
import { getAllClassSchedules } from "../../services/classScheduleService";
import Button from "../common/Button";

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const QRScanner = () => {
  const { id: routeCourseId, sessionId } = useParams();
  const location = useLocation();
  const { user } = useAuth();
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  // Course selection (replaces subject selection)
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [selectedDate, setSelectedDate] = useState(() => {
    try {
      return new Date().toISOString().split("T")[0];
    } catch (_) {
      return "";
    }
  });
  const [courseStudents, setCourseStudents] = useState([]);
  const [rosterStatus, setRosterStatus] = useState("idle");
  const [rosterError, setRosterError] = useState("");
  const [sessionStartTime, setSessionStartTime] = useState(() => {
    try {
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, "0");
      const mm = String(now.getMinutes()).padStart(2, "0");
      return `${hh}:${mm}`;
    } catch (_) {
      return "";
    }
  });
  const [sessionEndTime, setSessionEndTime] = useState(() => {
    try {
      const end = new Date();
      end.setHours(end.getHours() + 2);
      const hh = String(end.getHours()).padStart(2, "0");
      const mm = String(end.getMinutes()).padStart(2, "0");
      return `${hh}:${mm}`;
    } catch (_) {
      return "";
    }
  });
  const [sessionEndModified, setSessionEndModified] = useState(false);
  const [schedules, setSchedules] = useState([]);
  const [scheduleStatus, setScheduleStatus] = useState("idle");
  const [scheduleError, setScheduleError] = useState("");
  const [selectedScheduleId, setSelectedScheduleId] = useState("");

  // Keep session end time in sync with start time unless the end was manually edited
  const computeEndFromStart = (start) => {
    if (!start || !/^\d{2}:\d{2}$/.test(start)) return "";
    const [hh, mm] = start.split(":").map((p) => Number(p));
    if (!Number.isFinite(hh) || !Number.isFinite(mm)) return "";
    const d = new Date();
    d.setHours(hh, mm, 0, 0);
    d.setHours(d.getHours() + 2);
    const eh = String(d.getHours()).padStart(2, "0");
    const em = String(d.getMinutes()).padStart(2, "0");
    return `${eh}:${em}`;
  };

  useEffect(() => {
    if (sessionEndModified) return;
    try {
      const newEnd = computeEndFromStart(sessionStartTime);
      if (newEnd) setSessionEndTime(newEnd);
    } catch (_) {
      // ignore
    }
  }, [sessionStartTime, sessionEndModified]);

  // Simple camera preview to match the uploaded UI
  const videoRef = useRef(null);
  const readerRef = useRef(null);
  const controlsRef = useRef(null);
  const audioCtxRef = useRef(null);

  const [scanError, setScanError] = useState("");
  const [lastRecord, setLastRecord] = useState(null);
  const [scanIteration, setScanIteration] = useState(0);
  const [studentDetails, setStudentDetails] = useState(null);
  const [studentLoading, setStudentLoading] = useState(false);
  const [studentError, setStudentError] = useState("");

  const teacherId = useMemo(() => {
    return (
      user?.teacherId ??
      user?.TeacherId ??
      user?.teacherID ??
      user?.TeacherID ??
      user?.id ??
      user?.Id ??
      user?.userId ??
      user?.userID ??
      user?.UserId ??
      user?.UserID ??
      null
    );
  }, [user]);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const list = teacherId ? await getTeacherCourses(teacherId) : [];
        setCourses(Array.isArray(list) ? list : []);
        // if route contains a course id (e.g. /teacher/attendance/:id), pre-select it
        if (routeCourseId) {
          setSelectedCourseId(String(routeCourseId));
        } else {
          setSelectedCourseId("");
        }
      } catch (_) {
        setCourses([]);
      }
    };
    fetchCourses();
  }, [teacherId]);

  const resolveCourseId = useCallback((course) => {
    if (!course || typeof course !== "object") return null;
    return (
      course?.id ??
      course?.Id ??
      course?.courseId ??
      course?.CourseId ??
      course?.courseID ??
      course?.CourseID ??
      null
    );
  }, []);

  const resolveScheduleCourseId = useCallback((schedule) => {
    if (!schedule || typeof schedule !== "object") return null;
    return (
      schedule?.courseId ??
      schedule?.CourseID ??
      schedule?.courseID ??
      schedule?.CourseId ??
      schedule?.raw?.CourseID ??
      schedule?.raw?.courseID ??
      schedule?.raw?.CourseId ??
      schedule?.raw?.courseId ??
      null
    );
  }, []);

  const makeScheduleValue = useCallback((schedule) => {
    if (!schedule) return "";
    const coreId =
      schedule?.scheduleId ??
      schedule?.id ??
      schedule?.raw?.ScheduleID ??
      schedule?.raw?.scheduleID ??
      null;
    if (coreId !== null && coreId !== undefined) {
      return String(coreId);
    }

    const fallbackParts = [
      schedule?.courseId ??
        schedule?.CourseID ??
        schedule?.courseID ??
        "course",
      schedule?.subjectId ??
        schedule?.SubjectID ??
        schedule?.subjectID ??
        "subject",
      schedule?.dayOfWeek ?? "day",
      schedule?.startTime ?? "start",
      schedule?.endTime ?? "end",
    ];
    return fallbackParts.map((part) => String(part ?? "")).join("|");
  }, []);

  useEffect(() => {
    if (!teacherId) {
      setSchedules([]);
      setScheduleStatus("idle");
      setScheduleError("");
      setSelectedScheduleId("");
      return;
    }

    const courseIdSet = new Set(
      (Array.isArray(courses) ? courses : [])
        .map((course) => {
          const identifier = resolveCourseId(course);
          return identifier === null || identifier === undefined
            ? null
            : String(identifier);
        })
        .filter(Boolean)
    );

    if (!courseIdSet.size) {
      setSchedules([]);
      setScheduleStatus("idle");
      setScheduleError("");
      setSelectedScheduleId("");
      return;
    }

    let cancelled = false;
    setScheduleStatus("loading");
    setScheduleError("");

    const loadSchedules = async () => {
      try {
        const list = await getAllClassSchedules();
        if (cancelled) {
          return;
        }

        const filtered = (Array.isArray(list) ? list : []).filter(
          (schedule) => {
            if (!schedule || typeof schedule !== "object") return false;
            const courseIdCandidate = resolveScheduleCourseId(schedule);
            if (courseIdCandidate === null || courseIdCandidate === undefined) {
              return false;
            }
            return courseIdSet.has(String(courseIdCandidate));
          }
        );

        filtered.sort((a, b) => {
          const subjectA = String(a?.subjectName ?? "").toLowerCase();
          const subjectB = String(b?.subjectName ?? "").toLowerCase();
          if (subjectA && subjectB && subjectA !== subjectB) {
            return subjectA.localeCompare(subjectB);
          }
          const courseA = String(a?.courseName ?? "").toLowerCase();
          const courseB = String(b?.courseName ?? "").toLowerCase();
          if (courseA && courseB && courseA !== courseB) {
            return courseA.localeCompare(courseB);
          }
          const dayA = Number.isFinite(a?.dayOfWeek) ? a.dayOfWeek : 0;
          const dayB = Number.isFinite(b?.dayOfWeek) ? b.dayOfWeek : 0;
          if (dayA !== dayB) return dayA - dayB;
          const startA = String(a?.startTime ?? "");
          const startB = String(b?.startTime ?? "");
          return startA.localeCompare(startB);
        });

        setSchedules(filtered);
        setScheduleStatus("success");
        setScheduleError("");
        setSelectedScheduleId((prev) => {
          if (!prev) return prev;
          return filtered.some((item) => makeScheduleValue(item) === prev)
            ? prev
            : "";
        });
      } catch (error) {
        if (cancelled) {
          return;
        }
        console.error("Failed to load teacher schedules", error);
        setSchedules([]);
        setScheduleStatus("error");
        setScheduleError(
          "Unable to load schedules for your courses. Try again later."
        );
        setSelectedScheduleId("");
      }
    };

    loadSchedules();

    return () => {
      cancelled = true;
    };
  }, [
    teacherId,
    courses,
    makeScheduleValue,
    resolveCourseId,
    resolveScheduleCourseId,
  ]);

  const scheduleLookup = useMemo(() => {
    const map = new Map();
    (Array.isArray(schedules) ? schedules : []).forEach((schedule) => {
      map.set(makeScheduleValue(schedule), schedule);
    });
    return map;
  }, [schedules, makeScheduleValue]);

  const scheduleOptions = useMemo(() => {
    const list = Array.isArray(schedules) ? schedules : [];
    return list.map((schedule) => {
      const value = makeScheduleValue(schedule);
      const subjectLabel =
        schedule?.subjectName ||
        schedule?.SubjectName ||
        schedule?.subjectId ||
        schedule?.SubjectID ||
        "Schedule";
      const courseLabel = schedule?.courseName || schedule?.CourseName || "";
      const dayLabel = Number.isFinite(schedule?.dayOfWeek)
        ? DAY_NAMES[schedule.dayOfWeek]
        : "";
      const toShortTime = (time) => {
        if (!time) return "";
        return String(time).split(":").slice(0, 2).join(":");
      };
      const startShort = toShortTime(schedule?.startTime);
      const endShort = toShortTime(schedule?.endTime);
      const metaParts = [];
      if (courseLabel) metaParts.push(courseLabel);
      if (dayLabel) metaParts.push(dayLabel);
      if (startShort && endShort) {
        metaParts.push(`${startShort}-${endShort}`);
      } else if (startShort) {
        metaParts.push(`Start ${startShort}`);
      } else if (endShort) {
        metaParts.push(`End ${endShort}`);
      }
      const label = metaParts.length
        ? `${subjectLabel} (${metaParts.join(" • ")})`
        : String(subjectLabel);
      return { value, label };
    });
  }, [schedules, makeScheduleValue]);

  useEffect(() => {
    if (!teacherId || !selectedCourseId) {
      setCourseStudents([]);
      setRosterStatus("idle");
      setRosterError("");
      return;
    }

    let cancelled = false;
    setRosterStatus("loading");
    setRosterError("");
    setCourseStudents([]);

    const loadRoster = async () => {
      try {
        const { students } = await getTeacherCourseStudents(
          teacherId,
          selectedCourseId
        );
        if (cancelled) {
          return;
        }
        const list = Array.isArray(students) ? students : [];
        setCourseStudents(list);
        setRosterStatus("success");
      } catch (error) {
        if (cancelled) {
          return;
        }
        console.error("Failed to fetch course roster", error);
        setCourseStudents([]);
        setRosterStatus("error");
        setRosterError(
          "Unable to load enrolled students. Scanning is disabled for this course."
        );
      }
    };

    loadRoster();

    return () => {
      cancelled = true;
    };
  }, [selectedCourseId, teacherId]);

  const stopCamera = useCallback(() => {
    if (controlsRef.current) {
      try {
        controlsRef.current.stop();
      } catch (_) {
        // ignore stop errors
      }
      controlsRef.current = null;
    }

    if (readerRef.current) {
      try {
        readerRef.current.reset();
      } catch (_) {
        // ignore reset errors
      }
      readerRef.current = null;
    }

    const video = videoRef.current;
    if (video && video.srcObject) {
      const tracks =
        typeof video.srcObject.getTracks === "function"
          ? video.srcObject.getTracks()
          : [];
      tracks.forEach((track) => {
        try {
          track.stop();
        } catch (_) {
          // ignore stop errors
        }
      });
      video.srcObject = null;
    }
  }, []);

  const path = location?.pathname?.toLowerCase() ?? "";
  const isTeacherAttendanceRoute =
    path.includes("teacher") && path.includes("attendance");

  const rosterReady = rosterStatus === "success";
  const canScan =
    isTeacherAttendanceRoute && Boolean(selectedCourseId) && rosterReady;

  const handleScheduleSelect = useCallback(
    (value) => {
      setSelectedScheduleId(value);
      if (!value) {
        setSessionEndModified(false);
        return;
      }

      const schedule = scheduleLookup.get(value);
      if (!schedule) {
        return;
      }

      const resolvedCourseId = resolveScheduleCourseId(schedule);
      if (resolvedCourseId !== null && resolvedCourseId !== undefined) {
        const normalizedCourseId = String(resolvedCourseId);
        setSelectedCourseId((prev) =>
          prev === normalizedCourseId ? prev : normalizedCourseId
        );
      }

      const normalizeTimeInput = (time) => {
        if (!time) return "";
        return String(time).split(":").slice(0, 2).join(":");
      };

      const startValue = normalizeTimeInput(schedule?.startTime);
      if (startValue) {
        setSessionStartTime((prev) =>
          prev === startValue ? prev : startValue
        );
      }

      const endValue = normalizeTimeInput(schedule?.endTime);
      if (endValue) {
        setSessionEndModified(true);
        setSessionEndTime((prev) => (prev === endValue ? prev : endValue));
      } else {
        setSessionEndModified(false);
      }
    },
    [scheduleLookup, resolveScheduleCourseId]
  );

  useEffect(() => {
    if (!selectedScheduleId) return;
    const schedule = scheduleLookup.get(selectedScheduleId);
    if (!schedule) {
      setSelectedScheduleId("");
      return;
    }
    const scheduleCourseId = resolveScheduleCourseId(schedule);
    if (
      selectedCourseId &&
      scheduleCourseId !== null &&
      scheduleCourseId !== undefined &&
      String(scheduleCourseId) !== String(selectedCourseId)
    ) {
      setSelectedScheduleId("");
    }
  }, [
    selectedScheduleId,
    selectedCourseId,
    scheduleLookup,
    resolveScheduleCourseId,
  ]);

  const resolveAttendanceDate = useCallback(() => {
    if (selectedDate) {
      const now = new Date();
      const parts = selectedDate.split("-");
      if (parts.length === 3) {
        const [year, month, day] = parts.map((part) => Number(part));
        if (
          Number.isFinite(year) &&
          Number.isFinite(month) &&
          Number.isFinite(day)
        ) {
          const parsed = new Date(now);
          parsed.setFullYear(year, month - 1, day);
          if (!Number.isNaN(parsed.getTime())) {
            return {
              iso: parsed.toISOString(),
              display: selectedDate,
            };
          }
        }
      }

      const parsed = new Date(`${selectedDate}T00:00:00`);
      if (!Number.isNaN(parsed.getTime())) {
        // fallback to midnight if time merge failed
        return {
          iso: parsed.toISOString(),
          display: selectedDate,
        };
      }
    }

    const now = new Date();
    const fallbackDisplay = now.toISOString().split("T")[0];
    return {
      iso: now.toISOString(),
      display: fallbackDisplay,
    };
  }, [selectedDate]);

  const playBeep = useCallback(
    (times = 1, freq = 950, duration = 0.18, gap = 0.12) => {
      try {
        if (typeof window === "undefined") return;
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;

        if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
        const ctx = audioCtxRef.current;

        // resume if suspended (some browsers block until user interaction)
        if (ctx.state === "suspended" && typeof ctx.resume === "function") {
          ctx.resume().catch(() => {});
        }

        const now = ctx.currentTime;
        for (let i = 0; i < times; i++) {
          const start = now + i * (duration + gap);
          const stop = start + duration;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.value = freq;
          gain.gain.value = 0.06;
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(start);
          osc.stop(stop);
          // cleanup after the tone finishes
          setTimeout(() => {
            try {
              osc.disconnect();
              gain.disconnect();
            } catch (_) {}
          }, (i * (duration + gap) + duration + 0.1) * 1000);
        }
      } catch (_) {
        // ignore audio errors
      }
    },
    []
  );

  const enrolledStudentIds = useMemo(() => {
    if (!Array.isArray(courseStudents) || courseStudents.length === 0) {
      return new Set();
    }

    const ids = courseStudents
      .map((student) => {
        if (!student || typeof student !== "object") {
          return null;
        }
        const identifier =
          student.studentId ??
          student.StudentID ??
          student.id ??
          student.Id ??
          student.userId ??
          student.UserID ??
          null;

        if (identifier === undefined || identifier === null) {
          return null;
        }

        const text = String(identifier).trim();
        return text.length ? text : null;
      })
      .filter(Boolean);

    return new Set(ids);
  }, [courseStudents]);

  const handleDecoded = useCallback(
    async (rawText) => {
      if (!rawText) {
        setStatus("error");
        setMessage("Empty QR result. Please try again.");
        setScanError("QR code did not contain any data.");
        return;
      }

      stopCamera();
      setStatus("loading");
      setMessage("");
      setScanError("");
      setLastRecord(null);

      if (!rosterReady) {
        const pendingMessage =
          rosterStatus === "loading"
            ? "Student roster is still loading."
            : "Student roster unavailable.";
        setStatus("error");
        setMessage(pendingMessage);
        setScanError(
          rosterStatus === "loading"
            ? "Please wait for the enrolled student list to finish loading before scanning."
            : rosterError ||
                "Unable to verify the enrolled students for this course."
        );
        return;
      }

      let parsed = null;
      try {
        parsed = JSON.parse(rawText);
      } catch (_) {
        parsed = rawText;
      }

      const payload = parsed && typeof parsed === "object" ? parsed : {};

      const payloadCourseIds = (() => {
        if (!payload || typeof payload !== "object") {
          return [];
        }

        const rawList =
          payload.courseIds ??
          payload.CourseIds ??
          payload.courseIDs ??
          payload.CourseIDs ??
          payload.courses ??
          payload.Courses ??
          null;

        if (!Array.isArray(rawList)) {
          return [];
        }

        const normalized = rawList
          .map((value) => {
            if (value === undefined || value === null) {
              return null;
            }
            const text = String(value).trim();
            return text.length ? text : null;
          })
          .filter(Boolean);

        return Array.from(new Set(normalized));
      })();

      const qrType =
        payload.type ??
        payload.Type ??
        payload.qrType ??
        payload.QRType ??
        null;

      if (qrType && String(qrType).toLowerCase() !== "student-attendance") {
        setStatus("error");
        setMessage("This QR code is not a student attendance code.");
        setScanError(
          "Present a student attendance QR generated from the student portal."
        );
        return;
      }

      const resolvedStudentId = (() => {
        if (payload && typeof payload === "object") {
          return (
            payload.studentId ??
            payload.StudentID ??
            payload.studentID ??
            payload.id ??
            payload.Id ??
            payload.userId ??
            payload.UserID ??
            null
          );
        }

        if (typeof parsed === "string") {
          const trimmed = parsed.trim();
          if (!trimmed.length) {
            return null;
          }
          if (trimmed.startsWith("STD-")) {
            const parts = trimmed.split("-");
            return parts.length >= 2 ? parts[1] : trimmed;
          }
          return trimmed;
        }

        return null;
      })();

      if (!resolvedStudentId) {
        setStatus("error");
        setMessage("Invalid student QR code detected.");
        setScanError(
          "Could not extract student information from this QR code."
        );
        return;
      }

      // best-effort: fetch student details so the operator can view them
      // when a QR is scanned. Do not block the scanning flow on failure.
      (async () => {
        try {
          setStudentLoading(true);
          setStudentError("");
          setStudentDetails(null);

          const s = await getStudentById(resolvedStudentId);
          setStudentDetails(s || null);
        } catch (err) {
          console.debug("Unable to fetch student details", err);
          setStudentDetails(null);
          setStudentError("Student details unavailable");
        } finally {
          setStudentLoading(false);
        }
      })();

      const resolvedCourseId =
        selectedCourseId ||
        payload.courseId ||
        payload.CourseID ||
        payload.courseID ||
        null;

      if (!resolvedCourseId) {
        setStatus("error");
        setMessage("Select a schedule before scanning student QR codes.");
        setScanError("Schedule selection is required to record attendance.");
        return;
      }

      const normalizedCourseId = String(resolvedCourseId).trim();

      if (
        normalizedCourseId &&
        payloadCourseIds.length > 0 &&
        !payloadCourseIds.some((id) => id === normalizedCourseId)
      ) {
        setStatus("error");
        setMessage("QR code is not valid for the selected course.");
        setScanError(
          "The scanned QR does not list the selected course among the student's enrollments."
        );
        try {
          playBeep(2, 700, 0.14, 0.12);
        } catch (_) {}
        return;
      }

      const resolvedName =
        payload.name ??
        payload.studentName ??
        payload.StudentName ??
        payload.fullName ??
        payload.FullName ??
        "";

      // sessionDate comes from the teacher's selected date (session date)
      const sessionDate = resolveAttendanceDate();
      const sessionIso = sessionDate.iso;
      const sessionDisplay = sessionDate.display;

      // scannedAt is the current timestamp when the QR was scanned
      const scannedAtIso = new Date().toISOString();
      const scannedAtDisplay = new Date(scannedAtIso).toLocaleString();

      const sessionDatePart = (() => {
        if (selectedDate && selectedDate.includes("-")) {
          return selectedDate;
        }
        const isoSplit = sessionIso ? sessionIso.split("T")[0] : "";
        return isoSplit || new Date().toISOString().split("T")[0];
      })();

      const mergeDateAndTime = (timeValue) => {
        if (!timeValue) {
          return null;
        }

        const candidate = new Date(`${sessionDatePart}T${timeValue}`);
        return Number.isNaN(candidate.getTime())
          ? null
          : candidate.toISOString();
      };

      const sessionStartIsoBound = mergeDateAndTime(sessionStartTime);
      const sessionEndIsoBound = mergeDateAndTime(sessionEndTime);

      const enrollmentKey = String(resolvedStudentId).trim();
      if (!enrollmentKey || !enrolledStudentIds.has(enrollmentKey)) {
        setStatus("error");
        setMessage("Student is not enrolled in the selected course.");
        setScanError(
          "This QR belongs to a student who is not registered for the selected course."
        );
        // double beep to indicate mismatch (not enrolled)
        try {
          playBeep(2, 700, 0.14, 0.12);
        } catch (_) {}
        return;
      }

      try {
        const record = await recordAttendance({
          sessionId:
            sessionId ??
            payload.sessionId ??
            payload.sessionID ??
            payload.SessionID ??
            null,
          studentId: resolvedStudentId,
          courseId: resolvedCourseId,
          teacherId,
          // the teacher's selected date represents the session date
          attendanceDate: sessionIso,
          // the actual scan time should be the current time
          scanTime: scannedAtIso,
          sessionStartTime: sessionStartIsoBound,
          sessionEndTime: sessionEndIsoBound,
          SessionStart: sessionStartIsoBound,
          SessionEnd: sessionEndIsoBound,
          StartTime: sessionStartIsoBound,
          EndTime: sessionEndIsoBound,
          status: payload.status ?? "Present",
        });

        setStatus("success");
        // play a short beep to indicate successful scan
        playBeep(1, 950, 0.18, 0.12);
        setLastRecord({
          ...record,
          attendanceDate:
            record?.attendanceDate ?? record?.AttendanceDate ?? sessionIso,
          scanTime: record?.scanTime ?? record?.ScanTime ?? scannedAtIso,
          sessionStartTime:
            record?.sessionStartTime ??
            record?.SessionStartTime ??
            record?.SessionStart ??
            record?.StartTime ??
            sessionStartIsoBound,
          sessionEndTime:
            record?.sessionEndTime ??
            record?.SessionEndTime ??
            record?.SessionEnd ??
            record?.EndTime ??
            sessionEndIsoBound,
        });

        const displayName =
          resolvedName ||
          record?.studentName ||
          record?.StudentName ||
          String(resolvedStudentId);
        const sessionText = sessionDisplay
          ? ` for session ${sessionDisplay}`
          : "";
        const scannedText = scannedAtDisplay
          ? ` (scanned at ${scannedAtDisplay})`
          : "";
        const startText = sessionStartIsoBound
          ? ` | starts ${new Date(sessionStartIsoBound).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}`
          : "";
        const endText = sessionEndIsoBound
          ? ` | ends ${new Date(sessionEndIsoBound).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}`
          : "";
        setMessage(
          `Attendance recorded for ${displayName}${sessionText}${scannedText}${startText}${endText}.`
        );
      } catch (error) {
        console.error("Failed to record attendance", error);
        setStatus("error");
        setMessage("Failed to record attendance. Please try again.");
        setScanError(
          "Recording attendance failed. Check your connection and retry."
        );
      }
    },
    [
      enrolledStudentIds,
      resolveAttendanceDate,
      rosterReady,
      rosterStatus,
      rosterError,
      selectedCourseId,
      selectedDate,
      sessionId,
      stopCamera,
      teacherId,
      sessionEndTime,
      sessionStartTime,
    ]
  );

  useEffect(() => {
    if (!canScan) {
      stopCamera();
      if (!selectedCourseId || !isTeacherAttendanceRoute) {
        setStatus("idle");
        setMessage("");
        setScanError("");
        setLastRecord(null);
      }
      return undefined;
    }

    let cancelled = false;
    const videoElement = videoRef.current;

    if (!videoElement) {
      return undefined;
    }

    setStatus("scanning");
    setMessage("");
    setScanError("");
    setLastRecord(null);

    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;

    reader
      .decodeFromVideoDevice(
        undefined,
        videoElement,
        (result, err, controls) => {
          if (cancelled) {
            try {
              controls?.stop();
            } catch (_) {
              // ignore stop errors when cancelled
            }
            return;
          }

          if (result) {
            controlsRef.current = controls;
            handleDecoded(result.getText());
            return;
          }

          if (err) {
            const ignorable = new Set([
              "NotFoundException",
              "ChecksumException",
              "FormatException",
              "ChecksumError",
              "FormatError",
            ]);

            if (!ignorable.has(err.name)) {
              setScanError(
                "Unable to read QR code. Hold steady and try again."
              );
            } else {
              setScanError("");
            }
          }
        }
      )
      .then((controls) => {
        if (cancelled) {
          try {
            controls?.stop();
          } catch (_) {
            // ignore stop errors when cancelled
          }
          return;
        }
        controlsRef.current = controls;
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }
        console.error("Failed to access camera", error);
        setStatus("error");
        setMessage(
          "Camera access failed. Check browser permissions and retry."
        );
        setScanError(error?.message ?? "Camera access was blocked.");
      });

    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [
    canScan,
    handleDecoded,
    isTeacherAttendanceRoute,
    scanIteration,
    selectedCourseId,
    stopCamera,
  ]);

  const restartScanner = useCallback(() => {
    setMessage("");
    setScanError("");
    setLastRecord(null);
    setScanIteration((value) => value + 1);
  }, []);

  const actionButtonLabel = (() => {
    if (!canScan) {
      return "Start Scanning";
    }
    if (status === "scanning") {
      return "Scanning...";
    }
    if (status === "loading") {
      return "Recording...";
    }
    if (status === "success") {
      return "Scan Next Student";
    }
    if (status === "error") {
      return "Retry Scan";
    }
    return "Start Scanning";
  })();

  const lastRecordInfo = useMemo(() => {
    if (!lastRecord) {
      return null;
    }

    const studentLabel =
      lastRecord.studentId ??
      lastRecord.StudentID ??
      lastRecord.userId ??
      lastRecord.UserID ??
      "";

    const recordDate =
      lastRecord.date ??
      lastRecord.Date ??
      lastRecord.attendanceDate ??
      lastRecord.AttendanceDate ??
      lastRecord.recordedAt ??
      lastRecord.RecordedAt ??
      lastRecord.scanTime ??
      lastRecord.scan_time ??
      null;

    const courseLabel =
      lastRecord.courseId ?? lastRecord.CourseID ?? lastRecord.courseID ?? "";

    const sessionStart =
      lastRecord.sessionStartTime ??
      lastRecord.SessionStartTime ??
      lastRecord.SessionStart ??
      lastRecord.StartTime ??
      null;

    const sessionEnd =
      lastRecord.sessionEndTime ??
      lastRecord.SessionEndTime ??
      lastRecord.SessionEnd ??
      lastRecord.EndTime ??
      null;

    return { studentLabel, recordDate, courseLabel, sessionStart, sessionEnd };
  }, [lastRecord]);

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h2 className="text-lg sm:text-2xl font-bold mb-6 text-center text-indigo-700 dark:text-indigo-300">
        Scan QR Code for Attendance
      </h2>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-1 gap-4 mb-6">
        {/* Schedule picker */}
        <div>
          <label
            htmlFor="schedule-select"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Schedule
          </label>
          <div className="relative">
            <select
              id="schedule-select"
              value={selectedScheduleId}
              onChange={(e) => handleScheduleSelect(e.target.value)}
              disabled={scheduleStatus === "loading"}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 py-3 px-4 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select Schedule</option>
              {scheduleOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              🗓️
            </span>
          </div>
          {scheduleStatus === "loading" && (
            <p className="mt-1 text-xs text-gray-500">
              Loading schedules for your courses...
            </p>
          )}
          {scheduleStatus === "error" && (
            <p className="mt-1 text-xs text-red-500">{scheduleError}</p>
          )}
          {scheduleStatus === "success" && !scheduleOptions.length && (
            <p className="mt-1 text-xs text-gray-500">
              No schedules found for your courses.
            </p>
          )}
        </div>
      </div>

      {/* Camera preview inside dashed border */}
      <div className="rounded-2xl border-2 border-dashed border-indigo-400/70 p-3">
        <div className="rounded-xl overflow-hidden bg-gray-200 dark:bg-gray-700 aspect-video flex items-center justify-center">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            muted
            playsInline
            autoPlay
          />
        </div>
      </div>

      <div className="mt-6 flex flex-col sm:flex-row sm:items-center gap-3">
        <Button
          className="w-full sm:w-auto justify-center items-center"
          onClick={restartScanner}
          disabled={!canScan || status === "scanning" || status === "loading"}
        >
          {actionButtonLabel}
        </Button>
        <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3">
          {selectedScheduleId === "" && (
            <span className="text-sm text-gray-500">
              Select a schedule to enable scanning
            </span>
          )}
          {selectedScheduleId !== "" && rosterStatus === "loading" && (
            <span className="text-sm text-gray-500">
              Loading enrolled students...
            </span>
          )}
          {selectedScheduleId !== "" && rosterStatus === "error" && (
            <span className="text-sm text-red-500">{rosterError}</span>
          )}
        </div>
      </div>

      {message && (
        <p
          className={`mt-4 ${
            status === "success"
              ? "text-green-600 dark:text-green-400"
              : status === "error"
              ? "text-red-600 dark:text-red-400"
              : "text-gray-600 dark:text-gray-400"
          }`}
        >
          {message}
        </p>
      )}

      {scanError && (
        <p className="mt-2 text-sm text-red-500 dark:text-red-400">
          {scanError}
        </p>
      )}

      {/* Student details card (shown after scanning a student QR) */}
      {(studentLoading || studentDetails || studentError) && (
        <div className="mt-4 p-3 border rounded-lg bg-white dark:bg-gray-800">
          {studentLoading && (
            <p className="text-sm text-gray-500">Loading student...</p>
          )}

          {studentError && !studentLoading && (
            <p className="text-sm text-red-500">{studentError}</p>
          )}

          {studentDetails && !studentLoading && (
            <div className="text-sm text-gray-700 dark:text-gray-200">
              <p>
                <span className="font-medium">Name:</span>{" "}
                {studentDetails.firstName || studentDetails.FirstName || "-"}{" "}
                {studentDetails.lastName || studentDetails.LastName || ""}
              </p>
              <p>
                <span className="font-medium">Student ID:</span>{" "}
                {studentDetails.studentId ??
                  studentDetails.StudentID ??
                  studentDetails.id}
              </p>
              {studentDetails.email && (
                <p>
                  <span className="font-medium">Email:</span>{" "}
                  {studentDetails.email}
                </p>
              )}
              {studentDetails.rollNumber && (
                <p>
                  <span className="font-medium">Roll #:</span>{" "}
                  {studentDetails.rollNumber}
                </p>
              )}
              {studentDetails.currentGrade && (
                <p>
                  <span className="font-medium">Grade:</span>{" "}
                  {studentDetails.currentGrade}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {lastRecordInfo && (
        <div className="mt-4 text-sm text-gray-600 dark:text-gray-300">
          <p>
            Last scan:{" "}
            <span className="font-medium">
              {lastRecordInfo.studentLabel || "Unknown"}
            </span>
          </p>
          {lastRecordInfo.recordDate && (
            <p>
              Recorded at:{" "}
              <span className="font-medium">
                {new Date(lastRecordInfo.recordDate).toLocaleString()}
              </span>
            </p>
          )}
          {lastRecordInfo.sessionStart && (
            <p>
              Session start:{" "}
              <span className="font-medium">
                {new Date(lastRecordInfo.sessionStart).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </p>
          )}
          {lastRecordInfo.sessionEnd && (
            <p>
              Session end:{" "}
              <span className="font-medium">
                {new Date(lastRecordInfo.sessionEnd).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </p>
          )}
          {lastRecordInfo.courseLabel && (
            <p>
              Course:{" "}
              <span className="font-medium">{lastRecordInfo.courseLabel}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default QRScanner;

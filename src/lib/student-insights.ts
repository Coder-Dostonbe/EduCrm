import { format } from "date-fns";
import {
  attendanceRecords,
  courseById,
  exams,
  grades,
  groupById,
  scheduleEvents,
  teacherById,
} from "@/data";
import type {
  AttendanceStatus,
  Course,
  Exam,
  Group,
  ScheduleEvent,
  Student,
  Teacher,
} from "@/types";

/** One scheduled class, with what the register says about this student. */
export interface Lesson {
  event: ScheduleEvent;
  /** null when the class hasn't happened or was never marked. */
  status: AttendanceStatus | null;
  past: boolean;
}

export interface ExamResult {
  exam: Exam;
  score: number;
  maxScore: number;
  percent: number;
}

export interface StudentInsights {
  group?: Group;
  course?: Course;
  teacher?: Teacher;
  /** Every class of their group, oldest first. */
  lessons: Lesson[];
  pastLessons: Lesson[];
  upcomingLessons: Lesson[];
  nextLesson?: Lesson;
  counts: Record<AttendanceStatus, number>;
  /** Classes with a marked register — the denominator for `rate`. */
  markedCount: number;
  /** Share of marked classes the student turned up to, late included. */
  rate: number;
  examResults: ExamResult[];
  averagePercent: number;
  /** Attendance rate per calendar month, oldest first, for the trend chart. */
  monthlyRate: { date: string; rate: number }[];
}

/** Counts as having turned up. Late is still in the room. */
export function isAttended(status: AttendanceStatus): boolean {
  return status === "present" || status === "late";
}

/** Everything the student-facing screens need about one student's studies.
 *
 *  Derived in one place so the dashboard and the course page can never
 *  disagree about how many classes were missed.
 */
export function studentInsights(student: Student): StudentInsights {
  const today = format(new Date(), "yyyy-MM-dd");

  const group = groupById.get(student.groupId);
  const course = courseById.get(student.courseId);
  const teacher = group ? teacherById.get(group.teacherId) : undefined;

  const statusByDate = new Map<string, AttendanceStatus>();
  for (const record of attendanceRecords) {
    if (record.studentId === student.id) statusByDate.set(record.date, record.status);
  }

  const lessons: Lesson[] = scheduleEvents
    .filter((e) => e.groupId === student.groupId)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((event) => ({
      event,
      status: statusByDate.get(event.date) ?? null,
      past: event.date < today,
    }));

  const pastLessons = lessons.filter((l) => l.past);
  const upcomingLessons = lessons.filter((l) => !l.past);

  const counts: Record<AttendanceStatus, number> = {
    present: 0,
    late: 0,
    absent: 0,
    excused: 0,
  };
  for (const lesson of pastLessons) {
    if (lesson.status) counts[lesson.status] += 1;
  }

  const markedCount = counts.present + counts.late + counts.absent + counts.excused;
  const attended = counts.present + counts.late;
  const rate = markedCount === 0 ? 0 : Math.round((attended / markedCount) * 100);

  // Exam results, newest first — only exams that have actually been graded.
  const gradeByExam = new Map(
    grades.filter((g) => g.studentId === student.id).map((g) => [g.examId, g])
  );
  const examResults: ExamResult[] = exams
    .filter((e) => e.groupId === student.groupId && gradeByExam.has(e.id))
    .map((exam) => {
      const grade = gradeByExam.get(exam.id)!;
      return {
        exam,
        score: grade.score,
        maxScore: grade.maxScore,
        percent: Math.round((grade.score / grade.maxScore) * 100),
      };
    })
    .sort((a, b) => b.exam.date.localeCompare(a.exam.date));

  const averagePercent =
    examResults.length === 0
      ? 0
      : Math.round(
          examResults.reduce((sum, r) => sum + r.percent, 0) / examResults.length
        );

  const byMonth = new Map<string, { attended: number; marked: number }>();
  for (const lesson of pastLessons) {
    if (!lesson.status) continue;
    const month = lesson.event.date.slice(0, 7);
    const bucket = byMonth.get(month) ?? { attended: 0, marked: 0 };
    bucket.marked += 1;
    if (isAttended(lesson.status)) bucket.attended += 1;
    byMonth.set(month, bucket);
  }
  const monthlyRate = [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, b]) => ({
      date: `${month}-01`,
      rate: Math.round((b.attended / b.marked) * 100),
    }));

  return {
    group,
    course,
    teacher,
    lessons,
    pastLessons,
    upcomingLessons,
    nextLesson: upcomingLessons[0],
    counts,
    markedCount,
    rate,
    examResults,
    averagePercent,
    monthlyRate,
  };
}

import {
  addDays,
  addMonths,
  format,
  startOfDay,
  subDays,
  subMonths,
} from "date-fns";
import type {
  ActivityItem,
  AppNotification,
  AttendanceRecord,
  AttendanceStatus,
  Debt,
  Exam,
  Grade,
  Lead,
  LeadPriority,
  LeadSource,
  LeadStage,
  Payment,
  PaymentMethod,
  PaymentState,
  SalaryRecord,
  ScheduleEvent,
  SentMessage,
  Student,
  WeekDay,
} from "@/types";
import {
  femaleFirstNames,
  lastNamesFemale,
  lastNamesMale,
  maleFirstNames,
  mulberry32,
  pick,
  randInt,
  tashkentAddresses,
  uzPhone,
} from "./seed";
import { branches, courses, employees, messageTemplates, teachers } from "./static-data";
import { groups, rooms } from "./groups";

export { branches, courses, employees, messageTemplates, teachers, groups, rooms };

const TODAY = startOfDay(new Date());
const iso = (d: Date) => format(d, "yyyy-MM-dd");

// ── Students ─────────────────────────────────────────────────────────

const STUDENTS_PER_GROUP = 8;

function generateStudents(): Student[] {
  const rnd = mulberry32(42);
  const students: Student[] = [];
  let n = 0;

  for (const group of groups) {
    const course = courses.find((c) => c.id === group.courseId)!;
    const count = Math.min(STUDENTS_PER_GROUP + randInt(rnd, -2, 3), group.capacity);
    for (let i = 0; i < count; i++) {
      n += 1;
      const id = `s-${n}`;
      const gender = rnd() < 0.52 ? "male" : "female";
      const firstName =
        gender === "male" ? pick(rnd, maleFirstNames) : pick(rnd, femaleFirstNames);
      const lastName =
        gender === "male" ? pick(rnd, lastNamesMale) : pick(rnd, lastNamesFemale);
      const parentGender = rnd() < 0.6 ? "male" : "female";
      const parentFirst =
        parentGender === "male" ? pick(rnd, maleFirstNames) : pick(rnd, femaleFirstNames);
      const parentLast = gender === "male"
        ? (parentGender === "male" ? lastName : lastName.replace(/ov$/, "ova").replace(/ev$/, "eva"))
        : (parentGender === "male" ? lastName.replace(/ova$/, "ov").replace(/eva$/, "ev") : lastName);

      const enrollment = subDays(TODAY, randInt(rnd, 10, 540));
      const attendanceRate = randInt(rnd, 68, 100);
      const performance = randInt(rnd, 52, 98);

      const debtRoll = rnd();
      let debt = 0;
      let paymentStatus: PaymentState = "paid";
      if (debtRoll < 0.14) {
        debt = course.price;
        paymentStatus = "overdue";
      } else if (debtRoll < 0.26) {
        debt = Math.round((course.price * randInt(rnd, 20, 70)) / 100 / 10000) * 10000;
        paymentStatus = "partial";
      } else if (debtRoll < 0.34) {
        debt = course.price;
        paymentStatus = "pending";
      }

      const statusRoll = rnd();
      const status =
        statusRoll < 0.86 ? "active" : statusRoll < 0.93 ? "inactive" : statusRoll < 0.97 ? "suspended" : "graduated";

      students.push({
        id,
        firstName,
        lastName,
        phone: uzPhone(rnd),
        email: rnd() < 0.6 ? `${firstName.toLowerCase().replace(/[^a-z]/g, "")}.${lastName.toLowerCase().replace(/[^a-z]/g, "")}${randInt(rnd, 1, 99)}@gmail.com` : undefined,
        dateOfBirth: iso(subDays(TODAY, randInt(rnd, 12 * 365, 24 * 365))),
        gender,
        address: pick(rnd, tashkentAddresses),
        parentName: `${parentFirst} ${parentLast}`,
        parentPhone: uzPhone(rnd),
        courseId: course.id,
        groupId: group.id,
        branchId: group.branchId,
        enrollmentDate: iso(enrollment),
        status,
        attendanceRate,
        paymentStatus,
        debt,
        monthlyFee: course.price,
        performance,
        notes: rnd() < 0.2 ? "Sinov darsidan keyin qo'shilgan." : undefined,
      });
    }
  }

  // Keep the demo student account stable
  const s1 = students.find((s) => s.id === "s-1");
  if (s1) {
    s1.firstName = "Aziza";
    s1.lastName = "Yusupova";
    s1.gender = "female";
    s1.status = "active";
    // Matches the demo login, which is how the API-mode session finds this
    // record — its user id is a Django id, not "s-1".
    s1.email = "student@eduflow.uz";
  }
  return students;
}

export const students: Student[] = generateStudents();

// Fill group student ids
for (const g of groups) {
  g.studentIds = students.filter((s) => s.groupId === g.id).map((s) => s.id);
}

export const studentById = new Map(students.map((s) => [s.id, s]));
export const groupById = new Map(groups.map((g) => [g.id, g]));
export const courseById = new Map(courses.map((c) => [c.id, c]));
export const teacherById = new Map(teachers.map((t) => [t.id, t]));
export const branchById = new Map(branches.map((b) => [b.id, b]));

// ── Payments ─────────────────────────────────────────────────────────

function generatePayments(): Payment[] {
  const rnd = mulberry32(77);
  const cashiers = ["Alisher Sobirov", "Dilnoza Rasulova"];
  const methods: PaymentMethod[] = ["cash", "card", "transfer", "online"];
  const payments: Payment[] = [];
  let n = 0;

  for (const s of students) {
    // 1-4 payments per student over the last months
    const count = randInt(rnd, 1, 4);
    for (let i = 0; i < count; i++) {
      n += 1;
      const date = subDays(TODAY, randInt(rnd, 0, 100));
      const statusRoll = rnd();
      let status: PaymentState = "paid";
      let amount = s.monthlyFee;
      if (statusRoll < 0.06) {
        status = "cancelled";
      } else if (statusRoll < 0.14) {
        status = "partial";
        amount = Math.round((s.monthlyFee * randInt(rnd, 30, 80)) / 100 / 10000) * 10000;
      } else if (statusRoll < 0.2) {
        status = "pending";
      }
      payments.push({
        id: `p-${n}`,
        invoiceNo: `INV-2026-${String(n).padStart(4, "0")}`,
        studentId: s.id,
        amount,
        method: pick(rnd, methods),
        date: iso(date),
        status,
        cashier: pick(rnd, cashiers),
        branchId: s.branchId,
      });
    }
  }
  return payments.sort((a, b) => (a.date < b.date ? 1 : -1));
}

export const payments: Payment[] = generatePayments();

// ── Debts ────────────────────────────────────────────────────────────

export const debts: Debt[] = students
  .filter((s) => s.debt > 0)
  .map((s, i) => {
    const rnd = mulberry32(100 + i);
    const overdueDays = s.paymentStatus === "overdue" ? randInt(rnd, 3, 45) : 0;
    return {
      studentId: s.id,
      expected: s.monthlyFee,
      paid: Math.max(0, s.monthlyFee - s.debt),
      debt: s.debt,
      dueDate: iso(subDays(TODAY, overdueDays > 0 ? overdueDays : -randInt(rnd, 1, 20))),
      overdueDays,
    };
  });

// ── Attendance ───────────────────────────────────────────────────────

const dayIndex: Record<WeekDay, number> = {
  sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6,
};

function generateAttendance(): AttendanceRecord[] {
  const rnd = mulberry32(55);
  const records: AttendanceRecord[] = [];
  let n = 0;

  for (const g of groups) {
    if (g.status !== "active") continue;
    const teacher = teacherById.get(g.teacherId);
    const groupStudents = students.filter((s) => s.groupId === g.id && s.status === "active");
    for (let d = 45; d >= 1; d--) {
      const date = subDays(TODAY, d);
      if (!g.schedule.days.some((wd) => dayIndex[wd] === date.getDay())) continue;
      for (const s of groupStudents) {
        n += 1;
        const roll = rnd() * 100;
        let status: AttendanceStatus;
        if (roll < s.attendanceRate - 8) status = "present";
        else if (roll < s.attendanceRate) status = "late";
        else if (roll < s.attendanceRate + (100 - s.attendanceRate) / 2) status = "absent";
        else status = "excused";
        records.push({
          id: `att-${n}`,
          studentId: s.id,
          groupId: g.id,
          date: iso(date),
          status,
          markedBy: teacher ? `${teacher.firstName} ${teacher.lastName}` : "—",
        });
      }
    }
  }
  return records;
}

export const attendanceRecords: AttendanceRecord[] = generateAttendance();

// ── Exams & Grades ───────────────────────────────────────────────────

function generateExams(): { exams: Exam[]; grades: Grade[] } {
  const rnd = mulberry32(88);
  const exams: Exam[] = [];
  const grades: Grade[] = [];
  let en = 0;
  let gn = 0;

  const examNames: Record<string, string[]> = {
    "c-1": ["Unit 1-4 Progress Test", "Mid-course Exam", "Speaking Assessment"],
    "c-2": ["Mock IELTS #1", "Mock IELTS #2", "Writing Assessment"],
    "c-3": ["Algebra Test", "Geometry Test", "DTM Mock Exam"],
    "c-4": ["Python Basics Quiz", "OOP Project Defense"],
    "c-5": ["HTML/CSS Layout Test", "JavaScript Exam"],
    "c-6": ["Django Midterm", "API Project Defense"],
    "c-7": ["Photoshop Practical", "Portfolio Review"],
    "c-8": ["TOPIK Mock I", "Vocabulary Test"],
  };

  for (const g of groups) {
    const names = examNames[g.courseId];
    if (!names || g.status !== "active") continue;
    const count = randInt(rnd, 1, Math.min(3, names.length));
    for (let i = 0; i < count; i++) {
      en += 1;
      const isPast = rnd() < 0.7;
      const date = isPast ? subDays(TODAY, randInt(rnd, 3, 60)) : addDays(TODAY, randInt(rnd, 2, 21));
      const maxScore = g.courseId === "c-2" ? 9 : 100;
      const participants = g.studentIds.length;
      const exam: Exam = {
        id: `ex-${en}`,
        name: names[i],
        courseId: g.courseId,
        groupId: g.id,
        teacherId: g.teacherId,
        date: iso(date),
        maxScore,
        participants,
        status: isPast ? "graded" : "upcoming",
      };
      exams.push(exam);
      if (exam.status === "graded") {
        for (const sid of g.studentIds) {
          gn += 1;
          const student = studentById.get(sid)!;
          const base = student.performance;
          const score =
            maxScore === 9
              ? Math.min(9, Math.round((base / 100) * 9 * 2 + rnd()) / 2 + 2)
              : Math.min(100, Math.max(30, base + randInt(rnd, -12, 10)));
          grades.push({
            id: `gr-${gn}`,
            studentId: sid,
            examId: exam.id,
            score,
            maxScore,
            comment:
              rnd() < 0.3
                ? pick(rnd, [
                    "Yaxshi natija, davom eting!",
                    "Grammar ustida ko'proq ishlash kerak.",
                    "A'lo darajada tayyorgarlik.",
                    "Speaking qismini kuchaytirish lozim.",
                  ])
                : undefined,
          });
        }
      }
    }
  }
  return { exams: exams.sort((a, b) => (a.date < b.date ? 1 : -1)), grades };
}

const eg = generateExams();
export const exams: Exam[] = eg.exams;
export const grades: Grade[] = eg.grades;

// ── Schedule events ──────────────────────────────────────────────────

function generateSchedule(): ScheduleEvent[] {
  const events: ScheduleEvent[] = [];
  let n = 0;
  for (const g of groups) {
    if (g.status === "finished") continue;
    for (let d = -21; d <= 28; d++) {
      const date = addDays(TODAY, d);
      if (!g.schedule.days.some((wd) => dayIndex[wd] === date.getDay())) continue;
      n += 1;
      events.push({
        id: `ev-${n}`,
        groupId: g.id,
        courseId: g.courseId,
        teacherId: g.teacherId,
        room: g.room,
        date: iso(date),
        startTime: g.schedule.startTime,
        endTime: g.schedule.endTime,
        branchId: g.branchId,
      });
    }
  }
  return events;
}

export const scheduleEvents: ScheduleEvent[] = generateSchedule();

// ── Leads ────────────────────────────────────────────────────────────

function generateLeads(): Lead[] {
  const rnd = mulberry32(99);
  const stages: [LeadStage, number][] = [
    ["new", 6], ["contacted", 5], ["interested", 4], ["trial", 3],
    ["negotiation", 3], ["enrolled", 4], ["lost", 3],
  ];
  const sources: LeadSource[] = ["instagram", "telegram", "referral", "website", "walk-in", "ads"];
  const priorities: LeadPriority[] = ["high", "medium", "low"];
  const managers = ["Gavhar Po'latova", "Nilufar Karimova", "Otabek Nazarov"];
  const leads: Lead[] = [];
  let n = 0;

  for (const [stage, count] of stages) {
    for (let i = 0; i < count; i++) {
      n += 1;
      const gender = rnd() < 0.5 ? "male" : "female";
      const firstName = gender === "male" ? pick(rnd, maleFirstNames) : pick(rnd, femaleFirstNames);
      const lastName = gender === "male" ? pick(rnd, lastNamesMale) : pick(rnd, lastNamesFemale);
      const course = pick(rnd, courses);
      const createdAt = subDays(TODAY, randInt(rnd, 1, 40));
      leads.push({
        id: `l-${n}`,
        name: `${firstName} ${lastName}`,
        phone: uzPhone(rnd),
        source: pick(rnd, sources),
        courseInterest: course.name,
        stage,
        priority: pick(rnd, priorities),
        manager: pick(rnd, managers),
        expectedValue: course.price * course.durationMonths,
        nextContactDate:
          stage === "enrolled" || stage === "lost" ? undefined : iso(addDays(TODAY, randInt(rnd, 0, 7))),
        createdAt: iso(createdAt),
        notes:
          rnd() < 0.7
            ? [
                {
                  id: `ln-${n}-1`,
                  date: iso(addDays(createdAt, 1)),
                  author: pick(rnd, managers),
                  text: pick(rnd, [
                    "Telefon orqali gaplashdik, narxlar bilan qiziqdi.",
                    "Sinov darsiga yozildi.",
                    "Instagram orqali murojaat qildi, jadval yuborildi.",
                    "Ertaga qayta qo'ng'iroq qilishni so'radi.",
                    "Ota-onasi bilan maslahatlashib javob beradi.",
                  ]),
                },
              ]
            : [],
        branchId: pick(rnd, branches).id,
      });
    }
  }
  return leads;
}

export const leads: Lead[] = generateLeads();

// ── Salaries ─────────────────────────────────────────────────────────

function generateSalaries(): SalaryRecord[] {
  const rnd = mulberry32(66);
  const records: SalaryRecord[] = [];
  let n = 0;
  const people = [
    ...teachers.map((t) => ({
      id: t.id, name: `${t.firstName} ${t.lastName}`, role: t.specialization,
      base: t.baseSalary, branchId: t.branchId,
    })),
    ...employees.map((e) => ({
      id: e.id, name: e.name, role: e.role, base: e.salary, branchId: e.branchId,
    })),
  ];

  for (let m = 3; m >= 0; m--) {
    const monthDate = subMonths(TODAY, m);
    const month = format(monthDate, "yyyy-MM");
    for (const p of people) {
      n += 1;
      const bonus = rnd() < 0.4 ? randInt(rnd, 3, 12) * 100000 : 0;
      const deductions = rnd() < 0.15 ? randInt(rnd, 1, 5) * 100000 : 0;
      const isCurrent = m === 0;
      records.push({
        id: `sal-${n}`,
        employeeId: p.id,
        employeeName: p.name,
        role: p.role,
        baseSalary: p.base,
        bonus,
        deductions,
        total: p.base + bonus - deductions,
        month,
        paymentDate: isCurrent ? undefined : iso(addDays(addMonths(monthDate, 1), 4)),
        status: isCurrent ? "pending" : "paid",
        branchId: p.branchId,
      });
    }
  }
  return records;
}

export const salaries: SalaryRecord[] = generateSalaries();

// ── Notifications ────────────────────────────────────────────────────

export const notifications: AppNotification[] = [
  { id: "n-1", type: "payment", title: "Yangi to'lov", body: "Aziza Yusupova 650 000 so'm to'lov qildi (IELTS).", date: iso(TODAY), read: false, link: "/payments" },
  { id: "n-2", type: "lead", title: "Yangi lid", body: "Instagram orqali yangi murojaat: Frontend kursi.", date: iso(TODAY), read: false, link: "/leads" },
  { id: "n-3", type: "attendance", title: "Davomat past", body: "Python-12 guruhida bugun 4 o'quvchi darsga kelmadi.", date: iso(subDays(TODAY, 1)), read: false, link: "/attendance" },
  { id: "n-4", type: "payment", title: "Muddati o'tgan to'lov", body: "12 o'quvchining to'lov muddati o'tib ketdi.", date: iso(subDays(TODAY, 1)), read: false, link: "/debts" },
  { id: "n-5", type: "exam", title: "Imtihon natijalari", body: "Mock IELTS #2 natijalari e'lon qilindi.", date: iso(subDays(TODAY, 2)), read: true, link: "/exams" },
  { id: "n-6", type: "student", title: "Yangi o'quvchi", body: "Kamron Mirzayev Frontend Basics-9 guruhiga qo'shildi.", date: iso(subDays(TODAY, 2)), read: true, link: "/students" },
  { id: "n-7", type: "system", title: "Tizim yangilanishi", body: "EduFlow 2.4 versiyasiga yangilandi — yangi hisobotlar mavjud.", date: iso(subDays(TODAY, 3)), read: true },
  { id: "n-8", type: "lead", title: "Sinov darsi", body: "3 ta lid ertangi sinov darsiga yozildi.", date: iso(subDays(TODAY, 3)), read: true, link: "/leads" },
  { id: "n-9", type: "payment", title: "Oylik hisobot", body: "Avgust oyi bo'yicha moliyaviy hisobot tayyor.", date: iso(subDays(TODAY, 4)), read: true, link: "/reports" },
  { id: "n-10", type: "attendance", title: "Davomat hisoboti", body: "O'tgan hafta davomati: 91.2% (+1.4%).", date: iso(subDays(TODAY, 5)), read: true, link: "/attendance" },
  { id: "n-11", type: "exam", title: "Yangi imtihon", body: "Math DTM-1 uchun DTM Mock Exam rejalashtirildi.", date: iso(subDays(TODAY, 6)), read: true, link: "/exams" },
  { id: "n-12", type: "student", title: "Guruh o'zgarishi", body: "2 o'quvchi GE-A2 dan GE-B1 ga o'tkazildi.", date: iso(subDays(TODAY, 7)), read: true, link: "/groups" },
];

// ── Sent messages ────────────────────────────────────────────────────

function generateSentMessages(): SentMessage[] {
  const rnd = mulberry32(33);
  const msgs: SentMessage[] = [];
  let n = 0;
  const sample = students.slice(0, 24);
  for (const s of sample) {
    n += 1;
    const tpl = pick(rnd, messageTemplates);
    const statusRoll = rnd();
    msgs.push({
      id: `msg-${n}`,
      channel: tpl.channel,
      to: s.parentPhone,
      recipientName: s.parentName,
      templateKey: tpl.key,
      body: tpl.body
        .replace("{student_name}", `${s.firstName} ${s.lastName}`)
        .replace("{parent_name}", s.parentName)
        .replace("{amount}", `${s.monthlyFee.toLocaleString("fr-FR").replace(/ /g, " ")} so'm`)
        .replace("{course}", courseById.get(s.courseId)?.name ?? ""),
      date: iso(subDays(TODAY, randInt(rnd, 0, 14))),
      status: statusRoll < 0.75 ? "delivered" : statusRoll < 0.9 ? "sent" : statusRoll < 0.96 ? "scheduled" : "failed",
    });
  }
  return msgs.sort((a, b) => (a.date < b.date ? 1 : -1));
}

export const sentMessages: SentMessage[] = generateSentMessages();

// ── Activity timelines ───────────────────────────────────────────────

function generateActivities(): ActivityItem[] {
  const rnd = mulberry32(21);
  const items: ActivityItem[] = [];
  let n = 0;
  for (const s of students) {
    const count = randInt(rnd, 3, 6);
    for (let i = 0; i < count; i++) {
      n += 1;
      const type = pick(rnd, ["payment", "attendance", "grade", "note", "group-change", "enrollment"] as const);
      const date = i === count - 1 ? s.enrollmentDate : iso(subDays(TODAY, randInt(rnd, 0, 90)));
      const descriptions: Record<typeof type, string> = {
        payment: `To'lov qabul qilindi — ${(s.monthlyFee).toLocaleString("fr-FR").replace(/ /g, " ")} so'm`,
        attendance: "Davomat belgilandi — darsda qatnashdi",
        grade: "Imtihon natijasi kiritildi",
        note: "Izoh qo'shildi: darslarga faol qatnashmoqda",
        "group-change": "Guruh o'zgartirildi",
        enrollment: "O'qishga qabul qilindi",
      };
      items.push({
        id: `act-${n}`,
        studentId: s.id,
        type: i === count - 1 ? "enrollment" : type,
        date,
        description: i === count - 1 ? descriptions.enrollment : descriptions[type],
        actor: pick(rnd, ["Nilufar Karimova", "Alisher Sobirov", "Jasur Rahimov", "Tizim"]),
      });
    }
  }
  return items.sort((a, b) => (a.date < b.date ? 1 : -1));
}

export const activities: ActivityItem[] = generateActivities();

// ── Dashboard time series ────────────────────────────────────────────

export interface SeriesPoint {
  date: string;
  [key: string]: string | number;
}

/** Daily revenue for the last 365 days. */
export const revenueSeries: SeriesPoint[] = (() => {
  const rnd = mulberry32(7);
  const points: SeriesPoint[] = [];
  for (let d = 364; d >= 0; d--) {
    const date = subDays(TODAY, d);
    const dow = date.getDay();
    const weekendFactor = dow === 0 ? 0.3 : 1;
    const seasonal = 1 + 0.25 * Math.sin(((364 - d) / 365) * Math.PI * 2);
    const growth = 1 + (364 - d) / 900;
    const base = 9500000 * weekendFactor * seasonal * growth;
    const revenue = Math.round((base + rnd() * 4500000) / 100000) * 100000;
    const expected = Math.round((revenue * (1.05 + rnd() * 0.2)) / 100000) * 100000;
    points.push({ date: iso(date), revenue, expected });
  }
  return points;
})();

/** Monthly student totals for the last 12 months. */
export const studentGrowthSeries: SeriesPoint[] = (() => {
  const rnd = mulberry32(8);
  const points: SeriesPoint[] = [];
  let total = 420;
  for (let m = 11; m >= 0; m--) {
    const date = subMonths(TODAY, m);
    const joined = randInt(rnd, 24, 58);
    const left = randInt(rnd, 8, 26);
    total += joined - left;
    points.push({ date: iso(date), total, joined, left });
  }
  return points;
})();

/** Daily attendance % for the last 90 days. */
export const attendanceSeries: SeriesPoint[] = (() => {
  const rnd = mulberry32(9);
  const points: SeriesPoint[] = [];
  for (let d = 89; d >= 0; d--) {
    const date = subDays(TODAY, d);
    if (date.getDay() === 0) continue;
    points.push({
      date: iso(date),
      rate: Math.round((86 + rnd() * 10 + Math.sin(d / 9) * 2) * 10) / 10,
    });
  }
  return points;
})();

/** Weekly new registrations for the last 26 weeks. */
export const registrationSeries: SeriesPoint[] = (() => {
  const rnd = mulberry32(10);
  const points: SeriesPoint[] = [];
  for (let w = 25; w >= 0; w--) {
    const date = subDays(TODAY, w * 7);
    points.push({
      date: iso(date),
      students: randInt(rnd, 4, 18),
      leads: randInt(rnd, 12, 38),
    });
  }
  return points;
})();

/** Monthly payment collection for the last 12 months. */
export const collectionSeries: SeriesPoint[] = (() => {
  const rnd = mulberry32(11);
  const points: SeriesPoint[] = [];
  for (let m = 11; m >= 0; m--) {
    const date = subMonths(TODAY, m);
    const expected = randInt(rnd, 300, 420) * 1000000;
    const collected = Math.round(expected * (0.78 + rnd() * 0.17));
    points.push({ date: iso(date), expected, collected });
  }
  return points;
})();

/** Lead funnel snapshot. */
export const leadFunnel = (() => {
  const order: LeadStage[] = ["new", "contacted", "interested", "trial", "negotiation", "enrolled"];
  return order.map((stage) => ({
    stage,
    count: leads.filter((l) => l.stage === stage).length + (stage === "new" ? 18 : stage === "contacted" ? 12 : stage === "interested" ? 8 : stage === "trial" ? 5 : stage === "negotiation" ? 2 : 6),
  }));
})();

// ── KPI helpers ──────────────────────────────────────────────────────

export const kpis = (() => {
  const activeStudents = students.filter((s) => s.status === "active").length;
  const activeGroups = groups.filter((g) => g.status === "active").length;
  const monthRevenue = revenueSeries.slice(-30).reduce((sum, p) => sum + (p.revenue as number), 0);
  const prevMonthRevenue = revenueSeries.slice(-60, -30).reduce((sum, p) => sum + (p.revenue as number), 0);
  const totalDebt = debts.reduce((sum, d) => sum + d.debt, 0);
  const attendanceAvg =
    attendanceSeries.slice(-14).reduce((sum, p) => sum + (p.rate as number), 0) /
    attendanceSeries.slice(-14).length;
  const newLeadsCount = leads.filter((l) => l.stage === "new" || l.stage === "contacted").length + 18;

  return {
    totalStudents: students.length + 620, // across all branches (mock scale)
    totalStudentsPrev: students.length + 588,
    activeStudents,
    activeGroups,
    activeGroupsPrev: activeGroups - 2,
    monthRevenue,
    prevMonthRevenue,
    totalDebt,
    totalDebtPrev: Math.round(totalDebt * 1.18),
    attendanceRate: Math.round(attendanceAvg * 10) / 10,
    attendanceRatePrev: Math.round((attendanceAvg - 1.6) * 10) / 10,
    newLeads: newLeadsCount,
    newLeadsPrev: newLeadsCount - 7,
  };
})();

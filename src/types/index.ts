// ── Core domain types for EduFlow CRM ────────────────────────────────

export type Role = "admin" | "manager" | "teacher" | "student";

export type Language = "uz" | "ru" | "en";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar?: string;
  branchId: string;
}

export interface Branch {
  id: string;
  name: string;
  address: string;
  manager: string;
  phone: string;
  rooms: number;
  teachers: number;
  students: number;
  groups: number;
  monthlyRevenue: number;
  status: "active" | "inactive";
}

export type StudentStatus = "active" | "inactive" | "graduated" | "suspended";
export type PaymentState = "paid" | "pending" | "partial" | "overdue" | "cancelled";
export type Gender = "male" | "female";

export interface Student {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  dateOfBirth: string;
  gender: Gender;
  address: string;
  parentName: string;
  parentPhone: string;
  courseId: string;
  groupId: string;
  branchId: string;
  enrollmentDate: string;
  status: StudentStatus;
  attendanceRate: number; // 0-100
  paymentStatus: PaymentState;
  debt: number; // UZS
  monthlyFee: number; // UZS
  avatar?: string;
  notes?: string;
  performance: number; // 0-100 average grade
}

export interface Teacher {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  /** Telegram handle, without the leading @. */
  telegram: string;
  specialization: string;
  groupIds: string[];
  branchId: string;
  studentCount: number;
  attendanceRate: number;
  baseSalary: number;
  rating: number; // 0-5
  status: "active" | "inactive" | "vacation";
  hireDate: string;
  avatar?: string;
  bio?: string;
}

export type CourseCategory =
  | "languages"
  | "it"
  | "math"
  | "design"
  | "exam-prep";

export interface Course {
  id: string;
  name: string;
  category: CourseCategory;
  teacherIds: string[];
  durationMonths: number;
  price: number; // UZS / month
  studentCount: number;
  groupCount: number;
  status: "active" | "archived";
  description: string;
  curriculum: string[];
  color: string; // token key for calendar coloring
}

export type WeekDay = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export interface GroupScheduleSlot {
  days: WeekDay[];
  startTime: string; // "14:00"
  endTime: string; // "15:30"
}

export interface Group {
  id: string;
  name: string;
  courseId: string;
  teacherId: string;
  branchId: string;
  room: string;
  schedule: GroupScheduleSlot;
  studentIds: string[];
  capacity: number;
  startDate: string;
  status: "active" | "forming" | "finished";
}

export type AttendanceStatus = "present" | "absent" | "late" | "excused";

export interface AttendanceRecord {
  id: string;
  studentId: string;
  groupId: string;
  date: string; // ISO date
  status: AttendanceStatus;
  markedBy: string;
}

export interface Exam {
  id: string;
  name: string;
  courseId: string;
  groupId: string;
  teacherId: string;
  date: string;
  maxScore: number;
  participants: number;
  status: "upcoming" | "in-progress" | "graded";
}

export interface Grade {
  id: string;
  studentId: string;
  examId: string;
  score: number;
  maxScore: number;
  comment?: string;
}

export type PaymentMethod = "cash" | "card" | "transfer" | "online";

export interface Payment {
  id: string;
  invoiceNo: string;
  studentId: string;
  amount: number;
  method: PaymentMethod;
  date: string;
  status: PaymentState;
  cashier: string;
  branchId: string;
  note?: string;
}

export interface Debt {
  studentId: string;
  expected: number;
  paid: number;
  debt: number;
  dueDate: string;
  overdueDays: number;
}

export interface SalaryRecord {
  id: string;
  employeeId: string; // teacher or employee id
  employeeName: string;
  role: string;
  baseSalary: number;
  bonus: number;
  deductions: number;
  total: number;
  month: string; // "2026-08"
  paymentDate?: string;
  status: "paid" | "pending";
  branchId: string;
}

export type LeadStage =
  | "new"
  | "contacted"
  | "interested"
  | "trial"
  | "negotiation"
  | "enrolled"
  | "lost";

export type LeadSource =
  | "instagram"
  | "telegram"
  | "referral"
  | "website"
  | "walk-in"
  | "ads";

export type LeadPriority = "high" | "medium" | "low";

export interface LeadNote {
  id: string;
  date: string;
  author: string;
  text: string;
}

export interface Lead {
  id: string;
  name: string;
  phone: string;
  source: LeadSource;
  courseInterest: string;
  stage: LeadStage;
  priority: LeadPriority;
  manager: string;
  expectedValue: number;
  nextContactDate?: string;
  createdAt: string;
  notes: LeadNote[];
  branchId: string;
}

export type MessageChannel = "sms" | "telegram" | "email";

export interface MessageTemplate {
  id: string;
  key: string;
  channel: MessageChannel;
  subject?: string;
  body: string;
}

export interface SentMessage {
  id: string;
  channel: MessageChannel;
  to: string;
  recipientName: string;
  templateKey?: string;
  body: string;
  date: string;
  status: "sent" | "delivered" | "failed" | "scheduled";
}

export type NotificationType =
  | "payment"
  | "attendance"
  | "system"
  | "student"
  | "lead"
  | "exam";

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  date: string;
  read: boolean;
  link?: string;
}

export interface Employee {
  id: string;
  name: string;
  role: string;
  phone: string;
  email: string;
  branchId: string;
  hireDate: string;
  salary: number;
  status: "active" | "inactive";
  avatar?: string;
}

export interface ScheduleEvent {
  id: string;
  groupId: string;
  courseId: string;
  teacherId: string;
  room: string;
  date: string; // ISO date
  startTime: string;
  endTime: string;
  branchId: string;
}

export type ActivityType =
  | "payment"
  | "attendance"
  | "group-change"
  | "grade"
  | "note"
  | "enrollment"
  | "status";

export interface ActivityItem {
  id: string;
  studentId: string;
  type: ActivityType;
  date: string;
  description: string;
  actor: string;
}

export interface KpiTrendPoint {
  date: string;
  value: number;
}

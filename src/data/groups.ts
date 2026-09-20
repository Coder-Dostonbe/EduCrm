import type { Group } from "@/types";

export const groups: Group[] = [
  { id: "g-1", name: "GE-A1 Morning", courseId: "c-1", teacherId: "t-1", branchId: "br-1", room: "101", schedule: { days: ["mon", "wed", "fri"], startTime: "09:00", endTime: "10:30" }, studentIds: [], capacity: 16, startDate: "2026-05-04", status: "active" },
  { id: "g-2", name: "GE-A2 Afternoon", courseId: "c-1", teacherId: "t-1", branchId: "br-1", room: "101", schedule: { days: ["mon", "wed", "fri"], startTime: "14:00", endTime: "15:30" }, studentIds: [], capacity: 16, startDate: "2026-03-02", status: "active" },
  { id: "g-3", name: "GE-B1 Evening", courseId: "c-1", teacherId: "t-1", branchId: "br-1", room: "102", schedule: { days: ["tue", "thu", "sat"], startTime: "18:00", endTime: "19:30" }, studentIds: [], capacity: 14, startDate: "2026-01-12", status: "active" },
  { id: "g-4", name: "GE-A1 Yunusobod", courseId: "c-1", teacherId: "t-2", branchId: "br-2", room: "201", schedule: { days: ["mon", "wed", "fri"], startTime: "10:00", endTime: "11:30" }, studentIds: [], capacity: 16, startDate: "2026-06-01", status: "active" },
  { id: "g-5", name: "GE-B2 Yunusobod", courseId: "c-1", teacherId: "t-2", branchId: "br-2", room: "202", schedule: { days: ["tue", "thu"], startTime: "16:00", endTime: "18:00" }, studentIds: [], capacity: 12, startDate: "2026-02-16", status: "active" },
  { id: "g-6", name: "IELTS 6.5 Intensive", courseId: "c-2", teacherId: "t-3", branchId: "br-1", room: "103", schedule: { days: ["mon", "tue", "wed", "thu", "fri"], startTime: "11:00", endTime: "12:30" }, studentIds: [], capacity: 12, startDate: "2026-07-06", status: "active" },
  { id: "g-7", name: "IELTS 7.0 Evening", courseId: "c-2", teacherId: "t-3", branchId: "br-1", room: "103", schedule: { days: ["mon", "wed", "fri"], startTime: "18:30", endTime: "20:00" }, studentIds: [], capacity: 12, startDate: "2026-06-15", status: "active" },
  { id: "g-8", name: "IELTS Foundation", courseId: "c-2", teacherId: "t-4", branchId: "br-2", room: "203", schedule: { days: ["tue", "thu", "sat"], startTime: "14:00", endTime: "15:30" }, studentIds: [], capacity: 14, startDate: "2026-08-03", status: "active" },
  { id: "g-9", name: "Math DTM-1", courseId: "c-3", teacherId: "t-5", branchId: "br-1", room: "104", schedule: { days: ["mon", "wed", "fri"], startTime: "15:00", endTime: "16:30" }, studentIds: [], capacity: 18, startDate: "2026-01-05", status: "active" },
  { id: "g-10", name: "Math DTM-2", courseId: "c-3", teacherId: "t-5", branchId: "br-1", room: "104", schedule: { days: ["tue", "thu", "sat"], startTime: "15:00", endTime: "16:30" }, studentIds: [], capacity: 18, startDate: "2026-04-06", status: "active" },
  { id: "g-11", name: "Python-12", courseId: "c-4", teacherId: "t-6", branchId: "br-1", room: "105 (Lab)", schedule: { days: ["tue", "thu", "sat"], startTime: "17:00", endTime: "19:00" }, studentIds: [], capacity: 14, startDate: "2026-05-05", status: "active" },
  { id: "g-12", name: "Backend Django-4", courseId: "c-6", teacherId: "t-6", branchId: "br-1", room: "105 (Lab)", schedule: { days: ["mon", "wed", "fri"], startTime: "19:00", endTime: "21:00" }, studentIds: [], capacity: 12, startDate: "2026-03-09", status: "active" },
  { id: "g-13", name: "Frontend React-7", courseId: "c-5", teacherId: "t-7", branchId: "br-2", room: "204 (Lab)", schedule: { days: ["mon", "wed", "fri"], startTime: "17:30", endTime: "19:30" }, studentIds: [], capacity: 14, startDate: "2026-04-13", status: "active" },
  { id: "g-14", name: "Frontend Basics-9", courseId: "c-5", teacherId: "t-7", branchId: "br-2", room: "204 (Lab)", schedule: { days: ["tue", "thu"], startTime: "10:00", endTime: "12:00" }, studentIds: [], capacity: 14, startDate: "2026-08-17", status: "forming" },
  { id: "g-15", name: "Design Pro-3", courseId: "c-7", teacherId: "t-8", branchId: "br-3", room: "301 (Studio)", schedule: { days: ["mon", "wed", "fri"], startTime: "16:00", endTime: "18:00" }, studentIds: [], capacity: 12, startDate: "2026-06-08", status: "active" },
  { id: "g-16", name: "Korean TOPIK-1", courseId: "c-8", teacherId: "t-9", branchId: "br-2", room: "205", schedule: { days: ["tue", "thu", "sat"], startTime: "09:00", endTime: "10:30" }, studentIds: [], capacity: 15, startDate: "2026-02-02", status: "active" },
];

export const rooms = [
  "101", "102", "103", "104", "105 (Lab)",
  "201", "202", "203", "204 (Lab)", "205",
  "301 (Studio)", "302",
];

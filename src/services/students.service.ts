"use client";

import type { Student } from "@/types";
import { students as mockStudents } from "@/data";
import { USE_REAL_API } from "./config";
import { api, type Paginated } from "./http";

export interface StudentQuery {
  search?: string;
  status?: string;
  group?: string;
  course?: string;
  branch?: string;
  paymentStatus?: string;
  ordering?: string;
  page?: number;
  pageSize?: number;
}

export interface StudentPage {
  count: number;
  results: Student[];
}

/** The Django representation of a student. */
interface ApiStudent {
  id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  phone: string;
  email: string | null;
  date_of_birth: string;
  gender: "male" | "female";
  address: string;
  parent_name: string;
  parent_phone: string;
  group: number | null;
  group_name: string;
  course: number | null;
  course_name: string;
  branch: number;
  enrollment_date: string;
  monthly_fee: string;
  status: Student["status"];
  notes: string;
  attendance_rate: number;
  performance: number;
  debt: string;
  payment_status: Student["paymentStatus"];
}

/** Maps the API shape onto the frontend `Student` type the UI already uses. */
function toStudent(s: ApiStudent): Student {
  return {
    id: String(s.id),
    firstName: s.first_name,
    lastName: s.last_name,
    phone: s.phone,
    email: s.email ?? undefined,
    dateOfBirth: s.date_of_birth,
    gender: s.gender,
    address: s.address,
    parentName: s.parent_name,
    parentPhone: s.parent_phone,
    courseId: s.course ? `c-${s.course}` : "",
    groupId: s.group ? `g-${s.group}` : "",
    branchId: `br-${s.branch}`,
    enrollmentDate: s.enrollment_date,
    status: s.status,
    attendanceRate: s.attendance_rate,
    paymentStatus: s.payment_status,
    debt: Number(s.debt),
    monthlyFee: Number(s.monthly_fee),
    performance: s.performance,
    notes: s.notes || undefined,
  };
}

/** Maps a form payload onto what the API expects. */
function toPayload(input: Partial<Student> & { groupPk?: number }) {
  return {
    first_name: input.firstName,
    last_name: input.lastName,
    phone: input.phone,
    email: input.email || "",
    date_of_birth: input.dateOfBirth,
    gender: input.gender,
    address: input.address,
    parent_name: input.parentName,
    parent_phone: input.parentPhone,
    group: input.groupPk ?? (Number(String(input.groupId).replace("g-", "")) || undefined),
    enrollment_date: input.enrollmentDate,
    monthly_fee: input.monthlyFee,
    notes: input.notes || "",
  };
}

function filterMock(query: StudentQuery): Student[] {
  const q = query.search?.trim().toLowerCase();
  return mockStudents.filter((s) => {
    if (query.branch && query.branch !== "all" && s.branchId !== query.branch) return false;
    if (query.course && query.course !== "all" && s.courseId !== query.course) return false;
    if (query.group && query.group !== "all" && s.groupId !== query.group) return false;
    if (query.status && query.status !== "all" && s.status !== query.status) return false;
    if (
      query.paymentStatus &&
      query.paymentStatus !== "all" &&
      s.paymentStatus !== query.paymentStatus
    )
      return false;
    if (q && !`${s.firstName} ${s.lastName} ${s.phone}`.toLowerCase().includes(q)) return false;
    return true;
  });
}

export const studentsService = {
  async list(query: StudentQuery = {}): Promise<StudentPage> {
    if (!USE_REAL_API) {
      const results = filterMock(query);
      return { count: results.length, results };
    }

    const data = await api.get<Paginated<ApiStudent>>("/api/students/", {
      params: {
        search: query.search,
        status: query.status === "all" ? undefined : query.status,
        group: query.group === "all" ? undefined : query.group?.replace("g-", ""),
        branch: query.branch === "all" ? undefined : query.branch?.replace("br-", ""),
        ordering: query.ordering,
        page: query.page,
        page_size: query.pageSize,
      },
    });
    return { count: data.count, results: data.results.map(toStudent) };
  },

  async get(id: string): Promise<Student | null> {
    if (!USE_REAL_API) {
      return mockStudents.find((s) => s.id === id) ?? null;
    }
    const data = await api.get<ApiStudent>(`/api/students/${id.replace("s-", "")}/`);
    return toStudent(data);
  },

  async create(input: Partial<Student>): Promise<Student> {
    if (!USE_REAL_API) {
      return { ...(input as Student), id: `s-new-${Date.now()}` };
    }
    const data = await api.post<ApiStudent>("/api/students/", toPayload(input));
    return toStudent(data);
  },

  async update(id: string, input: Partial<Student>): Promise<Student> {
    if (!USE_REAL_API) {
      const existing = mockStudents.find((s) => s.id === id)!;
      return { ...existing, ...input };
    }
    const data = await api.patch<ApiStudent>(
      `/api/students/${id.replace("s-", "")}/`,
      toPayload(input)
    );
    return toStudent(data);
  },

  async remove(id: string): Promise<void> {
    if (!USE_REAL_API) return;
    await api.delete(`/api/students/${id.replace("s-", "")}/`);
  },
};

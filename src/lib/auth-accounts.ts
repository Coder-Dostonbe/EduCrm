import type { User } from "@/types";

export interface DemoAccount {
  email: string;
  password: string;
  user: User;
}

/**
 * Demo logins. These mirror the accounts the backend's `seed_demo`
 * management command creates, so the same credentials work in both modes.
 */
export const demoAccounts: DemoAccount[] = [
  {
    email: "admin@eduflow.uz",
    password: "admin123",
    user: {
      id: "u-admin",
      name: "Sardor Alimov",
      email: "admin@eduflow.uz",
      role: "admin",
      branchId: "br-1",
    },
  },
  {
    email: "manager@eduflow.uz",
    password: "manager123",
    user: {
      id: "u-manager",
      name: "Nilufar Karimova",
      email: "manager@eduflow.uz",
      role: "manager",
      branchId: "br-1",
    },
  },
  {
    email: "teacher@eduflow.uz",
    password: "teacher123",
    user: {
      id: "t-1",
      name: "Jasur Rahimov",
      email: "teacher@eduflow.uz",
      role: "teacher",
      branchId: "br-1",
    },
  },
  {
    email: "student@eduflow.uz",
    password: "student123",
    user: {
      id: "s-1",
      name: "Aziza Yusupova",
      email: "student@eduflow.uz",
      role: "student",
      branchId: "br-1",
    },
  },
];

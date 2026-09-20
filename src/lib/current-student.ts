import type { Student, User } from "@/types";
import { students } from "@/data";

/** The student record behind the signed-in user, or null if there is none.
 *
 *  Identity comes from two different places right now: mock mode hands out the
 *  demo account's own `s-1`, while the API hands out a Django user id that has
 *  nothing to do with the seeded ids. Matching on the id first and the email
 *  second keeps the student-facing pages working under either one.
 */
export function studentForUser(user: User | null | undefined): Student | null {
  if (!user) return null;
  const byId = students.find((s) => s.id === user.id);
  if (byId) return byId;
  const email = user.email?.trim().toLowerCase();
  if (!email) return null;
  return students.find((s) => s.email?.toLowerCase() === email) ?? null;
}

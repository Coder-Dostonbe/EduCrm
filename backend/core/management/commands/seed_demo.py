"""Seed the database with the same realistic Uzbek demo data the frontend mocks use.

    python manage.py seed_demo            # create if empty
    python manage.py seed_demo --flush    # wipe CRM tables first
"""

from __future__ import annotations

import random
from datetime import date, time, timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from core.models import (
    Attendance,
    Branch,
    Course,
    Exam,
    Grade,
    Group,
    Lesson,
    Student,
    Teacher,
)
from crm.models import Lead, LeadNote, MessageTemplate, Notification, SentMessage
from finance.models import Invoice, Payment, Salary

User = get_user_model()

MALE_FIRST = [
    "Jasur", "Bekzod", "Sardor", "Ulug'bek", "Aziz", "Doston", "Shohruh",
    "Javohir", "Otabek", "Temur", "Farrukh", "Sanjar", "Bobur", "Diyor",
    "Islom", "Kamron", "Murod", "Nodir", "Rustam", "Suhrob", "Abror",
]
FEMALE_FIRST = [
    "Aziza", "Dilnoza", "Gulnora", "Kamola", "Laylo", "Madina", "Nilufar",
    "Nodira", "Ozoda", "Rayhona", "Sevara", "Shahzoda", "Umida", "Zarina",
    "Zilola", "Dildora", "Feruza", "Iroda", "Malika", "Sabina", "Yulduz",
]
LAST_M = [
    "Karimov", "Rahimov", "Toshmatov", "Yusupov", "Aliyev", "Ergashev",
    "Ismoilov", "Nazarov", "Qodirov", "Sattorov", "Tursunov", "Umarov",
    "Xolmatov", "Abdullayev", "Mirzayev", "Olimov", "Rasulov", "Sobirov",
]
LAST_F = [name + "a" for name in LAST_M]

ADDRESSES = [
    "Chilonzor tumani, Bunyodkor ko'chasi 12",
    "Yunusobod tumani, Amir Temur shoh ko'chasi 45",
    "Mirzo Ulug'bek tumani, Buyuk Ipak Yo'li 78",
    "Shayxontohur tumani, Navoiy ko'chasi 23",
    "Yakkasaroy tumani, Bobur ko'chasi 8",
    "Olmazor tumani, Ziyolilar ko'chasi 15",
    "Sergeli tumani, Yangi Sergeli 5-mavze",
    "Mirobod tumani, Oybek ko'chasi 51",
]

BRANCHES = [
    ("Chilonzor", "Toshkent, Chilonzor tumani, Bunyodkor ko'chasi 21A", "+998712001122", 12),
    ("Yunusobod", "Toshkent, Yunusobod tumani, Amir Temur 108B", "+998712003344", 8),
    ("Sergeli", "Toshkent, Sergeli tumani, Yangi Sergeli 14", "+998712005566", 6),
]

COURSES = [
    ("General English", "languages", 6, 450000, "chart-1",
     "Umumiy ingliz tili kursi — A1 dan B2 gacha. Speaking, listening, reading va writing.",
     ["A1 — Elementary", "A2 — Pre-Intermediate", "B1 — Intermediate", "B2 — Upper-Intermediate"]),
    ("IELTS", "exam-prep", 4, 650000, "chart-4",
     "IELTS imtihoniga intensiv tayyorlov. Mock testlar va band 7.0+ strategiyalari.",
     ["Listening & Reading strategies", "Writing Task 1 & 2", "Speaking practice", "Full mock exams"]),
    ("Mathematics", "math", 9, 400000, "chart-3",
     "Maktab matematikasi va DTM ga tayyorlov.",
     ["Algebra fundamentals", "Geometry & trigonometry", "DTM test strategies", "Olympiad problems"]),
    ("Python", "it", 6, 550000, "chart-2",
     "Noldan Python dasturlash — sintaksisdan real loyihalargacha.",
     ["Python syntax & data structures", "OOP and modules", "Files & APIs", "Final project"]),
    ("Frontend", "it", 7, 600000, "chart-5",
     "Zamonaviy frontend: HTML, CSS, JavaScript, React.",
     ["HTML & CSS", "JavaScript fundamentals", "React", "Deployment & portfolio"]),
    ("Backend", "it", 8, 650000, "chart-2",
     "Django va PostgreSQL bilan backend dasturlash.",
     ["Python for web", "Django & ORM", "REST API with DRF", "Docker & deployment"]),
    ("Graphic Design", "design", 5, 500000, "chart-3",
     "Photoshop, Illustrator va Figma bilan dizayn.",
     ["Design principles", "Adobe Photoshop", "Adobe Illustrator", "Figma & UI basics"]),
    ("Korean", "languages", 8, 480000, "chart-4",
     "Koreys tili — TOPIK darajasiga tayyorlov.",
     ["Hangul & pronunciation", "TOPIK I grammar", "Conversation", "TOPIK II preparation"]),
]

TEACHERS = [
    ("Jasur", "Rahimov", "j.rahimov@eduflow.uz", "General English", 8500000, 4.8, 0),
    ("Sevara", "Abdullayeva", "s.abdullayeva@eduflow.uz", "General English", 7800000, 4.7, 1),
    ("Malika", "Yusupova", "m.yusupova@eduflow.uz", "IELTS", 10200000, 4.9, 0),
    ("Bekzod", "Tursunov", "b.tursunov@eduflow.uz", "IELTS", 9400000, 4.6, 1),
    ("Ulug'bek", "Qodirov", "u.qodirov@eduflow.uz", "Mathematics", 8000000, 4.8, 0),
    ("Doston", "Ergashev", "d.ergashev@eduflow.uz", "Python / Backend", 11000000, 4.9, 0),
    ("Kamron", "Mirzayev", "k.mirzayev@eduflow.uz", "Frontend", 10500000, 4.7, 1),
    ("Zarina", "Olimova", "z.olimova@eduflow.uz", "Graphic Design", 7500000, 4.5, 2),
    ("Nodira", "Sattorova", "n.sattorova@eduflow.uz", "Korean", 7200000, 4.6, 1),
]

# name, course index, teacher index, branch index, room, days, start, end, capacity
GROUPS = [
    ("GE-A1 Morning", 0, 0, 0, "101", ["mon", "wed", "fri"], time(9, 0), time(10, 30), 16),
    ("GE-A2 Afternoon", 0, 0, 0, "101", ["mon", "wed", "fri"], time(14, 0), time(15, 30), 16),
    ("GE-B1 Evening", 0, 0, 0, "102", ["tue", "thu", "sat"], time(18, 0), time(19, 30), 14),
    ("GE-A1 Yunusobod", 0, 1, 1, "201", ["mon", "wed", "fri"], time(10, 0), time(11, 30), 16),
    ("IELTS 6.5 Intensive", 1, 2, 0, "103", ["mon", "tue", "wed", "thu", "fri"], time(11, 0), time(12, 30), 12),
    ("IELTS 7.0 Evening", 1, 2, 0, "103", ["mon", "wed", "fri"], time(18, 30), time(20, 0), 12),
    ("IELTS Foundation", 1, 3, 1, "203", ["tue", "thu", "sat"], time(14, 0), time(15, 30), 14),
    ("Math DTM-1", 2, 4, 0, "104", ["mon", "wed", "fri"], time(15, 0), time(16, 30), 18),
    ("Math DTM-2", 2, 4, 0, "104", ["tue", "thu", "sat"], time(15, 0), time(16, 30), 18),
    ("Python-12", 3, 5, 0, "105 (Lab)", ["tue", "thu", "sat"], time(17, 0), time(19, 0), 14),
    ("Backend Django-4", 5, 5, 0, "105 (Lab)", ["mon", "wed", "fri"], time(19, 0), time(21, 0), 12),
    ("Frontend React-7", 4, 6, 1, "204 (Lab)", ["mon", "wed", "fri"], time(17, 30), time(19, 30), 14),
    ("Design Pro-3", 6, 7, 2, "301 (Studio)", ["mon", "wed", "fri"], time(16, 0), time(18, 0), 12),
    ("Korean TOPIK-1", 7, 8, 1, "205", ["tue", "thu", "sat"], time(9, 0), time(10, 30), 15),
]

DAY_INDEX = {"mon": 0, "tue": 1, "wed": 2, "thu": 3, "fri": 4, "sat": 5, "sun": 6}

DEMO_ACCOUNTS = [
    ("admin@eduflow.uz", "admin123", "Sardor", "Alimov", "admin"),
    ("manager@eduflow.uz", "manager123", "Nilufar", "Karimova", "manager"),
    ("teacher@eduflow.uz", "teacher123", "Jasur", "Rahimov", "teacher"),
    ("student@eduflow.uz", "student123", "Aziza", "Yusupova", "student"),
]


class Command(BaseCommand):
    help = "Seed the database with realistic Uzbek education-center demo data."

    def add_arguments(self, parser):
        parser.add_argument("--flush", action="store_true", help="Delete existing CRM data first.")
        parser.add_argument("--seed", type=int, default=42, help="PRNG seed for reproducibility.")

    @transaction.atomic
    def handle(self, *args, **options):
        rnd = random.Random(options["seed"])
        today = timezone.localdate()

        if options["flush"]:
            self.stdout.write("Flushing existing CRM data…")
            for model in (Notification, SentMessage, MessageTemplate, LeadNote, Lead,
                          Grade, Exam, Attendance, Lesson, Payment, Invoice, Salary,
                          Student, Group, Teacher, Course, Branch):
                model.objects.all().delete()
            User.objects.filter(is_superuser=False).delete()

        if Branch.objects.exists() and not options["flush"]:
            self.stdout.write(self.style.WARNING("Data already present — pass --flush to reseed."))
            return

        # ── Branches ─────────────────────────────────────────────────
        branches = [
            Branch.objects.create(name=n, address=a, phone=p, rooms=r)
            for n, a, p, r in BRANCHES
        ]

        # ── Demo accounts ────────────────────────────────────────────
        accounts: dict[str, User] = {}
        for email, password, first, last, role in DEMO_ACCOUNTS:
            user = User.objects.create_user(
                email=email, password=password, first_name=first,
                last_name=last, role=role, branch=branches[0],
                phone=f"+9989012345{rnd.randint(10, 99)}",
            )
            accounts[role] = user
        branches[0].manager = accounts["manager"]
        branches[0].save(update_fields=["manager"])

        # ── Courses ──────────────────────────────────────────────────
        courses = [
            Course.objects.create(
                name=name, category=cat, duration_months=months,
                price=Decimal(price), color=color, description=desc, curriculum=curriculum,
            )
            for name, cat, months, price, color, desc, curriculum in COURSES
        ]

        # ── Teachers ─────────────────────────────────────────────────
        teachers = []
        for first, last, email, spec, salary, rating, branch_idx in TEACHERS:
            # The demo teacher account is reused rather than duplicated.
            if email == "j.rahimov@eduflow.uz":
                user = accounts["teacher"]
            else:
                user = User.objects.create_user(
                    email=email, password="teacher123", first_name=first,
                    last_name=last, role="teacher", branch=branches[branch_idx],
                    phone=f"+99890{rnd.randint(1000000, 9999999)}",
                )
            teachers.append(
                Teacher.objects.create(
                    user=user, branch=branches[branch_idx], specialization=spec,
                    base_salary=Decimal(salary), rating=Decimal(str(rating)),
                    hire_date=today - timedelta(days=rnd.randint(200, 1400)),
                )
            )

        # ── Groups ───────────────────────────────────────────────────
        groups = [
            Group.objects.create(
                name=name, course=courses[ci], teacher=teachers[ti], branch=branches[bi],
                room=room, days=days, start_time=start, end_time=end, capacity=cap,
                start_date=today - timedelta(days=rnd.randint(30, 240)), status="active",
            )
            for name, ci, ti, bi, room, days, start, end, cap in GROUPS
        ]

        # ── Students ─────────────────────────────────────────────────
        students: list[Student] = []
        for group in groups:
            for i in range(rnd.randint(6, min(11, group.capacity))):
                gender = "male" if rnd.random() < 0.5 else "female"
                first = rnd.choice(MALE_FIRST if gender == "male" else FEMALE_FIRST)
                last = rnd.choice(LAST_M if gender == "male" else LAST_F)
                parent_first = rnd.choice(MALE_FIRST + FEMALE_FIRST)

                student = Student.objects.create(
                    first_name=first, last_name=last, gender=gender,
                    phone=f"+99890{rnd.randint(1000000, 9999999)}",
                    email=f"{first.lower()}.{rnd.randint(1, 999)}@gmail.com",
                    date_of_birth=today - timedelta(days=rnd.randint(13 * 365, 24 * 365)),
                    address=rnd.choice(ADDRESSES),
                    parent_name=f"{parent_first} {last}",
                    parent_phone=f"+99893{rnd.randint(1000000, 9999999)}",
                    group=group, branch=group.branch,
                    enrollment_date=today - timedelta(days=rnd.randint(10, 400)),
                    monthly_fee=group.course.price,
                    status="active" if rnd.random() < 0.9 else "inactive",
                )
                students.append(student)

        # Link the demo student account to a real student record
        demo_student = students[0]
        demo_student.first_name, demo_student.last_name = "Aziza", "Yusupova"
        demo_student.gender = "female"
        demo_student.user = accounts["student"]
        demo_student.status = "active"
        demo_student.save()

        # ── Lessons for the last 6 and next 4 weeks ──────────────────
        lessons: list[Lesson] = []
        for group in groups:
            wanted = {DAY_INDEX[d] for d in group.days}
            for offset in range(-42, 29):
                day = today + timedelta(days=offset)
                if day.weekday() not in wanted:
                    continue
                lessons.append(
                    Lesson(
                        group=group, date=day, start_time=group.start_time,
                        end_time=group.end_time, room=group.room,
                    )
                )
        Lesson.objects.bulk_create(lessons, batch_size=500)

        # ── Attendance for past lessons ──────────────────────────────
        records: list[Attendance] = []
        past_lessons = Lesson.objects.filter(date__lt=today).select_related("group")
        by_group: dict[int, list[Student]] = {}
        for s in students:
            by_group.setdefault(s.group_id, []).append(s)

        for lesson in past_lessons:
            for student in by_group.get(lesson.group_id, []):
                roll = rnd.random()
                if roll < 0.84:
                    st = "present"
                elif roll < 0.90:
                    st = "late"
                elif roll < 0.96:
                    st = "absent"
                else:
                    st = "excused"
                records.append(
                    Attendance(
                        student=student, lesson=lesson, status=st,
                        marked_by=lesson.group.teacher.user if lesson.group.teacher else None,
                    )
                )
        Attendance.objects.bulk_create(records, batch_size=1000, ignore_conflicts=True)

        # ── Exams & grades ───────────────────────────────────────────
        exam_names = {
            "General English": ["Unit 1-4 Progress Test", "Mid-course Exam"],
            "IELTS": ["Mock IELTS #1", "Mock IELTS #2"],
            "Mathematics": ["Algebra Test", "DTM Mock Exam"],
            "Python": ["Python Basics Quiz"],
            "Frontend": ["HTML/CSS Layout Test"],
            "Backend": ["Django Midterm"],
            "Graphic Design": ["Photoshop Practical"],
            "Korean": ["TOPIK Mock I"],
        }
        for group in groups:
            for name in exam_names.get(group.course.name, []):
                past = rnd.random() < 0.7
                exam = Exam.objects.create(
                    name=name, group=group,
                    date=today - timedelta(days=rnd.randint(5, 40)) if past
                    else today + timedelta(days=rnd.randint(3, 21)),
                    max_score=Decimal("9") if group.course.name == "IELTS" else Decimal("100"),
                    status="graded" if past else "upcoming",
                )
                if not past:
                    continue
                for student in by_group.get(group.id, []):
                    if exam.max_score == 9:
                        score = Decimal(str(round(rnd.uniform(5.0, 8.5) * 2) / 2))
                    else:
                        score = Decimal(rnd.randint(45, 99))
                    Grade.objects.create(
                        student=student, exam=exam, score=score,
                        comment=rnd.choice(
                            ["Yaxshi natija, davom eting!", "Grammar ustida ishlash kerak.",
                             "A'lo darajada tayyorgarlik.", ""]
                        ),
                    )

        # ── Invoices & payments (last 4 months) ──────────────────────
        payments: list[Payment] = []
        for student in students:
            for months_ago in range(3, -1, -1):
                period = (today.replace(day=1) - timedelta(days=months_ago * 30)).replace(day=1)
                if period < student.enrollment_date.replace(day=1):
                    continue
                Invoice.objects.get_or_create(
                    student=student, period=period,
                    defaults={
                        "amount_due": student.monthly_fee,
                        "due_date": period + timedelta(days=9),
                    },
                )
                # ~78% of invoices get paid; the rest become the demo debt
                if rnd.random() < 0.78:
                    payments.append(
                        Payment(
                            student=student, branch=student.branch,
                            amount=student.monthly_fee,
                            method=rnd.choice(["cash", "card", "transfer", "online"]),
                            status="paid",
                            date=period + timedelta(days=rnd.randint(1, 20)),
                            cashier=accounts["manager"],
                        )
                    )
        # bulk_create skips save(), so invoice numbers are assigned here
        year = today.year
        for i, payment in enumerate(payments, start=1):
            payment.invoice_no = f"INV-{year}-{i:05d}"
        Payment.objects.bulk_create(payments, batch_size=500)

        # ── Salaries (last 4 months) ─────────────────────────────────
        payroll = [(t.user, t.branch, t.base_salary) for t in teachers]
        payroll.append((accounts["manager"], branches[0], Decimal("12000000")))
        payroll.append((accounts["admin"], branches[0], Decimal("15000000")))

        for months_ago in range(3, -1, -1):
            month = (today.replace(day=1) - timedelta(days=months_ago * 30)).replace(day=1)
            for user, branch, base in payroll:
                Salary.objects.get_or_create(
                    employee=user, month=month,
                    defaults={
                        "branch": branch,
                        "base_salary": base,
                        "bonus": Decimal(rnd.choice([0, 300000, 500000, 1000000])),
                        "deductions": Decimal(rnd.choice([0, 0, 0, 200000])),
                        "status": "pending" if months_ago == 0 else "paid",
                        "payment_date": None if months_ago == 0 else month + timedelta(days=35),
                    },
                )

        # ── Leads (the CRM pipeline) ─────────────────────────────────
        stages = [
            ("new", 6), ("contacted", 5), ("interested", 4), ("trial", 3),
            ("negotiation", 3), ("enrolled", 4), ("lost", 3),
        ]
        sources = ["instagram", "telegram", "referral", "website", "walk-in", "ads"]
        priorities = ["high", "medium", "low"]
        managers = [accounts["manager"], accounts["admin"]]
        note_texts = [
            "Telefon orqali gaplashdik, narxlar bilan qiziqdi.",
            "Sinov darsiga yozildi.",
            "Instagram orqali murojaat qildi, jadval yuborildi.",
            "Ertaga qayta qo'ng'iroq qilishni so'radi.",
            "Ota-onasi bilan maslahatlashib javob beradi.",
        ]
        lead_count = 0
        for stage, count in stages:
            for _ in range(count):
                gender = "male" if rnd.random() < 0.5 else "female"
                first = rnd.choice(MALE_FIRST if gender == "male" else FEMALE_FIRST)
                last = rnd.choice(LAST_M if gender == "male" else LAST_F)
                course = rnd.choice(courses)
                lead = Lead.objects.create(
                    name=f"{first} {last}",
                    phone=f"+99890{rnd.randint(1000000, 9999999)}",
                    source=rnd.choice(sources),
                    course_interest=course,
                    stage=stage,
                    priority=rnd.choice(priorities),
                    manager=rnd.choice(managers),
                    branch=rnd.choice(branches),
                    expected_value=course.price * course.duration_months,
                    next_contact_date=(
                        None if stage in {"enrolled", "lost"}
                        else today + timedelta(days=rnd.randint(0, 7))
                    ),
                    lost_reason="Narx qimmat tuyuldi." if stage == "lost" else "",
                )
                lead_count += 1
                if rnd.random() < 0.7:
                    LeadNote.objects.create(
                        lead=lead, author=lead.manager, text=rnd.choice(note_texts)
                    )

        # ── Message templates ────────────────────────────────────────
        templates = [
            ("paymentReminder", "sms",
             "Hurmatli {parent_name}! {student_name}ning to'lovi {amount} so'm. "
             "EduFlow o'quv markazi."),
            ("classReminder", "telegram",
             "Assalomu alaykum, {student_name}! Ertaga {course} darsingiz bor. "
             "Xona: {room}. Kutamiz!"),
            ("absenceNotification", "sms",
             "Hurmatli {parent_name}! {student_name} bugungi {course} darsida qatnashmadi."),
            ("welcome", "telegram",
             "Xush kelibsiz, {student_name}! Siz {course} kursiga qabul qilindingiz."),
            ("examResult", "telegram",
             "{student_name}, imtihon natijangiz tayyor. Tabriklaymiz!"),
            ("debtNotification", "sms",
             "Hurmatli {parent_name}! {student_name}ning {amount} so'm qarzdorligi mavjud."),
        ]
        for key, channel, body in templates:
            MessageTemplate.objects.get_or_create(
                key=key, channel=channel, defaults={"body": body}
            )

        # ── Sent message history ─────────────────────────────────────
        sent = []
        for student in students[:24]:
            tpl = rnd.choice(MessageTemplate.objects.all())
            roll = rnd.random()
            sent.append(
                SentMessage(
                    channel=tpl.channel,
                    template=tpl,
                    student=student,
                    recipient_name=student.parent_name or student.full_name,
                    to=student.parent_phone or student.phone,
                    body=tpl.render(
                        {
                            "student_name": student.full_name,
                            "parent_name": student.parent_name,
                            "course": student.group.course.name if student.group else "",
                            "room": student.group.room if student.group else "",
                            "amount": f"{student.monthly_fee:,.0f}".replace(",", " "),
                        }
                    ),
                    status=(
                        "delivered" if roll < 0.75
                        else "sent" if roll < 0.9
                        else "scheduled" if roll < 0.96
                        else "failed"
                    ),
                    sent_by=accounts["manager"],
                )
            )
        SentMessage.objects.bulk_create(sent)

        # ── Notifications for the staff accounts ─────────────────────
        notices = [
            ("payment", "Yangi to'lov", "Aziza Yusupova 650 000 so'm to'lov qildi.", "/payments"),
            ("lead", "Yangi lid", "Instagram orqali yangi murojaat: Frontend kursi.", "/leads"),
            ("attendance", "Davomat past", "Python-12 guruhida bugun 4 o'quvchi kelmadi.", "/attendance"),
            ("payment", "Muddati o'tgan to'lov", "Bir nechta o'quvchining to'lov muddati o'tdi.", "/debts"),
            ("exam", "Imtihon natijalari", "Mock IELTS #2 natijalari e'lon qilindi.", "/exams"),
            ("student", "Yangi o'quvchi", "Yangi o'quvchi guruhga qo'shildi.", "/students"),
            ("system", "Tizim yangilanishi", "EduFlow yangi versiyaga yangilandi.", ""),
        ]
        for role_key in ("admin", "manager"):
            user = accounts[role_key]
            for i, (ntype, title, body, link) in enumerate(notices):
                Notification.objects.create(
                    user=user, type=ntype, title=title, body=body, link=link,
                    # the three most recent stay unread
                    read_at=None if i < 3 else timezone.now(),
                )

        self.stdout.write(
            self.style.SUCCESS(
                "\nSeeded:\n"
                f"  branches   {Branch.objects.count()}\n"
                f"  courses    {Course.objects.count()}\n"
                f"  teachers   {Teacher.objects.count()}\n"
                f"  groups     {Group.objects.count()}\n"
                f"  students   {Student.objects.count()}\n"
                f"  lessons    {Lesson.objects.count()}\n"
                f"  attendance {Attendance.objects.count()}\n"
                f"  exams      {Exam.objects.count()}  grades {Grade.objects.count()}\n"
                f"  invoices   {Invoice.objects.count()}  payments {Payment.objects.count()}\n"
                f"  salaries   {Salary.objects.count()}\n"
                f"  leads      {Lead.objects.count()}  notes {LeadNote.objects.count()}\n"
                f"  templates  {MessageTemplate.objects.count()}  messages {SentMessage.objects.count()}\n"
                f"  notices    {Notification.objects.count()}\n"
                "\nDemo logins:\n"
                "  admin@eduflow.uz / admin123\n"
                "  manager@eduflow.uz / manager123\n"
                "  teacher@eduflow.uz / teacher123\n"
                "  student@eduflow.uz / student123\n"
            )
        )

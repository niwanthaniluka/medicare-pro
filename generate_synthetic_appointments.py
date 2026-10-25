"""
MediCare Pro synthetic appointment-history SQL generator.
Reads current MySQL IDs and emits appointments + bills for 2025-10-01..2026-09-30.
Only synthetic demo data is generated. Requires mysql-connector-python.
"""
import os
import random
from datetime import date, timedelta
from pathlib import Path
import mysql.connector

START = date(2025, 10, 1)
END = date(2026, 9, 30)
random.seed(42)

def main():
    conn = mysql.connector.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=int(os.getenv("DB_PORT", "3306")),
        user=os.getenv("DB_USER", "root"),
        password=os.getenv("DB_PASSWORD", ""),
        database=os.getenv("DB_NAME", "hospital_db"),
    )
    cur = conn.cursor(dictionary=True)
    cur.execute("SELECT id FROM patients WHERE email LIKE '%@example.com' ORDER BY id")
    patient_ids = [r["id"] for r in cur.fetchall()]
    cur.execute("""
        SELECT ds.id AS schedule_id, ds.day_of_week, ds.max_patients,
               d.consultation_fee
        FROM doctor_schedules ds
        JOIN doctors d ON d.id = ds.doctor_id
        WHERE ds.is_active = 1 AND d.is_active = 1
    """)
    schedules = cur.fetchall()
    if len(patient_ids) < 30:
        raise SystemExit("Need at least 30 demo patients. Run 01_demo_base_data.sql first.")
    if not schedules:
        raise SystemExit("No active doctor schedules. Run 01_demo_base_data.sql first.")

    # Keep only schedules that match the calendar weekday.
    weekday_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    schedule_by_weekday = {day: [] for day in weekday_names}
    for s in schedules:
        schedule_by_weekday[s["day_of_week"]].append(s)

    statements = [
        "-- SYNTHETIC ONLY: generated appointment history; safe to review before importing.",
        "USE hospital_db;",
        "START TRANSACTION;"
    ]
    appt_count = 0
    bill_count = 0
    current = START
    while current <= END:
        day_schedules = schedule_by_weekday[current.strftime("%A")]
        # Synthetic seasonality: weekdays busier; Wednesday and Friday slightly busier.
        if current.weekday() >= 5:
            daily_rate = 0.05
        else:
            daily_rate = 0.24
        if current.weekday() in (2, 4):
            daily_rate += 0.08
        # Mild monthly trend plus deterministic variation.
        month_index = (current.year - START.year) * 12 + current.month - START.month
        daily_rate += min(month_index, 11) * 0.003
        for s in day_schedules:
            # Avoid overbooking; each schedule can have max_patients appointments/day.
            base = max(1, int(s["max_patients"] * daily_rate))
            count = min(s["max_patients"], max(0, base + random.randint(-2, 3)))
            # Ensure some non-zero data on working weekdays.
            if current.weekday() < 5 and random.random() < 0.85:
                count = max(1, count)
            count = min(count, s["max_patients"])
            queue_numbers = random.sample(range(1, s["max_patients"] + 1), count)
            for q in queue_numbers:
                pid = random.choice(patient_ids)
                status = random.choices(["Completed", "Booked", "Cancelled"], weights=[0.78, 0.15, 0.07])[0]
                payment_status = "Paid" if status == "Completed" and random.random() < 0.82 else "Pending"
                # Created timestamp deliberately kept valid; actual appointment date is historical.
                statements.append(
                    "INSERT INTO appointments (patient_id, schedule_id, appointment_date, queue_number, status, payment_status) "
                    f"VALUES ({pid}, {s['schedule_id']}, '{current.isoformat()}', {q}, '{status}', '{payment_status}');"
                )
                appt_count += 1
                if status == "Completed":
                    bill_status = "Paid" if payment_status == "Paid" else "Pending"
                    method = random.choice(["Cash", "Card", "Online"])
                    fee = float(s["consultation_fee"])
                    statements.append(
                        "INSERT INTO bills (appointment_id, total_amount, status, payment_method) "
                        f"VALUES (LAST_INSERT_ID(), {fee:.2f}, '{bill_status}', '{method}');"
                    )
                    bill_count += 1
        current += timedelta(days=1)
    statements.append("COMMIT;")
    target = Path("02_synthetic_appointments_12_months.sql")
    target.write_text("\n".join(statements) + "\n", encoding="utf-8")
    print(f"Generated {target.resolve()}")
    print(f"Synthetic appointments: {appt_count}")
    print(f"Synthetic bills: {bill_count}")
    print("Review the SQL file before importing it into hospital_db.")

if __name__ == "__main__":
    main()

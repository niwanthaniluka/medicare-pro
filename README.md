# 🏥 MediCare Pro — Enterprise ADBMS & AI Platform

**Advanced Hospital Channeling, ACID Database Governance & Predictive Analytics Architecture**


### 🖥️ Enterprise System Interfaces & Visualizations

<div align="center">

<h4>1. Secure Role-Based Authentication Portal</h4>
<img width="650" alt="MediCare Pro Secure Sign In" src="https://github.com/user-attachments/assets/ed4971fc-531f-4ef7-a74d-feb0b9d4c3aa" />
<p><em>JWT-protected staff login enforcing Role-Based Access Control (RBAC).</em></p>

<br/>

<h4>2. Real-Time Channeling, Schedules & AI Visit Forecast</h4>
<img width="850" alt="Doctor Channeling & AI Patient Visit Forecast" src="https://github.com/user-attachments/assets/60a3fd8a-201c-452b-bbc3-aacf663b0b61" />
<p><em>ACID transaction booking queue along with Random Forest ML forecast chart (Chart.js).</em></p>

<br/>

<h4>3. Patient Directory with Calculated Age UDF</h4>
<img width="850" alt="Patient Directory UDF Age and Soft Delete" src="https://github.com/user-attachments/assets/b0eceda1-8a03-4a6b-8047-c8b01e264961" />
<p><em>Directory integrating MySQL User-Defined Function (fn_CalculatePatientAge) and soft-deletion.</em></p>

<br/>

<h4>4. Database Governance & Archived Records (Views & Restores)</h4>
<img width="850" alt="Deleted Archives Views and Restore Management" src="https://github.com/user-attachments/assets/18b76e3f-9c27-4d91-b9a5-2865f699fd8d" />
<p><em>Enterprise view archives (vw_deleted_patients & vw_deleted_doctors) with one-click restore.</em></p>

<br/>

<h4>5. Consultant Specialist Onboarding Modal</h4>
<img width="850" alt="Onboard Specialist Doctor Modal" src="https://github.com/user-attachments/assets/4b2a8bbf-994c-4c2d-b730-bb12d3f62202" />
<p><em>Modal interface for registering consultants, category assignment, and session quota management.</em></p>

</div>


---

## 📌 Key System Highlights

* 🔐 **Granular RBAC & Security:** Server-enforced Role-Based Access Control (`db_admin`, `app_user`, `doctor`, `report_user`) powered by JWT token authentication and bcrypt hashing.
* ⚡ **ACID Transaction Booking:** High-concurrency appointment scheduling handled safely using stored procedures (`sp_BookAppointment`) and row-level locking.
* 🤖 **AI Patient Visit Forecasting:** Integrated Scikit-Learn **Random Forest Regressor** predicting seasonal patient surge demands for optimal hospital resource allocation.
* 🛡️ **Zero-Loss Data Archiving (Soft Deletes):** Safe deactivation and immediate recovery of doctor and patient records through dedicated MySQL views (`vw_deleted_doctors`, `vw_deleted_patients`).
* 📊 **Real-time Performance Metrics & E-Billing:** Dynamic KPI metrics, B-Tree indexed patient search, and cashier e-receipt billing verification.

---

## 🖼️ Application Showcases

### 1. Doctor Channeling & Real-Time AI Forecasting
> Live hospital capacity metrics, B-Tree indexed patient queries, settled revenues, and Chart.js daily predictive analytics.

### 2. Specialist Onboarding & Clinic Scheduling
> Dedicated specialist registration modal with dynamic category creation, fee thresholds, and slot limits.

### 3. Patient Directory & UDF Calculations
> Instant directory lookup with MySQL User-Defined Functions (`fn_CalculatePatientAge`) and soft-delete safeguards.

### 4. Enterprise Archival System (Recycle Bin Views)
> Dual-view administrative audit recovery console allowing one-click record restorations without breaking historical relational joins.

### 5. Secure Staff Authentication & Role Governance
> Multi-tier authentication gateway enforcing JWT interceptors and role segregation.

---

## 🏗️ System Architecture & Database Design

```
               ┌────────────────────────────────────────────────────────┐
               │                Single-Page UI Client                   │
               │   (Vanilla JS + Tailwind CSS CDN + Chart.js Engine)    │
               └──────────────────────────┬─────────────────────────────┘
                                          │  Bearer JWT / HTTPS REST API
                                          ▼
               ┌────────────────────────────────────────────────────────┐
               │                  Node.js / Express                     │
               │    (RBAC Middleware, Sanitization, Route Controllers)   │
               └──────────────┬───────────────────────────┬─────────────┘
                              │                           │
                              │ Reads Forecast            │ Query / Pool
                              ▼                           ▼
                 ┌─────────────────────────┐  ┌─────────────────────────┐
                 │  october_forecast.json  │  │   MySQL 8.0+ Database   │
                 │   (Scikit-Learn ML)     │  │   - Stored Procedures   │
                 └─────────────────────────┘  │   - Triggers & UDFs     │
                                              │   - Archive Views       │
                                              └─────────────────────────┘
```

### Advanced Database Capabilities
* **Stored Procedures:** `sp_BookAppointment` executes channeling slots transactionally with rollback safeguards and concurrency locks.
* **User Defined Functions (UDF):** `fn_CalculatePatientAge(dob)` and `fn_GetDoctorRevenue(doctor_id)` compute derived attributes inside SQL execution trees.
* **Audit Triggers:** Real-time JSON logging into `audit_logs` capturing `OLD` vs `NEW` record mutations.
* **Relational Views:** `vw_patient_billing_details`, `vw_deleted_patients`, and `vw_deleted_doctors`.

---

## 🤖 Machine Learning Pipeline

* **Algorithm:** Random Forest Regressor (`scikit-learn`)
* **Feature Inputs:** Historical channeling timestamps, weekday seasonality, doctor specializations, and booking volume trends.
* **Model Purpose:** Eliminates staffing bottlenecks by anticipating patient surges in advance.
* **Output:** Daily visit expectations exported directly to `october_forecast.json` and consumed asynchronously by the Express REST API.

---

## 🚀 Getting Started

### Prerequisites
* **Node.js** (v18.0.0 or higher)
* **MySQL Server** (v8.0 or higher)
* **Python 3.10+** (Optional, only for retraining or regenerating ML models)

### 1. Database Initialization
Import the schemas and synthetic seed data in chronological order:
```bash
mysql -u root -p < database/01_schema_and_tables.sql
mysql -u root -p < database/02_views_and_functions.sql
mysql -u root -p < database/02_synthetic_appointments_12_months.sql
```

### 2. Backend Environment Setup
Create a `.env` file in the backend root directory (`hospital-backend/.env`):
```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=medicare_db
JWT_SECRET=your_super_secret_jwt_key
```

### 3. Install Dependencies & Launch
```bash
# Navigate to backend directory
cd hospital-backend

# Install node dependencies
npm install

# Start the enterprise server
node server.js
```

### 4. Access Client Portal
Open `index.html` via Live Server or browse directly to:
```text
http://localhost:5000/
```

---

## 🛡️ Enterprise Security Compliance & Governance

* **Transport & Data Sanitization:** Client inputs undergo strict regex-based and HTML tag sanitization to prevent Cross-Site Scripting (XSS) and injection vectors.
* **Strict Least-Privilege Principles:** Database users and application staff roles operate on zero-trust privilege segregation.
* **Immutable Audit Trail:** All administrative deletions, status updates, and doctor updates trigger autonomous audit entries stored as immutable historical snapshots.
* **Non-Destructive Soft Deletes:** Medical records are permanently protected against accidental cascade-deletions to adhere to healthcare data retention policies.

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information.

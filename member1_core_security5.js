// MediCare Pro | member1_core_security.js
// Extracted from original index_RBAC(1).html; shared global scope.
        const API_BASE = 'http://localhost:5000/api';

        // Authorized API requests: automatically attach session JWT.
        const nativeFetch = window.fetch.bind(window);
        window.fetch = function(input, init = {}) {
            const url = typeof input === 'string' ? input : input.url;
            if (url.startsWith(API_BASE) && !url.includes('/auth/')) {
                const token = sessionStorage.getItem('medicare_jwt');
                init = {...init, headers: {...(init.headers || {}), ...(token ? {Authorization: `Bearer ${token}`} : {})}};
            }
            return nativeFetch(input, init);
        };
        const ROLE_TABS = {
            db_admin: ['booking','appointments','patients','billing','audit','archive','login'],
            app_user: ['booking','appointments','patients','billing'],
            receptionist: ['booking','appointments','patients','billing'],
            doctor: ['booking'],
            report_user: ['appointments','billing','audit']
        };
        function roleTabs() {
            return ROLE_TABS[sessionStorage.getItem('medicare_role')] || [];
        }
        function applyRoleNavigation() {
            const allowed = roleTabs();
            ['booking','appointments','patients','billing','audit','archive','login'].forEach(tab => {
                const button = document.getElementById('tab-' + tab);
                if (button) button.classList.toggle('hidden', !allowed.includes(tab));
            });
            // Hide financial and global operational metrics from the doctor dashboard.
            const isDoctor = sessionStorage.getItem('medicare_role') === 'doctor';
            const kpiContainer = document.getElementById('kpiPatients')?.closest('.grid');
            if (kpiContainer) kpiContainer.classList.toggle('hidden', isDoctor);
            const addDoctorButton = document.querySelector('[onclick="openDoctorModal()"]');
            if (addDoctorButton) addDoctorButton.classList.toggle('hidden', sessionStorage.getItem('medicare_role') !== 'db_admin');
            const bookingForm = document.getElementById('bookingForm');
            if (bookingForm) bookingForm.classList.toggle('hidden', isDoctor);
            const performance = document.getElementById('doctorPerformanceCards')?.parentElement;
            if (performance) performance.classList.toggle('hidden', isDoctor);
            const first = allowed[0];
            if (first) switchTab(first);
        }

        let state = {
            schedules: [],
            patients: [],
            appointments: [],
            bills: [],
            auditLogs: [],
            deletedPatients: [],
            deletedDoctors: [],
            selectedSpecialty: 'ALL',
            pendingDelete: null
        };

        document.getElementById('bookDate').valueAsDate = new Date();

        setInterval(() => {
            const clock = document.getElementById('liveClock');
            if (clock) clock.innerText = new Date().toLocaleTimeString('en-US', { hour12: true });
        }, 1000);

        // =============================================================
        // TOAST / RED POPUP SYSTEM
        // =============================================================
        function showErrorPopup(message) {
            let container = document.getElementById('notification-container');
            if (!container) {
                container = document.createElement('div');
                container.id = 'notification-container';
                document.body.appendChild(container);
            }

            const toast = document.createElement('div');
            toast.className = 'toast-error';
            toast.innerHTML = `
                <span class="toast-icon">⚠️</span>
                <div style="flex: 1;">${message}</div>
            `;

            container.appendChild(toast);

            setTimeout(() => {
                toast.style.transition = 'all 0.4s ease';
                toast.style.opacity = '0';
                toast.style.transform = 'translateX(100%)';
                setTimeout(() => toast.remove(), 400);
            }, 4000);
        }

        // =============================================================
        // VALIDATION FUNCTIONS
        // =============================================================
        function validateDoctorForm(formData) {
            const contactVal = (formData.phone || '').trim();
            const phoneRegex = /^(?:\+94|0)[0-9]{9}$/;

            // 1. Phone / Contact Number Check
            if (!contactVal) {
                showErrorPopup('Contact number is required!');
                return false;
            }
            if (!phoneRegex.test(contactVal)) {
                showErrorPopup('Please enter a valid Sri Lankan contact number! (e.g., 0771234567 or +94771234567)');
                return false;
            }

            // 2. Names Check
            if (!formData.first_name || formData.first_name.trim().length < 2) {
                showErrorPopup('Doctor first name must be at least 2 characters long!');
                return false;
            }
            if (!formData.last_name || formData.last_name.trim().length < 2) {
                showErrorPopup('Doctor last name must be at least 2 characters long!');
                return false;
            }

            // 3. Specialization Check
            if (!formData.specialization_id || formData.specialization_id === "" || formData.specialization_id === "0") {
                showErrorPopup('Please select a valid specialization category!');
                return false;
            }

            // 4. Consultation Fee Check
            const fee = Number(formData.consultation_fee);
            if (!formData.consultation_fee || isNaN(fee) || fee <= 0) {
                showErrorPopup('Consultation fee must be a positive number greater than 0!');
                return false;
            }
            if (fee > 100000) {
                showErrorPopup('Consultation fee cannot exceed LKR 100,000!');
                return false;
            }

            // 5. Email Check (Optional)
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (formData.email && formData.email.trim() !== '' && !emailRegex.test(formData.email.trim())) {
                showErrorPopup('Please provide a valid email address! (e.g., doctor@medicare.lk)');
                return false;
            }

            // 6. Time Slot Check
            if (formData.start_time && formData.end_time && formData.start_time >= formData.end_time) {
                showErrorPopup('Clinic start time must be earlier than the end time!');
                return false;
            }

            return true;
        }

        function validateCategoryForm(name) {
            if (!name || name.trim().length < 2) {
                showErrorPopup('Category name must be at least 2 characters long!');
                return false;
            }
            if (/^\d+$/.test(name.trim())) {
                showErrorPopup('Category name cannot contain only numbers!');
                return false;
            }
            return true;
        }

        function validatePatientForm(data) {
            if (!data.first_name || data.first_name.trim().length < 2 || !data.last_name || data.last_name.trim().length < 2) {
                showErrorPopup('Patient first name and last name are required (min 2 characters)!');
                return false;
            }
            if (!data.dob) {
                showErrorPopup('Please select a valid Date of Birth!');
                return false;
            }
            const phoneRegex = /^(?:\+94|0)[0-9]{9}$/;
            if (!data.contact_number || !phoneRegex.test(data.contact_number.trim())) {
                showErrorPopup('Please enter a valid 10-digit Sri Lankan phone number (e.g., 0771234567)!');
                return false;
            }
            return true;
        }

        // =============================================================
        // AUTHENTICATION LOGIC
        // =============================================================
        function checkSession() {
            const token = sessionStorage.getItem('medicare_jwt');
            const user = sessionStorage.getItem('medicare_user');
            const role = sessionStorage.getItem('medicare_role');

            if (token && user) {
                document.getElementById('authScreen').classList.add('hidden');
                document.getElementById('mainAppLayout').classList.remove('hidden');
                document.getElementById('activeUserBadge').innerText = `${user} (${role})`;
                document.getElementById('sessionUser').innerText = user;
                document.getElementById('sessionRole').innerText = role;
                applyRoleNavigation();
                refreshAllData();
            } else {
                document.getElementById('authScreen').classList.remove('hidden');
                document.getElementById('mainAppLayout').classList.add('hidden');
            }
        }

        function togglePortalAuth() {
            const isLogin = !document.getElementById('portalLoginForm').classList.contains('hidden');
            if (isLogin) {
                document.getElementById('portalLoginForm').classList.add('hidden');
                document.getElementById('portalRegisterForm').classList.remove('hidden');
                document.getElementById('portalToggleBtn').innerText = 'Already have an account? Sign In';
            } else {
                document.getElementById('portalRegisterForm').classList.add('hidden');
                document.getElementById('portalLoginForm').classList.remove('hidden');
                document.getElementById('portalToggleBtn').innerText = "Don't have an account? Create One";
            }
        }

        document.getElementById('portalLoginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('portalUser').value.trim();
            const password = document.getElementById('portalPass').value;

            try {
                const res = await fetch(`${API_BASE}/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });
                const json = await res.json();
                if (json.success) {
                    sessionStorage.setItem('medicare_jwt', json.token);
                    sessionStorage.setItem('medicare_user', json.username);
                    sessionStorage.setItem('medicare_role', json.role);
                    checkSession();
                } else {
                    showErrorPopup(json.message || 'Invalid credentials');
                }
            } catch (err) {
                showErrorPopup('Connection error with backend');
            }
        });

        document.getElementById('portalRegisterForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('regPortalUser').value.trim();
            const password = document.getElementById('regPortalPass').value;
            const role = document.getElementById('regPortalRole').value;

            try {
                const res = await fetch(`${API_BASE}/auth/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password, role })
                });
                const json = await res.json();
                if (json.success) {
                    alert(json.message);
                    togglePortalAuth();
                    document.getElementById('portalUser').value = username;
                    document.getElementById('portalPass').value = '';
                } else {
                    showErrorPopup(json.message || 'Registration failed');
                }
            } catch (err) {
                showErrorPopup('Server error during registration');
            }
        });

        function logoutPortal() {
            sessionStorage.clear();
            checkSession();
        }

        // =============================================================
        // CORE WORKSPACE SWITCHER
        // =============================================================
        function switchTab(tab) {
            if (!roleTabs().includes(tab)) { showErrorPopup('Access denied for your role'); return; }
            // Hide every tab panel, then show the requested panel.
            document.querySelectorAll('.tab-section').forEach(section => {
                section.classList.add('hidden');
            });
            const selectedSection = document.getElementById('section-' + tab);
            if (!selectedSection) {
                console.warn('Unknown dashboard tab:', tab);
                return;
            }
            selectedSection.classList.remove('hidden');

            // Forecast belongs to the Channeling dashboard only.
            const forecastSection = document.getElementById('aiForecastSection');
            if (forecastSection) {
                forecastSection.classList.toggle('hidden', tab !== 'booking' || !['db_admin','report_user'].includes(sessionStorage.getItem('medicare_role')));
            }

            // Update the highlighted sidebar button.
            document.querySelectorAll('.nav-btn').forEach(button => {
                button.classList.remove('nav-btn-active');
                button.classList.add('text-slate-300');
            });
            const activeButton = document.getElementById('tab-' + tab);
            if (activeButton) {
                activeButton.classList.add('nav-btn-active');
                activeButton.classList.remove('text-slate-300');
            }

            const pageInfo = {
                booking: ['Doctor Channeling & Schedules', 'Real-time ACID transaction booking & queue capacity'],
                appointments: ['Appointments Queue', 'Patient appointment and queue management'],
                patients: ['Patient Directory', 'Patient registration and records'],
                billing: ['Cashier & E-Billing', 'Hospital invoices and payment management'],
                audit: ['Trigger Audit Trail', 'Database activity and audit records'],
                archive: ['Deleted Archives (Views)', 'Archived patient and doctor records'],
                login: ['RBAC & Security', 'User roles and access control']
            };
            const [title, subtitle] = pageInfo[tab];
            document.getElementById('pageTitle').textContent = title;
            document.getElementById('pageSubtitle').textContent = subtitle;

            // Avoid refetching thousands of records on every tab click.
            // Data is fetched on login and by the Sync DB button.
            window.scrollTo(0, 0);
        }

        async function fetchSystemHealth() {
            try {
                const res = await fetch(`${API_BASE}/health`);
                const json = await res.json();
                if (json.success) {
                    document.getElementById('healthStatusBadge').innerText = json.status;
                    document.getElementById('healthLatency').innerText = json.latencyMs;
                }
            } catch (e) { }
        }

        async function loadDoctorPerformance() {
            try {
                const res = await fetch(`${API_BASE}/analytics/doctors`);
                const json = await res.json();
                const container = document.getElementById('doctorPerformanceCards');
                if (!container) return;
                container.innerHTML = '';
                (json.data || []).forEach(d => {
                    container.innerHTML += `
                        <div class="bg-slate-50 border border-slate-200/80 p-3 rounded-2xl">
                            <p class="font-extrabold text-slate-900 text-xs">${d.doctor_name}</p>
                            <p class="text-[10px] text-blue-600 font-semibold">${d.specialization}</p>
                            <div class="flex justify-between mt-2 pt-2 border-t border-slate-200/60 text-[11px]">
                                <span class="text-slate-500">${d.total_consultations} Visits</span>
                                <span class="font-bold text-emerald-600 font-mono-code">Rs. ${Number(d.total_revenue).toFixed(2)}</span>
                            </div>
                        </div>
                    `;
                });
            } catch (e) { }
        }


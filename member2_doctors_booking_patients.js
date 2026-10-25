// MediCare Pro | member2_doctors_booking_patients.js
// Extracted from original index_RBAC(1).html; shared global scope.
        // =============================================================
        // SCHEDULES & CATEGORY DROPDOWN
        // =============================================================
        async function loadSchedules() {
            try {
                const res = await fetch(`${API_BASE}/schedules`);
                const json = await res.json();
                state.schedules = json.data || [];

                const dropdown = document.getElementById('specialtyFilterDropdown');
                if (dropdown) {
                    const specialties = ['ALL', ...new Set(state.schedules.map(s => s.specialization).filter(Boolean))];
                    dropdown.innerHTML = '';
                    specialties.forEach(sp => {
                        const isSelected = state.selectedSpecialty === sp ? 'selected' : '';
                        dropdown.innerHTML += `<option value="${sp}" ${isSelected}>${sp === 'ALL' ? 'All Specializations' : sp}</option>`;
                    });
                }

                renderScheduleTable();
            } catch (e) {
                console.error("Error loading schedules:", e);
            }
        }

        function filterSpecialty(val) {
            state.selectedSpecialty = val;
            renderScheduleTable();
        }

        function renderScheduleTable() {
            const tbody = document.getElementById('scheduleTableBody');
            const select = document.getElementById('bookScheduleId');
            if (!tbody || !select) return;

            tbody.innerHTML = '';
            select.innerHTML = '<option value="">-- Choose Specialist Session --</option>';

            const filtered = state.schedules.filter(s => state.selectedSpecialty === 'ALL' || s.specialization === state.selectedSpecialty);

            if (filtered.length === 0) {
                tbody.innerHTML = `<tr><td colspan="6" class="py-4 text-center text-slate-400 font-medium">No active schedules found for this specialization.</td></tr>`;
            }

            filtered.forEach(s => {
                const bookedCount = (state.appointments || []).filter(a => a.doctor_name === s.doctor_name && a.status !== 'Cancelled').length;
                const maxCap = Number(s.max_patients) || 5;
                const pct = Math.min(100, Math.round((bookedCount / maxCap) * 100));

                const startTime = s.start_time ? s.start_time.slice(0, 5) : '08:00';
                const endTime = s.end_time ? s.end_time.slice(0, 5) : '12:00';
                const fee = Number(s.consultation_fee) || 0;

                tbody.innerHTML += `
                    <tr class="hover:bg-slate-50 transition">
                        <td class="py-3 px-4 font-bold text-slate-900">Dr. ${s.doctor_name}</td>
                        <td class="py-3 px-4"><span class="bg-blue-50 text-blue-700 text-xs font-bold px-2.5 py-0.5 rounded-lg border border-blue-200">${s.specialization}</span></td>
                        <td class="py-3 px-4 text-xs font-medium text-slate-600">${s.day_of_week} (${startTime} - ${endTime})</td>
                        <td class="py-3 px-4 w-44">
                            <div class="flex justify-between text-[11px] font-bold mb-1">
                                <span>${bookedCount}/${maxCap} Slots</span>
                                <span>${pct}%</span>
                            </div>
                            <div class="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                                <div class="bg-blue-600 h-2 rounded-full" style="width: ${pct}%"></div>
                            </div>
                        </td>
                        <td class="py-3 px-4 text-right font-bold text-slate-900">Rs. ${fee.toFixed(2)}</td>
                        <td class="py-3 px-4 text-right">
                            <button onclick="requestAdminAuthDelete('doctor', ${s.doctor_id})" class="text-rose-600 hover:text-rose-800 text-xs font-bold px-2 py-1 bg-rose-50 rounded-lg">
                                <i class="fa-solid fa-trash-can mr-1"></i>Delete
                            </button>
                        </td>
                    </tr>
                `;

                select.innerHTML += `<option value="${s.schedule_id}">Dr. ${s.doctor_name} (${s.specialization}) - [Rs. ${fee.toFixed(2)}]</option>`;
            });
        }

        // =============================================================
        // SPECIALIZATIONS MANAGEMENT (ADD, EDIT, DELETE)
        // =============================================================
        async function loadSpecializations() {
            try {
                const res = await fetch(`${API_BASE}/specializations`);
                const json = await res.json();
                const select = document.getElementById('docSpecialization');
                if (select) {
                    select.innerHTML = '<option value="">-- Select Specialty --</option>';
                    (json.data || []).forEach(s => {
                        select.innerHTML += `<option value="${s.id}">${s.name}</option>`;
                    });
                }
            } catch (e) { console.error(e); }
        }

        function openDoctorModal() {
            loadSpecializations();
            handleSpecialtyChange('');
            document.getElementById('doctorModal').classList.remove('hidden');
            document.getElementById('doctorModal').classList.add('flex');
        }

        function closeDoctorModal() {
            document.getElementById('doctorModal').classList.add('hidden');
            document.getElementById('doctorModal').classList.remove('flex');
            closeEditCategoryBox();
            document.getElementById('newCategoryBox').classList.add('hidden');
        }

        function toggleNewCategoryInput() {
            const box = document.getElementById('newCategoryBox');
            const select = document.getElementById('docSpecialization');
            closeEditCategoryBox();

            if (box.classList.contains('hidden')) {
                box.classList.remove('hidden');
                document.getElementById('newCategoryName').focus();
                select.disabled = true;
            } else {
                box.classList.add('hidden');
                document.getElementById('newCategoryName').value = '';
                select.disabled = false;
            }
        }

        async function saveNewCategory() {
            const name = document.getElementById('newCategoryName').value.trim();
            if (!validateCategoryForm(name)) {
                return;
            }
            try {
                const res = await fetch(`${API_BASE}/specializations`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name })
                });
                const json = await res.json();
                if (json.success) {
                    await loadSpecializations();
                    document.getElementById('docSpecialization').value = json.id;
                    toggleNewCategoryInput();
                    handleSpecialtyChange(json.id);
                    await loadSchedules();
                } else {
                    showErrorPopup(json.message || json.error || 'Failed to add category');
                }
            } catch (err) {
                showErrorPopup('Server error creating category: ' + err.message);
            }
        }

        // Toggle Edit and Delete Action Buttons
        function handleSpecialtyChange(val) {
            const btnEdit = document.getElementById('btnEditSpecialty');
            const btnDelete = document.getElementById('btnDeleteSpecialty');
            closeEditCategoryBox();

            if (val && val !== "" && val !== "0") {
                if (btnEdit) btnEdit.classList.remove('hidden');
                if (btnDelete) btnDelete.classList.remove('hidden');
            } else {
                if (btnEdit) btnEdit.classList.add('hidden');
                if (btnDelete) btnDelete.classList.add('hidden');
            }
        }

        // Open Category Rename Box
        function openEditCategoryBox() {
            const select = document.getElementById('docSpecialization');
            const currentName = select.options[select.selectedIndex]?.text;
            
            if (!select.value) {
                showErrorPopup('Please select a category to edit!');
                return;
            }

            const editBox = document.getElementById('editCategoryBox');
            const input = document.getElementById('editCategoryName');
            
            document.getElementById('newCategoryBox').classList.add('hidden');
            document.getElementById('docSpecialization').disabled = false;
            
            input.value = currentName;
            editBox.classList.remove('hidden');
            input.focus();
        }

        // Close Category Rename Box
        function closeEditCategoryBox() {
            const editBox = document.getElementById('editCategoryBox');
            if (editBox) {
                editBox.classList.add('hidden');
                document.getElementById('editCategoryName').value = '';
            }
        }

        // Save Updated Category Name
        async function saveUpdatedCategory() {
            const select = document.getElementById('docSpecialization');
            const id = select.value;
            const updatedName = document.getElementById('editCategoryName').value.trim();

            if (!id) {
                showErrorPopup('No category selected!');
                return;
            }
            if (!validateCategoryForm(updatedName)) {
                return;
            }

            try {
                const res = await fetch(`${API_BASE}/specializations/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: updatedName })
                });

                const json = await res.json();

                if (json.success) {
                    alert(json.message);
                    closeEditCategoryBox();
                    await loadSpecializations();
                    
                    document.getElementById('docSpecialization').value = id;
                    handleSpecialtyChange(id);
                    await loadSchedules();
                } else {
                    showErrorPopup(json.message || 'Failed to update category');
                }
            } catch (err) {
                showErrorPopup('Server error updating category: ' + err.message);
            }
        }

        // Delete Selected Category Safely
        async function deleteSelectedSpecialty() {
            const select = document.getElementById('docSpecialization');
            const id = select.value;
            const selectedText = select.options[select.selectedIndex]?.text;

            if (!id) {
                showErrorPopup('Please select a category to delete!');
                return;
            }

            if (!confirm(`Are you sure you want to delete category "${selectedText}"?`)) {
                return;
            }

            try {
                const res = await fetch(`${API_BASE}/specializations/${id}`, {
                    method: 'DELETE'
                });
                const json = await res.json();

                if (json.success) {
                    alert(json.message || `Category "${selectedText}" deleted successfully!`);
                    await loadSpecializations();
                    handleSpecialtyChange('');
                    await loadSchedules();
                } else {
                    showErrorPopup(json.message || 'Cannot delete category assigned to active doctors!');
                }
            } catch (err) {
                showErrorPopup('Server error deleting category: ' + err.message);
            }
        }

        // =============================================================
        // DOCTOR SUBMIT EVENT HANDLER
        // =============================================================
        document.getElementById('doctorOnboardForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const payload = {
                first_name: document.getElementById('docFirstName').value.trim(),
                last_name: document.getElementById('docLastName').value.trim(),
                specialization_id: document.getElementById('docSpecialization').value,
                consultation_fee: document.getElementById('docFee').value,
                email: document.getElementById('docEmail').value.trim(),
                phone: document.getElementById('docPhone').value.trim(),
                day_of_week: document.getElementById('docDay').value,
                start_time: document.getElementById('docStart').value,
                end_time: document.getElementById('docEnd').value,
                max_patients: document.getElementById('docMaxPatients').value
            };

            // 1. Client-Side Validation (Toast popup on failure)
            if (!validateDoctorForm(payload)) {
                return;
            }

            // 2. Submit to Backend
            try {
                const res = await fetch(`${API_BASE}/doctors`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        ...payload,
                        start_time: payload.start_time.length === 5 ? payload.start_time + ':00' : payload.start_time,
                        end_time: payload.end_time.length === 5 ? payload.end_time + ':00' : payload.end_time
                    })
                });
                const json = await res.json();
                if (json.success) {
                    alert('Doctor onboarded successfully!');
                    closeDoctorModal();
                    document.getElementById('doctorOnboardForm').reset();
                    refreshAllData();
                } else {
                    showErrorPopup(json.message || json.error || 'Failed to add doctor');
                }
            } catch (err) {
                showErrorPopup('Server communication error: ' + err.message);
            }
        });

        // =============================================================
        // BOOKINGS & TOKENS
        // =============================================================
        document.getElementById('bookingForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const patient_id = document.getElementById('bookPatientId').value;
            const schedule_id = document.getElementById('bookScheduleId').value;
            const appointment_date = document.getElementById('bookDate').value;

            if (!patient_id) {
                showErrorPopup('Please select a patient!');
                return;
            }
            if (!schedule_id) {
                showErrorPopup('Please select a doctor channeling session!');
                return;
            }
            if (!appointment_date) {
                showErrorPopup('Please choose an appointment date!');
                return;
            }

            const today = new Date().toISOString().split('T')[0];
            if (appointment_date < today) {
                showErrorPopup('Cannot book appointments for past dates!');
                return;
            }

            try {
                const res = await fetch(`${API_BASE}/appointments/book`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ patient_id, schedule_id, appointment_date })
                });
                const json = await res.json();
                if (json.success) {
                    if (json.tokenData) showTokenModal(json.tokenData);
                    await refreshAllData();
                } else {
                    showErrorPopup(json.message || json.error || 'Booking failed');
                }
            } catch (err) { 
                showErrorPopup('Error booking appointment: ' + err.message); 
            }
        });

        function showTokenModal(t) {
            document.getElementById('tokenQueueNum').innerText = `#0${t.queue_number}`;
            document.getElementById('tokenDoctor').innerText = t.doctor_name;
            document.getElementById('tokenPatient').innerText = t.patient_name;
            document.getElementById('tokenDate').innerText = t.appointment_date.split('T')[0];
            document.getElementById('tokenFee').innerText = `Rs. ${Number(t.total_amount).toFixed(2)}`;
            document.getElementById('tokenModal').classList.remove('hidden');
            document.getElementById('tokenModal').classList.add('flex');
        }

        function closeTokenModal() {
            document.getElementById('tokenModal').classList.add('hidden');
            document.getElementById('tokenModal').classList.remove('flex');
        }

        // =============================================================
        // PATIENTS DIRECTORY & SOFT DELETE
        // =============================================================
        async function loadPatients() {
            try {
                const res = await fetch(`${API_BASE}/patients`);
                const json = await res.json();
                state.patients = json.data || [];
                const select = document.getElementById('bookPatientId');
                const tbody = document.getElementById('patientsTableBody');
                if (!select || !tbody) return;

                select.innerHTML = '<option value="">-- Choose Patient --</option>';
                tbody.innerHTML = '';
                state.patients.forEach(p => {
                    select.innerHTML += `<option value="${p.id}">#${p.id} - ${p.first_name} ${p.last_name}</option>`;
                    tbody.innerHTML += `
                        <tr>
                            <td class="py-3 px-4 font-mono-code text-xs">#${p.id}</td>
                            <td class="py-3 px-4 font-bold">${p.first_name} ${p.last_name}</td>
                            <td class="py-3 px-4 text-xs font-bold text-blue-600">${p.calculated_age || '-'} Years (UDF)</td>
                            <td class="py-3 px-4 text-xs">${p.gender}</td>
                            <td class="py-3 px-4 text-xs font-mono-code">${p.contact_number}</td>
                            <td class="py-3 px-4 text-right">
                                <button onclick="requestAdminAuthDelete('patient', ${p.id})" class="text-rose-600 hover:text-rose-800 text-xs font-bold px-2 py-1 bg-rose-50 rounded-lg">
                                    <i class="fa-solid fa-trash-can mr-1"></i>Delete
                                </button>
                            </td>
                        </tr>
                    `;
                });
                document.getElementById('kpiPatients').innerText = state.patients.length;
            } catch (e) { }
        }

        document.getElementById('patientForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const patData = {
                first_name: document.getElementById('patFirstName').value,
                last_name: document.getElementById('patLastName').value,
                dob: document.getElementById('patDob').value,
                gender: document.getElementById('patGender').value,
                contact_number: document.getElementById('patContact').value,
                address: document.getElementById('patAddress').value
            };

            if (!validatePatientForm(patData)) {
                return;
            }

            try {
                const res = await fetch(`${API_BASE}/patients`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(patData)
                });
                const json = await res.json();
                if (json.success) {
                    alert('Patient registered successfully!');
                    document.getElementById('patientForm').reset();
                    refreshAllData();
                } else {
                    showErrorPopup(json.message || json.error || 'Failed to save patient');
                }
            } catch (err) {
                showErrorPopup('Server connection error: ' + err.message);
            }
        });


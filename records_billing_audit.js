// MediCare Pro | member3_records_billing_audit.js
// Extracted from original index_RBAC(1).html; shared global scope.
        // =============================================================
        // ADMIN PASSWORD PROTECTED DELETE & ARCHIVES
        // =============================================================
        function requestAdminAuthDelete(type, id) {
            if (sessionStorage.getItem('medicare_role') !== 'db_admin') { showErrorPopup('Administrator access required'); return; }
            state.pendingDelete = { type, id };
            document.getElementById('adminAuthMessage').innerText = `Administrator permission required to delete ${type} #${id}.`;
            document.getElementById('adminAuthPassword').value = '';
            document.getElementById('adminAuthModal').classList.remove('hidden');
            document.getElementById('adminAuthModal').classList.add('flex');
            document.getElementById('adminAuthPassword').focus();
        }

        function closeAdminAuthModal() {
            state.pendingDelete = null;
            document.getElementById('adminAuthModal').classList.add('hidden');
            document.getElementById('adminAuthModal').classList.remove('flex');
        }

        document.getElementById('adminAuthForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!state.pendingDelete) return;

            const admin_password = document.getElementById('adminAuthPassword').value;
            const { type, id } = state.pendingDelete;
            const endpoint = type === 'doctor' ? `${API_BASE}/doctors/${id}` : `${API_BASE}/patients/${id}`;

            try {
                const res = await fetch(endpoint, {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ admin_password })
                });
                const json = await res.json();
                if (json.success) {
                    alert(json.message);
                    closeAdminAuthModal();
                    refreshAllData();
                } else {
                    showErrorPopup(json.message || json.error || 'Verification failed');
                }
            } catch (err) {
                showErrorPopup('Server error executing soft-delete');
            }
        });

        async function loadArchives() {
            try {
                // Deleted Patients View
                const resPat = await fetch(`${API_BASE}/views/deleted-patients`);
                const jsonPat = await resPat.json();
                const tbodyPat = document.getElementById('deletedPatientsBody');
                if (tbodyPat) {
                    tbodyPat.innerHTML = '';
                    (jsonPat.data || []).forEach(p => {
                        tbodyPat.innerHTML += `
                            <tr>
                                <td class="py-3 px-4 font-mono-code text-xs">#${p.id}</td>
                                <td class="py-3 px-4 font-bold">${p.first_name} ${p.last_name}</td>
                                <td class="py-3 px-4 text-xs font-mono-code">${p.contact_number}</td>
                                <td class="py-3 px-4"><span class="bg-rose-100 text-rose-700 text-[10px] font-bold px-2 py-0.5 rounded-md">Archived</span></td>
                                <td class="py-3 px-4 text-right">
                                    <button onclick="restoreRecord('patient', ${p.id})" class="text-teal-600 hover:text-teal-800 text-xs font-bold px-2 py-1 bg-teal-50 rounded-lg">
                                        <i class="fa-solid fa-rotate-left mr-1"></i>Restore
                                    </button>
                                </td>
                            </tr>
                        `;
                    });
                }

                // Deleted Doctors View
                const resDoc = await fetch(`${API_BASE}/views/deleted-doctors`);
                const jsonDoc = await resDoc.json();
                const tbodyDoc = document.getElementById('deletedDoctorsBody');
                if (tbodyDoc) {
                    tbodyDoc.innerHTML = '';
                    (jsonDoc.data || []).forEach(d => {
                        tbodyDoc.innerHTML += `
                            <tr>
                                <td class="py-3 px-4 font-mono-code text-xs">#${d.id}</td>
                                <td class="py-3 px-4 font-bold">Dr. ${d.first_name} ${d.last_name}</td>
                                <td class="py-3 px-4 text-xs font-semibold text-slate-600">${d.specialization}</td>
                                <td class="py-3 px-4 font-mono-code text-xs">Rs. ${Number(d.consultation_fee).toFixed(2)}</td>
                                <td class="py-3 px-4 text-right">
                                    <button onclick="restoreRecord('doctor', ${d.id})" class="text-teal-600 hover:text-teal-800 text-xs font-bold px-2 py-1 bg-teal-50 rounded-lg">
                                        <i class="fa-solid fa-rotate-left mr-1"></i>Restore
                                    </button>
                                </td>
                            </tr>
                        `;
                    });
                }
            } catch (e) { console.error(e); }
        }

        async function restoreRecord(type, id) {
            const endpoint = type === 'doctor' ? `${API_BASE}/doctors/${id}/restore` : `${API_BASE}/patients/${id}/restore`;
            try {
                const res = await fetch(endpoint, { method: 'PUT' });
                const json = await res.json();
                if (json.success) {
                    alert(json.message);
                    refreshAllData();
                } else {
                    showErrorPopup(json.message || 'Restore failed');
                }
            } catch (e) {
                showErrorPopup('Server error on restore');
            }
        }

        // =============================================================
        // QUEUES, BILLING & AUDIT LOGS
        // =============================================================
        async function loadAppointments() {
            try {
                const res = await fetch(`${API_BASE}/appointments`);
                const json = await res.json();
                state.appointments = json.data || [];
                renderAppointments();
            } catch (e) { }
        }

        function renderAppointments() {
            const q = (document.getElementById('searchAppt')?.value || '').toLowerCase();
            const tbody = document.getElementById('appointmentsTableBody');
            if (!tbody) return;
            tbody.innerHTML = '';
            const filtered = state.appointments.filter(a => (a.patient_name || '').toLowerCase().includes(q));

            // Render only first 100 records to keep the browser responsive.
            // Full records remain in state for totals and CSV export.
            const rows = filtered.slice(0, 100).map(a => `
                    <tr>
                        <td class="py-3 px-4 font-mono-code text-xs">#${a.id}</td>
                        <td class="py-3 px-4 font-bold">${a.patient_name}</td>
                        <td class="py-3 px-4 text-xs">Dr. ${a.doctor_name}</td>
                        <td class="py-3 px-4 text-xs font-mono-code">${a.appointment_date.split('T')[0]}</td>
                        <td class="py-3 px-4 font-mono-code font-bold text-blue-600">TOKEN #${a.queue_number}</td>
                        <td class="py-3 px-4"><span class="px-2 py-0.5 rounded text-xs font-bold ${a.status === 'Completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'}">${a.status}</span></td>
                        <td class="py-3 px-4 text-xs">${a.payment_status || 'Pending'}</td>
                        <td class="py-3 px-4 text-right space-x-1">
                            <button onclick="updateStatus(${a.id}, 'Completed')" class="bg-emerald-600 text-white text-xs px-2 py-1 rounded">Complete</button>
                            <button onclick="updateStatus(${a.id}, 'Cancelled')" class="bg-rose-600 text-white text-xs px-2 py-1 rounded">Cancel</button>
                        </td>
                    </tr>
                `);
            tbody.innerHTML = rows.join('');
            document.getElementById('kpiAppointments').innerText = state.appointments.length;
            document.getElementById('navApptCount').innerText = state.appointments.length;
            document.getElementById('kpiCompletedAppts').innerText = `${state.appointments.filter(a => a.status === 'Completed').length} Completed Visits`;
        }

        async function updateStatus(id, status) {
            try {
                const res = await fetch(`${API_BASE}/appointments/${id}/status`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status })
                });
                const json = await res.json();
                if (!json.success) {
                    showErrorPopup(json.message || 'Failed to update status');
                }
                refreshAllData();
            } catch (err) {
                showErrorPopup('Error updating appointment status');
            }
        }

        async function loadBills() {
            try {
                const res = await fetch(`${API_BASE}/bills`);
                const json = await res.json();
                state.bills = json.data || [];
                const tbody = document.getElementById('billsTableBody');
                if (!tbody) return;
                tbody.innerHTML = '';
                let paid = 0, pending = 0;
                state.bills.forEach(b => {
                    if (b.status === 'Paid') paid += Number(b.total_amount);
                    else pending += Number(b.total_amount);
                });
                const billRows = state.bills.slice(0, 100).map(b => `
                        <tr>
                            <td class="py-3 px-4 font-mono-code">INV-${b.bill_id}</td>
                            <td class="py-3 px-4 font-bold">${b.patient_name}</td>
                            <td class="py-3 px-4 font-bold">Rs. ${Number(b.total_amount).toFixed(2)}</td>
                            <td class="py-3 px-4"><span class="px-2 py-0.5 rounded text-xs font-bold ${b.status === 'Paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}">${b.status}</span></td>
                            <td class="py-3 px-4 text-right space-x-1">
                                ${b.status !== 'Paid' ? `<button onclick="payBill(${b.bill_id})" class="bg-blue-600 text-white text-xs px-2 py-1 rounded">Pay</button>` : ''}
                                <button onclick="openInvoice(${b.bill_id})" class="bg-slate-100 border text-xs px-2 py-1 rounded">Receipt</button>
                            </td>
                        </tr>
                    `);
                tbody.innerHTML = billRows.join('');
                document.getElementById('kpiRevenue').innerText = `Rs. ${paid.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
                document.getElementById('kpiPending').innerText = `Rs. ${pending.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
            } catch (e) { }
        }

        async function payBill(id) {
            try {
                const res = await fetch(`${API_BASE}/bills/${id}/pay`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ payment_method: 'Cash' })
                });
                const json = await res.json();
                if (!json.success) {
                    showErrorPopup(json.message || 'Payment failed');
                }
                refreshAllData();
            } catch (err) {
                showErrorPopup('Error processing bill payment');
            }
        }

        function openInvoice(id) {
            const b = state.bills.find(x => x.bill_id === id);
            if (!b) return;
            document.getElementById('modalBillId').innerText = `INV-${b.bill_id}`;
            document.getElementById('modalPatient').innerText = b.patient_name;
            document.getElementById('modalAmount').innerText = `Rs. ${Number(b.total_amount).toFixed(2)}`;
            document.getElementById('invoiceModal').classList.remove('hidden');
            document.getElementById('invoiceModal').classList.add('flex');
        }

        function closeInvoiceModal() {
            document.getElementById('invoiceModal').classList.add('hidden');
            document.getElementById('invoiceModal').classList.remove('flex');
        }

        async function loadAuditLogs() {
            try {
                const res = await fetch(`${API_BASE}/audit-logs`);
                const json = await res.json();
                state.auditLogs = json.data || [];
                const tbody = document.getElementById('auditTableBody');
                if (!tbody) return;
                tbody.innerHTML = '';
                const auditRows = state.auditLogs.slice(0, 100).map(l => `
                        <tr>
                            <td class="py-3 px-4 font-mono-code">#${l.id}</td>
                            <td class="py-3 px-4 font-mono-code">${l.table_name}</td>
                            <td class="py-3 px-4 font-bold text-purple-700">${l.action}</td>
                            <td class="py-3 px-4 font-mono-code text-xs text-rose-600">${typeof l.old_data === 'object' ? JSON.stringify(l.old_data) : l.old_data}</td>
                            <td class="py-3 px-4 font-mono-code text-xs text-emerald-600">${typeof l.new_data === 'object' ? JSON.stringify(l.new_data) : l.new_data}</td>
                            <td class="py-3 px-4 text-xs font-mono-code">${new Date(l.changed_at).toLocaleTimeString()}</td>
                        </tr>
                    `);
                tbody.innerHTML = auditRows.join('');
                document.getElementById('kpiAuditCount').innerText = `${state.auditLogs.length} Trigger Events`;
            } catch (e) { }
        }


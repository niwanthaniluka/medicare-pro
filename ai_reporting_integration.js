// MediCare Pro | member4_ai_reporting_integration.js
// Extracted from original index_RBAC(1).html; shared global scope.
        function exportAppointmentsCSV() {
            const rows = state.appointments.map(a => [a.id, "${a.patient_name}", "Dr. ${a.doctor_name}", a.appointment_date.split('T')[0], a.queue_number, a.status]);
            const csv = 'data:text/csv;charset=utf-8,ID,Patient,Doctor,Date,Token,Status\n' + rows.map(e => e.join(',')).join('\n');
            const link = document.createElement('a');
            link.setAttribute('href', encodeURI(csv));
            link.setAttribute('download', 'appointments.csv');
            link.click();
        }

        async function refreshAllData() {
            const role = sessionStorage.getItem('medicare_role');
            if (role === 'doctor') {
                await Promise.all([fetchSystemHealth(), loadSchedules()]);
                return;
            }
            if (role === 'report_user') {
                await Promise.all([loadAppointments(), loadBills(), loadAuditLogs(), fetchSystemHealth()]);
                return;
            }
            await Promise.all([
                loadAppointments(),
                loadPatients(),
                loadBills(),
                ...(role === 'db_admin' ? [loadAuditLogs()] : []),
                fetchSystemHealth(),
                loadDoctorPerformance(),
                ...(role === 'db_admin' ? [loadArchives()] : [])
            ]);
            await loadSchedules();
        }
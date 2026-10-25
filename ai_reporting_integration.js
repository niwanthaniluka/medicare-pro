// MediCare Pro | member4_ai_reporting_integration.js
// Extracted from original index_RBAC(1).html; shared global scope.
        function exportAppointmentsCSV() {
            const rows = state.appointments.map(a => [a.id, `"${a.patient_name}"`, `"Dr. ${a.doctor_name}"`, a.appointment_date.split('T')[0], a.queue_number, a.status]);
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


let aiForecastChartInstance = null;

async function loadAIForecast() {
    const statusEl = document.getElementById('aiForecastStatus');
    const monthlyEl = document.getElementById('aiMonthlyVisits');
    const peakDateEl = document.getElementById('aiPeakDate');
    const peakVisitsEl = document.getElementById('aiPeakVisits');

    try {
        if (statusEl) statusEl.textContent = 'Loading AI forecast...';

        const response = await fetch(`${API_BASE}/ai/forecast`);

        if (!response.ok) {
            throw new Error(`API request failed: ${response.status}`);
        }

        const result = await response.json();

        if (!result.success || !result.data) {
            throw new Error(result.message || 'Forecast data unavailable');
        }

        const forecast = result.data;
        const predictions = forecast.daily_predictions;

        if (!Array.isArray(predictions) || predictions.length === 0) {
            throw new Error('Daily predictions are missing from the API response');
        }

        if (monthlyEl) {
            monthlyEl.textContent =
                Number(forecast.predicted_monthly_visits).toLocaleString();
        }

        const peak = predictions.reduce((best, day) =>
            Number(day.predicted_visits) > Number(best.predicted_visits)
                ? day
                : best
        );

        if (peakDateEl) peakDateEl.textContent = peak.date;
        if (peakVisitsEl) {
            peakVisitsEl.textContent =
                `${peak.predicted_visits} predicted visits`;
        }

        const canvas = document.getElementById('aiForecastChart');

        if (!canvas) throw new Error('Forecast chart canvas not found');
        if (typeof Chart === 'undefined') {
            throw new Error('Chart.js did not load. Check your internet connection.');
        }

        if (aiForecastChartInstance) {
            aiForecastChartInstance.destroy();
        }

        aiForecastChartInstance = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: predictions.map(day => day.date),
                datasets: [{
                    label: 'Predicted Visits',
                    data: predictions.map(day => Number(day.predicted_visits)),
                    backgroundColor: 'rgba(79, 70, 229, 0.72)',
                    borderColor: 'rgb(79, 70, 229)',
                    borderWidth: 1,
                    borderRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: true }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { precision: 0 },
                        title: {
                            display: true,
                            text: 'Predicted visits'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'October 2026'
                        },
                        ticks: { maxTicksLimit: 10 }
                    }
                }
            }
        });

        if (statusEl) {
            statusEl.textContent =
                `Forecast loaded successfully · ${forecast.period || 'October 2026'}`;
        }

    } catch (error) {
        console.error('AI forecast error:', error);
        if (statusEl) {
            statusEl.textContent = `Unable to load forecast: ${error.message}`;
        }
    }
}



        // Run session check on initial startup
        checkSession();
        if (sessionStorage.getItem('medicare_role') === 'db_admin') loadAIForecast();

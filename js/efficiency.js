// ==========================================
// FAIL: js/efficiency.js
// FUNGSI: Menguruskan Modul Efisiensi Pengesahan Data
// ==========================================

const EfficiencyManager = {
    allRecords: [],
    
    // 1. Fungsi pengekstrakan tarikh dari log semakan
    extractFirstDisahkanDate: function(logText, tarikhBancianStr) {
        if (!logText) return null;
        
        // Match format: [DD/MM HH:MM] DISAHKAN
        // Menggunakan regex global untuk cari semua match
        const regex = /\[(\d{2})\/(\d{2})\s+(\d{2}:\d{2})\]\s+DISAHKAN/gi;
        let matches;
        let earliestDate = null;
        
        // Dapatkan tahun dan tarikh dari Tarikh Bancian
        let baseDate = new Date(tarikhBancianStr);
        if (isNaN(baseDate.getTime())) {
            // Cuba parse manual jika string pelik
            if (tarikhBancianStr && tarikhBancianStr.includes('/')) {
                const parts = tarikhBancianStr.split('/');
                if (parts.length === 3) baseDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
            }
        }
        
        const baseYear = !isNaN(baseDate.getTime()) ? baseDate.getFullYear() : new Date().getFullYear();

        while ((matches = regex.exec(logText)) !== null) {
            const day = parseInt(matches[1], 10);
            const month = parseInt(matches[2], 10) - 1; // 0-indexed
            const timeParts = matches[3].split(':');
            const hour = parseInt(timeParts[0], 10);
            const minute = parseInt(timeParts[1], 10);
            
            let dt = new Date(baseYear, month, day, hour, minute);
            
            // Logik Tahun: Jika tarikh pengesahan < tarikh bancian, bermakna pengesahan dibuat pada tahun berikutnya
            if (!isNaN(baseDate.getTime()) && dt.getTime() < baseDate.getTime()) {
                dt.setFullYear(baseYear + 1);
            }
            
            if (!earliestDate || dt.getTime() < earliestDate.getTime()) {
                earliestDate = dt;
            }
        }
        
        return earliestDate;
    },

    // 2. Fungsi klasifikasi rekod
    classifyRecords: function(records) {
        const classified = [];
        
        records.forEach(r => {
            if (!r.t) return;
            
            let baseDate = new Date(r.t);
            if (isNaN(baseDate.getTime()) && r.t.includes('/')) {
                const parts = r.t.split('/');
                if (parts.length === 3) baseDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
            }
            if (isNaN(baseDate.getTime())) return;

            // Tentukan Deadline: 1hb bulan berikutnya jam 00:00
            const deadline = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 1, 0, 0, 0);
            const now = new Date();
            
            let disahkanDate = null;
            let statusEfisiensi = "";
            let hariLengah = 0;
            
            if (r.status === "DISAHKAN") {
                disahkanDate = this.extractFirstDisahkanDate(r.logText, r.t);
            }
            
            if (disahkanDate) {
                if (disahkanDate.getTime() < deadline.getTime()) {
                    statusEfisiensi = "TEPAT_MASA";
                } else {
                    statusEfisiensi = "LEWAT";
                    hariLengah = (disahkanDate.getTime() - deadline.getTime()) / (1000 * 3600 * 24);
                }
            } else {
                if (now.getTime() < deadline.getTime()) {
                    statusEfisiensi = "DALAM_TEMPOH";
                } else {
                    statusEfisiensi = "OVERDUE";
                }
            }
            
            classified.push({
                negeri: r.n,
                bulan: `${baseDate.getFullYear()}-${String(baseDate.getMonth() + 1).padStart(2, '0')}`, // YYYY-MM
                status: statusEfisiensi,
                hariLengah: hariLengah > 0 ? hariLengah : 0
            });
        });
        
        return classified;
    },

    // 3. Paparan Jadual
    renderTable: function(classified, filterBulan = "ALL") {
        const tbody = document.getElementById('tbodyEfficiency');
        if (!tbody) return;
        
        // Filter by month
        const filtered = filterBulan === "ALL" ? classified : classified.filter(c => c.bulan === filterBulan);
        
        // Group by Negeri
        const stats = {};
        filtered.forEach(c => {
            if (!stats[c.negeri]) {
                stats[c.negeri] = { negeri: c.negeri, total: 0, tepatMasa: 0, lewat: 0, overdue: 0, dalamTempoh: 0, sumHariLengah: 0 };
            }
            stats[c.negeri].total++;
            
            if (c.status === "TEPAT_MASA") stats[c.negeri].tepatMasa++;
            else if (c.status === "LEWAT") {
                stats[c.negeri].lewat++;
                stats[c.negeri].sumHariLengah += c.hariLengah;
            }
            else if (c.status === "OVERDUE") stats[c.negeri].overdue++;
            else if (c.status === "DALAM_TEMPOH") stats[c.negeri].dalamTempoh++;
        });
        
        // Calculate % and sort
        const ranked = Object.values(stats).map(s => {
            const dueRecords = s.tepatMasa + s.lewat + s.overdue; // Mengecualikan Dalam Tempoh
            s.pctTepatMasa = dueRecords > 0 ? (s.tepatMasa / dueRecords) * 100 : 0;
            s.avgHariLengah = s.lewat > 0 ? s.sumHariLengah / s.lewat : 0;
            return s;
        });
        
        ranked.sort((a, b) => b.pctTepatMasa - a.pctTepatMasa);
        
        if (ranked.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted p-4">Tiada rekod data dijumpai untuk bulan ini.</td></tr>';
            return;
        }
        
        tbody.innerHTML = ranked.map((s, i) => {
            let pctColor = "danger";
            if (s.pctTepatMasa >= 90) pctColor = "success";
            else if (s.pctTepatMasa >= 70) pctColor = "warning";
            
            return `
                <tr>
                    <td class="fw-bold">${i+1}. ${s.negeri}</td>
                    <td class="text-center">${s.total}</td>
                    <td class="text-center"><span class="badge bg-${pctColor}">${s.pctTepatMasa.toFixed(1)}%</span></td>
                    <td class="text-center text-warning fw-bold">${s.lewat}</td>
                    <td class="text-center text-danger fw-bold">${s.overdue}</td>
                    <td class="text-center">${s.avgHariLengah.toFixed(1)} Hari</td>
                </tr>
            `;
        }).join('');
    },

    // 4. Inisialisasi Data
    init: async function() {
        const container = document.getElementById('efficiencyDataBox');
        if (container) container.innerHTML = '<div class="text-center p-5"><div class="spinner-border text-primary"></div><div class="mt-2 text-muted">Menganalisis Data Pengesahan...</div></div>';
        
        try {
            // Gabung data dari mData (DISAHKAN)
            let records = [];
            
            if (AppState.mData && AppState.mData.length > 0) {
                AppState.mData.forEach(d => {
                    records.push({
                        t: d.t,
                        n: d.n,
                        status: 'DISAHKAN',
                        logText: d.vb
                    });
                });
            }
            
            // Ambil data BARU menggunakan getPending API (jika perlu)
            const p = await API.postData('getPending', {state: AppState.uProf.state});
            if (p.success !== false && p.rows && p.rows.length > 0) {
                const headers = p.headers.map(h => String(h).toUpperCase().trim());
                const idxN = headers.findIndex(h => h.includes("NEGERI"));
                const idxT = headers.findIndex((h, i) => i !== 0 && (h.includes("TARIKH BANCIAN") || h.includes("TARIKH LAWATAN") || ((h.includes("TARIKH") || h.includes("DATE")) && !h.includes("HANTAR") && !h.includes("TIMESTAMP") && !h.includes("KUTIP"))));
                const idxS = headers.findIndex(h => h.includes("STATUS PENGESAHAN"));
                
                p.rows.forEach(r => {
                    let st = idxS > -1 ? String(r.data[idxS]).toUpperCase() : "BARU";
                    if (st === "BARU" || st === "") {
                        records.push({
                            t: idxT > -1 ? r.data[idxT] : "",
                            n: idxN > -1 ? r.data[idxN] : "-",
                            status: 'BARU',
                            logText: null
                        });
                    }
                });
            }
            
            const classified = this.classifyRecords(records);
            this.allRecords = classified;
            
            // Extract unik bulan untuk dropdown
            const setBulan = new Set();
            classified.forEach(c => setBulan.add(c.bulan));
            const arrBulan = Array.from(setBulan).sort().reverse();
            
            let selectHTML = '<select id="selBulanEfficiency" class="form-select form-select-sm shadow-sm" style="width: auto;" onchange="EfficiencyManager.renderTable(EfficiencyManager.allRecords, this.value)"><option value="ALL">Semua Bulan</option>';
            arrBulan.forEach(b => {
                selectHTML += `<option value="${b}">${b}</option>`;
            });
            selectHTML += '</select>';
            
            const boxHTML = `
                <div class="d-flex justify-content-between align-items-center mb-3 p-3 bg-white border-bottom shadow-sm rounded-top">
                    <h5 class="m-0 fw-bold text-dark"><i class="bi bi-clock-history me-2 text-primary"></i>Prestasi Rekod Pengesahan</h5>
                    ${selectHTML}
                </div>
                <div class="table-responsive p-3 bg-white rounded-bottom shadow-sm">
                    <table class="table table-hover table-bordered table-striped align-middle" style="font-size:0.9rem">
                        <thead class="table-light">
                            <tr>
                                <th class="text-secondary">Negeri</th>
                                <th class="text-center text-secondary" title="Termasuk Yang Belum Matang (Dalam Tempoh)">Jum. Rekod</th>
                                <th class="text-center text-secondary" title="% Tepat Masa (Mengabaikan rekod Dalam Tempoh)">% Tepat Masa</th>
                                <th class="text-center text-secondary">Bil. Lewat</th>
                                <th class="text-center text-secondary">Bil. Semasa lewat belum disahkan</th>
                                <th class="text-center text-secondary" title="Hanya untuk rekod Lewat">Purata Hari Lambat Mengesahkan data..</th>
                            </tr>
                        </thead>
                        <tbody id="tbodyEfficiency">
                        </tbody>
                    </table>
                </div>
            `;
            
            if (container) {
                container.innerHTML = boxHTML;
                this.renderTable(this.allRecords, "ALL");
            }
            
        } catch (e) {
            console.error(e);
            if (container) container.innerHTML = '<div class="alert alert-danger m-3">Gagal memuatkan data efisiensi. Sila semak sambungan internet anda.</div>';
        }
    }
};

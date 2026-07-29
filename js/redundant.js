/**
 * Pengurus Kesan Data Redundant (Admin Sahaja)
 * Menggunakan algoritma Haversine untuk mencari kluster data yang berpotensi berulang.
 */

const RedundantManager = {
    ignoredList: [],
    clusters: [],

    init: function() {
        // Event Listeners
        const btnRefresh = document.getElementById('btnRefreshRedundant');
        if (btnRefresh) {
            btnRefresh.addEventListener('click', () => {
                this.load();
            });
        }

        const btnFilter = document.getElementById('btnApplyRedundantFilter');
        if (btnFilter) {
            btnFilter.addEventListener('click', () => {
                this.load();
            });
        }

        const btnExport = document.getElementById('btnExportRedundant');
        if (btnExport) {
            btnExport.addEventListener('click', () => {
                this.exportExcel();
            });
        }
    },

    load: async function() {
        const container = document.getElementById('redundantContainer');
        if (!container) return;

        container.innerHTML = `
            <div class="text-center p-5 text-muted">
                <div class="spinner-border text-danger mb-2"></div>
                <br>Memuat turun log pengabaian dan menganalisis kluster...
            </div>
        `;

        try {
            // 1. Dapatkan senarai ID yang telah diabaikan oleh Admin
            const resIgnored = await API.postData('getIgnoredRedundant', {});
            if (resIgnored && resIgnored.success) {
                this.ignoredList = resIgnored.ignoredList || [];
            }

            // 2. Analisis data utama (AppState.mData)
            if (!AppState.mData || AppState.mData.length === 0) {
                container.innerHTML = `<div class="p-4 text-center text-muted">Tiada data untuk dianalisis. Mungkin belum dimuat turun.</div>`;
                return;
            }

            this.processClusters(AppState.mData);
            this.render();

        } catch (error) {
            console.error("Ralat Redundant:", error);
            container.innerHTML = `<div class="p-4 text-center text-danger">Gagal menganalisis data. Sila cuba lagi.</div>`;
        }
    },

    processClusters: function(data) {
        this.clusters = [];
        
        // Tapis data: Hanya yang sah koordinat & tidak ada dalam ignoredList
        const validData = data.filter(r => {
            if (this.ignoredList.includes(String(r.id))) return false;
            if (!r.c || typeof r.c !== 'string' || !r.c.includes(',')) return false;
            return true;
        });

        // 1. Kumpulkan data mengikut Koordinat yang SAMA TEPAT (O(N) Optimization)
        const coordGroups = new Map();
        validData.forEach(r => {
            const coordStr = String(r.c).trim().replace(/\s/g, ''); // Buang whitespace
            if (!coordGroups.has(coordStr)) {
                coordGroups.set(coordStr, []);
            }
            coordGroups.get(coordStr).push(r);
        });

        // 2. Bina Graph untuk komponen yang redundant
        const adj = new Map();
        validData.forEach(n => adj.set(n.id, []));

        // Hanya proses kumpulan koordinat yang mempunyai > 1 rekod
        coordGroups.forEach((groupNodes, coordStr) => {
            if (groupNodes.length > 1) {
                // Bandingkan setiap pasangan di dalam kumpulan koordinat ini
                for (let i = 0; i < groupNodes.length; i++) {
                    for (let j = i + 1; j < groupNodes.length; j++) {
                        const nodeA = groupNodes[i];
                        const nodeB = groupNodes[j];
                        
                        // Syarat Wajib 2: Nama Tanaman mestilah SAMA. Jika berbeza, automatik bukan redundant (mixed farming di koordinat sama).
                        if (String(nodeA.tn).trim().toLowerCase() !== String(nodeB.tn).trim().toLowerCase()) continue;

                        // Markah 2 sedia ada kerana koordinat sama (Key 1) dan Tanaman sama (Key 2)
                        let score = 2; 
                        
                        // Key 3: Senarai Perosak
                        const pestA = nodeA.p ? Object.keys(nodeA.p).sort().join(',') : "";
                        const pestB = nodeB.p ? Object.keys(nodeB.p).sort().join(',') : "";
                        if (pestA === pestB) score++;
                        
                        // Key 4: Tarikh Bancian
                        if (nodeA.t === nodeB.t) score++;
                        
                        // Key 5: Umur Tanaman
                        if (String(nodeA.um).trim().toLowerCase() === String(nodeB.um).trim().toLowerCase()) score++;
                        
                        // Key 6: Nama Lokasi
                        if (String(nodeA.l).trim().toLowerCase() === String(nodeB.l).trim().toLowerCase()) score++;

                        // Syarat Lulus: 5 daripada 6 kriteria mestilah sama
                        if (score >= 5) {
                            adj.get(nodeA.id).push(nodeB);
                            adj.get(nodeB.id).push(nodeA);
                        }
                    }
                }
            }
        });

        // 3. Cari Connected Components (Kluster) menggunakan BFS
        const visited = new Set();

        validData.forEach(node => {
            if (!visited.has(node.id)) {
                const neighbors = adj.get(node.id);
                // Hanya wujudkan kluster jika node ini ada kaitan redundant
                if (neighbors.length > 0) {
                    let currentCluster = [];
                    let queue = [node];
                    visited.add(node.id);

                    while (queue.length > 0) {
                        const curr = queue.shift();
                        currentCluster.push(curr);

                        const currNeighbors = adj.get(curr.id);
                        currNeighbors.forEach(neighbor => {
                            if (!visited.has(neighbor.id)) {
                                visited.add(neighbor.id);
                                queue.push(neighbor);
                            }
                        });
                    }
                    this.clusters.push(currentCluster);
                } else {
                    visited.add(node.id);
                }
            }
        });
    },

    render: function() {
        const container = document.getElementById('redundantContainer');
        if (this.clusters.length === 0) {
            container.innerHTML = `
                <div class="p-5 text-center text-success">
                    <i class="bi bi-shield-check display-4"></i>
                    <h5 class="mt-3 fw-bold">Sistem Bersih!</h5>
                    <p class="text-muted">Tiada data berpotensi redundant ditemui mengikut parameter penapisan anda.</p>
                </div>
            `;
            
            const badge = document.getElementById('badgeRedundant');
            if (badge) badge.style.display = 'none';
            return;
        }

        let html = `<div class="accordion" id="accordionRedundant">`;

        this.clusters.forEach((cluster, idx) => {
            const clusterId = "cluster" + idx;
            // Dapatkan tarikh purata / minimum
            const dates = cluster.map(c => new Date(c.t).getTime()).filter(t => !isNaN(t));
            const minDate = new Date(Math.min(...dates));
            const dateStr = minDate.toLocaleDateString('ms-MY', { day: '2-digit', month: 'short', year: 'numeric' });
            
            // Lokasi utama
            const mainLoc = cluster[0].l || "Lokasi Tidak Diketahui";
            const mainNegeri = cluster[0].n || "";

            html += `
                <div class="accordion-item border mb-2 rounded shadow-sm">
                    <h2 class="accordion-header" id="heading${clusterId}">
                        <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapse${clusterId}" aria-expanded="false" aria-controls="collapse${clusterId}">
                            <div class="d-flex w-100 justify-content-between align-items-center me-3">
                                <div>
                                    <span class="badge bg-danger me-2">${cluster.length} Rekod</span>
                                    <strong>${mainLoc}</strong> <small class="text-muted ms-1">(${mainNegeri})</small>
                                </div>
                                <small class="text-muted"><i class="bi bi-calendar3 me-1"></i> ${dateStr}</small>
                            </div>
                        </button>
                    </h2>
                    <div id="collapse${clusterId}" class="accordion-collapse collapse" aria-labelledby="heading${clusterId}" data-bs-parent="#accordionRedundant">
                        <div class="accordion-body p-0">
                            <div class="d-flex justify-content-end p-2 border-bottom bg-light">
                                <button class="btn btn-sm btn-primary shadow-sm" onclick="RedundantManager.compareCluster(${idx})">
                                    <i class="bi bi-layout-split me-1"></i> Bandingkan Kesemua Data
                                </button>
                            </div>
                            <div class="table-responsive">
                                <table class="table table-hover table-sm mb-0 align-middle">
                                    <thead class="table-light">
                                        <tr>
                                            <th>ID</th>
                                            <th>Pegawai</th>
                                            <th>Tarikh</th>
                                            <th>Koordinat</th>
                                            <th>Kategori/Tanaman</th>
                                            <th class="text-center">Tindakan</th>
                                        </tr>
                                    </thead>
                                    <tbody>
            `;

            cluster.forEach(rec => {
                const pegawai = (rec.pg && String(rec.pg).length > 2) ? rec.pg : 'Tiada Nama';
                
                html += `
                    <tr>
                        <td><small class="text-muted">${rec.id}</small></td>
                        <td>${pegawai}</td>
                        <td>${Utils.formatDateDisplay(rec.t)}</td>
                        <td><small><a href="https://www.google.com/maps/search/?api=1&query=${rec.c}" target="_blank" class="text-decoration-none"><i class="bi bi-geo-alt-fill text-danger me-1"></i>${rec.c}</a></small></td>
                        <td>
                            <div>${rec.kt || '-'}</div>
                            <small class="text-primary">${rec.tn || '-'}</small>
                        </td>
                        <td class="text-center">
                            <div class="btn-group">
                                <button class="btn btn-sm btn-outline-info" onclick="RedundantManager.viewRecordDetail('${rec.id}')" title="Lihat Terperinci"><i class="bi bi-eye"></i></button>
                                <button class="btn btn-sm btn-outline-primary" onclick="RedundantManager.editRecord('${rec.id}')" title="Kemas Kini"><i class="bi bi-pencil-square"></i></button>
                                <button class="btn btn-sm btn-outline-warning" onclick="RedundantManager.ignoreRecord('${rec.id}')" title="Abaikan"><i class="bi bi-eye-slash"></i></button>
                                <button class="btn btn-sm btn-outline-danger" onclick="RedundantManager.deleteRecord('${rec.id}')" title="Padam"><i class="bi bi-trash"></i></button>
                            </div>
                        </td>
                    </tr>
                `;
            });

            html += `
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });

        html += `</div>`;
        container.innerHTML = html;
        
        // Update Badge
        const badge = document.getElementById('badgeRedundant');
        if (badge) {
            const totalRedundant = this.clusters.reduce((acc, c) => acc + c.length, 0);
            badge.innerText = totalRedundant;
            badge.style.display = totalRedundant > 0 ? 'inline-block' : 'none';
        }
    },

    compareCluster: function(clusterIdx) {
        const cluster = this.clusters[clusterIdx];
        if (!cluster || cluster.length === 0) return;

        let html = '';
        cluster.forEach((d, i) => {
            let pestRows = "";
            if (d.p && Object.keys(d.p).length > 0) { 
                for (let k in d.p) { pestRows += `<tr><td class="text-uppercase text-danger fw-bold">${k}</td><td class="text-center">${d.p[k]}</td></tr>`; }
            } else { 
                pestRows = `<tr><td colspan="2" class="text-center text-muted small">Tiada Rekod Perosak</td></tr>`; 
            }
            
            const pegawai = (d.pg && String(d.pg).length > 2) ? d.pg : 'Tiada Nama';

            html += `
            <div class="card shadow-sm border-0" style="min-width: 320px; max-width: 320px; flex-shrink: 0;">
                <div class="card-header bg-primary text-white py-2 d-flex justify-content-between align-items-center">
                    <span class="badge bg-light text-primary me-2 border">#${i+1}</span>
                    <strong class="text-truncate" style="max-width: 150px;" title="${pegawai}">${pegawai}</strong>
                </div>
                <div class="card-body p-3" style="font-size: 0.85rem;">
                    <div class="mb-2"><small class="text-muted d-block">ID Rekod:</small><strong>${d.id}</strong></div>
                    <div class="mb-2"><small class="text-muted d-block">Tarikh Bancian:</small><strong class="text-primary">${Utils.formatDateDisplay(d.t)}</strong></div>
                    <div class="mb-2"><small class="text-muted d-block">Lokasi:</small><strong>${d.l}, ${d.n}</strong></div>
                    <div class="mb-2"><small class="text-muted d-block">Koordinat:</small><strong class="font-monospace text-danger">${d.c}</strong></div>
                    <div class="mb-2"><small class="text-muted d-block">Kategori & Tanaman:</small><strong>${d.kt} - ${d.tn}</strong></div>
                    <div class="mb-2"><small class="text-muted d-block">Umur Tanaman:</small><strong>${d.um || "-"}</strong></div>
                    <div class="mb-3"><small class="text-muted d-block">Luas Tanaman:</small><strong>${(parseFloat(d.lt) || 0).toFixed(2)} HA</strong></div>
                    
                    <h6 class="fw-bold text-success mb-2 border-bottom pb-1" style="font-size:0.85rem;">DATA SERANGAN</h6>
                    <table class="table table-sm table-bordered mb-3">
                        <thead class="table-light"><tr><th>Perosak</th><th class="text-center">Luas (HA)</th></tr></thead>
                        <tbody>${pestRows}</tbody>
                    </table>

                    <div class="alert alert-light border p-2 mb-0" style="max-height: 100px; overflow-y: auto;">
                        <small class="fw-bold d-block text-secondary mb-1">Catatan/Syor:</small>
                        ${d.s || "-"}
                    </div>
                </div>
                <div class="card-footer bg-white p-2 d-flex justify-content-between gap-1">
                    <button class="btn btn-outline-warning btn-sm w-50" onclick="RedundantManager.ignoreRecord('${d.id}')" title="Abaikan dari Redundant"><i class="bi bi-eye-slash"></i> Abaikan</button>
                    <button class="btn btn-outline-danger btn-sm w-50" onclick="RedundantManager.deleteRecord('${d.id}')" title="Padam Kekal"><i class="bi bi-trash"></i> Padam</button>
                </div>
            </div>
            `;
        });

        document.getElementById('compareClusterBody').innerHTML = html;
        document.getElementById('compareClusterModalLabel').innerHTML = `<i class="bi bi-layout-split me-2"></i>Bandingkan Data (${cluster.length} Rekod)`;
        new bootstrap.Modal(document.getElementById('compareClusterModal')).show();
    },

    viewRecordDetail: function(id) {
        if (typeof DataManager !== 'undefined' && typeof DataManager.viewRec === 'function') {
            const idx = AppState.mData.findIndex(r => String(r.id) === String(id));
            if (idx > -1) {
                DataManager.viewRec(idx);
            } else {
                Swal.fire('Ralat', 'Rekod tidak dijumpai dalam senarai utama.', 'error');
            }
        } else {
            Swal.fire('Ralat', 'Modul paparan terperinci tidak dijumpai.', 'error');
        }
    },

    editRecord: function(id) {
        if (typeof DataManager !== 'undefined' && typeof DataManager.enableEditMode === 'function') {
            // Kita pass event secara dummy kerana enableEditMode mencari event.target
            // tetapi untuk memastikannya selamat, lebih baik ubah suai sedikit enableEditMode
            // atau pastikan kita tidak crash.
            DataManager.enableEditMode(id);
        } else {
            Swal.fire('Ralat', 'Fungsi kemaskini tidak dijumpai.', 'error');
        }
    },

    ignoreRecord: async function(id) {
        const confirm = await Swal.fire({
            title: 'Abaikan Rekod?',
            text: "Rekod ini akan dikeluarkan dari senarai redundant dan tidak akan ditandakan lagi.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#f59e0b',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Ya, Abaikan'
        });

        if (confirm.isConfirmed) {
            Swal.showLoading();
            try {
                const res = await API.postData('ignoreRedundant', { row: id, name: AppState.uProf.name });
                if (res && res.success) {
                    Swal.fire('Berjaya!', 'Rekod telah diabaikan.', 'success');
                    this.load(); // Refresh senarai
                } else {
                    Swal.fire('Ralat', res.message || 'Gagal mengabaikan rekod.', 'error');
                }
            } catch (err) {
                Swal.fire('Ralat', 'Isu Rangkaian: ' + err.message, 'error');
            }
        }
    },

    deleteRecord: async function(id) {
        const confirm = await Swal.fire({
            title: 'Padam Rekod Kekal?',
            text: "Adakah anda pasti mahu memadam rekod ini secara kekal?",
            icon: 'error',
            showCancelButton: true,
            confirmButtonColor: '#dc3545',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Ya, Padam!'
        });

        if (confirm.isConfirmed) {
            Swal.showLoading();
            try {
                const res = await API.postData('deleteEntry', { row: id, u: AppState.uProf.name });
                if (res && res.success) {
                    Swal.fire('Berjaya!', 'Rekod telah dipadam.', 'success');
                    // Buang rekod dari AppState.mData supaya tidak perlu panggil DB lagi
                    AppState.mData = AppState.mData.filter(r => String(r.id) !== String(id));
                    this.load();
                } else {
                    Swal.fire('Ralat', res.message || 'Gagal memadam rekod.', 'error');
                }
            } catch (err) {
                Swal.fire('Ralat', 'Isu Rangkaian: ' + err.message, 'error');
            }
        }
    },

    exportExcel: function() {
        if (this.clusters.length === 0) {
            Swal.fire('Info', 'Tiada data untuk dieksport.', 'info');
            return;
        }

        if (typeof ExcelJS === 'undefined') {
            Swal.fire('Ralat', 'Modul ExcelJS tidak dijumpai. Sila muat semula halaman.', 'error');
            return;
        }

        const wb = new ExcelJS.Workbook();
        const ws = wb.addWorksheet('Data Redundant');

        ws.columns = [
            { header: 'KLUSTER ID', key: 'cluster', width: 12 },
            { header: 'RECORD ID', key: 'id', width: 25 },
            { header: 'PEGAWAI', key: 'pegawai', width: 30 },
            { header: 'TARIKH BANCIAN', key: 'tarikh', width: 15 },
            { header: 'NEGERI', key: 'negeri', width: 20 },
            { header: 'DAERAH', key: 'daerah', width: 20 },
            { header: 'LOKASI', key: 'lokasi', width: 30 },
            { header: 'KOORDINAT', key: 'coord', width: 30 },
            { header: 'KATEGORI', key: 'kategori', width: 20 },
            { header: 'TANAMAN', key: 'tanaman', width: 20 }
        ];

        ws.getRow(1).font = { bold: true };
        ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD3D3D3' } };

        this.clusters.forEach((cluster, idx) => {
            const clusterName = "KLUSTER-" + (idx + 1);
            cluster.forEach(rec => {
                const pegawai = (rec.pg && String(rec.pg).length > 2) ? rec.pg : '-';
                ws.addRow({
                    cluster: clusterName,
                    id: rec.id,
                    pegawai: pegawai,
                    tarikh: rec.t ? Utils.formatDateDisplay(rec.t) : '-',
                    negeri: rec.n || '-',
                    daerah: rec.d || '-',
                    lokasi: rec.l || '-',
                    coord: rec.c || '-',
                    kategori: rec.kt || '-',
                    tanaman: rec.tn || '-'
                });
            });
        });

        wb.xlsx.writeBuffer().then(buffer => {
            const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `Log_Redundant_${new Date().toISOString().split('T')[0]}.xlsx`;
            link.click();
        });
    },

    // --- HELPER FUNCTIONS ---
    haversineDistance: function(lat1, lon1, lat2, lon2) {
        const toRad = x => (x * Math.PI) / 180;
        const R = 6371000; // Radius bumi dalam meter
        const dLat = toRad(lat2 - lat1);
        const dLon = toRad(lon2 - lon1);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
                  Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return Math.round(R * c); // pulangkan dalam meter
    },

    getDaysDifference: function(dateStr1, dateStr2) {
        if (!dateStr1 || !dateStr2) return 999;
        const d1 = new Date(dateStr1);
        const d2 = new Date(dateStr2);
        if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return 999;
        
        const diffTime = Math.abs(d2 - d1);
        return Math.floor(diffTime / (1000 * 60 * 60 * 24)); 
    }
};

// Inisialisasi semasa dokumen sedia
document.addEventListener('DOMContentLoaded', () => {
    RedundantManager.init();
});

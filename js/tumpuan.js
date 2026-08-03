const TumpuanManager = {
    rawData: [],
    filteredData: [],
    headers: [],
    
    // Konfigurasi pemetaan kolum untuk PNR Digital
    colMap: {
        tahun: ['TAHUN', 'YEAR'],
        bulan: ['BULAN', 'MONTH'],
        negeri: ['NEGERI', 'STATE'],
        daerah: ['DAERAH', 'DISTRICT'],
        lokasi: ['LOKASI', 'KEBUN'],
        kategori: ['KATEGORI', 'CATEGORY'],
        tanaman: ['NAMA TANAMAN', 'TANAMAN', 'CROP'],
        perosak: ['PEROSAK', 'PEST', 'SENARAI PEROSAK', 'DATA SERANGAN'],
        luasBancian: ['LUAS BANCIAN', 'LUAS BERTANAM', 'AREA', 'HEKTAR', 'KELUASAN'],
        luasSerangan: ['LUAS SERANGAN', 'DATA SERANGAN'],
        peratus: ['PERATUS']
    },

    charts: {
        negeri: null,
        pie: null,
        trend: null
    },

    drilldownState: {
        pieTanaman: null,
        trendYear: null
    },

    getColKey: function(type) {
        if (!this.headers || this.headers.length === 0) return null;
        const aliases = this.colMap[type];
        
        // Logik khas untuk tanaman vs kategori tanaman bagi elak clash
        if (type === 'tanaman') {
            const idx = this.headers.findIndex(h => {
                let up = String(h).toUpperCase();
                return up.includes('NAMA TANAMAN') || (up.includes('TANAMAN') && !up.includes('KATEGORI'));
            });
            return idx > -1 ? this.headers[idx] : null;
        }

        const match = this.headers.find(h => aliases.some(a => String(h).toUpperCase().includes(a)));
        return match || null;
    },

    loadData: async function() {
        document.getElementById('tumpuan-tbody').innerHTML = `<tr><td colspan="15" class="text-center py-4 text-muted"><div class="spinner-border spinner-border-sm me-2"></div>Memuatkan data dari pangkalan...</td></tr>`;
        
        try {
            const res = await API.postData('getTanamanTumpuan', {});
            
            if (res && res.success && res.data && res.data.length > 0) {
                this.rawData = res.data;
                this.headers = res.headers || Object.keys(res.data[0]);
                this.filteredData = [...this.rawData];
                
                this.renderHeaders();
                this.populateFilterDropdowns();
                // Set Default Tahun kepada 2025 sebelum render untuk elak lagging jika row > 7000
                const tahunDropdown = document.getElementById('filter-tumpuan-tahun');
                if (tahunDropdown) {
                    // Semak jika pilihan 2025 wujud
                    const has2025 = Array.from(tahunDropdown.options).some(opt => opt.value === '2025');
                    if (has2025) {
                        tahunDropdown.value = '2025';
                        this.applyFilters(); // Terus saring data berdasarkan 2025
                    } else {
                        this.renderDashboard();
                    }
                } else {
                    this.renderDashboard();
                }
            } else {
                let msg = (res && res.message) ? res.message : "Tiada data dijumpai.";
                document.getElementById('tumpuan-tbody').innerHTML = `<tr><td colspan="15" class="text-center py-4 text-danger"><i class="bi bi-exclamation-circle me-1"></i>${msg}</td></tr>`;
            }
        } catch (e) {
            console.error("Ralat memuatkan data tanaman tumpuan:", e);
            document.getElementById('tumpuan-tbody').innerHTML = `<tr><td colspan="15" class="text-center py-4 text-danger"><i class="bi bi-exclamation-circle me-1"></i>Gagal memuatkan data: ${e.message}</td></tr>`;
        }
    },

    renderHeaders: function() {
        const thead = document.getElementById('tumpuan-thead');
        let html = '';
        this.headers.forEach(h => {
            html += `<th class="p-2">${h}</th>`;
        });
        thead.innerHTML = html;
    },

    populateFilterDropdowns: function() {
        const keyTahun = this.getColKey('tahun');
        const keyBulan = this.getColKey('bulan');
        const keyNegeri = this.getColKey('negeri');
        const keyKategori = this.getColKey('kategori');
        const keyTanaman = this.getColKey('tanaman');
        const keyPerosak = this.getColKey('perosak');

        const tahunSet = new Set();
        const bulanSet = new Set();
        const negeriSet = new Set();
        const kategoriSet = new Set();
        const tanamanSet = new Set();
        const perosakSet = new Set();

        this.rawData.forEach(row => {
            if (keyTahun && row[keyTahun]) tahunSet.add(row[keyTahun]);
            if (keyBulan && row[keyBulan]) bulanSet.add(row[keyBulan]);
            if (keyNegeri && row[keyNegeri]) negeriSet.add(row[keyNegeri]);
            if (keyKategori && row[keyKategori]) kategoriSet.add(row[keyKategori]);
            if (keyTanaman && row[keyTanaman]) tanamanSet.add(row[keyTanaman]);
            
            // Perosak boleh jadi JSON string (dari PWA form) atau plain text
            if (keyPerosak && row[keyPerosak]) {
                let p = row[keyPerosak];
                if (typeof p === 'string' && (p.startsWith('{') || p.startsWith('['))) {
                    try {
                        let parsed = JSON.parse(p);
                        if (Array.isArray(parsed)) {
                            // Cth: [{"perosak":"REPUT BUAH","luas_serangan":0.1}]
                            parsed.forEach(item => {
                                if (item.perosak) perosakSet.add(item.perosak);
                            });
                        } else {
                            Object.keys(parsed).forEach(k => perosakSet.add(k));
                        }
                    } catch(e){}
                } else {
                    perosakSet.add(p);
                }
            }
        });

        const fillDropdown = (id, set) => {
            const select = document.getElementById(id);
            if(!select) return;
            const currentVal = select.value;
            let options = `<option value="">Semua</option>`;
            Array.from(set).sort().forEach(val => {
                options += `<option value="${val}">${val}</option>`;
            });
            select.innerHTML = options;
            if (Array.from(set).includes(currentVal)) select.value = currentVal;
        };

        fillDropdown('filter-tumpuan-tahun', tahunSet);
        fillDropdown('filter-tumpuan-bulan', bulanSet);
        fillDropdown('filter-tumpuan-negeri', negeriSet);
        fillDropdown('filter-tumpuan-kategori', kategoriSet);
        fillDropdown('filter-tumpuan-tanaman', tanamanSet);
        fillDropdown('filter-tumpuan-perosak', perosakSet);
    },

    applyFilters: function() {
        const vTahun = document.getElementById('filter-tumpuan-tahun').value;
        const vBulan = document.getElementById('filter-tumpuan-bulan').value;
        const vNegeri = document.getElementById('filter-tumpuan-negeri').value;
        const vKategori = document.getElementById('filter-tumpuan-kategori').value;
        const vTanaman = document.getElementById('filter-tumpuan-tanaman').value;
        const vPerosak = document.getElementById('filter-tumpuan-perosak').value;

        const keyTahun = this.getColKey('tahun');
        const keyBulan = this.getColKey('bulan');
        const keyNegeri = this.getColKey('negeri');
        const keyKategori = this.getColKey('kategori');
        const keyTanaman = this.getColKey('tanaman');
        const keyPerosak = this.getColKey('perosak');

        this.filteredData = this.rawData.filter(row => {
            if (vTahun && keyTahun && String(row[keyTahun]) !== String(vTahun)) return false;
            if (vBulan && keyBulan && String(row[keyBulan]) !== String(vBulan)) return false;
            if (vNegeri && keyNegeri && String(row[keyNegeri]) !== String(vNegeri)) return false;
            if (vKategori && keyKategori && String(row[keyKategori]) !== String(vKategori)) return false;
            if (vTanaman && keyTanaman && String(row[keyTanaman]) !== String(vTanaman)) return false;
            
            if (vPerosak && keyPerosak) {
                let p = row[keyPerosak];
                if (typeof p === 'string' && (p.startsWith('{') || p.startsWith('['))) {
                    // Cari dalam JSON jika wujud
                    if(!p.includes(vPerosak)) return false;
                } else if (String(p) !== String(vPerosak)) {
                    return false;
                }
            }
            return true;
        });
        
        // Reset drilldowns apabila saringan global berubah
        this.drilldownState.pieTanaman = null;
        this.drilldownState.trendYear = null;
        document.getElementById('btnPieBack').classList.add('d-none');
        document.getElementById('btnTrendBack').classList.add('d-none');
        document.getElementById('pieTitle').innerText = "Luas Bancian Mengikut Tanaman";
        document.getElementById('trendTitle').innerText = "Trend Luas Bancian (Tahun)";

        this.renderDashboard();
    },

    renderDashboard: function() {
        this.renderKPIs();
        this.renderTable();
        this.renderChartNegeri();
        this.renderChartPie();
        this.renderChartTrend();
    },

    renderKPIs: function() {
        const kpiContainer = document.getElementById('tumpuan-kpi');
        const keyLuasB = this.getColKey('luasBancian');
        const keyLuasS = this.getColKey('luasSerangan');
        const keyLokasi = this.getColKey('lokasi');

        let sumLuasB = 0;
        let sumLuasS = 0;
        const lokasiSet = new Set();

        this.filteredData.forEach(row => {
            if (keyLuasB) sumLuasB += parseFloat(row[keyLuasB]) || 0;
            
            // Luas serangan boleh jadi JSON (PWA) atau number
            if (keyLuasS) {
                let s = row[keyLuasS];
                if (typeof s === 'string' && (s.startsWith('{') || s.startsWith('['))) {
                    try {
                        let parsed = JSON.parse(s);
                        if (Array.isArray(parsed)) {
                            parsed.forEach(item => { sumLuasS += parseFloat(item.luas_serangan) || 0; });
                        } else {
                            Object.values(parsed).forEach(v => { sumLuasS += parseFloat(v) || 0; });
                        }
                    } catch(e){}
                } else {
                    sumLuasS += parseFloat(s) || 0;
                }
            }
            if (keyLokasi && row[keyLokasi]) lokasiSet.add(row[keyLokasi]);
        });

        let pct = sumLuasB > 0 ? (sumLuasS / sumLuasB) * 100 : 0;

        const kpiCards = [
            { title: "Jumlah Luas Bancian (Ha)", value: sumLuasB.toLocaleString('en-MY', { maximumFractionDigits: 2 }), icon: "bi-arrows-fullscreen", color: "primary" },
            { title: "Jumlah Luas Serangan (Ha)", value: sumLuasS.toLocaleString('en-MY', { maximumFractionDigits: 2 }), icon: "bi-bug-fill", color: "danger" },
            { title: "Bilangan Lokasi / Kebun", value: lokasiSet.size.toLocaleString('en-MY'), icon: "bi-geo-alt-fill", color: "success" },
            { title: "Purata Peratus Serangan", value: pct.toFixed(2) + "%", icon: "bi-percent", color: "warning" }
        ];

        let html = '';
        kpiCards.forEach(kpi => {
            html += `
            <div class="col-6 col-md-3">
                <div class="card border-0 shadow-sm rounded-3 h-100 bg-white">
                    <div class="card-body p-3 d-flex align-items-center">
                        <div class="bg-${kpi.color} bg-opacity-10 text-${kpi.color} rounded-circle p-2 me-3 d-flex align-items-center justify-content-center" style="width:40px; height:40px;">
                            <i class="bi ${kpi.icon} fs-5"></i>
                        </div>
                        <div>
                            <p class="text-muted small mb-0 fw-bold" style="font-size:0.75rem;">${kpi.title}</p>
                            <h5 class="fw-bold mb-0 text-dark">${kpi.value}</h5>
                        </div>
                    </div>
                </div>
            </div>`;
        });
        kpiContainer.innerHTML = html;
    },

    renderTable: function() {
        const tbody = document.getElementById('tumpuan-tbody');
        const q = (document.getElementById('search-tumpuan-table')?.value || "").toLowerCase();
        
        let filtered = this.filteredData;
        if(q) {
            filtered = filtered.filter(row => {
                return this.headers.some(h => String(row[h] || "").toLowerCase().includes(q));
            });
        }

        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="${this.headers.length}" class="text-center py-4 text-muted">Tiada rekod dijumpai.</td></tr>`;
            return;
        }

        let html = '';
        filtered.forEach(row => {
            html += `<tr>`;
            this.headers.forEach(h => {
                let val = row[h];
                if(val === undefined || val === null) val = "-";
                // Formatting for numbers
                if(typeof val === 'number') {
                    val = val.toLocaleString('en-MY', { maximumFractionDigits: 2 });
                }
                html += `<td class="p-2">${val}</td>`;
            });
            html += `</tr>`;
        });
        tbody.innerHTML = html;
    },

    renderChartNegeri: function() {
        const ctx = document.getElementById('chart-tumpuan-negeri').getContext('2d');
        if(this.charts.negeri) this.charts.negeri.destroy();
        
        const keyNegeri = this.getColKey('negeri');
        const keyLuasB = this.getColKey('luasBancian');
        const keyLuasS = this.getColKey('luasSerangan');
        if(!keyNegeri || !keyLuasB || !keyLuasS) return;

        let dataMap = {};
        this.filteredData.forEach(r => {
            let n = r[keyNegeri] || "Lain-lain";
            if(!dataMap[n]) dataMap[n] = { b: 0, s: 0 };
            dataMap[n].b += parseFloat(r[keyLuasB]) || 0;
            
            let s = r[keyLuasS];
            if (typeof s === 'string' && (s.startsWith('{') || s.startsWith('['))) {
                try { 
                    let parsed = JSON.parse(s);
                    if (Array.isArray(parsed)) {
                        parsed.forEach(item => { dataMap[n].s += parseFloat(item.luas_serangan) || 0; });
                    } else {
                        Object.values(parsed).forEach(v => { dataMap[n].s += parseFloat(v) || 0; }); 
                    }
                } catch(e){}
            } else {
                dataMap[n].s += parseFloat(s) || 0;
            }
        });

        const labels = Object.keys(dataMap).sort();
        const dataB = labels.map(l => dataMap[l].b);
        const dataS = labels.map(l => dataMap[l].s);

        this.charts.negeri = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    { label: 'Luas Bancian (Ha)', data: dataB, backgroundColor: '#0ea5e9', borderRadius: 4 },
                    { label: 'Luas Serangan (Ha)', data: dataS, backgroundColor: '#ef4444', borderRadius: 4 }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'top', labels: { usePointStyle: true } } },
                scales: {
                    x: { grid: { display: false } },
                    y: { beginAtZero: true }
                }
            }
        });
    },

    renderChartPie: function() {
        const ctx = document.getElementById('chart-tumpuan-pie').getContext('2d');
        if(this.charts.pie) this.charts.pie.destroy();
        
        const keyTanaman = this.getColKey('tanaman');
        const keyPerosak = this.getColKey('perosak');
        const keyLuasS = this.getColKey('luasSerangan');
        const keyLuasB = this.getColKey('luasBancian');
        if(!keyTanaman || !keyLuasB) return;

        let labels = [];
        let data = [];
        const isDrill = this.drilldownState.pieTanaman !== null;
        const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

        if (!isDrill) {
            // Level 1: Tanaman
            let dataMap = {};
            this.filteredData.forEach(r => {
                let t = r[keyTanaman] || "Lain-lain";
                if(!dataMap[t]) dataMap[t] = 0;
                dataMap[t] += parseFloat(r[keyLuasB]) || 0;
            });
            labels = Object.keys(dataMap);
            data = labels.map(l => dataMap[l]);
        } else {
            // Level 2: Perosak bagi Tanaman dipilih
            let dataMap = {};
            let t = this.drilldownState.pieTanaman;
            this.filteredData.filter(r => r[keyTanaman] === t).forEach(r => {
                let s = r[keyLuasS];
                let p = r[keyPerosak];
                
                if (typeof s === 'string' && (s.startsWith('{') || s.startsWith('['))) {
                    try {
                        let parsed = JSON.parse(s);
                        if (Array.isArray(parsed)) {
                            parsed.forEach(item => {
                                let k = item.perosak || "Lain-lain";
                                if(!dataMap[k]) dataMap[k] = 0;
                                dataMap[k] += parseFloat(item.luas_serangan) || 0;
                            });
                        } else {
                            Object.keys(parsed).forEach(k => {
                                if(!dataMap[k]) dataMap[k] = 0;
                                dataMap[k] += parseFloat(parsed[k]) || 0;
                            });
                        }
                    } catch(e){}
                } else {
                    let pName = p || "Tiada Perosak";
                    if(!dataMap[pName]) dataMap[pName] = 0;
                    dataMap[pName] += parseFloat(s) || 0;
                }
            });
            labels = Object.keys(dataMap);
            data = labels.map(l => dataMap[l]);
        }

        this.charts.pie = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors,
                    borderWidth: 2,
                    borderColor: '#ffffff',
                    hoverOffset: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '60%',
                plugins: {
                    legend: { position: 'right', labels: { usePointStyle: true, boxWidth: 8 } },
                    tooltip: {
                        callbacks: {
                            label: function(ctx) {
                                let label = ctx.label || '';
                                let val = ctx.raw || 0;
                                return label + ': ' + val.toLocaleString('en-MY', {maximumFractionDigits:2}) + ' Ha';
                            }
                        }
                    }
                },
                onClick: (e, activeEls) => {
                    if (activeEls.length > 0 && !isDrill) {
                        const idx = activeEls[0].index;
                        const crop = labels[idx];
                        this.drillPie(crop);
                    }
                }
            }
        });
    },

    drillPie: function(tanaman) {
        this.drilldownState.pieTanaman = tanaman;
        document.getElementById('pieTitle').innerText = "Serangan (Ha): " + tanaman;
        document.getElementById('btnPieBack').classList.remove('d-none');
        this.renderChartPie();
    },

    resetPieDrilldown: function() {
        this.drilldownState.pieTanaman = null;
        document.getElementById('pieTitle').innerText = "Luas Bancian Mengikut Tanaman";
        document.getElementById('btnPieBack').classList.add('d-none');
        this.renderChartPie();
    },

    renderChartTrend: function() {
        const ctx = document.getElementById('chart-tumpuan-trend').getContext('2d');
        if(this.charts.trend) this.charts.trend.destroy();
        
        const keyTahun = this.getColKey('tahun');
        const keyBulan = this.getColKey('bulan');
        const keyLuasB = this.getColKey('luasBancian');
        if(!keyTahun || !keyLuasB) return;

        let labels = [];
        let data = [];
        const isDrill = this.drilldownState.trendYear !== null;

        if (!isDrill) {
            // Level 1: By Tahun
            let dataMap = {};
            this.filteredData.forEach(r => {
                let y = String(r[keyTahun] || "N/A").trim();
                if(!dataMap[y]) dataMap[y] = 0;
                dataMap[y] += parseFloat(r[keyLuasB]) || 0;
            });
            labels = Object.keys(dataMap).sort();
            data = labels.map(l => dataMap[l]);
        } else {
            // Level 2: By Bulan untuk Tahun
            let y = this.drilldownState.trendYear;
            let dataMap = { "1":0, "2":0, "3":0, "4":0, "5":0, "6":0, "7":0, "8":0, "9":0, "10":0, "11":0, "12":0 };
            const mNames = ["Jan", "Feb", "Mac", "Apr", "Mei", "Jun", "Jul", "Ogo", "Sep", "Okt", "Nov", "Dis"];
            
            this.filteredData.filter(r => String(r[keyTahun]).trim() === String(y)).forEach(r => {
                let m = String(r[keyBulan] || "1").trim();
                if(dataMap[m] !== undefined) {
                    dataMap[m] += parseFloat(r[keyLuasB]) || 0;
                }
            });
            labels = mNames;
            data = Object.keys(dataMap).map(k => dataMap[k]);
        }

        const gradient = ctx.createLinearGradient(0, 0, 0, 300);
        gradient.addColorStop(0, 'rgba(14, 165, 233, 0.4)');
        gradient.addColorStop(1, 'rgba(14, 165, 233, 0.0)');

        this.charts.trend = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Luas Bancian (Ha)',
                    data: data,
                    borderColor: '#0ea5e9',
                    backgroundColor: gradient,
                    borderWidth: 2,
                    pointBackgroundColor: '#fff',
                    pointBorderColor: '#0ea5e9',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    fill: true,
                    tension: 0.3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { display: false } },
                    y: { beginAtZero: true }
                },
                onClick: (e, activeEls) => {
                    if (activeEls.length > 0 && !isDrill) {
                        const idx = activeEls[0].index;
                        const year = labels[idx];
                        this.drillTrend(year);
                    }
                }
            }
        });
    },

    drillTrend: function(year) {
        this.drilldownState.trendYear = year;
        document.getElementById('trendTitle').innerText = "Trend Luas Bancian (Bulan) - " + year;
        document.getElementById('btnTrendBack').classList.remove('d-none');
        this.renderChartTrend();
    },

    resetTrendDrilldown: function() {
        this.drilldownState.trendYear = null;
        document.getElementById('trendTitle').innerText = "Trend Luas Bancian (Tahun)";
        document.getElementById('btnTrendBack').classList.add('d-none');
        this.renderChartTrend();
    }
};

// Hook initialization
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.nav-item').forEach(el => {
        el.addEventListener('click', function() {
            if (this.getAttribute('data-view') === 'tumpuan') {
                if (TumpuanManager.rawData.length === 0) {
                    TumpuanManager.loadData();
                }
            }
        });
    });
});

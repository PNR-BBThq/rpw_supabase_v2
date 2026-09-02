// ==========================================
// FAIL: js/charts.js
// FUNGSI: Menguruskan Carta Bar Interaktif & Carta Pie Keterukan
// ==========================================

const ChartManager = {
    myPestChart: null,
    pieChart: null,
    chartLevel: 1,
    pilihanPerosak: "",
    pilihanTanaman: "",

    updateCharts: function(pm, km) { 
        if (typeof Chart === 'undefined') return;
        
        // CARTA PIE KETERUKAN
        if(this.pieChart) this.pieChart.destroy(); 
        
        // Label Keterukan Moden
        const legendContainer = document.getElementById('legendContainer');
        if(legendContainer) {
            legendContainer.innerHTML = `
                <p class="text-uppercase text-muted fw-bold mb-2" style="font-size: 11px; letter-spacing: 1px;">Petunjuk Tahap Keterukan</p>
                <div class="d-flex flex-wrap justify-content-center gap-2" style="font-size: 11px;">
                    <span class="badge rounded-pill text-white shadow-sm px-2 py-1" style="background-color: #22c55e;">T1: Sgt Rendah</span>
                    <span class="badge rounded-pill text-white shadow-sm px-2 py-1" style="background-color: #84cc16;">T2: Rendah</span>
                    <span class="badge rounded-pill text-dark shadow-sm px-2 py-1" style="background-color: #eab308;">T3: Sederhana</span>
                    <span class="badge rounded-pill text-white shadow-sm px-2 py-1" style="background-color: #f97316;">T4: Teruk</span>
                    <span class="badge rounded-pill text-white shadow-sm px-2 py-1" style="background-color: #ef4444;">T5: Sgt Teruk</span>
                </div>
            `;
        }

        this.pieChart = new Chart(document.getElementById('cPie'), { 
            type: 'doughnut', 
            data: { 
                labels: ['T1 (Sgt Rendah)','T2 (Rendah)','T3 (Sederhana)','T4 (Teruk)','T5 (Sgt Teruk)'], 
                datasets: [{ 
                    data: Object.values(km), 
                    backgroundColor: ['#22c55e','#84cc16','#eab308','#f97316','#ef4444'], 
                    borderWidth: 2,
                    borderColor: '#ffffff',
                    hoverOffset: 6
                }] 
            }, 
            options: { 
                maintainAspectRatio: false, 
                cutout: '70%',
                plugins:{
                    legend:{ display: false },
                    tooltip: {
                        backgroundColor: '#1e293b',
                        padding: 10,
                        bodyFont: { family: "'Segoe UI', sans-serif", size: 13, weight: 'bold' }
                    }
                } 
            } 
        }); 
        
        // Panggil Carta Bar interaktif yang baru
        this.lukisCartaPerosak(1);
        
        // Event Listener untuk Butang Kembali pada carta
        const btnBack = document.getElementById('btnBackPest');
        if(btnBack && !btnBack.hasAttribute('data-bound')) {
            btnBack.addEventListener('click', () => this.patahBalikCarta());
            btnBack.setAttribute('data-bound', 'true');
        }
    },

    lukisCartaPerosak: function(level, namaPest = "", namaTanaman = "") {
        if (typeof Chart === 'undefined') return;
        const ctxEl = document.getElementById('cBar');
        if(!ctxEl) return;
        const ctx = ctxEl.getContext('2d'); 
        if(this.myPestChart) this.myPestChart.destroy();

        let labelX = [], dataY = [], tajuk = "", sub = "", paletteType = 1;

        if (level === 1) {
            // TAHAP 1: TOP 10 PEROSAK
            let kiraPerosak = {};
            AppState.fData.forEach(item => { 
                if(item.p) Object.entries(item.p).forEach(([nPest, luas]) => { kiraPerosak[nPest] = (kiraPerosak[nPest]||0) + parseFloat(luas); }); 
            });
            let top10 = Object.entries(kiraPerosak).sort((a,b)=>b[1]-a[1]).slice(0,10);
            labelX = top10.map(x=>x[0]); dataY = top10.map(x=>x[1]); 
            tajuk = "Top 10 Perosak Tertinggi (Ha)"; sub = "Klik pada bar untuk lihat pecahan tanaman"; 
            paletteType = 1; this.chartLevel = 1; 
            document.getElementById('btnBackPest').style.display = 'none';
        } 
        else if (level === 2) {
            // TAHAP 2: PECAHAN TANAMAN
            let kiraTanaman = {};
            AppState.fData.forEach(item => { 
                if(item.p && item.p[namaPest]) kiraTanaman[item.tn] = (kiraTanaman[item.tn]||0) + parseFloat(item.p[namaPest]); 
            });
            let susun = Object.entries(kiraTanaman).sort((a,b)=>b[1]-a[1]);
            labelX = susun.map(x=>x[0]); dataY = susun.map(x=>x[1]); 
            tajuk = `Tanaman Diserang: ${namaPest} (Ha)`; sub = "Klik pada bar untuk lihat pecahan daerah"; 
            paletteType = 2; this.chartLevel = 2; this.pilihanPerosak = namaPest; 
            document.getElementById('btnBackPest').style.display = 'inline-block';
        } 
        else if (level === 3) {
            // TAHAP 3: PECAHAN DAERAH
            let kiraDaerah = {};
            AppState.fData.forEach(item => { 
                if(item.p && item.p[namaPest] && item.tn === namaTanaman) kiraDaerah[item.d] = (kiraDaerah[item.d]||0) + parseFloat(item.p[namaPest]); 
            });
            let susun = Object.entries(kiraDaerah).sort((a,b)=>b[1]-a[1]);
            labelX = susun.map(x=>x[0]); dataY = susun.map(x=>x[1]); 
            tajuk = `Daerah Terlibat: ${namaTanaman} - ${namaPest} (Ha)`; sub = "Pecahan terperinci mengikut daerah"; 
            paletteType = 3; this.chartLevel = 3; this.pilihanTanaman = namaTanaman; 
            document.getElementById('btnBackPest').style.display = 'inline-block';
        }

        const tajukEl = document.getElementById('tajukCBar');
        const subEl = document.getElementById('subCBar');
        if(tajukEl) tajukEl.innerText = tajuk;
        if(subEl) subEl.innerHTML = `<i class="bi bi-hand-index-thumb-fill text-primary me-1"></i> ${sub}`;

        const self = this;

        // Plugin Custom Label untuk paparan nilai di hujung bar
        const customDataLabelPlugin = {
            id: 'customBarLabels',
            afterDatasetsDraw(chart) {
                const { ctx, chartArea } = chart;
                ctx.save();
                ctx.font = "bold 11px 'Segoe UI', sans-serif";
                ctx.textBaseline = 'middle';
                
                chart.data.datasets.forEach((dataset, i) => {
                    const meta = chart.getDatasetMeta(i);
                    meta.data.forEach((bar, index) => {
                        const value = dataset.data[index];
                        if (value === undefined || value === null) return;
                        const formattedVal = parseFloat(value).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}) + " Ha";
                        
                        let posX = bar.x + 10;
                        const posY = bar.y;
                        
                        const textWidth = ctx.measureText(formattedVal).width;
                        if (posX + textWidth > chartArea.right - 4) {
                            ctx.fillStyle = '#ffffff';
                            ctx.textAlign = 'right';
                            ctx.fillText(formattedVal, bar.x - 8, posY);
                        } else {
                            ctx.fillStyle = '#334155';
                            ctx.textAlign = 'left';
                            ctx.fillText(formattedVal, posX, posY);
                        }
                    });
                });
                ctx.restore();
            }
        };

        this.myPestChart = new Chart(ctx, { 
            type: 'bar', 
            data: { 
                labels: labelX, 
                datasets: [{ 
                    label: 'Luas Serangan (Ha)', 
                    data: dataY, 
                    borderRadius: 8,
                    barThickness: 22,
                    maxBarThickness: 26,
                    backgroundColor: (context) => {
                        const chart = context.chart;
                        const {ctx, chartArea} = chart;
                        if (!chartArea) return '#ef4444';
                        
                        const idx = context.dataIndex;
                        if (idx === undefined) return '#ef4444';
                        
                        // Gradient warna dinamik mengikut ranking & level carta
                        const palettes = {
                            1: [
                                ['#991b1b', '#ef4444'], ['#b91c1c', '#f87171'], ['#c2410c', '#f97316'], 
                                ['#d97706', '#fbbf24'], ['#b45309', '#f59e0b'], ['#15803d', '#4ade80'], 
                                ['#0f766e', '#2dd4bf'], ['#0369a1', '#38bdf8'], ['#4338ca', '#818cf8'], ['#475569', '#94a3b8']
                            ],
                            2: [
                                ['#c2410c', '#f97316'], ['#d97706', '#fbbf24'], ['#b45309', '#f59e0b'],
                                ['#047857', '#34d399'], ['#0284c7', '#38bdf8'], ['#475569', '#94a3b8']
                            ],
                            3: [
                                ['#1d4ed8', '#60a5fa'], ['#0369a1', '#38bdf8'], ['#0f766e', '#2dd4bf'],
                                ['#15803d', '#4ade80'], ['#d97706', '#fbbf24'], ['#475569', '#94a3b8']
                            ]
                        };
                        
                        const currentPalette = palettes[paletteType] || palettes[1];
                        const pair = currentPalette[idx % currentPalette.length];
                        
                        if (!pair) return '#ef4444';

                        const gradient = ctx.createLinearGradient(chartArea.left, 0, chartArea.right, 0);
                        gradient.addColorStop(0, pair[0]);
                        gradient.addColorStop(1, pair[1]);
                        return gradient;
                    }
                }] 
            }, 
            options: { 
                indexAxis: 'y', 
                responsive: true, 
                maintainAspectRatio: false,
                layout: { padding: { right: 70 } }, // Beri ruang kepada custom datalabels
                scales: {
                    x: {
                        grid: { display: false, drawBorder: false }, // Buang vertical gridlines
                        ticks: { font: { family: "'Segoe UI', sans-serif", size: 11 }, color: "#64748b" }
                    },
                    y: {
                        grid: { color: "rgba(0, 0, 0, 0.04)", drawBorder: false },
                        ticks: { font: { family: "'Segoe UI', sans-serif", size: 12, weight: '600' }, color: "#1e293b" }
                    }
                },
                plugins: { 
                    legend: { display: false }, 
                    title: { display: false },
                    tooltip: {
                        backgroundColor: '#1e293b',
                        padding: 12,
                        cornerRadius: 8,
                        bodyFont: { family: "'Segoe UI', sans-serif", size: 13, weight: 'bold' },
                        callbacks: {
                            label: (context) => `Luas Serangan: ${parseFloat(context.raw||0).toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2})} Ha`
                        }
                    }
                },
                onClick: (event, elements) => { 
                    if (elements.length > 0) { 
                        const index = elements[0].index; 
                        const labelDiKlik = self.myPestChart.data.labels[index]; 
                        if (self.chartLevel === 1) self.lukisCartaPerosak(2, labelDiKlik); 
                        else if (self.chartLevel === 2) self.lukisCartaPerosak(3, self.pilihanPerosak, labelDiKlik); 
                    } 
                } 
            },
            plugins: [customDataLabelPlugin]
        });
    },

    patahBalikCarta: function() { 
        if (this.chartLevel === 3) this.lukisCartaPerosak(2, this.pilihanPerosak); 
        else if (this.chartLevel === 2) this.lukisCartaPerosak(1); 
    }
};

// ==========================================
// FAIL: js/dashboard.js
// FUNGSI: Mengemaskini UI Dashboard, Pengiraan KPI & Analisis Pintar (Berserta Multi-Column Sorting)
// ==========================================

const DashboardManager = {
    // Sediakan memori penanda isihan jadual dan kawalan carousel
    currentSortCol: null,
    currentSortDir: 'asc',
    searchQuery: "",
    insightSlides: [],
    currentSlideIndex: 0,
    carouselTimer: null,

    initDash: async function() {
        const isOffline = !navigator.onLine;
        const cachedRaw = localStorage.getItem('pnr_dashboard_data');
        const cachedTime = localStorage.getItem('pnr_dashboard_time');

        if (isOffline && !cachedRaw) {
            document.getElementById('smartSummary').innerHTML = '<div class="alert alert-danger">Tiada sambungan internet & tiada data simpanan.</div>';
            return; 
        }

        if (isOffline || cachedRaw) {
            try {
                AppState.mData = JSON.parse(cachedRaw);
                DashboardManager.processDataToUI(AppState.mData);
                DashboardManager.updateLastUpdateLabel(cachedTime, isOffline ? 'OFFLINE' : 'SYNCING');
            } catch(e) { console.error(e); }
        }

        if (!isOffline) {
            try {
                const d = await API.postData('getAnalytics', {state: AppState.uProf.state});
                if (d.records) {
                    AppState.mData = d.records;
                    localStorage.setItem('pnr_dashboard_data', JSON.stringify(AppState.mData));
                    const now = new Date().toLocaleString('en-MY', { hour12: true });
                    localStorage.setItem('pnr_dashboard_time', now);
                    
                    DashboardManager.processDataToUI(AppState.mData);
                    DashboardManager.updateLastUpdateLabel(now, 'ONLINE');
                    if (typeof TaskManager !== 'undefined') {
                        TaskManager.checkTaskCount(); 
                    }
                } else {
                    // Jika API gagal (cth: masalah CORS atau sesi luput) tatkala online
                    DashboardManager.updateLastUpdateLabel(cachedTime, 'ERROR');
                }
            } catch (e) { 
                console.log("Gagal tarik data server:", e); 
                DashboardManager.updateLastUpdateLabel(cachedTime, 'ERROR');
            }
        }
    },

    processDataToUI: function(dataList) {
        const currentN = FilterManager.v('selNegeri'); 
        FilterManager.fillSel('selNegeri', dataList.map(d => d.n).filter((val, i, a) => a.indexOf(val) === i).sort(), 'n');
        
        if(AppState.uProf.state !== "ALL") { 
            const cbList = document.querySelectorAll('.chk-selNegeri');
            cbList.forEach(cb => {
                if(cb.value === AppState.uProf.state) { cb.checked = true; cb.disabled = true; }
                else { cb.checked = false; cb.disabled = true; } 
            });
            const btn = document.getElementById('btnselNegeri');
            if(btn) { btn.innerText = AppState.uProf.state; btn.classList.add('disabled', 'bg-light'); }
        } else if (currentN.length > 0) {
            document.querySelectorAll('.chk-selNegeri').forEach(cb => { if(currentN.includes(cb.value)) cb.checked = true; }); 
            FilterManager.updateBtnText('selNegeri');
        }

        MapManager.initMap();
        FilterManager.runFilter('n');
    },

    updateLastUpdateLabel: function(timeStr, status) {
        const el = document.getElementById('lastUpdate');
        if (!el) return;
        if (status === 'ONLINE' || status === true) {
            el.innerHTML = `<span class="text-success fw-bold"><i class="bi bi-cloud-check-fill"></i> Data Terkini: ${timeStr}</span>`;
        } else if (status === 'SYNCING') {
            el.innerHTML = `<span class="text-primary fw-bold"><i class="bi bi-cloud-download-fill"></i> Memuat Turun Data Server... (Cache: ${timeStr || "Tiada"})</span>`;
        } else if (status === 'ERROR') {
            el.innerHTML = `<span class="text-warning fw-bold text-dark"><i class="bi bi-exclamation-triangle-fill text-danger"></i> Gagal Sambung ke Server/CORS! (Paparan Cache: ${timeStr || "Tiada"})</span>`;
        } else {
            el.innerHTML = `<span class="text-danger fw-bold"><i class="bi bi-clock-history"></i> Data Offline (${timeStr || "Tiada Tarikh"})</span>`;
        }
    },

    calcUI: function() {
        let tt=0, ts=0, pm={}, km={1:0,2:0,3:0,4:0,5:0}, pts=[], hData={};
        
        AppState.fData.forEach(d => {
            tt += (d.lt||0); 
            ts += (d.ls||0);
            try{ 
                let p=typeof d.p==='string'?JSON.parse(d.p):d.p; 
                if(p) Object.entries(p).forEach(([k,v])=>pm[k]=(pm[k]||0)+parseFloat(v)); 
                else if(d.ls>0) pm["Umum"]=(pm["Umum"]||0)+d.ls; 
            } catch(e){ 
                if(d.ls>0) pm["Umum"]=(pm["Umum"]||0)+d.ls; 
            }
            let l = parseInt(d.k)||0; 
            if(l>0 && l<=5) km[l]++;
            
            if(d.c && d.c.includes(',')) { 
                let p = d.c.split(',').map(Number); 
                if(p.length===2 && !isNaN(p[0])) pts.push({ coord: p, data: d }); 
            }
            if(d.ls > 0 && d.d !== "-") hData[d.d] = (hData[d.d]||0) + d.ls;
        });

        const peratus = tt > 0 ? ((ts/tt)*100).toFixed(1) : "0.0";
        document.getElementById('kpiCardsContainer').innerHTML = `
            <div class="col-6 col-md-3">
                <div class="kpi-card kpi-bancian d-flex flex-column justify-content-between">
                    <div>
                        <div class="d-flex justify-content-between align-items-center mb-1">
                            <span class="kpi-title">Luas Bancian</span>
                            <div class="kpi-icon-circle bg-success-subtle text-success"><i class="bi bi-rulers"></i></div>
                        </div>
                        <div class="kpi-value">${tt.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})} <small class="fs-6 fw-normal text-muted">Ha</small></div>
                    </div>
                    <div class="d-flex align-items-center mt-3 pt-2 border-top border-light" style="font-size: 0.75rem; color: #475569; font-weight: 700;">
                        <span class="badge bg-success-subtle text-success border border-success rounded-circle me-2 p-1 d-flex align-items-center justify-content-center flex-shrink-0" style="width: 22px; height: 22px;"><i class="bi bi-globe-americas" style="font-size: 0.7rem;"></i></span>
                        <span class="text-truncate">Jumlah Luas Bancian Semasa</span>
                    </div>
                </div>
            </div>
            <div class="col-6 col-md-3">
                <div class="kpi-card kpi-serangan d-flex flex-column justify-content-between">
                    <div>
                        <div class="d-flex justify-content-between align-items-center mb-1">
                            <span class="kpi-title">Luas Serangan</span>
                            <div class="kpi-icon-circle bg-danger-subtle text-danger"><i class="bi bi-bug-fill"></i></div>
                        </div>
                        <div class="kpi-value text-danger">${ts.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})} <small class="fs-6 fw-normal text-muted">Ha</small></div>
                    </div>
                    <div class="d-flex align-items-center mt-3 pt-2 border-top border-light" style="font-size: 0.75rem; color: #475569; font-weight: 700;">
                        <span class="badge bg-danger-subtle text-danger border border-danger rounded-circle me-2 p-1 d-flex align-items-center justify-content-center flex-shrink-0" style="width: 22px; height: 22px;"><i class="bi bi-exclamation-triangle-fill" style="font-size: 0.7rem;"></i></span>
                        <span class="text-truncate">Jumlah Luas Serangan Perosak Semasa</span>
                    </div>
                </div>
            </div>
            <div class="col-6 col-md-3">
                <div class="kpi-card kpi-peratus d-flex flex-column justify-content-between">
                    <div>
                        <div class="d-flex justify-content-between align-items-center mb-1">
                            <span class="kpi-title">Peratus Serangan</span>
                            <div class="kpi-icon-circle bg-warning-subtle text-warning"><i class="bi bi-percent"></i></div>
                        </div>
                        <div class="kpi-value">${peratus}%</div>
                    </div>
                    <div class="d-flex align-items-center mt-3 pt-2 border-top border-light" style="font-size: 0.75rem; color: #475569; font-weight: 700;">
                        <span class="badge bg-warning-subtle text-warning border border-warning rounded-circle me-2 p-1 d-flex align-items-center justify-content-center flex-shrink-0" style="width: 22px; height: 22px;"><i class="bi bi-activity" style="font-size: 0.7rem;"></i></span>
                        <span class="text-truncate">Peratus Serangan Perosak Semasa</span>
                    </div>
                </div>
            </div>
            <div class="col-6 col-md-3">
                <div class="kpi-card kpi-rekod d-flex flex-column justify-content-between">
                    <div>
                        <div class="d-flex justify-content-between align-items-center mb-1">
                            <span class="kpi-title">Bil. Rekod</span>
                            <div class="kpi-icon-circle bg-primary-subtle text-primary"><i class="bi bi-file-text-fill"></i></div>
                        </div>
                        <div class="kpi-value">${AppState.fData.length.toLocaleString('en-US')}</div>
                    </div>
                    <div class="d-flex align-items-center mt-3 pt-2 border-top border-light" style="font-size: 0.75rem; color: #475569; font-weight: 700;">
                        <span class="badge bg-primary-subtle text-primary border border-primary rounded-circle me-2 p-1 d-flex align-items-center justify-content-center flex-shrink-0" style="width: 22px; height: 22px;"><i class="bi bi-pin-map-fill" style="font-size: 0.7rem;"></i></span>
                        <span class="text-truncate">Bilangan Lokasi Bancian Semasa</span>
                    </div>
                </div>
            </div>
        `;

        if (typeof ChartManager !== 'undefined') ChartManager.updateCharts(pm, km); 
        MapManager.updateMap(pts); 
        DashboardManager.updateHotspot(hData); 
        DashboardManager.genSummary(pm, tt, ts); 
        
        if (this.currentSortCol) {
            this.reExecuteSort();
        } else {
            DashboardManager.renTab();
        }
    },

    updateHotspot: function(hData) { 
        const s = Object.entries(hData).sort((a,b)=>b[1]-a[1]).slice(0,5); 
        document.getElementById('hotspotTable').innerHTML = s.length ? s.map(x=>`<tr><td class="fw-medium">${x[0]}</td><td class="text-end fw-bold text-danger">${x[1].toFixed(2)}</td></tr>`).join('') : '<tr><td colspan="2" class="text-center text-muted p-3">Tiada Data</td></tr>'; 
    },

    genSummary: function(pm, tt, ts) {
        const el = document.getElementById('smartSummary');
        if (!el) return;
        
        this.stopCarousel();

        if (ts === 0 || AppState.fData.length === 0) { 
            el.innerHTML = `
            <div class="insight-carousel-card w-100">
                <div class="insight-slide">
                    <div class="insight-badge text-success bg-success-subtle border-0"><i class="bi bi-shield-check"></i></div>
                    <div class="insight-details">
                        <span class="text-success fw-bold d-block small mb-1" style="letter-spacing:0.5px">RINGKASAN ANALISIS</span>
                        <h6 class="fw-bold mb-1 text-dark">Tiada Serangan Perosak Dilaporkan</h6>
                        <span class="text-muted small">Semua lokasi bancian berada dalam keadaan selamat dan terkawal.</span>
                    </div>
                </div>
            </div>`; 
            return; 
        }
        
        // Gunakan kaedah original Analisis Pintar bagi pengiraan peratus serangan yang tepat
        const getPct = (d) => {
            const lt = parseFloat(d.lt) || 0;
            const ls = parseFloat(d.ls) || 0;
            if (lt > 0) {
                return Math.min(100, (ls / lt) * 100);
            }
            return ls > 0 ? Math.min(100, ls) : 0;
        };

        const attackedRecords = AppState.fData.filter(d => (parseFloat(d.ls) || 0) > 0 || getPct(d) > 0);
        const topRecords = attackedRecords.sort((a, b) => getPct(b) - getPct(a)).slice(0, 5);

        if (topRecords.length === 0) {
            el.innerHTML = `<div class="p-3 text-muted small">Tiada data maklumat insiden serangan perosak.</div>`;
            return;
        }

        this.insightSlides = topRecords.map((d) => {
            const pct = getPct(d).toFixed(1);
            let pestNames = "-";
            try {
                let pObj = typeof d.p === 'string' ? JSON.parse(d.p) : d.p;
                if (pObj && Object.keys(pObj).length > 0) {
                    pestNames = Object.keys(pObj).join(', ');
                } else if (d.ls > 0) {
                    pestNames = "Serangan Umum";
                }
            } catch (e) { pestNames = d.p || "-"; }
            
            const sev = parseInt(d.k) || 1;
            let sevText = "Rendah";
            let badgeColor = "#22c55e";
            if (sev >= 4) { sevText = "Sangat Teruk"; badgeColor = "#ef4444"; }
            else if (sev === 3) { sevText = "Sederhana"; badgeColor = "#eab308"; }
            else if (sev === 2) { sevText = "Rendah"; badgeColor = "#84cc16"; }
            
            return {
                negeri: d.n || "-",
                daerah: d.d || d.l || "-",
                tanaman: d.tn || "-",
                perosak: pestNames,
                keterukan: `Tahap T${sev} (${sevText})`,
                sevColor: badgeColor,
                tarikh: Utils.formatDateDisplay(d.t),
                peratus: pct
            };
        });

        this.renderInsightSlide(0);
        this.startCarousel();
    },

    renderInsightSlide: function(idx) {
        const el = document.getElementById('smartSummary');
        if (!el || !this.insightSlides.length) return;
        this.currentSlideIndex = (idx + this.insightSlides.length) % this.insightSlides.length;
        const slide = this.insightSlides[this.currentSlideIndex];
        
        el.innerHTML = `
        <div class="insight-carousel-card w-100">
            <div class="insight-slide">
                <div class="insight-badge" style="color: ${slide.sevColor}; border-color: ${slide.sevColor}33 !important;"><i class="bi bi-geo-alt"></i></div>
                <div class="insight-details pe-md-5">
                    <div class="d-flex align-items-center gap-2 mb-1 flex-wrap">
                        <span class="badge bg-light text-dark border fw-bold" style="font-size:0.72rem"><i class="bi bi-pin-map me-1 text-primary"></i> ${slide.negeri} &bull; ${slide.daerah}</span>
                        <span class="text-danger fw-bold ms-1" style="font-size:0.82rem"><i class="bi bi-exclamation-triangle me-1"></i>${slide.peratus}% KADAR SERANGAN</span>
                        <span class="text-muted small ms-auto d-none d-md-inline-block" style="font-size:0.75rem"><i class="bi bi-calendar-event me-1"></i> ${slide.tarikh}</span>
                    </div>
                    <div class="text-dark fw-medium mt-1" style="font-size: 0.9rem;">
                        Tanaman <strong class="text-primary text-uppercase">${slide.tanaman}</strong> diserang oleh <strong class="text-danger text-uppercase">${slide.perosak}</strong> dengan keterukan <span class="fw-bold" style="color:${slide.sevColor}">${slide.keterukan}</span>.
                    </div>
                </div>
            </div>
            ${this.insightSlides.length > 1 ? `
            <div class="insight-nav">
                <span class="insight-page-indicator">${this.currentSlideIndex + 1} / ${this.insightSlides.length}</span>
                <button class="btn-insight-arrow" onclick="DashboardManager.prevInsight()" title="Sebelum"><i class="bi bi-chevron-left"></i></button>
                <button class="btn-insight-arrow" onclick="DashboardManager.nextInsight(true)" title="Seterusnya"><i class="bi bi-chevron-right"></i></button>
            </div>` : ""}
        </div>`;
    },

    nextInsight: function(manual = false) {
        if (manual) this.resetCarousel();
        this.renderInsightSlide(this.currentSlideIndex + 1);
    },

    prevInsight: function() {
        this.resetCarousel();
        this.renderInsightSlide(this.currentSlideIndex - 1);
    },

    startCarousel: function() {
        this.stopCarousel();
        if (this.insightSlides && this.insightSlides.length > 1) {
            this.carouselTimer = setInterval(() => {
                this.nextInsight(false);
            }, 5000);
        }
    },

    stopCarousel: function() {
        if (this.carouselTimer) {
            clearInterval(this.carouselTimer);
            this.carouselTimer = null;
        }
    },

    resetCarousel: function() {
        this.stopCarousel();
        this.startCarousel();
    },

    handleLiveSearch: function(val) {
        this.searchQuery = (val || "").toLowerCase().trim();
        AppState.pg = 1;
        this.renTab();
    },

    toggleExpandRow: function(detailId) {
        const el = document.getElementById(detailId);
        if (el) {
            el.style.display = el.style.display === 'none' ? 'table-row' : 'none';
        }
    },

    renTab: function() { 
        let listToRender = AppState.fData;
        if (this.searchQuery && this.searchQuery !== "") {
            const q = this.searchQuery;
            listToRender = listToRender.filter(d => {
                const str = [
                    d.t, d.n, d.d, d.l, d.tn, d.kt, d.pg, d.vb, d.s,
                    typeof d.p === 'string' ? d.p : JSON.stringify(d.p||{}),
                    d.catatan
                ].join(" ").toLowerCase();
                return str.includes(q);
            });
        }

        const st = (AppState.pg-1)*AppState.pSize; 
        const dt = listToRender.slice(st, st+AppState.pSize); 
        
        document.getElementById('tBody').innerHTML = dt.length ? dt.map((d, i) => { 
            const realIndex = AppState.fData.indexOf(d); 
            const rowId = `row_${d.id || (st+i)}`;
            const detailId = `detail_${d.id || (st+i)}`;

            // Ambil timestamp sebenar (tarikh hantar ke sistem) bertuankan data daripada kolom Timestamp pangkalan data
            const getTimestampVal = (rec) => {
                const keys = ['Timestamp', 'timestamp', 'tm', 'ts', 'th', 'tk', 'tkh', 'w', 'm', 'h', 'dt', 'time', 'waktu', 'hantar', 'date', 'created_at', 'date_created', 't_hantar', 'tarikh_kutip', 'tarikhHantar', 'tkhHantar', 'tarikh_hantar', 't_stamp', 'tstamp'];
                for (let k of keys) {
                    if (rec[k] !== undefined && rec[k] !== null && rec[k] !== "") return Utils.formatDateTimeDisplay(rec[k]);
                }
                const knownFields = ['id', 't', 'n', 'd', 'l', 'c', 'kt', 'tn', 'vr', 'um', 'lt', 'p', 'k', 'pk', 'ls', 'ps', 'pct', 's', 'pg', 'em', 'vb', 'im', 'row', 'idx', '_id', 'status', 'st'];
                for (let k in rec) {
                    if (!knownFields.includes(k) && rec[k] !== undefined && rec[k] !== null && rec[k] !== "") {
                        return Utils.formatDateTimeDisplay(rec[k]);
                    }
                }
                return "-";
            };
            const tarikhHantar = getTimestampVal(d);

            // Bina senarai point terperinci bagi setiap perosak dijumpai dan maklumat serangannya
            let pestDetailsHTML = "<span class='text-muted small'>Tiada Serangan Perosak Dikesan</span>";
            try {
                let pObj = typeof d.p === 'string' ? JSON.parse(d.p) : (d.p || {});
                let sevObj = typeof d.pk === 'string' ? JSON.parse(d.pk) : (d.pk || {});
                const lt = parseFloat(d.lt) || 0;
                
                if (pObj && Object.keys(pObj).length > 0) {
                    pestDetailsHTML = "<div class='mt-1'>" + Object.entries(pObj).map(([pestName, pestArea]) => {
                        const luasS = parseFloat(pestArea) || 0;
                        const pctS = lt > 0 ? Math.min(100, (luasS / lt) * 100).toFixed(1) + "%" : (luasS > 0 ? Math.min(100, luasS).toFixed(1) + "%" : "0%");
                        const sevVal = sevObj[pestName] !== undefined ? sevObj[pestName] : (d.k || 1);
                        return `<div class="text-dark mb-1" style="font-size:0.83rem;">
                            &bull; <strong class="text-capitalize">${pestName}</strong>, Luas serangan (<span class="text-danger fw-bold">${luasS.toFixed(2)} Ha</span>), (${pctS}) &minus; Skala keterukan (<span class="fw-bold text-danger">${sevVal}</span>)
                        </div>`;
                    }).join('') + "</div>";
                } else if ((parseFloat(d.ls) || 0) > 0) {
                    const luasS = parseFloat(d.ls) || 0;
                    const pctS = lt > 0 ? Math.min(100, (luasS / lt) * 100).toFixed(1) + "%" : "0%";
                    const sevVal = d.k || 1;
                    pestDetailsHTML = `<div class="mt-1 text-dark mb-1" style="font-size:0.83rem;">
                        &bull; <strong>Serangan Umum</strong>, Luas serangan (<span class="text-danger fw-bold">${luasS.toFixed(2)} Ha</span>), (${pctS}) &minus; Skala keterukan (<span class="fw-bold text-danger">${sevVal}</span>)
                    </div>`;
                }
            } catch(e) { 
                pestDetailsHTML = `<span class="text-danger">${d.p || "-"}</span>`; 
            }

            const statusSah = d.st || "DISAHKAN";
            const catatan = d.catatan || d.s || "Tiada catatan tambahan";
            const kategori = d.kt || "-";

            return `
            <tr id="${rowId}" onclick="DashboardManager.toggleExpandRow('${detailId}')" title="Klik baris untuk butiran tambahan">
                <td class="fw-semibold text-primary">${Utils.formatDateDisplay(d.t)} <i class="bi bi-chevron-down small ms-1 text-muted"></i></td>
                <td class="fw-bold text-dark">${d.n}</td>
                <td><span class="text-dark fw-medium">${d.l}</span> <br><span class="text-muted small">${d.d || ""}</span></td>
                <td><span class="badge bg-light text-dark border px-2 py-1">${d.tn}</span></td>
                <td>${parseFloat(d.lt||0).toFixed(4)}</td>
                <td class="text-danger fw-bold">${parseFloat(d.ls||0).toFixed(4)}</td>
                <td class="text-center" onclick="event.stopPropagation();">
                  <button class="btn btn-sm btn-outline-secondary me-1 shadow-sm" title="Lihat Modal Terperinci" onclick="DataManager.viewRec(${realIndex})">
                    <i class="bi bi-card-list"></i>
                  </button>
                  <button class="btn btn-sm btn-danger shadow-sm" 
                    data-lokasi="${d.l}" data-pegawai="${d.pg}" data-coord="${d.c}" data-tarikh="${d.t}" 
                    onclick="ExportManager.klikJanaPDF(this)">
                    <i class="bi bi-file-earmark-pdf-fill"></i> PDF
                </button>
                </td>
            </tr>
            <tr id="${detailId}" class="row-expanded-detail" style="display:none;">
                <td colspan="7" class="p-3">
                    <div class="row g-3 text-start">
                        <div class="col-md-5 col-sm-6">
                            <div class="detail-badge-title"><i class="bi bi-calendar-check me-1"></i> Tarikh Dihantar & Bancian</div>
                            <div class="detail-badge-val">Dihantar: ${tarikhHantar} | Bancian: ${Utils.formatDateDisplay(d.t)}</div>
                        </div>
                        <div class="col-md-3 col-sm-6">
                            <div class="detail-badge-title"><i class="bi bi-tag me-1"></i> Kategori & Status</div>
                            <div class="detail-badge-val"><span class="text-uppercase">${kategori}</span> | <span class="badge bg-success text-white small">${statusSah}</span></div>
                        </div>
                        <div class="col-md-12 col-sm-12 mt-3 pt-2 border-top">
                            <div class="detail-badge-title"><i class="bi bi-bug me-1"></i> Perosak & Maklumat Serangan</div>
                            <div class="detail-badge-val">${pestDetailsHTML}</div>
                        </div>
                        <div class="col-12 mt-2 pt-2 border-top">
                            <div class="detail-badge-title"><i class="bi bi-journal-text me-1"></i> Catatan / Syor Kawalan</div>
                            <div class="detail-badge-val fw-normal text-secondary">${catatan}</div>
                        </div>
                    </div>
                </td>
            </tr>`; 
        }).join('') : '<tr><td colspan="7" class="text-center text-muted p-4">Tiada rekod dijumpai.</td></tr>'; 
        
        const totalPgs = Math.ceil(listToRender.length / AppState.pSize) || 1;
        document.getElementById('pgInfo').innerText = `Muka ${AppState.pg} dari ${totalPgs} (${listToRender.length} rekod)`; 
    },
    
    movePg: function(v) { 
        let listToRender = AppState.fData;
        if (this.searchQuery && this.searchQuery !== "") {
            const q = this.searchQuery;
            listToRender = listToRender.filter(d => {
                const str = [
                    d.t, d.n, d.d, d.l, d.tn, d.kt, d.pg, d.vb, d.s,
                    typeof d.p === 'string' ? d.p : JSON.stringify(d.p||{}),
                    d.catatan
                ].join(" ").toLowerCase();
                return str.includes(q);
            });
        }
        const maxP = Math.ceil(listToRender.length / AppState.pSize) || 1;
        AppState.pg = Math.min(maxP, Math.max(1, AppState.pg+v)); 
        this.renTab(); 
    },

    // ============================================================
    // FUNGSI UTAMA: PENGURUSAN ISIHAN LAJUR JADUAL (DYNAMIC SORT)
    // ============================================================
    sortData: function(property) {
        if (this.currentSortCol === property) {
            this.currentSortDir = this.currentSortDir === 'asc' ? 'desc' : 'asc';
        } else {
            this.currentSortCol = property;
            this.currentSortDir = 'asc';
        }
        
        this.reExecuteSort();
    },

    reExecuteSort: function() {
        const col = this.currentSortCol;
        const dir = this.currentSortDir;

        AppState.fData.sort((a, b) => {
            let valA = a[col];
            let valB = b[col];

            if (col === 'lt' || col === 'ls') {
                return dir === 'asc' ? (parseFloat(valA) - parseFloat(valB)) : (parseFloat(valB) - parseFloat(valA));
            }

            valA = valA ? String(valA).toLowerCase() : '';
            valB = valB ? String(valB).toLowerCase() : '';

            if (valA < valB) return dir === 'asc' ? -1 : 1;
            if (valA > valB) return dir === 'asc' ? 1 : -1;
            return 0;
        });

        AppState.pg = 1; 
        this.renTab();
        this.updateSortIcons();
    },

    updateSortIcons: function() {
        const listCols = ['t', 'n', 'l', 'tn', 'lt', 'ls'];
        listCols.forEach(c => {
            const iconEl = document.getElementById('sort_' + c);
            if (!iconEl) return;

            if (this.currentSortCol === c) {
                iconEl.className = this.currentSortDir === 'asc' ? 'bi bi-sort-down text-primary fw-bold' : 'bi bi-sort-up text-primary fw-bold';
            } else {
                iconEl.className = 'bi bi-arrow-down-up small text-muted';
            }
        });
    }
};

// Utils: Fungsi bantuan (tarikh, dsb) diletakkan di dalam objek Utils
const Utils = {
    formatDateTimeDisplay: function(dateStr) {
        if (!dateStr || dateStr === "-") return "-";
        let str = String(dateStr).trim();
        let datePart = str;
        let timePart = "";
        if (str.includes('T')) {
            const splitT = str.split('T');
            datePart = splitT[0].trim();
            timePart = splitT[1].split('.')[0].replace('Z', '').trim();
        } else if (str.includes(' ')) {
            const splitSpace = str.split(' ');
            datePart = splitSpace[0].trim();
            timePart = splitSpace.slice(1).join(' ').trim();
        }
        let cleanDate = datePart;
        if (datePart.includes('-')) {
            const parts = datePart.split('-');
            if (parts.length === 3) cleanDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
        return timePart ? `${cleanDate} (${timePart})` : cleanDate;
    },
    formatDateDisplay: function(dateStr) {
        if (!dateStr || dateStr === "-") return "-";
        let str = String(dateStr).trim();
        if (str.includes('T')) str = str.split('T')[0];
        if (str.includes(' ')) str = str.split(' ')[0];
        if (str.includes('-')) {
            const parts = str.split('-'); 
            if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
        if (str.includes('/')) return str; 
        const d = new Date(str);
        if (isNaN(d)) return str; 
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
    }
};

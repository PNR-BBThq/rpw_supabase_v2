// ==========================================
// FAIL: js/filter.js
// FUNGSI: Menguruskan Dropdown Menu Interaktif, Cascading Dwihala & Pilihan Tarikh
// ==========================================

const FilterManager = {
    
    // Fungsi bantuan untuk dapatkan nilai kotak tapisan
    v: function(id) { 
        if(id === 'dS' || id === 'dE' || id === 'selBulan') { 
            const el = document.getElementById(id); 
            return el ? el.value : ""; 
        }
        const checkboxes = document.querySelectorAll('.chk-' + id + ':checked');
        return Array.from(checkboxes).map(cb => cb.value);
    },

    runFilter: function(source) {
        const n = this.v('selNegeri');
        const d = this.v('selDaerah');
        const t = this.v('selTanaman');
        const p = this.v('selPerosak');
        const k = this.v('selKategori');
        const s = this.v('dS');
        const e = this.v('dE');
        
        const modeBulanEl = document.getElementById('modeBulan');
        const isBulanMode = modeBulanEl && modeBulanEl.checked;
        const mBulan = isBulanMode ? this.v('selBulan') : "";

        // Helper semak perosak
        const checkPest = (r, pestList) => {
            if (pestList.length === 0) return true;
            if (!r.p) return false;
            try { 
                const pestObj = (typeof r.p === 'string' ? JSON.parse(r.p) : r.p);
                return pestList.some(selectedPest => pestObj[selectedPest]);
            } catch(err) { return false; }
        };

        // Helper semak tarikh
        const checkDate = (r) => {
            if (isBulanMode && mBulan && (!r.t || !r.t.startsWith(mBulan))) return false;
            if (!isBulanMode && s && (!r.t || r.t < s)) return false;
            if (!isBulanMode && e && (!r.t || r.t > e)) return false;
            return true;
        };
        
        // 1. TAPIS DATA UTAMA SISTEM
        AppState.fData = AppState.mData.filter(r => { 
            return (n.length === 0 || n.includes(r.n)) && 
                   (d.length === 0 || d.includes(r.d)) && 
                   (t.length === 0 || t.includes(r.tn)) && 
                   (k.length === 0 || k.includes(r.kt)) && 
                   checkPest(r, p) && checkDate(r);
        });

        // 2. KEMASKINI DROPDOWN SECARA CASCADING DWIHALA (kecuali dropdown yang sedang diisi oleh pengguna)
        if (source !== 'n') {
            const validN = AppState.mData.filter(r => (d.length===0 || d.includes(r.d)) && (t.length===0 || t.includes(r.tn)) && (k.length===0 || k.includes(r.kt)) && checkPest(r, p) && checkDate(r));
            this.updateDropdown('selNegeri', [...new Set(validN.map(x=>x.n).filter(x=>x))].sort(), n, 'n');
        }
        if (source !== 'd') {
            const validD = AppState.mData.filter(r => (n.length===0 || n.includes(r.n)) && (t.length===0 || t.includes(r.tn)) && (k.length===0 || k.includes(r.kt)) && checkPest(r, p) && checkDate(r));
            this.updateDropdown('selDaerah', [...new Set(validD.map(x=>x.d).filter(x=>x))].sort(), d, 'd');
        }
        if (source !== 't') {
            const validT = AppState.mData.filter(r => (n.length===0 || n.includes(r.n)) && (d.length===0 || d.includes(r.d)) && (k.length===0 || k.includes(r.kt)) && checkPest(r, p) && checkDate(r));
            this.updateDropdown('selTanaman', [...new Set(validT.map(x=>x.tn).filter(x=>x))].sort(), t, 't');
        }
        if (source !== 'k') {
            const validK = AppState.mData.filter(r => (n.length===0 || n.includes(r.n)) && (d.length===0 || d.includes(r.d)) && (t.length===0 || t.includes(r.tn)) && checkPest(r, p) && checkDate(r));
            this.updateDropdown('selKategori', [...new Set(validK.map(x=>x.kt).filter(x=>x))].sort(), k, 'k');
        }
        if (source !== 'p') {
            const validP = AppState.mData.filter(r => (n.length===0 || n.includes(r.n)) && (d.length===0 || d.includes(r.d)) && (t.length===0 || t.includes(r.tn)) && (k.length===0 || k.includes(r.kt)) && checkDate(r));
            let allPests = new Set(); 
            validP.forEach(r => { 
                try { 
                    let obj = typeof r.p === 'string' ? JSON.parse(r.p) : r.p; 
                    if(obj) Object.keys(obj).forEach(x => allPests.add(x)); 
                } catch(err){} 
            });
            this.updateDropdown('selPerosak', [...allPests].sort(), p, 'p');
        }

        if (!source || source === 'init') {
            this.populateMonthDropdown();
        }
        
        // 3. REFRESH DASHBOARD UTAMA
        AppState.pg = 1; 
        DashboardManager.calcUI();

        // 4. REFRESH DASHBOARD SKU (JIKA SEDANG DIBUKA)
        const viewSKU = document.getElementById('view-sku');
        if (viewSKU && viewSKU.style.display !== 'none' && typeof KPIManager !== 'undefined') {
            KPIManager.renderDashboard();
        }
    },

    updateDropdown: function(id, list, curValArray, srcCode) { 
        const container = document.getElementById('filterDropdownsContainer');
        const labelMap = { 'selNegeri': 'Negeri', 'selDaerah': 'Daerah', 'selTanaman': 'Tanaman', 'selPerosak': 'Perosak', 'selKategori': 'Kategori' };
        
        if(!document.getElementById('list' + id) && container) {
            const html = `
            <div class="dropdown d-inline-block">
                <button class="btn btn-white border text-start text-truncate dropdown-toggle btn-sm bg-white shadow-sm d-flex align-items-center justify-content-between gap-1" type="button" id="btn${id}" data-bs-toggle="dropdown" data-bs-auto-close="outside" style="font-size:0.78rem; height:31px; max-width: 175px;">
                    <span class="text-muted fw-bold me-1">${labelMap[id] || id}:</span><span class="val-text text-dark text-truncate">- Semua -</span>
                </button>
                <div class="dropdown-menu p-2 shadow border-0 rounded-3" style="min-width: 230px; max-height: 260px; overflow-y: auto; z-index: 1060;" id="list${id}"></div>
            </div>`;
            container.insertAdjacentHTML('beforeend', html);
        }
        
        const menuEl = document.getElementById('list' + id);
        if(!menuEl) return;
        
        // Simpan state semasa
        const activeVals = new Set(curValArray || []);
        
        // Caching DOM bagi mengelakkan dropdown tersangkut/lag apabila diganggu klik ulangan
        const cacheKey = JSON.stringify([...list].sort()) + '|' + JSON.stringify([...activeVals].sort());
        if (menuEl.dataset.cacheKey === cacheKey) {
            this.updateBtnText(id);
            return;
        }
        menuEl.dataset.cacheKey = cacheKey;
        
        // Header butang Pilih Semua & Kosongkan
        menuEl.innerHTML = `
            <div class="d-flex justify-content-between align-items-center border-bottom pb-2 mb-2 sticky-top bg-white px-1" style="z-index: 5;">
                <button type="button" class="btn btn-link p-0 text-primary fw-bold text-decoration-none" style="font-size: 0.73rem;" onclick="event.stopPropagation(); FilterManager.selectAll('${id}', true, '${srcCode}')"><i class="bi bi-check-all me-1"></i>Pilih Semua</button>
                <button type="button" class="btn btn-link p-0 text-secondary fw-bold text-decoration-none" style="font-size: 0.73rem;" onclick="event.stopPropagation(); FilterManager.selectAll('${id}', false, '${srcCode}')"><i class="bi bi-x-circle me-1"></i>Kosongkan</button>
            </div>
            <div class="dropdown-items-scrollable"></div>
        `;

        const listContainer = menuEl.querySelector('.dropdown-items-scrollable');
        
        if (list.length === 0) {
            listContainer.innerHTML = '<div class="text-muted small text-center p-2 fst-italic">Tiada pilihan sesuai</div>';
        } else {
            list.forEach(x => { 
                const isChecked = activeVals.has(x) ? 'checked' : '';
                const cleanId = 'chk_' + id + '_' + String(x).replace(/[^a-zA-Z0-9]/g, '');
                const div = document.createElement('div');
                div.className = 'form-check mb-1 px-3';
                div.innerHTML = `<input class="form-check-input chk-${id}" type="checkbox" value="${x}" id="${cleanId}" ${isChecked}>
                                 <label class="form-check-label w-100 text-truncate text-dark" style="font-size:0.83rem; cursor:pointer;" for="${cleanId}">${x}</label>`;
                
                div.querySelector('input').addEventListener('change', () => {
                    FilterManager.updateBtnText(id);
                    FilterManager.runFilter(srcCode);
                });
                listContainer.appendChild(div);
            });
        }
        
        this.updateBtnText(id);
    },

    selectAll: function(id, state, srcCode) {
        const menuEl = document.getElementById('list' + id);
        if(menuEl) delete menuEl.dataset.cacheKey;
        document.querySelectorAll('.chk-' + id).forEach(cb => {
            if(!cb.disabled) cb.checked = state;
        });
        this.updateBtnText(id);
        this.runFilter(srcCode);
    },

    updateBtnText: function(id) {
        const btn = document.getElementById('btn' + id);
        if(!btn) return;
        const valSpan = btn.querySelector('.val-text');
        const checked = Array.from(document.querySelectorAll('.chk-' + id + ':checked')).map(cb => cb.value);
        let txt = '- Semua -';
        if (checked.length === 1) txt = checked[0];
        else if (checked.length > 1) txt = `${checked[0]} (+${checked.length - 1})`;

        if (valSpan) {
            valSpan.innerText = txt;
            if (checked.length === 0) valSpan.className = 'val-text text-dark text-truncate';
            else valSpan.className = 'val-text text-primary fw-bold text-truncate';
        } else {
            btn.innerText = txt;
        }
        if (checked.length > 0) btn.classList.add('border-primary', 'fw-bold');
        else btn.classList.remove('border-primary', 'fw-bold');
    },

    fillSel: function(id, arr, srcCode) { 
        this.updateDropdown(id, arr, [], srcCode);
        this.populateMonthDropdown();
    },

    populateMonthDropdown: function() {
        const sel = document.getElementById('selBulan');
        if(!sel || !AppState.mData || !AppState.mData.length) return;
        const curVal = sel.value;
        
        const monthNames = ["Januari", "Februari", "Mac", "April", "Mei", "Jun", "Julai", "Ogos", "September", "Oktober", "November", "Disember"];
        const formatBulanLabel = (ym) => {
            if(!ym || !ym.includes('-')) return ym;
            const [y, m] = ym.split('-');
            const idx = parseInt(m, 10) - 1;
            return (monthNames[idx] || "Bulan") + " " + y;
        };

        const months = [...new Set(AppState.mData.map(r => r.t ? r.t.substring(0, 7) : "").filter(x => x && x.length === 7))].sort().reverse();
        
        sel.innerHTML = '<option value="">- Semua Bulan -</option>';
        months.forEach(ym => {
            const opt = document.createElement('option');
            opt.value = ym;
            opt.textContent = formatBulanLabel(ym);
            if(ym === curVal) opt.selected = true;
            sel.appendChild(opt);
        });
    },

    toggleDateMode: function(mode) {
        const bulanCon = document.getElementById('dateBulanContainer');
        const julatCon = document.getElementById('dateJulatContainer');
        if (mode === 'bulan') {
            if(bulanCon) bulanCon.style.display = 'inline-block';
            if(julatCon) julatCon.style.display = 'none';
            const dS = document.getElementById('dS');
            const dE = document.getElementById('dE');
            if(dS) dS.value = "";
            if(dE) dE.value = "";
        } else {
            if(bulanCon) bulanCon.style.display = 'none';
            if(julatCon) julatCon.style.display = 'inline-flex';
            const selBulan = document.getElementById('selBulan');
            if(selBulan) selBulan.value = "";
        }
        FilterManager.runFilter('tarikh');
    },

    resetFilter: function(){ 
        document.querySelectorAll('.chk-selNegeri, .chk-selDaerah, .chk-selTanaman, .chk-selPerosak, .chk-selKategori').forEach(cb => { 
            if(!cb.disabled) cb.checked = false; 
        });
        document.querySelectorAll('input[type=date]').forEach(e => e.value=""); 
        const selB = document.getElementById('selBulan'); if(selB) selB.value = "";
        const modeB = document.getElementById('modeBulan'); 
        if(modeB) { modeB.checked = true; FilterManager.toggleDateMode('bulan'); }
        
        ['selNegeri', 'selDaerah', 'selTanaman', 'selPerosak', 'selKategori'].forEach(id => {
            const menuEl = document.getElementById('list' + id);
            if(menuEl) delete menuEl.dataset.cacheKey;
            FilterManager.updateBtnText(id);
        });
        FilterManager.runFilter('init'); 
    }
};

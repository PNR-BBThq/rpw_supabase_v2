/* Presentation controller only: existing permissions, filters and API remain authoritative. */
const Workspace = {
    tab: 'overview',
    trend: null,
    init() {
        document.body.dataset.workspaceView = 'main';
        const toolbar = document.querySelector('.overview-toolbar');
        const filter = document.getElementById('filterSection');
        // Shared filters stay outside app-view; moving them inside main would hide other modules' filters.
        if (toolbar && filter) {
            const heading = document.querySelector('.overview-heading');
            const main = document.getElementById('view-main');
            const shared = document.createElement('div');
            shared.id = 'workspaceDashboardHeader';
            main.before(shared);
            shared.append(heading, toolbar, filter);
        }
        document.querySelectorAll('[data-dashboard-tab]').forEach(button => {
            button.addEventListener('click', () => this.setTab(button.dataset.dashboardTab));
            button.addEventListener('keydown', event => {
                const tabs = Array.from(document.querySelectorAll('[data-dashboard-tab]'));
                const i = tabs.indexOf(button);
                let next;
                if (event.key === 'ArrowRight') next = (i + 1) % tabs.length;
                if (event.key === 'ArrowLeft') next = (i + tabs.length - 1) % tabs.length;
                if (event.key === 'Home') next = 0;
                if (event.key === 'End') next = tabs.length - 1;
                if (next !== undefined) { event.preventDefault(); this.setTab(tabs[next].dataset.dashboardTab); tabs[next].focus(); }
            });
        });
        document.getElementById('toggleWorkspaceFilters').addEventListener('click', () => {
            if (window.innerWidth <= 768 && typeof MobileFilter !== 'undefined') { MobileFilter.open(); return; }
            const collapsed = document.body.classList.toggle('filters-collapsed');
            document.getElementById('toggleWorkspaceFilters').setAttribute('aria-expanded', String(!collapsed));
        });
        document.getElementById('quickPeriod').addEventListener('change', event => this.setPeriod(event.target.value));
        document.getElementById('workspaceMenu').addEventListener('click', () => {
            document.getElementById('sidebar').classList.toggle('active');
            document.getElementById('mobileOverlay')?.classList.toggle('active');
        });
        const moduleHeading=document.createElement('section');
        moduleHeading.id='moduleHeading'; moduleHeading.className='module-heading'; moduleHeading.hidden=true;
        document.querySelector('.workspace-header')?.after(moduleHeading);
        this.setTab('overview');
    },
    onView(view) {
        document.body.dataset.workspaceView = view;
        const heading = document.getElementById('workspaceDashboardHeader');
        // Move shared filters back out when using another module.
        const filter = document.getElementById('filterSection');
        if (heading && filter) {
            if (view === 'main') heading.append(filter);
            else heading.after(filter);
            heading.hidden = view !== 'main';
        }
        document.body.classList.remove('filters-collapsed');
        document.getElementById('toggleWorkspaceFilters')?.setAttribute('aria-expanded', 'true');
        const names = {main:'Overview',form:'Bancian baharu',verify:'Pengesahan',tasks:'Tugasan saya',sku:'Pencapaian SKU',users:'Pengguna',efficiency:'Prestasi pengesahan',redundant:'Semakan pertindihan',tumpuan:'Analisis tumpuan'};
        const descriptions={
          tasks:'Semak laporan yang perlu tindakan dan kemas kini rekod anda.',
          verify:'Teliti laporan sebelum meluluskan atau mengembalikannya untuk pembetulan.',
          sku:'Bandingkan pencapaian bancian dengan sasaran yang ditetapkan.',
          tumpuan:'Pantau tanaman dan perosak tumpuan mengikut skop negeri.',
          efficiency:'Kenal pasti tempoh semakan dan laporan yang menunggu tindakan.',
          redundant:'Bandingkan rekod berpotensi bertindih sebelum membuat keputusan.',
          users:'Urus kelulusan akaun, peranan dan skop akses pegawai.'
        };
        const headingPanel=document.getElementById('moduleHeading');
        if(headingPanel){
          headingPanel.replaceChildren(); headingPanel.hidden=!descriptions[view];
          if(descriptions[view]){
            const title=document.createElement('h1'),detail=document.createElement('p');
            title.textContent=names[view];detail.textContent=descriptions[view];headingPanel.append(title,detail);
          }
        }
        const label = document.getElementById('workspaceViewLabel');
        if (label) label.textContent = names[view] || 'Ruang kerja';
        document.querySelectorAll('.sidebar [data-view]').forEach(item => {
            item.classList.toggle('active', item.dataset.view === view);
            if (item.dataset.view === view) item.setAttribute('aria-current','page');
            else item.removeAttribute('aria-current');
        });
        if (view === 'main') requestAnimationFrame(() => this.resize());
    },
    setTab(tab) {
        this.tab = tab;
        document.querySelectorAll('[data-dashboard-panel]').forEach(panel => { panel.hidden = panel.dataset.dashboardPanel !== tab; });
        document.querySelectorAll('[data-dashboard-tab]').forEach(button => {
            const selected = button.dataset.dashboardTab === tab;
            button.setAttribute('aria-selected', String(selected));
            button.tabIndex = selected ? 0 : -1;
        });
        requestAnimationFrame(() => this.resize());
    },
    async resize() {
        if (this.tab === 'geo' && typeof MapManager !== 'undefined') {
            await MapManager.initMap();
            if (!MapManager.map || this.tab !== 'geo') return;
            MapManager.map.invalidateSize();
            if (MapManager._lastPoints) MapManager.updateMap(MapManager._lastPoints);
        }
        if (this.tab === 'overview') {
            this.trend?.resize();
            if (typeof ChartManager !== 'undefined') { ChartManager.myPestChart?.resize(); ChartManager.pieChart?.resize(); }
        }
    },
    setPeriod(period) {
        const date = new Date();
        const iso = value => `${value.getFullYear()}-${String(value.getMonth()+1).padStart(2,'0')}-${String(value.getDate()).padStart(2,'0')}`;
        document.getElementById('modeJulat').checked = true;
        document.getElementById('selBulan').value = '';
        document.getElementById('dateBulanContainer').style.display = 'none';
        document.getElementById('dateJulatContainer').style.display = 'inline-flex';
        const start = new Date(date);
        if (period === 'month') start.setDate(1);
        else start.setDate(start.getDate()-89);
        document.getElementById('dS').value = period === 'all' ? '' : iso(start);
        document.getElementById('dE').value = period === 'all' ? '' : iso(date);
        FilterManager.runFilter('tarikh');
        // updateData may mark this as custom while a manual date changes; preserve the explicit preset.
        document.getElementById('quickPeriod').value = period;
    },
    updateData() {
        const selector = document.getElementById('quickPeriod');
        if (selector) selector.value = FilterManager.v('selBulan') || FilterManager.v('dS') || FilterManager.v('dE') ? 'custom' : 'all';
        const counts = new Map();
        AppState.fData.forEach(record => {
            const month = String(record.t || '').slice(0,7);
            if (/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) counts.set(month, (counts.get(month)||0)+1);
        });
        const months = [...counts.keys()].sort();
        const empty = document.getElementById('trendEmpty');
        if (empty) empty.hidden = months.length > 0;
        const canvas = document.getElementById('surveyTrend');
        if (!canvas) return;
        // Keep gaps explicit; do not invent zero-report months or connect across unknown months.
        const labels = months.map(month => new Date(month+'-01T12:00:00').toLocaleDateString('ms-MY',{month:'short',year:'2-digit'}));
        canvas.setAttribute('aria-label', months.length ? months.map((m,i)=>`${labels[i]}: ${counts.get(m)} rekod`).join('; ') : 'Tiada rekod bertarikh');
        if (typeof Chart === 'undefined') return;
        if (!this.trend) this.trend = new Chart(canvas, {
            type:'bar', data:{labels, datasets:[{label:'Rekod disahkan',data:months.map(m=>counts.get(m)),backgroundColor:'#0d9488',hoverBackgroundColor:'#102a43',borderRadius:5,maxBarThickness:34}]},
            options:{responsive:true,maintainAspectRatio:false,animation:false,plugins:{legend:{display:false}},scales:{x:{grid:{display:false},ticks:{maxTicksLimit:9,color:'#67736f'}},y:{beginAtZero:true,ticks:{precision:0,color:'#67736f'},border:{display:false},grid:{color:'#edf0ec'}}}}
        });
        else { this.trend.data.labels=labels; this.trend.data.datasets[0].data=months.map(m=>counts.get(m)); this.trend.update('none'); }
    }
};
document.addEventListener('DOMContentLoaded', () => Workspace.init());

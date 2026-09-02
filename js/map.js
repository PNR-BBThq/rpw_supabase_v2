// ==========================================
// FAIL: js/map.js
// FUNGSI: Menguruskan paparan Leaflet Map berserta Heatmap, Marker Cluster & State Pastel Layer
// ==========================================

const STATE_COLORS = {
    "Sarawak": "#86efac",       // hijau cerah soft (low bright)
    "Johor": "#fde047",         // kuning cerah soft
    "Pahang": "#fdba74",        // oren cerah soft
    "Sabah": "#fca5a5",         // merah cerah soft
    "Perak": "#d8b4fe",         // ungu cerah soft
    "Kedah": "#7dd3fc",         // biru cerah soft
    "Kelantan": "#bef264",      // lime cerah soft
    "Terengganu": "#5eead4",    // teal cerah soft
    "Selangor": "#a5b4fc",      // indigo cerah soft
    "Negeri Sembilan": "#fcd34d",// amber cerah soft
    "Melaka": "#fda4af",        // rose cerah soft
    "Pulau Pinang": "#67e8f9",  // cyan cerah soft
    "Perlis": "#cbd5e1",        // slate cerah soft
    "Kuala Lumpur": "#94a3b8",
    "Labuan": "#cbd5e1",
    "Putrajaya": "#94a3b8"
};

const MapManager = {
    map: null,
    clusterGroup: null,
    heatLayer: null,
    geoLayer: null,

    initMap: async function() {
        if (typeof L === 'undefined') {
            document.getElementById('map').innerHTML = '<div class="d-flex align-items-center justify-content-center h-100 text-muted bg-light">Peta tidak tersedia (Offline)</div>';
            return;
        }

        if (!this.map) {
            try {
                this.map = L.map('map').setView([4.2105, 101.9758], 6);
                // Tile layer CartoDB Positron (Light All)
                L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
                    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
                    subdomains: 'abcd',
                    maxZoom: 19
                }).addTo(this.map);

                this.loadStateBoundaries();
            } catch(e) { 
                console.log("Ralat memuatkan Leaflet Map"); 
            }
        }
    },

    loadStateBoundaries: async function() {
        // Gunakan fail malaysia.states.geojson menerusi CDN berprestasi tinggi agar setiap negeri terpisah dengan warna low bright
        const geoUrls = [
            "https://cdn.jsdelivr.net/gh/nullifye/malaysia.geojson@master/malaysia.state.geojson",
            "https://raw.githubusercontent.com/nullifye/malaysia.geojson/master/malaysia.state.geojson",
            "https://raw.githubusercontent.com/wmgeolab/geoBoundaries/9469f09/releaseData/gbOpen/MYS/ADM1/geoBoundaries-MYS-ADM1_simplified.geojson"
        ];
        for (let url of geoUrls) {
            try {
                const resp = await fetch(url);
                if (resp.ok) {
                    const geoData = await resp.json();
                    this.geoLayer = L.geoJSON(geoData, {
                        style: function(feature) {
                            const name = String(feature.properties.name || feature.properties.NAME_1 || feature.properties.state || feature.properties.shapeName || feature.properties.negeri || "");
                            let color = "#cbd5e1"; // default soft color
                            Object.keys(STATE_COLORS).forEach(k => {
                                if (name.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(name.toLowerCase())) {
                                    color = STATE_COLORS[k];
                                }
                            });
                            // Tingkatkan opacity ke 0.55 agar kontras warna jelas terserlah di atas peta CartoDB Positron
                            return { color: "#64748b", weight: 1.5, fill: true, fillColor: color, fillOpacity: 0.55, dashArray: '4, 3' };
                        },
                        interactive: false // Supaya tidak menghalang klik pada pin data/cluster
                    }).addTo(this.map);
                    break;
                }
            } catch(e) { console.log("Cuba alternatif geojson Malaysia..."); }
        }
    },

    updateMap: function(pts) {
        if(!this.map) return;
        if(this.clusterGroup) this.map.removeLayer(this.clusterGroup);
        if(this.heatLayer) this.map.removeLayer(this.heatLayer);
        
        // Simpan titik terakhir untuk redraw semasa tab bertukar
        this._lastPoints = pts;

        const mapContainer = this.map.getContainer();
        const isVisible = mapContainer && mapContainer.clientWidth > 0;

        if(pts.length > 0) {
            // 1. Heatmap layer berdasarkan Luas Serangan (ls) dengan gradient kuning-oren-merah
            const heatPoints = pts.map(item => {
                const ls = parseFloat(item.data.ls) || 0.5;
                const intensity = Math.min(1.0, Math.max(0.3, ls / 15));
                return [item.coord[0], item.coord[1], intensity];
            });

            // ⚡ ELAK CRASH: Jangan cuba render heatLayer jika view-main tersembunyi (width 0)
            if (isVisible && typeof L.heatLayer !== 'undefined' && heatPoints.length > 0) {
                try {
                    this.heatLayer = L.heatLayer(heatPoints, {
                        radius: 28,
                        blur: 20,
                        maxZoom: 14,
                        gradient: { 0.2: '#fef08a', 0.5: '#f97316', 0.8: '#dc2626', 1.0: '#991b1b' }
                    }).addTo(this.map);
                } catch(e) {
                    console.warn("Heatmap diskip kerana map container tersembunyi.", e);
                }
            }

            // 2. Marker Clustering & Pin Data
            let markerContainer;
            if (typeof L.markerClusterGroup !== 'undefined') {
                markerContainer = L.markerClusterGroup({
                    showCoverageOnHover: false,
                    maxClusterRadius: 45,
                    spiderfyOnMaxZoom: true,
                    iconCreateFunction: function(cluster) {
                        const count = cluster.getChildCount();
                        let sizeClass = count < 10 ? 'small' : (count < 50 ? 'medium' : 'large');
                        return L.divIcon({ 
                            html: `<div style="background-color:#064e3b; color:white; border: 2px solid #10b981; border-radius: 50%; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.85rem; box-shadow: 0 2px 6px rgba(0,0,0,0.3);">${count}</div>`, 
                            className: 'custom-marker-cluster ' + sizeClass, 
                            iconSize: [34, 34] 
                        });
                    }
                });
            } else {
                markerContainer = L.layerGroup();
            }

            const markers = pts.map(item => {
                const p = item.coord; 
                const d = item.data; 
                const marker = L.circleMarker(p, { radius: 7, color: '#ffffff', weight: 1.5, fillColor: '#dc2626', fillOpacity: 0.9, opacity: 1, customData: d });
                
                marker.bindPopup(function(layer) {
                    const data = layer.options.customData;
                    let pestHTML = ""; 
                    let pestObj = data.p || {}; 
                    
                    if (pestObj && Object.keys(pestObj).length > 0) { 
                        pestHTML = `<div style="margin-top:8px; border-top:1px dashed #ccc; padding-top:6px;"><small class="fw-bold text-muted d-block mb-1">PERINCIAN PEROSAK:</small><ul style="padding-left: 15px; margin-bottom: 0; font-size: 0.8rem;">`; 
                        Object.entries(pestObj).forEach(([nama, luas]) => { 
                            pestHTML += `<li>${nama}: <b class="text-danger">${parseFloat(luas).toFixed(2)} Ha</b></li>`; 
                        }); 
                        pestHTML += `</ul></div>`; 
                    } else { 
                        pestHTML = `<div class="mt-2 text-muted small fst-italic">- Tiada data perosak terperinci -</div>`; 
                    }
                    
                    return `
                        <div style="font-family: 'Segoe UI', sans-serif; font-size: 0.88rem; min-width: 220px;">
                            <div style="background-color: #f1f5f9; padding: 6px 10px; border-radius: 6px 6px 0 0; border-bottom: 1px solid #e2e8f0; margin-bottom: 8px; font-weight: 800;">
                                <span class="text-primary text-uppercase">${data.tn}</span>
                            </div>
                            <div class="mb-2 px-1"><i class="bi bi-geo-alt-fill text-danger me-1"></i> <b>${data.l}</b><br><span class="text-muted small">${data.d}, ${data.n}</span></div>
                            <div class="d-flex justify-content-between bg-light border rounded p-2 mb-2" style="font-size: 0.82rem;">
                                <div><span class="d-block text-muted" style="font-size:0.68rem; font-weight:700;">LUAS TANAM</span><b>${parseFloat(data.lt||0).toFixed(2)} Ha</b></div>
                                <div class="text-end border-start ps-2"><span class="d-block text-muted" style="font-size:0.68rem; font-weight:700;">JUMLAH SERANGAN</span><b class="text-danger">${parseFloat(data.ls||0).toFixed(2)} Ha</b></div>
                            </div>
                            ${pestHTML}
                            <div class="text-end mt-2 pt-2 border-top"><small class="text-muted fw-bold" style="font-size: 0.72rem;"><i class="bi bi-calendar-event me-1"></i>Tarikh: ${Utils.formatDateDisplay(data.t)}</small></div>
                        </div>`;
                }, { minWidth: 230 }); 
                marker.bindTooltip(`<b>${d.tn}</b>: ${d.l}`, { direction: 'top', offset: [0, -6], opacity: 0.9 }); 
                return marker;
            });
            
            markers.forEach(m => markerContainer.addLayer(m));
            this.clusterGroup = markerContainer;
            this.map.addLayer(this.clusterGroup);

            try { 
                this.map.fitBounds(L.latLngBounds(pts.map(x => x.coord)), { padding: [30, 30], maxZoom: 11 }); 
            } catch(e){}
        }
    }
};

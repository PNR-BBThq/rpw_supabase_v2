// ==========================================
// FAIL: js/exports.js
// FUNGSI: Menguruskan Muat Turun (Excel, PDF, KML, GeoJSON)
// ==========================================

const ExportManager = {

    reportLogo: function() {
        return new Promise(resolve => {
            const img = new Image();
            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
                    canvas.getContext('2d').drawImage(img, 0, 0);
                    resolve(canvas.toDataURL('image/jpeg', 0.85));
                } catch { resolve(null); }
            };
            img.onerror = () => resolve(null);
            img.src = '/logo_doa.jpg';
        });
    },

    downloadDualExcel: async function() { 
        if (!AppState.fData.length) { alert("Tiada data!"); return; } 
        const workbook = new ExcelJS.Workbook(); 
        const worksheet = workbook.addWorksheet('Laporan Penuh'); 
        
        worksheet.columns = [
            { header: 'ID', key: 'id', width: 6 }, { header: 'Nama Pegawai', key: 'pg', width: 25 }, 
            { header: 'Tarikh', key: 't', width: 12 }, { header: 'Negeri', key: 'n', width: 15 }, 
            { header: 'Daerah', key: 'd', width: 15 }, { header: 'Lokasi', key: 'l', width: 22 }, 
            { header: 'Koordinat', key: 'c', width: 22 }, { header: 'Kategori', key: 'kt', width: 18 }, 
            { header: 'Tanaman', key: 'tn', width: 18 }, { header: 'Luas Bancian (Ha)', key: 'lt', width: 18 }, 
            { header: 'Perosak', key: 'p', width: 20 }, { header: 'Keterukan', key: 'k', width: 15 }, 
            { header: 'Luas Serangan (Ha)', key: 'ls', width: 18 }, { header: '% Serangan', key: 'pct', width: 15 }, 
            { header: 'Syor Kawalan', key: 's', width: 50 },
            { header: 'Catatan', key: 'catatan', width: 45 }
        ]; 
        
        worksheet.getRow(1).font = { bold: true }; 
        worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' }; 
        let rowIndex = 2; 
        
        AppState.fData.forEach(d => { 
            let pestEntries = (d.p && Object.keys(d.p).length > 0) ? Object.entries(d.p) : [["TIADA", 0]]; 
            let startRow = rowIndex; 
            let luasTanam = parseFloat(d.lt) || 0; 
            
            pestEntries.forEach(([pName, pArea]) => { 
                let luasSerang = parseFloat(pArea) || 0; 
                let pctVal = (luasTanam > 0) ? ((luasSerang / luasTanam) * 100).toFixed(2) + '%' : "0%"; 
                const row = worksheet.getRow(rowIndex); 
                row.values = { id: d.id, pg: d.pg || "-", t: d.t, n: d.n, d: d.d, l: d.l, c: d.c || "-", kt: d.kt || "-", tn: d.tn, lt: luasTanam, p: pName, k: (d.pk && d.pk[pName]) || d.k, ls: luasSerang, pct: pctVal, s: d.s, catatan: d.catatan || '' };
                
                row.eachCell({ includeEmpty: true }, (cell) => { 
                    cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} }; 
                    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }; 
                }); 
                rowIndex++; 
            }); 
            
            if (pestEntries.length > 1) { 
                for (let c = 1; c <= 10; c++) { worksheet.mergeCells(startRow, c, rowIndex - 1, c); } 
                worksheet.mergeCells(startRow, 15, rowIndex - 1, 15); 
                worksheet.mergeCells(startRow, 16, rowIndex - 1, 16);
            } 
        }); 
        
        const buffer = await workbook.xlsx.writeBuffer(); 
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }); 
        const url = window.URL.createObjectURL(blob); 
        const anchor = document.createElement('a'); 
        anchor.href = url; anchor.download = 'PNR_Laporan_Lengkap.xlsx'; 
        anchor.click(); window.URL.revokeObjectURL(url); 
    },

    dlPDF: async function() { 
        if (!AppState.fData.length) { alert("Tiada data untuk dijana!"); return; }
        const btn = document.getElementById('btnDlPDF');
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Jana...';
        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({orientation:'landscape',unit:'mm',format:'a4'});
            const rows = AppState.fData;
            const number = n => (Number(n) || 0).toFixed(2);
            const dates = rows.map(d=>String(d.t || '')).filter(d=>/^\d{4}-\d{2}-\d{2}$/.test(d)).sort();
            const displayDate = d => /^\d{4}-\d{2}-\d{2}$/.test(String(d)) ? d.split('-').reverse().join('/') : String(d || '-');
            const dateLabel = dates.length ? `${displayDate(dates[0])} - ${displayDate(dates[dates.length-1])}` : '-';
            const choice = document.getElementById('selNegeri');
            let state = choice ? choice.options[choice.selectedIndex].text : 'SEMUA';
            if (AppState.uProf?.state === 'CAMERON HIGHLANDS') state = 'PAHANG (CAMERON HIGHLANDS)';
            else if (AppState.uProf?.state && AppState.uProf.state !== 'ALL') state = AppState.uProf.state;
            if (!state || /semua/i.test(state)) state = 'SEMUA';
            const author = AppState.uProf?.name || 'Sistem PNR';
            const now = new Intl.DateTimeFormat('ms-MY',{timeZone:'Asia/Kuala_Lumpur',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date());
            doc.setProperties({title:'Laporan Pemantauan Perosak',author,subject:'Bahagian Biosekuriti Tumbuhan'});
            const logo = await this.reportLogo();
            if (logo) doc.addImage(logo,'JPEG',13,10,24,17);
            doc.setTextColor(6,78,59);
            doc.setFont('helvetica','bold'); doc.setFontSize(16);
            doc.text('LAPORAN PEMANTAUAN PEROSAK',40,15);
            doc.setTextColor(25,25,25); doc.setFont('helvetica','normal'); doc.setFontSize(9);
            doc.text('Bahagian Biosekuriti Tumbuhan, Jabatan Pertanian',40,20);
            doc.setFontSize(7.5);
            doc.text(`Negeri: ${state}  |  Tarikh: ${dateLabel}  |  Dijana Oleh: ${author}`,40,25,{maxWidth:244});
            doc.setDrawColor(6,78,59); doc.setLineWidth(0.8); doc.line(12,31,285,31);
            const area = rows.reduce((total,r)=>total+(Number(r.lt)||0),0);
            const attacked = rows.reduce((total,r)=>total+(Number(r.ls)||Object.values(r.p||{}).reduce((sum,value)=>sum+(Number(value)||0),0)),0);
            const cards = [[`${number(area)} Ha`,'Jumlah Luas Bancian'],[`${number(attacked)} Ha`,'Jumlah Luas Serangan'],[`${number(area ? 100*attacked/area : 0)}%`,'Peratus Serangan'],[String(rows.length),'Bil. Rekod']];
            cards.forEach(([value,label],i)=>{
                const x=16+i*70;
                doc.setDrawColor(16,185,129); doc.setLineWidth(0.25); doc.roundedRect(x,36,65,17,2,2,'S');
                doc.setTextColor(i===1?220:6,i===1?38:78,i===1?38:59);
                doc.setFont('helvetica','bold');doc.setFontSize(12);doc.text(value,x+32.5,43,{align:'center'});
                doc.setTextColor(45,45,45);doc.setFont('helvetica','normal');doc.setFontSize(8);doc.text(label,x+32.5,49,{align:'center'});
            });
            const body=[];
            rows.forEach((r,index)=>{
                const pest=Object.entries(r.p||{});
                const list=pest.length?pest:[['TIADA',0]];
                const planted=Number(r.lt)||0;
                body.push([String(index+1),displayDate(r.t),r.d||'-',r.l||'-',r.tn||'-',number(planted),
                    list.map(([name])=>name).join('\n'),list.map(([,a])=>number(a)).join('\n'),
                    list.map(([,a])=>`${number(planted?100*Number(a)/planted:0)}%`).join('\n')]);
                body.push([{content:`SYOR: ${r.s && r.s!=='-'?r.s:'Tiada syor khusus.'}${r.catatan && r.catatan!=='-'?'\nCATATAN: '+r.catatan:''}`,
                    colSpan:9,styles:{fillColor:[255,249,219],fontStyle:'italic',halign:'left',fontSize:7}}]);
            });
            doc.autoTable({
                head:[['Bil','Tarikh','Daerah','Lokasi','Tanaman','Luas Bancian (Ha)','Perosak','Luas Serangan (Ha)','Peratus Serangan']],
                body,startY:59,margin:{top:17,left:12,right:12,bottom:15},showHead:'everyPage',
                theme:'grid',rowPageBreak:'avoid',
                styles:{font:'helvetica',fontSize:7.5,textColor:[25,25,25],lineWidth:0.2,lineColor:[30,30,30],cellPadding:2,overflow:'linebreak'},
                headStyles:{fillColor:[247,248,250],textColor:[25,25,25],fontStyle:'bold',halign:'center'},
                columnStyles:{0:{cellWidth:10,halign:'center'},1:{cellWidth:20,halign:'center'},2:{cellWidth:32},3:{cellWidth:43},4:{cellWidth:31},5:{cellWidth:22,halign:'center'},6:{cellWidth:63},7:{cellWidth:26,halign:'center'},8:{cellWidth:26,halign:'center'}},
                didDrawPage: data=>{
                    if(data.pageNumber>1){doc.setDrawColor(6,78,59);doc.setLineWidth(0.5);doc.line(12,13,285,13);}
                    doc.setFontSize(7);doc.setTextColor(110,110,110);
                    doc.text(`Dicetak pada: ${now}`,12,201);
                    doc.text(`Halaman ${data.pageNumber}`,285,201,{align:'right'});
                }
            });
            doc.save(`DATA PNR ${state.replace(/[^A-Za-z0-9 ()-]/g,'_')} - ${dateLabel.replace(/\//g,'-')}.pdf`);
        } catch(e) {
            console.error(e);
            alert('Ralat sistem semasa menjana PDF.');
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    },

    klikJanaPDF: async function(btnElement) {
        if (!navigator.onLine) {
            Swal.fire('Mod Offline', 'Harap maklum, penjanaan PDF memerlukan capaian internet.', 'warning');
            return;
        }

        const lokasiStr = btnElement.getAttribute('data-lokasi');
        const pegawaiStr = btnElement.getAttribute('data-pegawai');
        const coordStr = btnElement.getAttribute('data-coord');      
        const tarikhStr = btnElement.getAttribute('data-tarikh');   
        
        const rec = AppState.mData.find(d => d.l === lokasiStr && d.pg === pegawaiStr && d.c === coordStr && d.t === tarikhStr);
        if (!rec) {
            Swal.fire('Ralat', 'Gagal mencari rekod.', 'error');
            return;
        }

        Swal.fire({
            title: 'Menjana Laporan PDF...',
            html: 'Sila tunggu sebentar. Memproses data...<br><br><div class="spinner-border text-danger" role="status"></div>',
            showConfirmButton: false,
            allowOutsideClick: false
        });

        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF('portrait');

            // Header
            doc.setFontSize(16);
            doc.setFont("helvetica", "bold");
            doc.text("Laporan Bancian Perosak Tanaman", 105, 20, null, null, "center");
            
            doc.setFontSize(11);
            doc.setFont("helvetica", "normal");
            doc.text(`Tarikh: ${rec.t}`, 20, 35);
            doc.text(`Lokasi: ${rec.l}`, 20, 42);
            doc.text(`Koordinat: ${rec.c}`, 20, 49);
            doc.text(`Pegawai Pelapor: ${rec.pg}`, 20, 56);
            doc.text(`Negeri: ${rec.n}   Daerah: ${rec.d}`, 20, 63);

            // Table details
            let pestEntries = (rec.p && Object.keys(rec.p).length > 0) ? Object.entries(rec.p) : [["TIADA", 0]]; 
            let luasTanam = parseFloat(rec.lt) || 0; 
            
            const tableRows = [];
            pestEntries.forEach(([pName, pArea]) => { 
                let luasSerang = parseFloat(pArea) || 0; 
                let pctVal = (luasTanam > 0) ? ((luasSerang / luasTanam) * 100).toFixed(1) + '%' : "0%"; 
                let sevVal = (rec.pk && rec.pk[pName]) ? rec.pk[pName] : (rec.k || 0);
                tableRows.push([
                    rec.tn, 
                    luasTanam.toFixed(2), 
                    pName, 
                    luasSerang.toFixed(2), 
                    pctVal, 
                    `T${sevVal}`
                ]);
            });

            doc.autoTable({
                startY: 75,
                head: [["Tanaman", "L. Tanam(Ha)", "Perosak", "L. Serang(Ha)", "% Serangan", "Tahap"]],
                body: tableRows,
                theme: 'grid',
                styles: { fontSize: 10, cellPadding: 3 },
                headStyles: { fillColor: [41, 128, 185], textColor: 255, halign: 'center' }
            });

            // Status
            let finalY = doc.lastAutoTable.finalY + 15;
            doc.text(`Syor Kawalan: ${rec.s || '-'}`, 20, finalY);
            doc.text(`Status Laporan: ${rec.st || 'Disahkan'}`, 20, finalY + 7);

            const fileName = `Laporan_${rec.l.replace(/[^a-zA-Z0-9]/g, "_")}_${rec.t}.pdf`;
            doc.save(fileName);
            
            Swal.close();
        } catch (err) {
            console.error(err);
            Swal.fire('Ralat Sistem', 'Gagal menjana PDF.', 'error');
        }
    },

    downloadGeoJSON: function() {
        if (!AppState.fData.length) { alert("Tiada data untuk dimuat turun!"); return; }

        let featuresArray = [];
        AppState.fData.forEach(d => {
            let pestObj = {};
            try { pestObj = typeof d.p === 'string' ? JSON.parse(d.p) : d.p; } catch(e) { pestObj = {}; }
            if (!pestObj || Object.keys(pestObj).length === 0) { pestObj = { "Serangan Umum": d.ls }; }

            Object.entries(pestObj).forEach(([pestName, luasSerangPerosak]) => {
                const coord = d.c.split(',').map(Number);
                const luasS = parseFloat(luasSerangPerosak) || 0;
                const luasT = parseFloat(d.lt) || 0;
                const peratus = luasT > 0 ? ((luasS / luasT) * 100).toFixed(2) : 0;
                let sevVal = (d.pk && d.pk[pestName]) ? d.pk[pestName] : (d.k || 0);

                featuresArray.push({
                    "type": "Feature",
                    "geometry": { "type": "Point", "coordinates": [coord[1], coord[0]] },
                    "properties": {
                        "ID": d.id, "Tarikh": d.t, "Negeri": d.n, "Daerah": d.d,
                        "Lokasi": d.l, "Tanaman": d.tn, "Perosak": pestName,          
                        "Luas_Tanam_Ha": luasT, "Luas_Serangan_Ha": luasS,             
                        "Peratus_Serangan": parseFloat(peratus), "Keterukan": "T" + sevVal, "Pegawai": d.pg
                    }
                });
            });
        });

        const geojson = { "type": "FeatureCollection", "features": featuresArray };
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(geojson));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "PNR_Data_Spatial_Individu.geojson");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    },

    downloadKML: function() {
        if (!AppState.fData.length) { alert("Tiada data!"); return; }
        
        const colorMap = {
            "JOHOR": "ff0000ff", "KEDAH": "ff00ff00", "KELANTAN": "ff00a5ff",
            "MELAKA": "ffff00ff", "NEGERI SEMBILAN": "ff13458b", "PAHANG": "ff00ffff",
            "PERAK": "ffff0000", "PERLIS": "ff800080", "PULAU PINANG": "ffffff00",
            "SABAH": "ff0080ff", "SARAWAK": "ffcbc0ff", "SELANGOR": "ff000080",
            "TERENGGANU": "ffd0e040", "W.P. KUALA LUMPUR": "ff808080",
            "W.P. LABUAN": "ff008000", "W.P. PUTRAJAYA": "ff8080c0", "HQ / IBU PEJABAT": "ff000000"
        };

        let kml = `<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2">\n<Document>\n    <name>Laporan Spatial PNR</name>\n`;

        AppState.fData.forEach(d => {
            let pestObj = {};
            try { pestObj = typeof d.p === 'string' ? JSON.parse(d.p) : d.p; } catch(e) { pestObj = {}; }
            if (!pestObj || Object.keys(pestObj).length === 0) { pestObj = { "Serangan Umum": d.ls }; }

            Object.entries(pestObj).forEach(([pestName, luasSerangPerosak]) => {
                const coord = d.c.split(',').map(Number);
                const luasS = parseFloat(luasSerangPerosak) || 0;
                const luasT = parseFloat(d.lt) || 0;
                const peratus = luasT > 0 ? ((luasS / luasT) * 100) : 0;
                
                const namaNegeri = (d.n || "").toUpperCase();
                const warna = colorMap[namaNegeri] || "ffffffff";
                const skala = Math.max(0.5, (peratus / 100) * 2.5).toFixed(1);
                let sevVal = (d.pk && d.pk[pestName]) ? d.pk[pestName] : (d.k || 0);

                kml += `
    <Placemark>
        <name><![CDATA[${pestName} - ${d.l}]]></name>
        <description><![CDATA[
            <table border="1" padding="5" style="border-collapse:collapse; font-family:Arial; font-size:12px;">
                <tr><td bgcolor="#f2f2f2"><b>PEROSAK</b></td><td><b>${pestName}</b></td></tr>
                <tr><td bgcolor="#f2f2f2"><b>LOKASI</b></td><td>${d.l}</td></tr>
                <tr><td bgcolor="#f2f2f2"><b>TANAMAN</b></td><td>${d.tn}</td></tr>
                <tr><td bgcolor="#f2f2f2"><b>LUAS TANAM</b></td><td>${luasT.toFixed(2)} Ha</td></tr>
                <tr><td bgcolor="#f2f2f2"><b>LUAS SERANGAN</b></td><td><font color="red">${luasS.toFixed(2)} Ha</font></td></tr>
                <tr><td bgcolor="#f2f2f2"><b>PERATUS</b></td><td><b>${peratus.toFixed(1)}%</b></td></tr>
                <tr><td bgcolor="#f2f2f2"><b>KETERUKAN</b></td><td>Tahap ${sevVal}</td></tr>
                <tr><td bgcolor="#f2f2f2"><b>TARIKH</b></td><td>${d.t}</td></tr>
            </table>
        ]]></description>
        <Style>
            <IconStyle><color>${warna}</color><scale>${skala}</scale><Icon><href>http://maps.google.com/mapfiles/kml/shapes/shaded_dot.png</href></Icon></IconStyle>
            <LabelStyle><scale>0</scale></LabelStyle>
        </Style>
        <Point><coordinates>${coord[1]},${coord[0]},0</coordinates></Point>
    </Placemark>`;
            });
        });

        kml += `\n</Document></kml>`;
        
        const blob = new Blob([kml], {type: 'application/vnd.google-earth.kml+xml'});
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = "PNR_Data_Perosak.kml";
        document.body.appendChild(a); a.click(); document.body.removeChild(a); window.URL.revokeObjectURL(url);
    }
};

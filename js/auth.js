// ==========================================
// FAIL: js/auth.js
// FUNGSI: Pengurusan Log Masuk, Daftar, Sesi, dan Sekuriti
// ==========================================

const AuthManager = {

    doLogin: async function() {
        const u = document.getElementById('uid').value; 
        const p = document.getElementById('pwd').value; 
        const btn = document.getElementById('btnLogin'); 
        const msg = document.getElementById('loginMsg');
        
        if(!u || !p) { msg.innerText = "Sila isi ID dan Kata Laluan"; return; }
        
        btn.disabled = true; 
        btn.innerText = "Memproses...";
        
        const r = await API.postData('login', { u, p });
        
        if(r.success) {
            const sessionData = { uProf: r, userToken: r.token, currentUserID: u };
            localStorage.setItem('pnr_session', JSON.stringify(sessionData));
            await AuthManager.applyLogin(r, r.token, u);
        } else { 
            msg.innerText = r.message; 
            btn.disabled = false; 
            btn.innerText = "MASUK"; 
        }
    },

    applyLogin: async function(r, token, uid) {
        // Set ke dalam Global State
        AppState.uProf = r; 
        AppState.userToken = token; 
        AppState.currentUserID = uid;
        
        document.getElementById('uDisp').innerText = r.name; 
        document.getElementById('loginOverlay').style.display = 'none';
        
        // Logik Paparan Navigasi berdasarkan Role
        const role = (r.role || "").toUpperCase();
        if(["ADMIN","PENYELIA"].includes(role)) { 
            document.getElementById('navVerify').style.display = "flex"; 
            if(document.getElementById('mobNavVerify')) document.getElementById('mobNavVerify').style.display = "flex";
            // DashboardManager.checkPendingCount(); // Akan dipanggil nanti bila fail kpi/dashboard siap
        } else {
            // Untuk staff biasa, paparkan butang tugas di phone
            if(document.getElementById('mobNavTasks')) document.getElementById('mobNavTasks').style.display = "flex";
        }
        
        if(role === "ADMIN") {
            document.getElementById('navUsers').style.display = "flex";
            const navEff = document.getElementById('navEfficiency');
            if (navEff) navEff.style.display = "flex";
            const navRed = document.getElementById('navRedundant');
            if (navRed) navRed.style.display = "flex";
            const navTum = document.getElementById('navTumpuan');
            if (navTum) navTum.style.display = "flex";
        }
        
        document.getElementById('navTasks').style.display = "flex";
        
        // ⚡ Panggil fungsi-fungsi init dari modul lain SECARA BERGILIR (Sequential)
        // Ini mengelakkan ralat 404 dari Google Apps Script 'echo' URL kerana rate limit
        if (typeof DataManager !== 'undefined') await DataManager.loadMasterData(); 
        if (typeof TaskManager !== 'undefined') await TaskManager.loadMyTasks();
        if (typeof DashboardManager !== 'undefined') await DashboardManager.initDash();
    },

    checkSession: async function() {
        const saved = localStorage.getItem('pnr_session');
        if (saved) {
            try {
                const s = JSON.parse(saved);
                if (s.uProf && s.userToken) {
                    await AuthManager.applyLogin(s.uProf, s.userToken, s.currentUserID);
                    
                    // Hantar log ke server jika ada internet
                    if (navigator.onLine) {
                        API.postData('logSession', { name: s.uProf.name, role: s.uProf.role }).catch(e=>{});
                    } else {
                        console.log("Offline Login: Menggunakan sesi simpanan.");
                        const summary = document.getElementById('smartSummary');
                        if(summary) summary.innerHTML = `<div class="alert alert-warning mb-0"><i class="bi bi-wifi-off"></i> Mod Offline: Anda sedang menggunakan data simpanan.</div>`;
                    }
                }
            } catch (e) {
                console.error("Session rosak", e);
            }
        }
    },

    doLogout: function() { 
        localStorage.removeItem('pnr_session'); 
        location.reload(); 
    },

  toggleDaftar: async function() {
        // Ambil nilai dari borang HTML
        const nama = document.getElementById('reg-nama').value.trim();
        const ic = document.getElementById('reg-ic').value.trim();
        const jawatan = document.getElementById('reg-jawatan').value.trim();
        const negeri = document.getElementById('reg-negeri').value;
        const uid = document.getElementById('reg-uid').value.trim();
        const pwd = document.getElementById('reg-pwd').value.trim();

        if(!nama || !ic || !jawatan || !negeri || !uid || !pwd) {
            Swal.fire('Maklumat Tidak Lengkap', 'Sila isi SEMUA maklumat yang diwajibkan!', 'warning');
            return;
        }

        const formValues = { 
            nama: nama.toUpperCase(), ic: ic, jawatan: jawatan.toUpperCase(), 
            negeri: negeri, uid: uid.toLowerCase(), pwd: pwd,
            role: "STAFF", status: "MENUNGGU", catatan: "Didaftar melalui Web PNR"
        };

        Swal.fire({ title: 'Menghantar Pendaftaran...', allowOutsideClick: false, showConfirmButton: false, didOpen: () => Swal.showLoading() });
        const r = await API.postData('registerUser', formValues);
        
        if (r.success) {
            Swal.fire({ icon: 'success', title: 'Berjaya!', text: r.message, confirmButtonColor: '#198754' }).then(() => {
                // Kembali ke paparan log masuk
                document.getElementById('formDaftar').style.display = 'none';
                document.getElementById('formLogin').style.display = 'block';
                // Kosongkan form
                ['reg-nama','reg-ic','reg-jawatan','reg-negeri','reg-uid','reg-pwd'].forEach(id => document.getElementById(id).value = '');
            });
        } else {
            Swal.fire('Gagal Mendaftar', r.message, 'error');
        }
    },
    
    lupaKatalaluan: async function() {
        await Swal.fire('Pemulihan akses', 'Hubungi pentadbir PNR untuk pengesahan identiti dan penetapan kata laluan baharu.', 'info');
    }
};

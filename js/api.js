// ==========================================
// FAIL: js/api.js
// FUNGSI: Menguruskan komunikasi dengan API Vercel + Supabase
// ==========================================

const API = {
    // Peta action lama (GAS) ke route baru (Vercel)
    routeMap: {
        'login': '/auth/login',
        'registerUser': '/auth/register',
        'verifyForgotPwd': '/auth/forgot-password',
        'updateMyAccess': '/auth/update-access',
        'trackActivity': '/auth/activity',
        'auditLogs': '/users/audit',
        'logSession': '/auth/log-session',
        'getAnalytics': '/data/analytics',
        'getTanamanList': '/data/master-tanaman',
        'getPending': '/data/pending',
        'submitVerify': '/data/verify',
        'updateEntry': '/data/update-entry',
        'deleteEntry': '/data/delete-entry',
        'getMyTasks': '/data/my-tasks',
        'getSingleRecord': '/data/single-record',
        'getKPIData': '/data/kpi',
        'getTanamanTumpuan': '/data/tumpuan',
        'getIgnoredRedundant': '/data/redundant',
        'ignoreRedundant': '/data/redundant',
        'getUserList': '/users/list',
        'updateUser': '/users/update',
        'deleteUser': '/users/delete',
        'uploadImageOnly': '/gdrive/upload'
    },

    refreshPromise: null,
    refreshSession: async function() {
        if(this.refreshPromise)return this.refreshPromise;
        const session=JSON.parse(localStorage.getItem('pnr_session')||'null');
        if(!session?.uProf?.refreshToken || session.uProf.expiresAt*1000>Date.now()+60000)return;
        this.refreshPromise=(async()=>{
            const res=await fetch(CONFIG.API_URL+'/auth/refresh',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({refreshToken:session.uProf.refreshToken})});
            const data=await res.json();
            if(!data.success)throw new Error(data.message||'Sesi tamat.');
            Object.assign(session.uProf,data);session.userToken=data.token;
            localStorage.setItem('pnr_session',JSON.stringify(session));
            AppState.userToken=data.token;Object.assign(AppState.uProf,data);
        })();
        try{await this.refreshPromise;}finally{this.refreshPromise=null;}
    },
    postData: async function(action, payloadData = {}) {
        try {
            if(!['login','registerUser','verifyForgotPwd'].includes(action)&&navigator.onLine)await this.refreshSession();
            let payload = { ...payloadData };
            let headers = {
                "Content-Type": "application/json"
            };
            
            // Masukkan token sekuriti jika ia bukan laluan bebas
            if (!CONFIG.FREE_ROUTES.includes(`auth/${action}`) && !CONFIG.FREE_ROUTES.includes(action)) {
                if (AppState.userToken) {
                    headers["Authorization"] = `Bearer ${AppState.userToken}`;
                }
                payload.u = AppState.currentUserID;
            }
            
            // Tentukan URL Vercel berdasarkan action
            const route = this.routeMap[action];
            if (!route) {
                console.error(`Route tidak dijumpai untuk action: ${action}`);
                return { success: false, message: "Aksi tidak sah." };
            }


            const url = `${CONFIG.API_URL}${route}`;

            // ⚡ Hantar request terus ke Vercel (tiada delay/queue diperlukan)
            const res = await fetch(url, { 
                method: "POST", 
                headers: headers,
                body: JSON.stringify(payload) 
            });
            
            const responseData = await res.json();

            // Tangkap ralat jika sesi tamat (Token Expired/Unauthorized)
            if (res.status === 401) {
                alert("⛔ Sesi tamat. Sila log masuk semula."); 
                if (typeof AuthManager!=='undefined' && action!=='login') AuthManager.doLogout();
                return { success: false, message: responseData.message || "Sesi tamat." }; 
            }
            
            return responseData;
            
        } catch (e) {
            console.error("Fetch Error:", e);
            return { success: false, message: "Ralat sambungan pelayan. Sila semak internet anda." }; 
        }
    }
};

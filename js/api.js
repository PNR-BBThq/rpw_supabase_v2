
// ==========================================
// FAIL: js/api.js
// FUNGSI: Menguruskan komunikasi dengan Google Apps Script (Backend)
// ==========================================

const API = {
    postData: async function(action, payloadData = {}) {
        try {
            let payload = { action: action, ...payloadData };
            
            // Masukkan token sekuriti jika ia bukan laluan bebas (cth: bukan login/register)
            if (!CONFIG.FREE_ROUTES.includes(action)) {
                payload.token = AppState.userToken;
                payload.u = AppState.currentUserID;
            }
            
            // ⚡ KRITIKAL: Hantar request ke Google Apps Script
            // Kita gunakan JSONP (script injection) untuk 100% memintas isu CORS
            // dan sekatan Third-Party Cookies (Incognito) di pelayan Google.
            const payloadString = JSON.stringify(payload);
            const requestUrl = `${CONFIG.API_URL}?action=${action}&payload=${encodeURIComponent(payloadString)}`;
            
            const textResponse = await new Promise((resolve, reject) => {
                const callbackName = 'jsonp_cb_' + Math.round(1000000 * Math.random());
                
                // Fungsi callback yang akan dipanggil oleh GAS
                window[callbackName] = function(data) {
                    delete window[callbackName];
                    document.body.removeChild(script);
                    resolve(JSON.stringify(data));
                };
                
                const script = document.createElement('script');
                script.src = requestUrl + '&callback=' + callbackName;
                script.onerror = function() {
                    delete window[callbackName];
                    document.body.removeChild(script);
                    resolve('<error>Gagal berhubung dengan pelayan</error>');
                };
                
                document.body.appendChild(script);
                
                // Timeout 15 saat jika pelayan tersangkut
                setTimeout(() => {
                    if (window[callbackName]) {
                        delete window[callbackName];
                        if (script.parentNode) document.body.removeChild(script);
                        resolve('<error>Pelayan tidak memberi respon (Timeout)</error>');
                    }
                }, 15000);
            });
            
            // Semak jika response adalah HTML atau ralat
            if (textResponse.trim().startsWith('<')) {
                console.error("CRITICAL: Pelayan Google Apps Script memulangkan ralat HTML! Kandungan ralat:", textResponse);
                return { 
                    success: false, 
                    message: "Ralat pada pelayan Backend (Sila rujuk Console Log untuk butiran ralat HTML dari Google)." 
                };
            }

            const responseData = JSON.parse(textResponse);

            // Tangkap ralat jika sesi tamat (Token Expired)
            if (!CONFIG.FREE_ROUTES.includes(action) && responseData.success === false && 
                responseData.message && (responseData.message.includes("sesi") || responseData.message.includes("token"))) {
                alert("⛔ Sesi tamat. Sila log masuk semula."); 
                AuthManager.doLogout();
                return { success: false }; 
            }
            
            return responseData;
            
        } catch(e) { 
            console.error("API Error:", e); 
            return { success: false, message: "Ralat sambungan pelayan. Sila semak internet anda." }; 
        }
    }
};

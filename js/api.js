// ==========================================
// FAIL: js/api.js
// FUNGSI: Menguruskan komunikasi dengan Google Apps Script (Backend)
// ==========================================
// FAIL: js/api.js
// FUNGSI: Menguruskan komunikasi dengan Google Apps Script (Backend)
// ==========================================

let isProcessingQueue = false;
let requestQueue = [];

const API = {
    postData: function(action, payloadData = {}) {
        return new Promise((resolve, reject) => {
            requestQueue.push({ action, payloadData, resolve, reject });
            API._processQueue();
        });
    },
    
    _processQueue: async function() {
        if (isProcessingQueue || requestQueue.length === 0) return;
        isProcessingQueue = true;
        
        while (requestQueue.length > 0) {
            const req = requestQueue.shift();
            try {
                // Sengaja letak delay 500ms antara setiap panggilan supaya Google Apps Script 'bernafas'
                await new Promise(r => setTimeout(r, 500));
                const res = await API._executePostData(req.action, req.payloadData);
                req.resolve(res);
            } catch (err) {
                req.reject(err);
            }
        }
        isProcessingQueue = false;
    },

    _executePostData: async function(action, payloadData = {}) {
        try {
            let payload = { action: action, ...payloadData };
            
            // Masukkan token sekuriti jika ia bukan laluan bebas (cth: bukan login/register)
            if (!CONFIG.FREE_ROUTES.includes(action)) {
                payload.token = AppState.userToken;
                payload.u = AppState.currentUserID;
            }
            
            // ⚡ KRITIKAL: Hantar request ke Google Apps Script
            // - JANGAN set Content-Type header → ini mencetuskan preflight OPTIONS request
            //   yang Google Apps Script TIDAK sokong (menyebabkan CORS block).
            // - Gunakan redirect: 'follow' → GAS redirect ke URL exec selepas deployment.
            
            let res;
            let textResponse;
            let retryCount = 0;
            const maxRetries = 2; // Retry 2 kali jika pelayan GAS error (404/HTML)
            
            while (retryCount <= maxRetries) {
                res = await fetch(`${CONFIG.API_URL}?action=${action}`, { 
                    method: "POST", 
                    headers: {
                        "Content-Type": "text/plain;charset=utf-8"
                    },
                    redirect: "follow",
                    body: JSON.stringify(payload) 
                });
                
                textResponse = await res.text();
                
                // Semak jika response adalah HTML (berlaku jika ada ralat pada backend GAS atau isu kuki 404)
                if (textResponse.trim().startsWith('<')) {
                    console.warn(`[API] Ralat HTML dikesan untuk aksi '${action}'. Percubaan semula ${retryCount + 1}/${maxRetries}...`);
                    retryCount++;
                    if (retryCount <= maxRetries) {
                        await new Promise(r => setTimeout(r, 1000)); // Tunggu 1 saat sebelum retry
                        continue;
                    }
                } else {
                    break; // Berjaya dapat JSON
                }
            }

            if (textResponse.trim().startsWith('<')) {
                console.error("CRITICAL: Pelayan Google Apps Script masih memulangkan ralat HTML selepas cuba semula! Kandungan ralat:", textResponse);
                return { 
                    success: false, 
                    message: "⛔ Ralat Sambungan Pelayan (Gagal menyambung ke pangkalan data). Sila muat semula aplikasi." 
                };
            }

            const responseData = JSON.parse(textResponse);

            // Tangkap ralat jika sesi tamat (Token Expired)
            if (!CONFIG.FREE_ROUTES.includes(action) && responseData.success === false && responseData.message && (responseData.message.includes("sesi") || responseData.message.includes("token"))) {
                alert("⛔ Sesi tamat. Sila log masuk semula."); 
                AuthManager.doLogout();
                return { success: false }; 
            }
            
            return responseData;
            
        } catch (e) {
            console.error("Fetch Error:", e);
            return { success: false, message: "Ralat sambungan pelayan. Sila semak internet anda." }; 
        }
    }
};

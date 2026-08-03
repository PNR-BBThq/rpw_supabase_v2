
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
            // - JANGAN set Content-Type header → ini mencetuskan preflight OPTIONS request
            //   yang Google Apps Script TIDAK sokong (menyebabkan CORS block).
            // - Gunakan redirect: 'follow' → GAS redirect ke URL exec selepas deployment.
            const res = await fetch(`${CONFIG.API_URL}?action=${action}`, { 
                method: "POST", 
                redirect: "follow",
                body: JSON.stringify(payload) 
            });
            
            const textResponse = await res.text();
            
            // Semak jika response adalah HTML (berlaku dalam Incognito sebab 3rd-party cookies disekat oleh Google Apps Script)
            if (textResponse.trim().startsWith('<')) {
                console.warn("API memulangkan HTML. Ini biasanya berlaku dalam mod Incognito (Third-Party Cookies disekat).");
                return { 
                    success: false, 
                    message: "Mod Incognito / Private dikesan. Sila benarkan 'Third-Party Cookies' atau gunakan mod browser biasa untuk sambungan API yang stabil." 
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

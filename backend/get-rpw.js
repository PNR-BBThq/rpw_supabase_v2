export default async function handler(req, res) {
  // Hanya benarkan permintaan GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const SUPABASE_URL = process.env.RAHSIA_URL_SUPABASE;
  const SUPABASE_KEY = process.env.RAHSIA_KEY_SUPABASE;

  try {
    let semuaData = [];
    let mulaRow = 0;
    const saizBatch = 1000;
    let adaLagi = true;

    // ENJIN LOOPING VERCEL: Sedut 1000, 1000, 1000 sampai habis
    while (adaLagi) {
      let akhirRow = mulaRow + saizBatch - 1;
      
      const response = await fetch(`${SUPABASE_URL}/rest/v1/tangkapan_rpw?select=*`, {
        method: "GET",
        headers: {
          "apikey": SUPABASE_KEY,
          "Authorization": `Bearer ${SUPABASE_KEY}`,
          "Content-Type": "application/json",
          "Range-Unit": "items",
          "Range": `${mulaRow}-${akhirRow}` // Minta batch seterusnya
        }
      });

      if (!response.ok) throw new Error("Gagal tarik dari Supabase");
      
      const dataBatch = await response.json();
      semuaData = semuaData.concat(dataBatch);

      // Kalau data yang dapat tu ngam-ngam 1000, maksudnya ada baki lagi
      if (dataBatch.length === saizBatch) {
        mulaRow += saizBatch;
      } else {
        // Kalau kurang dari 1000, maksudnya dah habis sedut
        adaLagi = false;
      }
    }
    
    // Hantar SEMUA data yang dah digabung sekaligus ke HTML kau
    res.status(200).json(semuaData);
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

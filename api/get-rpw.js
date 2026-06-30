export default async function handler(req, res) {
  // Hanya benarkan permintaan GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Tarik rahsia dari Peti Besi Vercel (Environment Variables)
  const SUPABASE_URL = process.env.RAHSIA_URL_SUPABASE;
  const SUPABASE_KEY = process.env.RAHSIA_KEY_SUPABASE;

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/tangkapan_rpw?select=*`, {
      method: "GET",
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) throw new Error("Gagal tarik dari Supabase");
    
    const data = await response.json();
    
    // Hantar data kembali ke HTML kau
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

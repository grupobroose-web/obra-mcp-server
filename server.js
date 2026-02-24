import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

// Health check
app.get("/", (req, res) => {
  res.json({ status: "MCP server running 🚀" });
});

// Criar gasto
app.post("/criar-gasto", async (req, res) => {
  try {
    const { obra_id, descricao, valor, tipo } = req.body;

    const response = await fetch(`${SUPABASE_URL}/rest/v1/gastos`, {
      method: "POST",
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        "Prefer": "return=representation"
      },
      body: JSON.stringify({
        obra_id,
        descricao,
        valor,
        tipo
      })
    });

    const data = await response.json();
    res.json({ success: true, data });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

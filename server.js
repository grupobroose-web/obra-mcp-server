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
    const apiKey = req.headers["x-api-key"];

  if (!apiKey || apiKey !== process.env.API_KEY) {
    return res.status(401).json({ success: false, message: "Não autorizado" });
  }
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

// Criar obra
app.post("/criar-obra", async (req, res) => {
  const apiKey = req.headers["x-api-key"];

  if (!apiKey || apiKey !== process.env.API_KEY) {
    return res.status(401).json({ success: false, message: "Não autorizado" });
  }

  try {
    const { usuario_id, nome_obra, valor_total } = req.body;

    if (!usuario_id || !nome_obra) {
      return res.status(400).json({
        success: false,
        message: "Campos obrigatórios: usuario_id, nome_obra",
      });
    }

    const response = await fetch(`${SUPABASE_URL}/rest/v1/obras`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        usuario_id,
        nome_obra,
        valor_total: valor_total ?? null,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ success: false, data });
    }

    return res.json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Listar obras por usuario
app.get("/obras", async (req, res) => {
  const apiKey = req.headers["x-api-key"];

  if (!apiKey || apiKey !== process.env.API_KEY) {
    return res.status(401).json({ success: false, message: "Não autorizado" });
  }

  const { usuario_id } = req.query;

  if (!usuario_id) {
    return res
      .status(400)
      .json({ success: false, message: "Campo obrigatório: usuario_id" });
  }

  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/obras?usuario_id=eq.${usuario_id}&select=*`,
      {
        method: "GET",
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const data = await response.json();

    // Se Supabase retornar erro, costuma vir com "message"
    if (!response.ok) {
      return res.status(response.status).json({ success: false, data });
    }

    return res.json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Listar gastos por obra
app.get("/gastos", async (req, res) => {
  const apiKey = req.headers["x-api-key"];

  if (!apiKey || apiKey !== process.env.API_KEY) {
    return res.status(401).json({ success: false, message: "Não autorizado" });
  }

  const { obra_id } = req.query;

  if (!obra_id) {
    return res
      .status(400)
      .json({ success: false, message: "Campo obrigatório: obra_id" });
  }

  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/gastos?obra_id=eq.${obra_id}&select=*`,
      {
        method: "GET",
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ success: false, data });
    }

    return res.json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

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

// Resumo do mês por obra
app.get("/resumo-mes", async (req, res) => {
  const apiKey = req.headers["x-api-key"];

  if (!apiKey || apiKey !== process.env.API_KEY) {
    return res.status(401).json({ success: false, message: "Não autorizado" });
  }

  const { obra_id, mes, ano } = req.query;

  if (!obra_id || !mes || !ano) {
    return res.status(400).json({
      success: false,
      message: "Campos obrigatórios: obra_id, mes, ano",
    });
  }

  // mes: 1-12
  const m = String(mes).padStart(2, "0");
  const start = `${ano}-${m}-01`;

  // calcula o primeiro dia do próximo mês
  const nextMonth = Number(mes) === 12 ? 1 : Number(mes) + 1;
  const nextYear = Number(mes) === 12 ? Number(ano) + 1 : Number(ano);
  const nm = String(nextMonth).padStart(2, "0");
  const end = `${nextYear}-${nm}-01`;

  try {
    // Busca gastos do mês daquela obra
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/gastos?obra_id=eq.${obra_id}&created_at=gte.${start}&created_at=lt.${end}&select=*`,
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

    // agrega no servidor
    const total = data.reduce((acc, g) => acc + (Number(g.valor) || 0), 0);

    const porTipo = data.reduce((acc, g) => {
      const tipo = (g.tipo || "outros").toLowerCase();
      acc[tipo] = (acc[tipo] || 0) + (Number(g.valor) || 0);
      return acc;
    }, {});

    // top 5 maiores gastos
    const top5 = [...data]
      .sort((a, b) => (Number(b.valor) || 0) - (Number(a.valor) || 0))
      .slice(0, 5);

    return res.json({
      success: true,
      obra_id,
      periodo: { mes: Number(mes), ano: Number(ano), start, end },
      qtd_lancamentos: data.length,
      total,
      por_tipo: porTipo,
      top5,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ===== Helpers: mês/ano PT-BR =====
const MONTHS_PT = {
  janeiro: 1, jan: 1,
  fevereiro: 2, fev: 2,
  marco: 3, março: 3, mar: 3,
  abril: 4, abr: 4,
  maio: 5, mai: 5,
  junho: 6, jun: 6,
  julho: 7, jul: 7,
  agosto: 8, ago: 8,
  setembro: 9, set: 9,
  outubro: 10, out: 10,
  novembro: 11, nov: 11,
  dezembro: 12, dez: 12,
};

function normalizeText(s = "") {
  return String(s)
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "") // remove acentos
    .trim();
}

function parseMonthYear(texto) {
  const t = normalizeText(texto);
  const now = new Date();
  let year = now.getFullYear();
  let month = null;

  // 1) procura "setembro", "set", etc.
  for (const [k, v] of Object.entries(MONTHS_PT)) {
    if (t.includes(k)) {
      month = v;
      break;
    }
  }

  // 2) procura formato 09/2026, 09-2026, 9/26 etc.
  const mY = t.match(/\b(0?[1-9]|1[0-2])\s*[\/\-\.]\s*(\d{2}|\d{4})\b/);
  if (mY) {
    month = Number(mY[1]);
    const yy = mY[2];
    year = yy.length === 2 ? Number(`20${yy}`) : Number(yy);
  }

  // 3) procura ano solto 2026
  const yOnly = t.match(/\b(20\d{2})\b/);
  if (yOnly) year = Number(yOnly[1]);

  // fallback: se não achou mês, usa mês atual
  if (!month) month = now.getMonth() + 1;

  const mm = String(month).padStart(2, "0");
  const start = `${year}-${mm}-01`;

  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const nmm = String(nextMonth).padStart(2, "0");
  const end = `${nextYear}-${nmm}-01`;

  return { month, year, start, end };
}

function tryFindObraByName(texto, obras = []) {
  const t = normalizeText(texto);
  // tenta achar pelo nome da obra (substring)
  // se achar mais de uma, pega a primeira mais longa (mais específica)
  const matches = obras
    .map(o => ({ o, name: normalizeText(o.nome_obra || "") }))
    .filter(x => x.name && t.includes(x.name));

  if (!matches.length) return null;

  matches.sort((a, b) => b.name.length - a.name.length);
  return matches[0].o;
}

// ===== Endpoint: PERGUNTA =====
app.post("/pergunta", async (req, res) => {
  const apiKey = req.headers["x-api-key"];

  if (!apiKey || apiKey !== process.env.API_KEY) {
    return res.status(401).json({ success: false, message: "Não autorizado" });
  }

  const { usuario_id, texto } = req.body || {};
  if (!usuario_id || !texto) {
    return res.status(400).json({
      success: false,
      message: "Campos obrigatórios: usuario_id, texto",
    });
  }

  const { month, year, start, end } = parseMonthYear(texto);

  try {
    // 1) Buscar obras do usuário
    const obrasResp = await fetch(
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

    const obras = await obrasResp.json();
    if (!obrasResp.ok) {
      return res.status(obrasResp.status).json({ success: false, data: obras });
    }

    if (!Array.isArray(obras) || obras.length === 0) {
      return res.json({
        success: true,
        resposta: "Você ainda não tem nenhuma obra cadastrada. Quer que eu crie uma obra? (Ex: 'criar obra Casa Verde')",
        detalhes: { month, year, total: 0, por_tipo: {}, qtd_lancamentos: 0, top5: [] },
      });
    }

    // 2) Se o texto citar nome da obra, tenta filtrar por ela. Se não, soma todas.
    const obraEncontrada = tryFindObraByName(texto, obras);
    const obraIds = obraEncontrada ? [obraEncontrada.id] : obras.map(o => o.id);

    // 3) Buscar gastos do período para essas obras
    // Supabase REST: obra_id=in.(id1,id2,...) e filtro de created_at
    const inList = obraIds.map(id => `"${id}"`).join(",");
    const urlGastos =
      `${SUPABASE_URL}/rest/v1/gastos` +
      `?obra_id=in.(${encodeURIComponent(inList)})` +
      `&created_at=gte.${start}` +
      `&created_at=lt.${end}` +
      `&select=*`;

    const gastosResp = await fetch(urlGastos, {
      method: "GET",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
      },
    });

    const gastos = await gastosResp.json();
    if (!gastosResp.ok) {
      return res.status(gastosResp.status).json({ success: false, data: gastos });
    }

    const total = (gastos || []).reduce((acc, g) => acc + (Number(g.valor) || 0), 0);

    const porTipo = (gastos || []).reduce((acc, g) => {
      const tipo = normalizeText(g.tipo || "outros");
      acc[tipo] = (acc[tipo] || 0) + (Number(g.valor) || 0);
      return acc;
    }, {});

    const top5 = [...(gastos || [])]
      .sort((a, b) => (Number(b.valor) || 0) - (Number(a.valor) || 0))
      .slice(0, 5);

    const obraLabel = obraEncontrada ? `na obra "${obraEncontrada.nome_obra}"` : "somando todas as suas obras";
    const resposta =
      `No mês ${month}/${year}, ${obraLabel}, você teve **R$ ${total.toFixed(2)}** em gastos. ` +
      (Object.keys(porTipo).length
        ? `Principais tipos: ${Object.entries(porTipo)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([k, v]) => `${k}: R$ ${Number(v).toFixed(2)}`)
            .join(" | ")}.`
        : "");

    return res.json({
      success: true,
      resposta,
      detalhes: {
        month,
        year,
        periodo: { start, end },
        obra: obraEncontrada ? { id: obraEncontrada.id, nome_obra: obraEncontrada.nome_obra } : null,
        qtd_lancamentos: (gastos || []).length,
        total,
        por_tipo: porTipo,
        top5,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Vincular WhatsApp (wa_id) a um usuario_id
app.post("/vincular-whatsapp", async (req, res) => {
  const apiKey = req.headers["x-api-key"];
  if (!apiKey || apiKey !== process.env.API_KEY) {
    return res.status(401).json({ success: false, message: "Não autorizado" });
  }

  const { wa_id, usuario_id } = req.body || {};
  if (!wa_id || !usuario_id) {
    return res.status(400).json({
      success: false,
      message: "Campos obrigatórios: wa_id, usuario_id",
    });
  }

  try {
    // upsert usando querystring do PostgREST
    const response = await fetch(`${SUPABASE_URL}/rest/v1/contatos_whatsapp`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=representation",
      },
      body: JSON.stringify({ wa_id, usuario_id }),
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

// Descobrir usuario_id pelo wa_id
app.get("/usuario-por-whatsapp", async (req, res) => {
  const apiKey = req.headers["x-api-key"];
  if (!apiKey || apiKey !== process.env.API_KEY) {
    return res.status(401).json({ success: false, message: "Não autorizado" });
  }

  const { wa_id } = req.query;
  if (!wa_id) {
    return res.status(400).json({ success: false, message: "Campo obrigatório: wa_id" });
  }

  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/contatos_whatsapp?wa_id=eq.${encodeURIComponent(wa_id)}&select=wa_id,usuario_id`,
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

    const row = Array.isArray(data) ? data[0] : null;
    if (!row) {
      return res.json({ success: true, found: false, message: "WhatsApp ainda não vinculado" });
    }

    return res.json({ success: true, found: true, data: row });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

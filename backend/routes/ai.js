import express from "express";

const router = express.Router();

router.post("/chat", async (req, res) => {
  const { message, system } = req.body;

  console.log("👉 Incoming:", message);
  console.log("👉 Using model:", process.env.OLLAMA_MODEL);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000); // 60s timeout

    const response = await fetch(`${process.env.OLLAMA_URL}/api/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: process.env.OLLAMA_MODEL || "llama3.1:8b",
        prompt: `
${system || "You are a helpful AI assistant."}

Task:
Generate exactly 3 high-quality calculus practice questions.

Rules:
- ONLY give questions (no solutions)
- Use correct math
- Do NOT invent formulas
- Maintain JEE-level difficulty

User Input:
${message}

Output Format:
1. Question
2. Question
3. Question
        `,
        stream: false,
        options: {
          temperature: 0.3,
          num_predict: 150,
        },
      }),
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const data = await response.json();

    console.log("👉 Ollama:", data);

    if (!data || !data.response) {
      return res.json({
        reply: "⚠️ Model returned empty output (try smaller input or lighter model)",
      });
    }

    res.json({
      reply: data.response.trim(),
    });

  } catch (err) {
    console.error("🔥 ERROR:", err.message);

    let errorMessage = "⚠️ Ollama error";

    if (err.name === "AbortError") {
      errorMessage = "⚠️ Request timeout (model too slow)";
    } else if (err.message.includes("fetch")) {
      errorMessage = "⚠️ Cannot connect to Ollama";
    }

    res.status(500).json({
      reply: errorMessage,
    });
  }
});

export default router;
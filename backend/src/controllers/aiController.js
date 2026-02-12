function rolePrompt(role) {
  if (role === "citizen") {
    return [
      "Ты AI-помощник для жителя городского приложения.",
      "Помогаешь оформить заявку: описание, фото, геолокация, приоритет.",
      "Если приложено фото, опиши видимую проблему простым языком без выдуманных деталей.",
      "Пиши кратко на русском, 2-4 предложения, практично и без воды.",
      "Если данных недостаточно — попроси только самые важные недостающие пункты.",
    ].join(" ");
  }

  if (role === "worker") {
    return [
      "Ты AI-помощник для исполнителя заявок.",
      "Твоя цель: подсказать, какую задачу брать первой, учитывая приоритет, просрочку и статус.",
      "Никогда не используй технические id заявок в ответе, используй человеческое название задачи.",
      "Пиши без лишних скобок и без служебных меток.",
      "Пиши кратко на русском, с чёткой рекомендацией и коротким обоснованием.",
    ].join(" ");
  }

  return [
    "Ты AI-помощник администратора-диспетчера.",
    "Твоя цель: предложить, какую задачу назначить первой и как выбрать исполнителя по рейтингу/нагрузке.",
    "Не используй технические id заявок, формулируй рекомендацию по названию/содержанию заявки.",
    "Пиши без лишних скобок и без служебных меток.",
    "Пиши кратко на русском, с конкретным действием.",
  ].join(" ");
}

function normalizeRole(role) {
  if (role === "CITIZEN") return "citizen";
  if (role === "WORKER") return "worker";
  if (role === "ADMIN") return "admin";
  return null;
}

function extractOutputText(payload) {
  if (typeof payload?.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text.trim();
  }

  if (Array.isArray(payload?.response?.output)) {
    const nested = [];
    for (const item of payload.response.output) {
      const content = Array.isArray(item?.content) ? item.content : [];
      for (const c of content) {
        if (typeof c?.text === "string" && c.text.trim()) nested.push(c.text.trim());
        if (typeof c?.output_text === "string" && c.output_text.trim()) nested.push(c.output_text.trim());
      }
    }
    if (nested.length) return nested.join("\n").trim();
  }

  const parts = [];
  const output = Array.isArray(payload?.output) ? payload.output : [];
  for (const item of output) {
    const content = Array.isArray(item?.content) ? item.content : [];
    for (const c of content) {
      if (typeof c?.text === "string" && c.text.trim()) parts.push(c.text.trim());
    }
  }

  return parts.join("\n").trim();
}


async function requestOpenAI(env, system, message, contextJson, imageDataUrl, signal) {
  const model = imageDataUrl ? env.OPENAI_VISION_MODEL || "gpt-4.1-mini" : env.OPENAI_MODEL || "gpt-4.1-mini";
  const isGpt5 = String(model).toLowerCase().startsWith("gpt-5");
  const textPrompt = imageDataUrl
    ? `Контекст: ${contextJson}\n\nВопрос пользователя: ${message}\n\nЕсли фото не показывает явную неисправность, так и скажи. Не пиши шаблон “укажите объект и дефект”.`
    : `Контекст: ${contextJson}\n\nВопрос пользователя: ${message}`;
  const body = {
    model,
    max_output_tokens: isGpt5 ? 1024 : 280,
    input: imageDataUrl
      ? [
          { role: "system", content: [{ type: "input_text", text: system }] },
          {
            role: "user",
            content: [
              { type: "input_text", text: textPrompt },
              { type: "input_image", image_url: imageDataUrl },
            ],
          },
        ]
      : `${system}\n\n${textPrompt}`,
  };

  if (isGpt5) {
    body.reasoning = { effort: "minimal" };
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify(body),
    signal,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    return {
      ok: false,
      status: 502,
      error: {
        error: "AI_UPSTREAM_ERROR",
        details: payload?.error?.message || "OpenAI request failed",
        provider: "openai",
      },
    };
  }

  const answer = extractOutputText(payload);
  if (!answer) {
    const debug = {
      id: payload?.id,
      status: payload?.status,
      hasOutputText: Boolean(payload?.output_text),
      outputLen: Array.isArray(payload?.output) ? payload.output.length : 0,
      responseOutputLen: Array.isArray(payload?.response?.output) ? payload.response.output.length : 0,
    };
    return {
      ok: false,
      status: 502,
      error: { error: "AI_EMPTY_RESPONSE", provider: "openai", debug },
    };
  }

  return { ok: true, answer, source: "openai" };
}

async function assistant(env, req, res) {
  const rawRole = req.body?.role;
  const role = normalizeRole(rawRole);
  const message = String(req.body?.message || "").trim();
  const context = req.body?.context ?? {};
  const imageDataUrl = String(req.body?.imageDataUrl || "").trim();

  if (!role) return res.status(400).json({ error: "Некорректная роль" });
  if (!message) return res.status(400).json({ error: "Пустой вопрос" });
  if (message.length > 1000) return res.status(400).json({ error: "Слишком длинный вопрос" });
  if (imageDataUrl && !imageDataUrl.startsWith("data:image/")) {
    return res.status(400).json({ error: "Некорректный формат изображения" });
  }
  if (imageDataUrl.length > 6_000_000) {
    return res.status(400).json({ error: "Слишком большое изображение" });
  }

  if (!env.OPENAI_API_KEY) {
    return res.status(503).json({ error: "AI_NOT_CONFIGURED" });
  }

  const contextJson = JSON.stringify(context).slice(0, 6000);
  const system = rolePrompt(role);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const result = await requestOpenAI(env, system, message, contextJson, imageDataUrl || undefined, controller.signal);
    if (result.ok) return res.json({ answer: result.answer, source: result.source });

    if (imageDataUrl) {
      const textFallback = await requestOpenAI(
        env,
        system,
        `${message}\n\nЕсли фото недоступно для анализа в текущей модели, дай полезный шаблон описания и какие детали дописать вручную.`,
        contextJson,
        undefined,
        controller.signal
      );
      if (textFallback.ok) {
        return res.json({
          answer: `Фото напрямую в этой модели может быть ограничено. ${textFallback.answer}`,
          source: textFallback.source,
        });
      }
    }

    return res.status(result.status || 502).json(result.error || { error: "AI_REQUEST_FAILED" });
  } catch (e) {
    const isAbort = e?.name === "AbortError";
    return res.status(isAbort ? 504 : 502).json({
      error: isAbort ? "AI_TIMEOUT" : "AI_REQUEST_FAILED",
    });
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = { assistant };

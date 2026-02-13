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
  const imageDataUrls = Array.isArray(imageDataUrl)
    ? imageDataUrl.filter((v) => typeof v === "string" && v.trim().startsWith("data:image/"))
    : typeof imageDataUrl === "string" && imageDataUrl.trim().startsWith("data:image/")
      ? [imageDataUrl.trim()]
      : [];
  const model = imageDataUrls.length > 0 ? env.OPENAI_VISION_MODEL || "gpt-4.1-mini" : env.OPENAI_MODEL || "gpt-4.1-mini";
  const isGpt5 = String(model).toLowerCase().startsWith("gpt-5");
  const textPrompt = imageDataUrls.length > 0
    ? `Контекст: ${contextJson}\n\nВопрос пользователя: ${message}\n\nЕсли фото не показывает явную неисправность, так и скажи. Не пиши шаблон “укажите объект и дефект”.`
    : `Контекст: ${contextJson}\n\nВопрос пользователя: ${message}`;

  const userContent = [{ type: "input_text", text: textPrompt }];
  for (const url of imageDataUrls) {
    userContent.push({ type: "input_image", image_url: url });
  }

  const body = {
    model,
    max_output_tokens: isGpt5 ? 1024 : 280,
    input: imageDataUrls.length > 0
      ? [
          { role: "system", content: [{ type: "input_text", text: system }] },
          {
            role: "user",
            content: userContent,
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

function isValidImageDataUrl(value) {
  return typeof value === "string" && value.startsWith("data:image/");
}

function isTooLargeImageDataUrl(value, maxLen) {
  return typeof value === "string" && value.length > maxLen;
}

function clampRating(value, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  const rounded = Math.round(numeric);
  if (rounded < 1) return 1;
  if (rounded > 5) return 5;
  return rounded;
}

function normalizeRecommendation(value) {
  const text = String(value || "").trim().toUpperCase();
  if (text === "CONFIRM") return "CONFIRM";
  if (text === "REWORK") return "REWORK";
  if (text.includes("ПОДТВ")) return "CONFIRM";
  if (text.includes("ДОРАБОТ")) return "REWORK";
  return null;
}

function extractJsonObject(text) {
  if (typeof text !== "string") return null;
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  const raw = text.slice(start, end + 1);
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function deriveWorkAnalysis(answer) {
  const parsed = extractJsonObject(answer);
  let recommendation = "REWORK";
  let suggestedRating = 3;
  let confidence = "UNCLEAR";
  let summary = String(answer || "").trim();

  if (parsed && typeof parsed === "object") {
    const parsedRecommendation = normalizeRecommendation(parsed.recommendation);
    if (parsedRecommendation) recommendation = parsedRecommendation;

    const visibilityRaw = String(parsed.visibility || parsed.confidence || "").toUpperCase();
    if (visibilityRaw.includes("CLEAR")) confidence = "CLEAR";
    if (visibilityRaw.includes("UNCLEAR") || visibilityRaw.includes("NOT_CLEAR") || visibilityRaw.includes("INSUFFICIENT")) {
      confidence = "UNCLEAR";
    }

    const fallbackRating = recommendation === "CONFIRM" ? 4 : 2;
    suggestedRating = clampRating(parsed.suggestedRating, fallbackRating);

    const parsedSummary = String(parsed.summary || "").trim();
    if (parsedSummary) summary = parsedSummary;
  }

  if (confidence === "UNCLEAR") {
    recommendation = "REWORK";
    if (suggestedRating > 3) suggestedRating = 3;
  }

  if (recommendation === "REWORK" && suggestedRating > 3) {
    suggestedRating = 3;
  }

  if (!summary) {
    summary = recommendation === "REWORK" ? "Результат работы на фото виден недостаточно. Рекомендуется отправить на доработку." : "Результат работы выглядит достаточным для подтверждения.";
  }

  return { recommendation, suggestedRating, confidence, summary };
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

async function analyzeWorkPhotos(env, req, res) {
  const beforeImageDataUrl = String(req.body?.beforeImageDataUrl || "").trim();
  const afterImageDataUrl = String(req.body?.afterImageDataUrl || "").trim();
  const context = req.body?.context ?? {};

  if (!beforeImageDataUrl || !afterImageDataUrl) {
    return res.status(400).json({ error: "Нужны оба фото: до и после" });
  }
  if (!isValidImageDataUrl(beforeImageDataUrl) || !isValidImageDataUrl(afterImageDataUrl)) {
    return res.status(400).json({ error: "Некорректный формат изображения" });
  }
  if (isTooLargeImageDataUrl(beforeImageDataUrl, 6_000_000) || isTooLargeImageDataUrl(afterImageDataUrl, 6_000_000)) {
    return res.status(400).json({ error: "Слишком большое изображение" });
  }

  if (!env.OPENAI_API_KEY) {
    return res.status(503).json({ error: "AI_NOT_CONFIGURED" });
  }

  const system = [
    "Ты AI-помощник жителя для проверки качества выполненной работы.",
    "Сравни фото ДО и ПОСЛЕ, оцени реально ли устранена проблема.",
    "Если по фото видно что проблема устранена — рекомендуй подтвердить заявку, если не видно или результат сомнительный — рекомендуй отправить на доработку. Не будь слишком строгим.",
    "Верни ТОЛЬКО JSON без markdown и без пояснений.",
    "Схема JSON: {\"summary\":\"краткий вердикт\",\"recommendation\":\"CONFIRM|REWORK\",\"suggestedRating\":1-5,\"visibility\":\"CLEAR|UNCLEAR\"}",
    "Если visibility=UNCLEAR, recommendation должен быть REWORK, а suggestedRating не выше 3.",
    "Не выдумывай детали, если не видно — так и укажи в summary.",
  ].join(" ");

  const message = "Проанализируй качество работы исполнителя по фото до/после.";
  const contextJson = JSON.stringify(context).slice(0, 6000);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    const result = await requestOpenAI(
      env,
      system,
      message,
      contextJson,
      [beforeImageDataUrl, afterImageDataUrl],
      controller.signal
    );

    if (result.ok) {
      const normalized = deriveWorkAnalysis(result.answer);
      return res.json({
        answer: normalized.summary,
        source: result.source,
        recommendation: normalized.recommendation,
        suggestedRating: normalized.suggestedRating,
        confidence: normalized.confidence,
      });
    }

    const fallback = await requestOpenAI(
      env,
      system,
      "Если фото недоступны для прямого сравнения, дай жителю чек-лист из 3 пунктов как вручную проверить качество до подтверждения.",
      contextJson,
      undefined,
      controller.signal
    );

    if (fallback.ok) {
      return res.json({
        answer: `Автосравнение фото ограничено в текущей модели. ${fallback.answer}`,
        source: fallback.source,
        recommendation: "REWORK",
        suggestedRating: 3,
        confidence: "UNCLEAR",
      });
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

module.exports = { assistant, analyzeWorkPhotos };

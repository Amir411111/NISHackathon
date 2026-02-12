import * as FileSystem from "expo-file-system/legacy";
import { useMemo, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { Button } from "@/components/Buttons";
import { ui } from "@/constants/ui";
import { askAssistant } from "@/services/aiService";
import type { Request, RequestLocation, Worker } from "@/types/domain";
import { requestDisplayName } from "@/utils/requestPresentation";

type Role = "CITIZEN" | "WORKER" | "ADMIN";

type CitizenContext = {
  description?: string;
  hasPhoto: boolean;
  hasLocation: boolean;
  photoUri?: string;
  onApplyDescription?: (description: string) => void;
};

type WorkerContext = {
  tasks: Request[];
  now: number;
  isOverdue: (request: Request, now: number) => boolean;
  workerLocation?: RequestLocation;
};

type AdminContext = {
  requests: Request[];
  workers: Worker[];
  now: number;
  isOverdue: (request: Request, now: number) => boolean;
};

type Props = {
  role: Role;
  citizen?: CitizenContext;
  worker?: WorkerContext;
  admin?: AdminContext;
};

type ChatMessage = { id: number; from: "user" | "ai"; text: string };

export function AIAssistant(props: Props) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [busy, setBusy] = useState(false);

  const quickPrompt = useMemo(() => {
    if (props.role === "CITIZEN") return "Помоги создать задачу";
    if (props.role === "WORKER") return "Что делать первым?";
    return "Кого лучше назначить?";
  }, [props.role]);

  async function ask(question: string) {
    const q = question.trim();
    if (!q) return;

    const userMessage: ChatMessage = { id: Date.now(), from: "user", text: q };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setBusy(true);

    try {
      const answer = await askAssistant({
        role: props.role,
        message: q,
        context: buildApiContext(props),
      });
      setMessages((prev) => [...prev, { id: Date.now() + 1, from: "ai", text: sanitizeAssistantAnswer(answer) }]);
    } catch {
      const fallback = buildAnswer(props, q);
      setMessages((prev) => [...prev, { id: Date.now() + 1, from: "ai", text: fallback }]);
    } finally {
      setBusy(false);
    }
  }

  async function describeFromPhoto() {
    if (props.role !== "CITIZEN") return;
    const photoUri = props.citizen?.photoUri;
    if (!photoUri) {
      setMessages((prev) => [...prev, { id: Date.now(), from: "ai", text: "Сначала добавьте фото проблемы, затем нажмите эту кнопку снова." }]);
      return;
    }

    setBusy(true);
    try {
      const imageDataUrl = await toImageDataUrl(photoUri);
      const answer = await askAssistant({
        role: "CITIZEN",
        message: "Сформируй краткое описание проблемы по фото для заявки (1-2 предложения).",
        context: buildApiContext(props),
        imageDataUrl,
      });
      const cleaned = sanitizeAssistantAnswer(answer);

      props.citizen?.onApplyDescription?.(cleaned);
      setMessages((prev) => [...prev, { id: Date.now(), from: "ai", text: `Черновик описания добавлен: ${cleaned}` }]);
    } catch {
      setMessages((prev) => [...prev, { id: Date.now(), from: "ai", text: "Не удалось распознать фото сейчас. Попробуйте другое фото или повторите позже." }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.card}>
      <View style={styles.headRow}>
        <Text style={styles.title}>AI ассистент</Text>
        <Text style={styles.badge}>beta</Text>
      </View>
      <Text style={styles.subtitle}>{quickPrompt}</Text>

      {messages.length === 0 ? <Text style={styles.hint}>Нажмите быстрый вопрос или задайте свой.</Text> : null}

      <View style={styles.chatWrap}>
        {messages.slice(-4).map((m) => (
          <View key={m.id} style={[styles.msg, m.from === "ai" ? styles.msgAi : styles.msgUser]}>
            <Text style={styles.msgText}>{m.from === "ai" ? `🤖 ${m.text}` : `Вы: ${m.text}`}</Text>
          </View>
        ))}
      </View>

      <View style={styles.actionsRow}>
        <Pressable style={[styles.quickBtn, busy && styles.quickBtnDisabled]} disabled={busy} onPress={() => ask(quickPrompt)}>
          <Text style={styles.quickBtnText}>{quickPrompt}</Text>
        </Pressable>
        {props.role === "CITIZEN" ? (
          <Pressable style={[styles.quickBtn, busy && styles.quickBtnDisabled]} disabled={busy} onPress={describeFromPhoto}>
            <Text style={styles.quickBtnText}>Описание по фото</Text>
          </Pressable>
        ) : null}
      </View>

      <TextInput
        value={input}
        onChangeText={setInput}
        placeholder="Напишите вопрос для ассистента..."
        style={styles.input}
        multiline
      />

      <Button onPress={() => ask(input)} variant="secondary" disabled={!input.trim() || busy} loading={busy}>
        Спросить
      </Button>
    </View>
  );
}

function buildApiContext(props: Props) {
  if (props.role === "CITIZEN") {
    return {
      descriptionLength: props.citizen?.description?.trim().length ?? 0,
      hasPhoto: Boolean(props.citizen?.hasPhoto),
      hasLocation: Boolean(props.citizen?.hasLocation),
      photoAttached: Boolean(props.citizen?.photoUri),
    };
  }

  if (props.role === "WORKER") {
    const worker = props.worker;
    if (!worker) return { tasks: [] };
    return {
      workerLocation: worker.workerLocation ? { lat: worker.workerLocation.lat, lon: worker.workerLocation.lon } : undefined,
      tasks: worker.tasks.slice(0, 15).map((task) => ({
        title: requestDisplayName(task),
        priority: task.priority,
        status: task.status,
        overdue: worker.isOverdue(task, worker.now),
        createdAt: task.createdAt,
        lat: task.location?.lat,
        lon: task.location?.lon,
        distanceKm: computeDistanceKm(worker.workerLocation, task.location),
      })),
    };
  }

  const admin = props.admin;
  if (!admin) return { requests: [], workers: [] };

  return {
    requests: admin.requests.slice(0, 30).map((request) => ({
      title: requestDisplayName(request),
      priority: request.priority,
      status: request.status,
      assignedWorkerId: request.assignedWorkerId,
      overdue: admin.isOverdue(request, admin.now),
      createdAt: request.createdAt,
    })),
    workers: admin.workers.slice(0, 30).map((worker) => ({
      name: worker.name,
      rating: worker.rating,
      ratingCount: worker.ratingCount ?? 0,
    })),
  };
}

function sanitizeAssistantAnswer(text: string) {
  let next = String(text || "").trim();
  if (!next) return next;

  next = next
    .replace(/\((?:[^)]*created\s*at[^)]*|[^)]*\d{6,}[^)]*)\)/gi, "")
    .replace(/\((?:\s*\d{4,}[\d\s,.:-]*\s*)\)/g, "")
    .replace(/\((?:\s*id\s*[:=]?\s*)?[a-f0-9]{24}\)/gi, "")
    .replace(/\[[^\]]*(?:id\s*[:=]?\s*)?[a-f0-9]{24}[^\]]*\]/gi, "")
    .replace(/\b(?:id\s*[:=]?\s*)?[a-f0-9]{24}\b/gi, "")
    .replace(/\bcreated\s*at\s*\d{6,}\b/gi, "")
    .replace(/\b[a-z0-9_-]{20,}\b/gi, (m) => (/[а-яё]/i.test(m) ? m : ""))
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\(\s*\)/g, "")
    .trim();

  return next;
}

function buildAnswer(props: Props, rawQuestion: string) {
  const question = rawQuestion.toLowerCase();

  if (props.role === "CITIZEN") {
    const ctx = props.citizen;
    if (!ctx) return "Опишите проблему, добавьте фото и точку на карте, затем отправьте заявку.";

    const missing: string[] = [];
    if (!ctx.description || ctx.description.trim().length < 8) missing.push("описание (минимум 8 символов)");
    if (!ctx.hasPhoto) missing.push("фото проблемы");
    if (!ctx.hasLocation) missing.push("местоположение");

    if (question.includes("что") || question.includes("созда") || question.includes("помоги")) {
      if (missing.length === 0) {
        return "Готово к отправке: все обязательные поля заполнены. Нажмите «Отправить».";
      }
      return `Чтобы создать заявку, добавьте: ${missing.join(", ")}. После этого нажмите «Отправить».`;
    }

    return missing.length
      ? `Сейчас не хватает: ${missing.join(", ")}.`
      : "Заявка выглядит полной: можно отправлять.";
  }

  if (props.role === "WORKER") {
    const ctx = props.worker;
    if (!ctx || ctx.tasks.length === 0) return "Сейчас активных задач нет.";

    const ranked = [...ctx.tasks].sort((a, b) => scoreTask(b, ctx.now, ctx.isOverdue, ctx.workerLocation) - scoreTask(a, ctx.now, ctx.isOverdue, ctx.workerLocation));
    const top = ranked[0];
    const overdue = ctx.isOverdue(top, ctx.now) ? "просрочена" : "ещё в SLA";
    const distanceKm = computeDistanceKm(ctx.workerLocation, top.location);
    const distanceText = Number.isFinite(distanceKm) ? `расстояние ~${distanceKm.toFixed(1)} км` : "расстояние неизвестно";
    const topName = requestDisplayName(top);

    if (question.includes("перв") || question.includes("что") || question.includes("сначала")) {
      return `Рекомендую начать с задачи «${topName}»: приоритет ${priorityLabel(top.priority)}, ${overdue}, ${distanceText}.`;
    }

    return `Сфокусируйтесь на «${topName}»: приоритет, дедлайн и ${distanceText} делают её самой выгодной сейчас.`;
  }

  const ctx = props.admin;
  if (!ctx) return "Проверьте активные задачи и рейтинг исполнителей перед назначением.";

  const pending = ctx.requests.filter((r) => r.status !== "DONE");
  const unassigned = pending.filter((r) => !r.assignedWorkerId);
  const target = (unassigned.length ? unassigned : pending).sort((a, b) => scoreTask(b, ctx.now, ctx.isOverdue) - scoreTask(a, ctx.now, ctx.isOverdue))[0];

  if (!target) return "Активных задач для назначения сейчас нет.";

  const loads = new Map<string, number>();
  for (const req of pending) {
    if (!req.assignedWorkerId) continue;
    loads.set(req.assignedWorkerId, (loads.get(req.assignedWorkerId) ?? 0) + 1);
  }

  const bestWorker = [...ctx.workers]
    .sort((a, b) => {
      const scoreA = a.rating * 100 - (loads.get(a.id) ?? 0) * 10;
      const scoreB = b.rating * 100 - (loads.get(b.id) ?? 0) * 10;
      return scoreB - scoreA;
    })
    .at(0);

  if (!bestWorker) {
    return `Сначала обработайте задачу «${requestDisplayName(target)}» (${priorityLabel(target.priority)}). В системе нет доступных исполнителей.`;
  }

  return `Сначала назначьте «${requestDisplayName(target)}» (${priorityLabel(target.priority)}) на ${bestWorker.name}: рейтинг ${bestWorker.rating.toFixed(1)}, активная нагрузка ${loads.get(bestWorker.id) ?? 0}.`;
}

function scoreTask(request: Request, now: number, isOverdue: (request: Request, now: number) => boolean, workerLocation?: RequestLocation) {
  const priority = request.priority === "HIGH" ? 300 : request.priority === "MEDIUM" ? 200 : 100;
  const overdueBonus = isOverdue(request, now) ? 150 : 0;
  const ageHours = Math.max(0, (now - request.createdAt) / 3600000);
  const distanceKm = computeDistanceKm(workerLocation, request.location);
  const distanceBonus = Number.isFinite(distanceKm) ? Math.max(0, 100 - distanceKm * 15) : 0;
  return priority + overdueBonus + Math.min(72, ageHours) + distanceBonus;
}

function computeDistanceKm(a?: RequestLocation, b?: RequestLocation) {
  if (!a || !b) return Number.NaN;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const earth = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const hav = Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(hav), Math.sqrt(1 - hav));
  return earth * c;
}

async function toImageDataUrl(uri: string) {
  if (uri.startsWith("data:image/")) return uri;
  if (Platform.OS === "web") {
    const response = await fetch(uri);
    const blob = await response.blob();
    return await blobToDataUrl(blob);
  }

  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const mimeType = guessMimeType(uri);
  return `data:${mimeType};base64,${base64}`;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = String(reader.result || "");
      if (!result) {
        reject(new Error("EMPTY_DATA_URL"));
        return;
      }
      resolve(result);
    };
    reader.onerror = () => reject(new Error("READ_FAILED"));
    reader.readAsDataURL(blob);
  });
}

function guessMimeType(uri: string) {
  const lower = uri.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}

function priorityLabel(priority: Request["priority"]) {
  if (priority === "HIGH") return "высокий";
  if (priority === "MEDIUM") return "средний";
  return "низкий";
}

const styles = StyleSheet.create({
  card: { borderRadius: 14, borderWidth: 1, borderColor: ui.colors.border, backgroundColor: ui.colors.surface, padding: 12, gap: 10 },
  headRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 14, fontWeight: "900", color: ui.colors.text },
  badge: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: ui.colors.border,
    backgroundColor: ui.colors.primarySoft,
    paddingHorizontal: 8,
    paddingVertical: 2,
    fontSize: 11,
    fontWeight: "800",
    color: ui.colors.primary,
  },
  subtitle: { fontSize: 12, color: ui.colors.textMuted, fontWeight: "700" },
  hint: { fontSize: 12, color: ui.colors.textMuted },
  chatWrap: { gap: 6 },
  msg: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 8 },
  msgAi: { borderColor: ui.colors.border, backgroundColor: ui.colors.primarySoft },
  msgUser: { borderColor: ui.colors.border, backgroundColor: ui.colors.surfaceMuted },
  msgText: { fontSize: 12, color: ui.colors.text, fontWeight: "600" },
  actionsRow: { flexDirection: "row" },
  quickBtn: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: ui.colors.border,
    backgroundColor: ui.colors.surfaceMuted,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  quickBtnDisabled: { opacity: 0.6 },
  quickBtnText: { fontSize: 12, fontWeight: "800", color: ui.colors.primary },
  input: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: ui.colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: ui.colors.text,
    backgroundColor: ui.colors.surfaceMuted,
  },
});

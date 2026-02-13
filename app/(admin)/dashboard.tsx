import { Link } from "expo-router";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { HotspotsMap } from "@/components/HotspotsMap";
import { Screen } from "@/components/Screen";
import { CATEGORIES } from "@/constants/domain";
import { ui } from "@/constants/ui";
import { adminListAll, analyticsSummary } from "@/services/requestService";
import { getWorkers } from "@/services/workerService";
import { useAppStore } from "@/store/useAppStore";
import type { RequestStatus } from "@/types/domain";

export default function AdminDashboardScreen() {
  const requests = useAppStore((s) => s.requests);
  const workers = useAppStore((s) => s.workers);
  const replaceRequests = useAppStore((s) => s.replaceRequests);
  const replaceWorkers = useAppStore((s) => s.replaceWorkers);
  const avgClosure = useAppStore((s) => s.getAverageClosureMinutes());

  const [summary, setSummary] = useState<null | { total: number; overdue: number; byStatus: Record<string, number>; avgCloseMinutes: number | null }>(null);

  useEffect(() => {
    let alive = true;
    analyticsSummary()
      .then((s) => {
        if (!alive) return;
        setSummary(s);
      })
      .catch(() => {
        // keep mock-only mode
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    adminListAll()
      .then((items) => {
        if (!alive) return;
        replaceRequests(items);
      })
      .catch(() => {
        // keep fallback from store
      });
    return () => {
      alive = false;
    };
  }, [replaceRequests]);

  useEffect(() => {
    let alive = true;
    getWorkers()
      .then((items) => {
        if (!alive) return;
        replaceWorkers(items);
      })
      .catch(() => {
        // keep fallback
      });
    return () => {
      alive = false;
    };
  }, [replaceWorkers]);

  const total = summary?.total ?? requests.length;
  const done = summary?.byStatus?.DONE ?? requests.filter((r) => r.status === "DONE").length;
  const inProgress = summary?.byStatus?.IN_PROGRESS ?? requests.filter((r) => r.status === "IN_PROGRESS").length;
  const overdue = summary?.overdue;
  const avgClose = summary?.avgCloseMinutes ?? avgClosure;

  const contractorRatings = workers;
  const now = new Date();
  const monthLabel = new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric" }).format(now);

  const allRequests = useMemo(() => requests, [requests]);

  const requestsByDate = useMemo(() => {
    const map = new Map<string, typeof allRequests>();
    for (const item of allRequests) {
      const date = new Date(getRequestDate(item));
      const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      const list = map.get(dateKey) ?? [];
      list.push(item);
      map.set(dateKey, list);
    }
    return map;
  }, [allRequests]);

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const firstWeekday = (monthStart.getDay() + 6) % 7;
  const calendarCells = useMemo(() => {
    const cells: Array<number | null> = [];
    for (let i = 0; i < firstWeekday; i += 1) cells.push(null);
    for (let day = 1; day <= daysInMonth; day += 1) cells.push(day);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [daysInMonth, firstWeekday]);

  const defaultSelectedDate = useMemo(() => {
    const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    if (requestsByDate.has(todayKey)) return todayKey;
    const firstWithRequests = calendarCells.find((cell) => {
      if (!cell) return false;
      const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(cell).padStart(2, "0")}`;
      return requestsByDate.has(key);
    });
    if (!firstWithRequests) return null;
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(firstWithRequests).padStart(2, "0")}`;
  }, [calendarCells, requestsByDate, now]);

  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(defaultSelectedDate);
  const [showAllRequestsForDay, setShowAllRequestsForDay] = useState(false);
  const selectedRequests = selectedDateKey ? requestsByDate.get(selectedDateKey) ?? [] : [];
  const visibleSelectedRequests = showAllRequestsForDay ? selectedRequests : selectedRequests.slice(0, 4);
  const hiddenRequestsCount = Math.max(0, selectedRequests.length - visibleSelectedRequests.length);
  const selectedDateLabel = selectedDateKey
    ? new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric" }).format(new Date(`${selectedDateKey}T00:00:00`))
    : null;
  const categoryMap = useMemo(() => new Map(CATEGORIES.map((item) => [item.value, item.label])), []);

  useEffect(() => {
    if (!selectedDateKey && defaultSelectedDate) {
      setSelectedDateKey(defaultSelectedDate);
    }
  }, [defaultSelectedDate, selectedDateKey]);

  useEffect(() => {
    setShowAllRequestsForDay(false);
  }, [selectedDateKey]);

  return (
    <Screen>
      <Card title="Сводка">
        <Metric label="Заявок всего" value={String(total)} />
        <Metric label="В работе" value={String(inProgress)} />
        <Metric label="Выполнено" value={String(done)} />
        {typeof overdue === "number" ? <Metric label="Просрочено" value={String(overdue)} /> : null}
        <Metric label="Среднее время закрытия" value={avgClose === null ? "—" : `${avgClose} мин`} />

        <View style={styles.calendarSection}>
          <Text style={styles.calendarTitle}>Задачи по датам</Text>
          <Text style={styles.calendarMonth}>{monthLabel}</Text>

          <View style={styles.calendarWeekHeader}>
            {WEEK_DAYS.map((day) => (
              <Text key={day} style={styles.calendarWeekDay}>
                {day}
              </Text>
            ))}
          </View>

          <View style={styles.calendarGrid}>
            {calendarCells.map((day, idx) => {
              if (!day) return <View key={`empty-${idx}`} style={styles.calendarCell} />;
              const dateKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const dayRequests = requestsByDate.get(dateKey) ?? [];
              const hasRequests = dayRequests.length > 0;
              const dayStatuses = Array.from(new Set(dayRequests.map((item) => item.status)));
              const isSelected = selectedDateKey === dateKey;

              return (
                <Pressable
                  key={dateKey}
                  onPress={() => setSelectedDateKey(dateKey)}
                  style={[styles.calendarCell, hasRequests && styles.calendarCellActive, isSelected && styles.calendarCellSelected]}
                >
                  <Text style={[styles.calendarDayText, hasRequests && styles.calendarDayTextActive, isSelected && styles.calendarDayTextSelected]}>{day}</Text>
                  {hasRequests ? (
                    <View style={styles.calendarDotsRow}>
                      {dayStatuses.slice(0, 3).map((status) => (
                        <View key={status} style={[styles.calendarDot, { backgroundColor: STATUS_UI[status].dot }]} />
                      ))}
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </View>

          <View style={styles.completedList}>
            {selectedDateLabel ? (
              <View style={styles.completedHeader}>
                <Text style={styles.completedHeaderTitle}>{selectedDateLabel}</Text>
                <Text style={styles.completedHeaderCount}>{selectedRequests.length} шт.</Text>
              </View>
            ) : null}
            {selectedRequests.length === 0 ? (
              <Text style={styles.empty}>{selectedDateLabel ? "На выбранную дату задач нет" : "Выберите дату в календаре"}</Text>
            ) : (
              <>
                {visibleSelectedRequests.map((item) => {
                  const eventAt = getRequestDate(item);
                  const timeLabel = new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit" }).format(new Date(eventAt));
                  const categoryLabel = categoryMap.get(item.category) ?? item.category;
                  const statusUi = STATUS_UI[item.status];
                  return (
                    <Link key={item.id} href={`/(admin)/requests/${item.id}`} asChild>
                      <Pressable style={styles.completedItem}>
                        <View style={styles.completedItemMeta}>
                          <Text style={styles.completedItemCategory}>{categoryLabel}</Text>
                          <Text style={styles.completedItemTime}>{timeLabel}</Text>
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: statusUi.badgeBg, borderColor: statusUi.badgeBorder }]}>
                          <Text style={[styles.statusBadgeText, { color: statusUi.badgeText }]}>{statusUi.label}</Text>
                        </View>
                        <Text numberOfLines={2} style={styles.completedItemText}>
                          {item.description}
                        </Text>
                      </Pressable>
                    </Link>
                  );
                })}

                {hiddenRequestsCount > 0 ? (
                  <Pressable style={styles.showMoreBtn} onPress={() => setShowAllRequestsForDay(true)}>
                    <Text style={styles.showMoreText}>Показать еще {hiddenRequestsCount}</Text>
                  </Pressable>
                ) : null}
                {showAllRequestsForDay && selectedRequests.length > 4 ? (
                  <Pressable style={styles.showLessBtn} onPress={() => setShowAllRequestsForDay(false)}>
                    <Text style={styles.showLessText}>Показать меньше</Text>
                  </Pressable>
                ) : null}
              </>
            )}
          </View>
        </View>
      </Card>

      <Card title="Рейтинг подрядчиков">
        {contractorRatings.length === 0 ? <Text style={styles.empty}>Исполнители пока не найдены</Text> : null}
        {contractorRatings.map((w) => (
          <View key={w.id} style={styles.row}>
            <Text style={styles.contractor}>{w.name}</Text>
            <Text style={styles.value}>⭐ {w.rating.toFixed(1)}</Text>
          </View>
        ))}
      </Card>

      <Card title="Карта горячих точек города">
        <HotspotsMap requests={requests} />
      </Card>
    </Screen>
  );
}

function Card(props: { title: string; children: ReactNode }) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{props.title}</Text>
      <View style={styles.body}>{props.children}</View>
    </View>
  );
}

function Metric(props: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.label}>{props.label}</Text>
      <Text style={styles.metricValue}>{props.value}</Text>
    </View>
  );
}

const WEEK_DAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

const STATUS_UI: Record<RequestStatus, { label: string; dot: string; badgeBg: string; badgeText: string; badgeBorder: string }> = {
  ACCEPTED: {
    label: "Принято",
    dot: ui.colors.textMuted,
    badgeBg: ui.colors.surfaceMuted,
    badgeText: ui.colors.textMuted,
    badgeBorder: ui.colors.border,
  },
  ASSIGNED: {
    label: "Назначен",
    dot: ui.colors.warning,
    badgeBg: ui.colors.surface,
    badgeText: ui.colors.warning,
    badgeBorder: ui.colors.warning,
  },
  IN_PROGRESS: {
    label: "В работе",
    dot: ui.colors.primary,
    badgeBg: ui.colors.primarySoft,
    badgeText: ui.colors.primary,
    badgeBorder: ui.colors.primary,
  },
  DONE: {
    label: "Выполнено",
    dot: ui.colors.text,
    badgeBg: ui.colors.surface,
    badgeText: ui.colors.text,
    badgeBorder: ui.colors.border,
  },
  REJECTED: {
    label: "Отклонено",
    dot: ui.colors.danger,
    badgeBg: ui.colors.dangerSoft,
    badgeText: ui.colors.danger,
    badgeBorder: ui.colors.danger,
  },
};

function getRequestDate(request: {
  status: RequestStatus;
  createdAt: number;
  updatedAt: number;
  workStartedAt?: number;
  workEndedAt?: number;
  citizenConfirmedAt?: number;
  adminRejectedAt?: number;
}) {
  if (request.status === "DONE") return request.workEndedAt ?? request.citizenConfirmedAt ?? request.updatedAt ?? request.createdAt;
  if (request.status === "REJECTED") return request.adminRejectedAt ?? request.updatedAt ?? request.createdAt;
  if (request.status === "IN_PROGRESS") return request.workStartedAt ?? request.updatedAt ?? request.createdAt;
  return request.updatedAt ?? request.createdAt;
}

const styles = StyleSheet.create({
  card: { padding: 14, borderRadius: 16, borderWidth: 1, borderColor: ui.colors.border, backgroundColor: ui.colors.surface, gap: 12 },
  title: { fontSize: 14, fontWeight: "900", color: ui.colors.text },
  body: { gap: 10 },
  metric: { flexDirection: "row", justifyContent: "space-between", gap: 10 },
  label: { fontSize: 13, color: ui.colors.textMuted, fontWeight: "700" },
  metricValue: { fontSize: 14, color: ui.colors.text, fontWeight: "900" },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  contractor: { fontSize: 13, fontWeight: "800", color: ui.colors.text },
  value: { fontSize: 13, fontWeight: "900", color: ui.colors.primary },
  empty: { color: ui.colors.textMuted, fontWeight: "700" },
  calendarSection: { marginTop: 6, gap: 8 },
  calendarTitle: { fontSize: 13, fontWeight: "900", color: ui.colors.text },
  calendarMonth: { fontSize: 12, fontWeight: "700", color: ui.colors.textMuted, textTransform: "capitalize" },
  calendarWeekHeader: { flexDirection: "row", gap: 6 },
  calendarWeekDay: { flex: 1, textAlign: "center", fontSize: 11, fontWeight: "800", color: ui.colors.textMuted },
  calendarGrid: { flexDirection: "row", flexWrap: "wrap", rowGap: 6, justifyContent: "space-between" },
  calendarCell: {
    width: "13.5%",
    aspectRatio: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: ui.colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: ui.colors.surfaceMuted,
  },
  calendarCellActive: {
    borderColor: ui.colors.primary,
    backgroundColor: ui.colors.primarySoft,
  },
  calendarCellSelected: {
    borderColor: ui.colors.primary,
    borderWidth: 2,
  },
  calendarDayText: { fontSize: 12, fontWeight: "700", color: ui.colors.textMuted },
  calendarDayTextActive: { color: ui.colors.primary, fontWeight: "900" },
  calendarDayTextSelected: { color: ui.colors.primary },
  calendarDotsRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 3, marginTop: 3 },
  calendarDot: { width: 5, height: 5, borderRadius: 999 },
  completedList: { gap: 8, marginTop: 4 },
  completedHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderRadius: 10,
    backgroundColor: ui.colors.surfaceMuted,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  completedHeaderTitle: { fontSize: 12, fontWeight: "900", color: ui.colors.text, textTransform: "capitalize" },
  completedHeaderCount: { fontSize: 11, fontWeight: "800", color: ui.colors.textMuted },
  completedItem: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: ui.colors.border,
    backgroundColor: ui.colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 9,
    gap: 6,
  },
  completedItemMeta: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  completedItemCategory: {
    fontSize: 10,
    fontWeight: "900",
    color: ui.colors.primary,
    backgroundColor: ui.colors.primarySoft,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    overflow: "hidden",
  },
  completedItemTime: { fontSize: 11, fontWeight: "800", color: ui.colors.textMuted },
  statusBadge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusBadgeText: { fontSize: 10, fontWeight: "900" },
  completedItemText: { fontSize: 12, fontWeight: "700", color: ui.colors.text, lineHeight: 17 },
  showMoreBtn: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: ui.colors.border,
    backgroundColor: ui.colors.surfaceMuted,
    alignItems: "center",
    paddingVertical: 8,
  },
  showMoreText: { fontSize: 12, fontWeight: "800", color: ui.colors.primary },
  showLessBtn: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: ui.colors.border,
    backgroundColor: ui.colors.surface,
    alignItems: "center",
    paddingVertical: 8,
  },
  showLessText: { fontSize: 12, fontWeight: "800", color: ui.colors.textMuted },
});

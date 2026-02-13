import { useRouter } from "expo-router";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, Pressable, StyleSheet, Text, View } from "react-native";

import { Screen } from "@/components/Screen";
import { ui } from "@/constants/ui";
import { getPublicLeaderboard, type LeaderboardItem } from "@/services/userService";

export default function WelcomeScreen() {
  const router = useRouter();
  const scrollY = useRef(new Animated.Value(0)).current;
  const [leaderboardTab, setLeaderboardTab] = useState<"USERS" | "WORKERS">("USERS");
  const [leaderboardItems, setLeaderboardItems] = useState<LeaderboardItem[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);

  useEffect(() => {
    let alive = true;

    setLeaderboardLoading(true);
    setLeaderboardItems([]);

    (async () => {
      try {
        const role = leaderboardTab === "WORKERS" ? "WORKER" : "CITIZEN";
        const res = await getPublicLeaderboard(5, role);
        if (!alive) return;
        setLeaderboardItems(res.items || []);
      } catch {
        if (!alive) return;
        setLeaderboardItems([]);
      } finally {
        if (!alive) return;
        setLeaderboardLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [leaderboardTab]);

  const actionsProgress = scrollY.interpolate({
    inputRange: [0, 90],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  const actionsMaxHeight = actionsProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 94],
    extrapolate: "clamp",
  });

  const actionsTranslateY = actionsProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [-18, 0],
    extrapolate: "clamp",
  });

  return (
    <Screen scroll={false}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <View style={styles.brandBadge}>
              <Text style={styles.brandBadgeText}>eQala</Text>
            </View>
            <Text style={styles.logo}>🟢</Text>
          </View>
          <Text style={styles.title} numberOfLines={2}>
            Городские обращения — просто и прозрачно
          </Text>
          <Text style={styles.subtitle} numberOfLines={2}>
            Отправляйте заявку с фото, отслеживайте статус и получайте результат в одном приложении.
          </Text>
        </View>

        <Animated.View
          style={[
            styles.heroActions,
            {
              maxHeight: actionsMaxHeight,
              opacity: actionsProgress,
              transform: [{ translateY: actionsTranslateY }],
            },
          ]}
        >
          <Pressable style={styles.heroPrimaryBtn} onPress={() => router.push({ pathname: "/login", params: { mode: "register" } })}>
            <Text style={styles.heroPrimaryBtnText}>Создать аккаунт</Text>
          </Pressable>
          <Pressable style={styles.heroSecondaryBtn} onPress={() => router.push("/login")}>
            <Text style={styles.heroSecondaryBtnText}>Уже есть аккаунт? Войти</Text>
          </Pressable>
        </Animated.View>

        <Animated.ScrollView
          contentContainerStyle={styles.scrollContent}
          bounces={false}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
            useNativeDriver: false,
          })}
        >
          <SectionCard title="eQala" tone="primary">
            <Text style={styles.infoText}>Единая платформа для обращений жителей и контроля городских задач.</Text>
            <Text style={styles.infoText}>
              Вход через Digital ID подтверждает личность и делает обращения официальными.
            </Text>
          </SectionCard>

          <SectionCard title="Как это работает: 3 шага">
            <View style={styles.modules}>
              <ModuleCard icon="1️⃣" title="Создайте заявку" description="Опишите проблему, добавьте фото и геолокацию" />
              <ModuleCard icon="2️⃣" title="Следите за статусом" description="Видите исполнителя, сроки и обновления по задаче" />
              <ModuleCard icon="3️⃣" title="Подтвердите результат" description="Проверьте фото До/После и закройте обращение" />
            </View>
          </SectionCard>

          <SectionCard title="Популярные категории">
            <Tag text="ЖКХ: вода, свет, дороги, мусор" />
            <Tag text="Благоустройство и безопасность" />
            <Tag text="Транспорт и городская среда" />
            <Tag text="Госуслуги и соцвопросы" />
          </SectionCard>

          <SectionCard title="Почему это удобно" tone="primary">
            <ListItem text="Понятный трек-номер и прозрачный статус заявки" />
            <ListItem text="Фото-подтверждение работ и контроль сроков" />
            <ListItem text="Меньше звонков и бумажных обращений" />
            <ListItem text="Единое окно для жителя, исполнителя и акимата" />
          </SectionCard>

          <SectionCard title="Рейтинг активности">
            <View style={styles.leaderboardTabs}>
              <Pressable
                style={[styles.leaderboardTab, leaderboardTab === "USERS" && styles.leaderboardTabActive]}
                onPress={() => setLeaderboardTab("USERS")}
              >
                <Text style={[styles.leaderboardTabText, leaderboardTab === "USERS" && styles.leaderboardTabTextActive]}>Рейтинг пользователей</Text>
              </Pressable>
              <Pressable
                style={[styles.leaderboardTab, leaderboardTab === "WORKERS" && styles.leaderboardTabActive]}
                onPress={() => setLeaderboardTab("WORKERS")}
              >
                <Text style={[styles.leaderboardTabText, leaderboardTab === "WORKERS" && styles.leaderboardTabTextActive]}>Рейтинг рабочих</Text>
              </Pressable>
            </View>

            {leaderboardLoading ? (
              <View style={styles.leaderboardLoaderWrap}>
                <ActivityIndicator color={ui.colors.primary} />
              </View>
            ) : null}
            {!leaderboardLoading && leaderboardItems.length === 0 ? <Text style={styles.infoText}>Пока нет данных</Text> : null}
            {!leaderboardLoading && leaderboardItems.map((item) => (
              <View key={item.id} style={styles.leaderboardRow}>
                <Text style={styles.leaderboardRank}>#{item.rank}</Text>
                <View style={styles.leaderboardUserCol}>
                  <Text style={styles.leaderboardName}>{item.fullName}</Text>
                  <Text style={styles.leaderboardEmail}>{item.email}</Text>
                </View>
                <Text style={styles.leaderboardPoints}>{leaderboardTab === "WORKERS" ? `${(item.ratingAvg ?? 0).toFixed(1)}★` : item.points}</Text>
              </View>
            ))}
          </SectionCard>

          <View style={styles.spacer} />
        </Animated.ScrollView>

        <View style={styles.footer}>
          <Text style={styles.termsText}>MVP прототип для кейса «Городские сервисы и eGov»</Text>
        </View>
      </View>
    </Screen>
  );
}

function SectionCard(props: { title: string; children: ReactNode; tone?: "default" | "primary" }) {
  return (
    <View style={[styles.infoBox, props.tone === "primary" && styles.infoBoxPrimary]}>
      <Text style={styles.infoTitle}>{props.title}</Text>
      <View style={styles.contentColumn}>{props.children}</View>
    </View>
  );
}

function ListItem({ text }: { text: string }) {
  return <Text style={styles.listItem}>• {text}</Text>;
}

function ModuleCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <View style={styles.moduleCard}>
      <View style={styles.moduleHead}>
        <Text style={styles.moduleIcon}>{icon}</Text>
        <Text style={styles.moduleTitle}>{title}</Text>
      </View>
      <Text style={styles.moduleDescription}>{description}</Text>
    </View>
  );
}

function Tag({ text }: { text: string }) {
  return (
    <View style={styles.tagBlock}>
      <Text style={styles.tagText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "space-between",
  },
  header: {
    height: "20%",
    justifyContent: "space-between",
    gap: 4,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
    borderRadius: ui.radius.lg,
    borderWidth: 1,
    borderColor: ui.colors.border,
    backgroundColor: ui.colors.surface,
  },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  brandBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: ui.radius.pill,
    borderWidth: 1,
    borderColor: ui.colors.border,
    backgroundColor: ui.colors.surfaceMuted,
  },
  brandBadgeText: {
    fontSize: 11,
    fontWeight: "900",
    color: ui.colors.primary,
  },
  logo: {
    fontSize: 18,
  },
  title: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: "900",
    color: ui.colors.text,
  },
  subtitle: {
    fontSize: 12,
    color: ui.colors.textMuted,
    lineHeight: 16,
  },
  heroActions: {
    gap: 6,
    marginTop: 6,
    marginBottom: 6,
    alignItems: "center",
    overflow: "hidden",
  },
  heroPrimaryBtn: {
    minHeight: 40,
    width: "92%",
    borderRadius: ui.radius.md,
    backgroundColor: ui.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  heroPrimaryBtnText: {
    fontSize: 14,
    fontWeight: "900",
    color: ui.colors.surface,
  },
  heroSecondaryBtn: {
    minHeight: 38,
    width: "92%",
    borderRadius: ui.radius.md,
    borderWidth: 1,
    borderColor: ui.colors.border,
    backgroundColor: ui.colors.surface,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  heroSecondaryBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: ui.colors.primary,
  },
  scrollContent: {
    paddingVertical: 8,
    flexGrow: 1,
    gap: 14,
  },
  contentColumn: {
    gap: 8,
  },
  infoBox: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: ui.colors.surfaceMuted,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: ui.colors.border,
  },
  infoBoxPrimary: {
    backgroundColor: ui.colors.primarySoft,
    borderColor: ui.colors.border,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: ui.colors.primary,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    color: ui.colors.textMuted,
    lineHeight: 20,
    fontWeight: "700",
  },
  listItem: {
    fontSize: 14,
    color: ui.colors.text,
    lineHeight: 22,
    fontWeight: "600",
  },
  modules: {
    gap: 10,
  },
  moduleCard: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: ui.colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: ui.colors.border,
    gap: 6,
  },
  moduleHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  moduleIcon: {
    fontSize: 20,
  },
  moduleTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: ui.colors.text,
  },
  moduleDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: ui.colors.textMuted,
    fontWeight: "600",
  },
  tagBlock: {
    borderRadius: 12,
    backgroundColor: ui.colors.surface,
    borderWidth: 1,
    borderColor: "#d4e9dd",
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  tagText: {
    fontSize: 14,
    color: ui.colors.text,
    fontWeight: "700",
  },
  leaderboardTabs: { flexDirection: "row", gap: 8 },
  leaderboardTab: {
    flex: 1,
    minHeight: 36,
    borderRadius: ui.radius.md,
    borderWidth: 1,
    borderColor: ui.colors.border,
    backgroundColor: ui.colors.surface,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  leaderboardTabActive: { backgroundColor: ui.colors.primary, borderColor: ui.colors.primary },
  leaderboardTabText: { fontSize: 12, fontWeight: "900", color: ui.colors.textMuted, textAlign: "center" },
  leaderboardTabTextActive: { color: ui.colors.surface },
  leaderboardLoaderWrap: { minHeight: 64, alignItems: "center", justifyContent: "center" },
  leaderboardRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 3 },
  leaderboardRank: { minWidth: 32, fontSize: 12, fontWeight: "900", color: ui.colors.text },
  leaderboardUserCol: { flex: 1, gap: 1 },
  leaderboardName: { fontSize: 13, fontWeight: "900", color: ui.colors.text },
  leaderboardEmail: { fontSize: 12, color: ui.colors.textMuted },
  leaderboardPoints: { fontSize: 13, fontWeight: "900", color: ui.colors.text },
  spacer: {
    flex: 1,
  },
  footer: {
    paddingBottom: 8,
    gap: 12,
  },
  termsText: {
    fontSize: 13,
    color: ui.colors.textMuted,
    textAlign: "center",
    lineHeight: 18,
  },
});

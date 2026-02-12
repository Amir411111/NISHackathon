import { useRouter } from "expo-router";
import type { ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Screen } from "@/components/Screen";
import { ui } from "@/constants/ui";

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <Screen scroll={false}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.topActions}>
            <Pressable style={styles.topLink} onPress={() => router.push("/login")}>
              <Text style={styles.topLinkText}>Войти</Text>
            </Pressable>
            <Pressable
              style={[styles.topLink, styles.topLinkPrimary]}
              onPress={() => router.push({ pathname: "/login", params: { mode: "register" } })}
            >
              <Text style={styles.topLinkPrimaryText}>Регистрация</Text>
            </Pressable>
          </View>

          <Text style={styles.logo}>🟢</Text>
          <Text style={styles.title}>Единая цифровая экосистема городских сервисов</Text>
          <Text style={styles.subtitle}>
            Житель → Исполнитель → Администратор в одном прозрачном процессе с фотофиксацией и контролем сроков.
          </Text>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} bounces={false} showsVerticalScrollIndicator={false}>
          <SectionCard title="eQala" tone="primary">
            <Text style={styles.infoText}>
              eQala — единая цифровая экосистема для обращений граждан и управления городскими проблемами.
            </Text>
            <Text style={styles.infoText}>
              Авторизация через Digital ID (eGov) делает обращения подтвержденными, прозрачными и юридически значимыми.
            </Text>
          </SectionCard>

          <SectionCard title="Как это работает">
            <View style={styles.modules}>
              <ModuleCard icon="👤" title="Житель" description="Подает заявку с фото и геолокацией" />
              <ModuleCard icon="🛠️" title="Исполнитель" description="Выполняет задачу и прикладывает фото До/После" />
              <ModuleCard icon="🏛" title="Акимат" description="Контролирует SLA, назначает и анализирует" />
            </View>
          </SectionCard>

          <SectionCard title="Что можно решить через eQala?">
            <Tag text="ЖКХ: вода, свет, дороги, мусор" />
            <Tag text="Городская среда: транспорт, благоустройство, безопасность" />
            <Tag text="Госуслуги: обращения, запись, запросы информации" />
            <Tag text="Льготы и соцвопросы" />
            <Tag text="Земля, бизнес и налоги" />
          </SectionCard>

          <SectionCard title="Почему это удобно" tone="primary">
            <ListItem text="Цифровой трек-номер и прозрачный статус заявки" />
            <ListItem text="Фото-подтверждение работ и контроль сроков (SLA)" />
            <ListItem text="Карта проблем и аналитика в реальном времени" />
            <ListItem text="Рейтинг подрядчиков и геймификация для жителей" />
          </SectionCard>

          <View style={styles.spacer} />
        </ScrollView>

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
    gap: 10,
    paddingHorizontal: 2,
    paddingTop: 4,
    paddingBottom: 6,
  },
  topActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
  topLink: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: ui.colors.border,
    backgroundColor: ui.colors.surface,
  },
  topLinkPrimary: {
    borderColor: "#cbe6d6",
    backgroundColor: ui.colors.primarySoft,
  },
  topLinkText: {
    fontSize: 14,
    fontWeight: "800",
    color: ui.colors.primary,
  },
  topLinkPrimaryText: {
    fontSize: 14,
    fontWeight: "900",
    color: ui.colors.primary,
  },
  logo: {
    fontSize: 36,
  },
  title: {
    fontSize: 38,
    lineHeight: 44,
    fontWeight: "900",
    color: ui.colors.text,
  },
  subtitle: {
    fontSize: 16,
    color: ui.colors.textMuted,
    lineHeight: 24,
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
    borderColor: "#cbe6d6",
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

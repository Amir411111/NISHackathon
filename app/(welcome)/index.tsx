import { useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/Buttons";
import { Screen } from "@/components/Screen";

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <Screen scroll={false}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.logo}>🏛️</Text>
          <Text style={styles.title}>Подача обращений в государственные органы</Text>
          <Text style={styles.subtitle}>
            Акиматы, Министерства, Комитеты, Агентства и другие учреждения без очередей и бюрократических задержек
          </Text>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} bounces={false} showsVerticalScrollIndicator={false}>
          <View style={styles.features}>
            <FeatureCard icon="📋" title="Подать обращение" />
            <FeatureCard icon="👤" title="Обжаловать ответ" />
            <FeatureCard icon="⚖️" title="Подать иск в суд" />
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              * В мобильной версии, подача обращений доступна только для физ. лиц
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Какие проблемы можно решить через eOtinish?</Text>
            <Text style={styles.sectionDescription}>
              Получайте быстрый ответ и решение ваших проблем в один клик
            </Text>
          </View>

          <View style={styles.spacer} />
        </ScrollView>

        <View style={styles.footer}>
          <Button onPress={() => router.push("/login")}>Войти или зарегистрироваться</Button>

          <Text style={styles.termsText}>
            Используя приложение, вы принимаете{" "}
            <Text style={styles.termsLink}>условия использования</Text>
          </Text>
        </View>
      </View>
    </Screen>
  );
}

function FeatureCard({ icon, title }: { icon: string; title: string }) {
  return (
    <View style={styles.featureCard}>
      <Text style={styles.featureIcon}>{icon}</Text>
      <Text style={styles.featureTitle}>{title}</Text>
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
  logo: {
    fontSize: 36,
  },
  title: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: "900",
    color: "#111",
  },
  subtitle: {
    fontSize: 16,
    color: "#444",
    lineHeight: 22,
  },
  scrollContent: {
    paddingVertical: 8,
    flexGrow: 1,
  },
  features: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  featureCard: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 12,
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e5e5e5",
    alignItems: "center",
    justifyContent: "center",
  },
  featureIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  featureTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#111",
    textAlign: "center",
  },
  infoBox: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "#fafafa",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#eee",
    marginBottom: 20,
  },
  infoText: {
    fontSize: 12,
    color: "#666",
    lineHeight: 16,
    fontWeight: "700",
  },
  section: {
    paddingHorizontal: 2,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 28,
    lineHeight: 33,
    fontWeight: "900",
    color: "#111",
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: "#444",
    lineHeight: 20,
  },
  spacer: {
    flex: 1,
  },
  footer: {
    paddingBottom: 8,
    gap: 12,
  },
  termsText: {
    fontSize: 12,
    color: "#999",
    textAlign: "center",
    lineHeight: 16,
  },
  termsLink: {
    color: "#111",
    fontWeight: "800",
    textDecorationLine: "underline",
  },
});

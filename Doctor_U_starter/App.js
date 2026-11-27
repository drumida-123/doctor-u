import React, { useState } from "react";
import {
  SafeAreaView, View, Text, TouchableOpacity, ScrollView,
  StyleSheet, StatusBar
} from "react-native";

const subjects = [
  { title: "Хирургическая стоматология", subtitle: "Анестезия, хирургические методы", icon: "🦷" },
  { title: "Терапевтическая стоматология", subtitle: "Кариес, эндодонтия, пломбирование", icon: "✨" },
  { title: "Ортопедическая стоматология", subtitle: "Протезирование и конструкции", icon: "🩺" },
  { title: "Детская стоматология", subtitle: "Лечение и профилактика у детей", icon: "🧸" },
  { title: "Ортодонтия", subtitle: "Прикус и зубочелюстные аномалии", icon: "😁" },
  { title: "Анатомия и фармакология", subtitle: "Базовые медицинские дисциплины", icon: "📚" },
];

export default function App() {
  const [tab, setTab] = useState("Главная");
  const [selected, setSelected] = useState(null);

  const tabs = ["Главная", "Мои лекции", "Тесты", "Профиль"];

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF7FA" />
      <View style={styles.header}>
        <View style={styles.logo}><Text style={styles.logoText}>U</Text></View>
        <View>
          <Text style={styles.brand}>Doctor U</Text>
          <Text style={styles.tagline}>Твой помощник в стоматологии</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {selected ? (
          <>
            <TouchableOpacity onPress={() => setSelected(null)}>
              <Text style={styles.back}>‹  Все предметы</Text>
            </TouchableOpacity>
            <Text style={styles.heading}>{selected.title}</Text>
            <Text style={styles.muted}>Раздел предмета</Text>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Материалы и лекции</Text>
              <Text style={styles.body}>Здесь будут отображаться твои загруженные материалы.</Text>
              <Text style={styles.note}>Загрузка и чтение PDF/Word будут подключены на следующем этапе.</Text>
            </View>
          </>
        ) : (
          <>
            <View style={styles.hero}>
              <Text style={styles.eyebrow}>ТВОЯ УЧЁБА — В ОДНОМ МЕСТЕ</Text>
              <Text style={styles.heroTitle}>Учись уверенно{'\n'}вместе с Doctor U</Text>
              <Text style={styles.heroText}>Лекции, подготовка к экзаменам и стоматологические знания.</Text>
            </View>

            <View style={styles.sectionRow}>
              <Text style={styles.heading}>Мои предметы</Text>
              <Text style={styles.count}>6 разделов</Text>
            </View>
            {subjects.map((item) => (
              <TouchableOpacity key={item.title} style={styles.subject}
                onPress={() => setSelected(item)}>
                <Text style={styles.subjectIcon}>{item.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.subjectTitle}>{item.title}</Text>
                  <Text style={styles.subjectSubtitle}>{item.subtitle}</Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>
            ))}

            <View style={styles.card}>
              <Text style={styles.cardTitle}>ИИ-помощник</Text>
              <Text style={styles.body}>Помощник сможет объяснять темы по твоим лекциям и помогать готовиться к устным ответам.</Text>
              <Text style={styles.note}>Пока это макет раздела. Для работы ИИ подключим отдельный сервис и настроим безопасное хранение ключа.</Text>
            </View>
          </>
        )}
      </ScrollView>

      <View style={styles.nav}>
        {tabs.map((item) => (
          <TouchableOpacity key={item} style={styles.navItem} onPress={() => {
            setTab(item); setSelected(null);
          }}>
            <Text style={[styles.navText, tab === item && styles.navActive]}>{item}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FFF7FA" },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 14, gap: 12 },
  logo: { width: 44, height: 44, borderRadius: 14, backgroundColor: "#F3C7DA", alignItems: "center", justifyContent: "center" },
  logoText: { color: "#9B416A", fontSize: 25, fontWeight: "800" },
  brand: { color: "#422A36", fontSize: 21, fontWeight: "800" },
  tagline: { color: "#9B7C8B", fontSize: 12, marginTop: 2 },
  content: { padding: 18, paddingBottom: 30 },
  hero: { backgroundColor: "#F8E3ED", borderRadius: 24, padding: 22, marginBottom: 24 },
  eyebrow: { color: "#A75A7C", fontSize: 10, fontWeight: "800", letterSpacing: 1 },
  heroTitle: { color: "#422A36", fontSize: 27, fontWeight: "800", lineHeight: 33, marginTop: 10 },
  heroText: { color: "#785A69", fontSize: 14, lineHeight: 20, marginTop: 10 },
  sectionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  heading: { color: "#422A36", fontSize: 21, fontWeight: "800", marginBottom: 8 },
  count: { color: "#A77E91", fontSize: 12 },
  subject: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 17, padding: 14, marginBottom: 10, gap: 12, borderWidth: 1, borderColor: "#F4E6ED" },
  subjectIcon: { fontSize: 25, width: 34, textAlign: "center" },
  subjectTitle: { color: "#49313D", fontSize: 14, fontWeight: "700" },
  subjectSubtitle: { color: "#9A8490", fontSize: 11, marginTop: 4 },
  chevron: { color: "#C27B9C", fontSize: 25 },
  card: { backgroundColor: "#FFFFFF", borderRadius: 18, padding: 17, marginTop: 12, borderWidth: 1, borderColor: "#F4E6ED" },
  cardTitle: { color: "#49313D", fontSize: 16, fontWeight: "800", marginBottom: 8 },
  body: { color: "#725D68", fontSize: 13, lineHeight: 19 },
  note: { color: "#B17A94", fontSize: 11, lineHeight: 16, marginTop: 10 },
  back: { color: "#A34F75", fontSize: 14, fontWeight: "700", marginBottom: 20 },
  muted: { color: "#A88C9A", marginBottom: 8 },
  nav: { flexDirection: "row", justifyContent: "space-around", paddingVertical: 13, backgroundColor: "#FFFFFF", borderTopWidth: 1, borderTopColor: "#F1E2E9" },
  navItem: { paddingHorizontal: 5 },
  navText: { color: "#A88C9A", fontSize: 11, fontWeight: "600" },
  navActive: { color: "#B64F7D", fontWeight: "800" },
});

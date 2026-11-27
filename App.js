import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert, Image, Modal, SafeAreaView, ScrollView, StatusBar,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

const STORAGE_KEY = '@doctor_u/materials_v1';
const FOLDER = `${FileSystem.documentDirectory}doctor_u/`;

const subjects = [
  { id: 'surgery', title: 'Хирургическая стоматология', subtitle: 'Анестезия, хирургические методы', icon: '🦷' },
  { id: 'therapy', title: 'Терапевтическая стоматология', subtitle: 'Кариес, эндодонтия, пломбирование', icon: '✨' },
  { id: 'orthopedic', title: 'Ортопедическая стоматология', subtitle: 'Протезирование и конструкции', icon: '🩺' },
  { id: 'pediatric', title: 'Детская стоматология', subtitle: 'Лечение и профилактика у детей', icon: '🧸' },
  { id: 'ortho', title: 'Ортодонтия', subtitle: 'Прикус и зубочелюстные аномалии', icon: '😁' },
  { id: 'basic', title: 'Анатомия и фармакология', subtitle: 'Базовые медицинские дисциплины', icon: '📚' },
];

const safeName = (name = 'material') => name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-90) || 'material';

export default function App() {
  const [tab, setTab] = useState('Главная');
  const [selected, setSelected] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [search, setSearch] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');
  const [pendingAsset, setPendingAsset] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved) setMaterials(JSON.parse(saved));
      } catch (e) {
        Alert.alert('Не удалось загрузить материалы', 'Попробуй перезапустить приложение.');
      }
    })();
  }, []);

  const persist = async (next) => {
    setMaterials(next);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const visibleMaterials = useMemo(() => {
    let list = materials;
    if (tab === 'Избранное') list = list.filter((item) => item.favorite);
    if (selected) list = list.filter((item) => item.subjectId === selected.id);
    const q = search.trim().toLowerCase();
    if (q) list = list.filter((item) => `${item.title} ${item.fileName} ${item.subjectTitle}`.toLowerCase().includes(q));
    return list;
  }, [materials, tab, selected, search]);

  const ensureFolder = async () => {
    const info = await FileSystem.getInfoAsync(FOLDER);
    if (!info.exists) await FileSystem.makeDirectoryAsync(FOLDER, { intermediates: true });
  };

  const saveAsset = async (asset, kind) => {
    await ensureFolder();
    const fileName = `${Date.now()}_${safeName(asset.name || asset.fileName || (kind === 'image' ? 'image.jpg' : 'document.pdf'))}`;
    const destination = FOLDER + fileName;
    await FileSystem.copyAsync({ from: asset.uri, to: destination });
    const record = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      title: draftTitle.trim() || (asset.name || asset.fileName || 'Новый материал').replace(/\.[^.]+$/, ''),
      fileName: asset.name || asset.fileName || fileName,
      uri: destination,
      kind,
      subjectId: selected.id,
      subjectTitle: selected.title,
      favorite: false,
      createdAt: new Date().toISOString(),
    };
    await persist([record, ...materials]);
    setModalVisible(false);
    setDraftTitle('');
    setPendingAsset(null);
    Alert.alert('Готово 💗', 'Материал сохранён в Doctor_U на этом устройстве.');
  };

  const choosePdf = async () => {
    if (!selected) return;
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      setPendingAsset(asset);
      setDraftTitle((asset.name || '').replace(/\.[^.]+$/, ''));
      setModalVisible(true);
    } catch (e) {
      Alert.alert('Ошибка', 'Не получилось выбрать документ. Попробуй ещё раз.');
    }
  };

  const chooseImage = async () => {
    if (!selected) return;
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Нужен доступ к фото', 'Разреши Doctor_U выбирать изображения из медиатеки iPhone.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 });
      if (result.canceled) return;
      const asset = result.assets[0];
      setPendingAsset({ uri: asset.uri, name: asset.fileName || `image_${Date.now()}.jpg` });
      setDraftTitle((asset.fileName || 'Рисунок зуба').replace(/\.[^.]+$/, ''));
      setModalVisible(true);
    } catch (e) {
      Alert.alert('Ошибка', 'Не получилось выбрать изображение.');
    }
  };

  const confirmSave = async () => {
    if (!pendingAsset || !selected || busy) return;
    setBusy(true);
    try {
      const kind = /\.(png|jpe?g|heic|webp)$/i.test(pendingAsset.name || '') ? 'image' : 'document';
      await saveAsset(pendingAsset, kind);
    } catch (e) {
      Alert.alert('Не удалось сохранить', 'Проверь свободное место на устройстве и попробуй ещё раз.');
    } finally {
      setBusy(false);
    }
  };

  const openMaterial = async (item) => {
    try {
      const info = await FileSystem.getInfoAsync(item.uri);
      if (!info.exists) {
        Alert.alert('Файл не найден', 'Возможно, файл был удалён из памяти приложения.');
        return;
      }
      if (item.kind === 'image') return;
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(item.uri, { mimeType: 'application/pdf', dialogTitle: item.title });
      else Alert.alert('Предпросмотр недоступен', 'На этом устройстве нельзя открыть меню просмотра файла.');
    } catch (e) {
      Alert.alert('Не удалось открыть файл', 'Попробуй открыть его ещё раз.');
    }
  };

  const toggleFavorite = async (id) => persist(materials.map((item) => item.id === id ? { ...item, favorite: !item.favorite } : item));

  const removeMaterial = (item) => Alert.alert('Удалить материал?', `«${item.title}» будет удалён из Doctor_U.`, [
    { text: 'Отмена', style: 'cancel' },
    { text: 'Удалить', style: 'destructive', onPress: async () => {
      try { await FileSystem.deleteAsync(item.uri, { idempotent: true }); } catch (e) {}
      await persist(materials.filter((entry) => entry.id !== item.id));
    } },
  ]);

  const renderMaterial = (item) => (
    <View key={item.id} style={styles.materialCard}>
      <TouchableOpacity style={styles.materialMain} onPress={() => openMaterial(item)}>
        {item.kind === 'image' ? <Image source={{ uri: item.uri }} style={styles.thumb} /> : <View style={styles.fileIcon}><Text style={styles.fileIconText}>PDF</Text></View>}
        <View style={{ flex: 1 }}>
          <Text style={styles.materialTitle}>{item.title}</Text>
          <Text style={styles.materialSub} numberOfLines={1}>{item.fileName}</Text>
          <Text style={styles.materialSub}>{item.kind === 'image' ? 'Изображение' : 'Документ'} · {new Date(item.createdAt).toLocaleDateString('ru-RU')}</Text>
        </View>
      </TouchableOpacity>
      <View style={styles.materialActions}>
        <TouchableOpacity onPress={() => toggleFavorite(item.id)} style={styles.smallAction}><Text style={styles.actionText}>{item.favorite ? '♥' : '♡'}</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => removeMaterial(item)} style={styles.smallAction}><Text style={styles.deleteText}>Удалить</Text></TouchableOpacity>
      </View>
    </View>
  );

  const renderMaterialList = () => (
    <>
      <TextInput value={search} onChangeText={setSearch} placeholder="Поиск лекций и файлов" placeholderTextColor="#B49AA7" style={styles.search} />
      {visibleMaterials.length ? visibleMaterials.map(renderMaterial) : (
        <View style={styles.empty}><Text style={styles.emptyIcon}>📂</Text><Text style={styles.emptyTitle}>Пока здесь пусто</Text><Text style={styles.emptyText}>Добавленные материалы появятся в этом разделе.</Text></View>
      )}
    </>
  );

  const renderHome = () => (
    <>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>ТВОЯ УЧЁБА — В ОДНОМ МЕСТЕ</Text>
        <Text style={styles.heroTitle}>Учись уверенно{ '\n' }вместе с Doctor U</Text>
        <Text style={styles.heroText}>Лекции, конспекты и стоматологические знания — рядом.</Text>
      </View>
      <View style={styles.sectionRow}><Text style={styles.heading}>Мои предметы</Text><Text style={styles.count}>6 разделов</Text></View>
      {subjects.map((item) => (
        <TouchableOpacity key={item.id} style={styles.subject} onPress={() => setSelected(item)}>
          <Text style={styles.subjectIcon}>{item.icon}</Text>
          <View style={{ flex: 1 }}><Text style={styles.subjectTitle}>{item.title}</Text><Text style={styles.subjectSubtitle}>{item.subtitle}</Text></View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      ))}
      <View style={styles.infoCard}><Text style={styles.cardTitle}>Твоя библиотека</Text><Text style={styles.body}>Добавляй PDF, документы и фотографии конспектов. Файлы сохраняются локально на устройстве.</Text></View>
    </>
  );

  const title = selected ? selected.title : tab;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF7FA" />
      <View style={styles.header}>
        <View style={styles.logo}><Text style={styles.logoText}>U</Text></View>
        <View style={{ flex: 1 }}><Text style={styles.brand}>Doctor_U</Text><Text style={styles.tagline}>Твой помощник в стоматологии</Text></View>
        <View style={styles.headerCount}><Text style={styles.headerCountText}>{materials.length}</Text><Text style={styles.headerCountLabel}>файлов</Text></View>
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {selected ? (
          <>
            <TouchableOpacity onPress={() => { setSelected(null); setSearch(''); }}><Text style={styles.back}>‹  Все предметы</Text></TouchableOpacity>
            <Text style={styles.heading}>{selected.title}</Text>
            <Text style={styles.muted}>Материалы этого предмета</Text>
            <View style={styles.addRow}>
              <TouchableOpacity style={styles.addButton} onPress={choosePdf}><Text style={styles.addButtonText}>＋ Добавить PDF / Word</Text></TouchableOpacity>
              <TouchableOpacity style={styles.imageButton} onPress={chooseImage}><Text style={styles.imageButtonText}>＋ Фото</Text></TouchableOpacity>
            </View>
            {renderMaterialList()}
          </>
        ) : tab === 'Главная' ? renderHome() : tab === 'Мои материалы' || tab === 'Избранное' ? (
          <><Text style={styles.heading}>{tab}</Text><Text style={styles.muted}>{tab === 'Избранное' ? 'Сохранённые важные материалы' : 'Все твои лекции и конспекты'}</Text>{renderMaterialList()}</>
        ) : (
          <View style={styles.empty}><Text style={styles.emptyIcon}>{tab === 'Тесты' ? '📝' : '🌸'}</Text><Text style={styles.emptyTitle}>{tab === 'Тесты' ? 'Тесты появятся позже' : 'Doctor_U'}</Text><Text style={styles.emptyText}>{tab === 'Тесты' ? 'Сначала создадим удобную библиотеку учебных материалов.' : 'Приложение работает без регистрации и подписки.'}</Text></View>
        )}
      </ScrollView>
      <View style={styles.nav}>
        {['Главная', 'Мои материалы', 'Избранное', 'Профиль'].map((item) => (
          <TouchableOpacity key={item} style={styles.navItem} onPress={() => { setTab(item); setSelected(null); setSearch(''); }}>
            <Text style={[styles.navText, (tab === item && !selected) && styles.navActive]}>{item}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalBackdrop}><View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Сохранить материал</Text>
          <Text style={styles.modalHint}>Предмет: {selected?.title}</Text>
          <TextInput value={draftTitle} onChangeText={setDraftTitle} placeholder="Название материала" placeholderTextColor="#B49AA7" style={styles.modalInput} />
          <TouchableOpacity style={styles.modalPrimary} onPress={confirmSave} disabled={busy}><Text style={styles.modalPrimaryText}>{busy ? 'Сохраняем…' : 'Сохранить в Doctor_U'}</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => { setModalVisible(false); setPendingAsset(null); }} style={styles.modalCancel}><Text style={styles.modalCancelText}>Отмена</Text></TouchableOpacity>
        </View></View>
      </Modal>
    </SafeAreaView>
  );
}

const P = { ink: '#422A36', muted: '#927987', pink: '#B64F7D', pale: '#F8E3ED', line: '#F2E3EA' };
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFF7FA' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 12, gap: 11 },
  logo: { width: 43, height: 43, borderRadius: 14, backgroundColor: '#F3C7DA', alignItems: 'center', justifyContent: 'center' },
  logoText: { color: '#9B416A', fontSize: 25, fontWeight: '800' }, brand: { color: P.ink, fontSize: 20, fontWeight: '800' },
  tagline: { color: '#9B7C8B', fontSize: 11, marginTop: 2 }, headerCount: { alignItems: 'center', backgroundColor: '#F9EAF0', borderRadius: 12, paddingHorizontal: 11, paddingVertical: 5 },
  headerCountText: { color: P.pink, fontWeight: '800', fontSize: 14 }, headerCountLabel: { color: P.muted, fontSize: 9 },
  content: { padding: 17, paddingBottom: 28 }, hero: { backgroundColor: P.pale, borderRadius: 23, padding: 21, marginBottom: 23 },
  eyebrow: { color: '#A75A7C', fontSize: 9, fontWeight: '800', letterSpacing: 1 }, heroTitle: { color: P.ink, fontSize: 27, fontWeight: '800', lineHeight: 33, marginTop: 10 },
  heroText: { color: '#785A69', fontSize: 13, lineHeight: 19, marginTop: 9 }, sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 11 },
  heading: { color: P.ink, fontSize: 21, fontWeight: '800', marginBottom: 6 }, count: { color: '#A77E91', fontSize: 11 },
  subject: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 16, padding: 13, marginBottom: 9, gap: 11, borderWidth: 1, borderColor: P.line },
  subjectIcon: { fontSize: 24, width: 33, textAlign: 'center' }, subjectTitle: { color: '#49313D', fontSize: 13, fontWeight: '700' }, subjectSubtitle: { color: '#9A8490', fontSize: 10, marginTop: 4 },
  chevron: { color: '#C27B9C', fontSize: 24 }, infoCard: { backgroundColor: '#FFF', borderRadius: 17, padding: 16, marginTop: 12, borderWidth: 1, borderColor: P.line },
  cardTitle: { color: '#49313D', fontSize: 15, fontWeight: '800', marginBottom: 7 }, body: { color: '#725D68', fontSize: 12, lineHeight: 18 },
  back: { color: '#A34F75', fontSize: 14, fontWeight: '700', marginBottom: 16 }, muted: { color: '#A88C9A', fontSize: 12, marginBottom: 13 },
  addRow: { flexDirection: 'row', gap: 8, marginBottom: 15 }, addButton: { flex: 1, backgroundColor: P.pink, borderRadius: 13, paddingVertical: 12, alignItems: 'center' },
  addButtonText: { color: '#FFF', fontSize: 11, fontWeight: '800' }, imageButton: { backgroundColor: '#F5DCE7', borderRadius: 13, paddingHorizontal: 14, justifyContent: 'center' }, imageButtonText: { color: '#98476B', fontSize: 11, fontWeight: '800' },
  search: { backgroundColor: '#FFF', borderWidth: 1, borderColor: P.line, borderRadius: 13, paddingHorizontal: 14, paddingVertical: 11, color: P.ink, marginBottom: 12, fontSize: 13 },
  materialCard: { backgroundColor: '#FFF', borderWidth: 1, borderColor: P.line, borderRadius: 15, padding: 11, marginBottom: 9 }, materialMain: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  thumb: { width: 48, height: 48, borderRadius: 10, backgroundColor: '#F8E3ED' }, fileIcon: { width: 48, height: 48, borderRadius: 10, backgroundColor: '#F9EAF0', alignItems: 'center', justifyContent: 'center' },
  fileIconText: { color: P.pink, fontSize: 12, fontWeight: '900' }, materialTitle: { color: P.ink, fontSize: 13, fontWeight: '700' }, materialSub: { color: '#9A8490', fontSize: 10, marginTop: 3 },
  materialActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 7, gap: 8 }, smallAction: { paddingHorizontal: 8, paddingVertical: 3 }, actionText: { color: P.pink, fontSize: 19 }, deleteText: { color: '#B77C93', fontSize: 10, fontWeight: '600' },
  empty: { alignItems: 'center', padding: 30, backgroundColor: '#FFF', borderRadius: 18, borderWidth: 1, borderColor: P.line, marginTop: 12 }, emptyIcon: { fontSize: 35, marginBottom: 10 },
  emptyTitle: { color: P.ink, fontSize: 15, fontWeight: '800' }, emptyText: { color: P.muted, fontSize: 12, textAlign: 'center', lineHeight: 18, marginTop: 6 },
  nav: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 12, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: P.line }, navItem: { paddingHorizontal: 3 },
  navText: { color: '#A88C9A', fontSize: 10, fontWeight: '600' }, navActive: { color: P.pink, fontWeight: '800' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(55,30,43,0.35)', justifyContent: 'center', padding: 22 }, modalCard: { backgroundColor: '#FFF', borderRadius: 22, padding: 20 },
  modalTitle: { color: P.ink, fontSize: 19, fontWeight: '800' }, modalHint: { color: P.muted, fontSize: 11, marginTop: 6, marginBottom: 14 }, modalInput: { borderWidth: 1, borderColor: P.line, borderRadius: 12, padding: 12, color: P.ink, fontSize: 13 },
  modalPrimary: { backgroundColor: P.pink, borderRadius: 12, padding: 13, alignItems: 'center', marginTop: 14 }, modalPrimaryText: { color: '#FFF', fontWeight: '800', fontSize: 12 }, modalCancel: { alignItems: 'center', padding: 11, marginTop: 3 }, modalCancelText: { color: P.muted, fontSize: 12 },
});

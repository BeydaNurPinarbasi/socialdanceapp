# Eğitmen modülü — yapılacaklar listesi

Eğitmen onboarding, bireysel/kurum bağlantısı, ücretli-ücretsiz ders, etkinlik, program/takvim, öğrenci yönetimi ve devam/gelişim takibi.

---

## Faz 0 — Keşif ve hizalama

- [x] `EditEvent` / `EditClass` ekranlarının gerçek API’ye yazıp yazmadığını netleştir (mock vs Supabase). **Bulgu:** İkisi de yalnızca doğrulama + `goBack`; Supabase’e yazmıyor.
- [ ] Keşfet / okul detay / etkinlik listelerinde veri kaynağı haritasını çıkar (nerede birleştirilecek).
- [ ] Ödeme stratejisi: sadece fiyat gösterimi mi, uygulama içi ödeme mi (Faz 3 ile sınırla).
- [ ] Okul verisi (scraped `schools`) ile “eğitmen bu okulda” iddiası için ürün + hukuki metin kararı.

---

## Faz 1 — Veri modeli ve güvenlik (Supabase)

- [x] `instructor_profiles` (veya eşdeğeri) tablosu: `user_id`, çalışma modu, vitrin alanları, `created_at` / `updated_at`.
- [x] RLS: eğitmen kendi profilini okuyup güncellesin; public okuma kuralları (keşfet için).
- [x] `instructor_school_links` (opsiyonel Faz 1’de sadece yapı): `school_id`, `status`, `role`.
- [x] `instructor_lessons` (veya eşdeğeri): başlık, açıklama, `price` null = ücretsiz, seviye, `school_id` nullable.
- [x] Basit program: `instructor_schedule_slots` veya eşdeğeri (hafta günü, saat, timezone, lokasyon tipi).
- [x] `instructor_students`: eğitmen ↔ öğrenci `user_id`, durum (invited / active / archived).
- [x] Migration dosyalarını ekle; gerekirse seed/test verisi (sadece geliştirme). **Dosya:** `supabase/migrations/20260404_instructor_module.sql`

---

## Faz 2 — API ve istemci servisleri

- [x] `src/services/api/` altında eğitmen CRUD ve liste endpoint’leri (mevcut `apiClient` desenine uyum). **İlk adım:** `instructorProfile.ts` (`getMine`, `upsertMine`).
- [x] TypeScript tipleri (`types` / DTO mapping). **Model:** `InstructorProfileModel`, `InstructorWorkMode`.
- [x] Dersler + program slotları: `instructorLessons.ts` (`instructorLessonsService`, `instructorScheduleService`).
- [x] Öğrenciler: `instructorStudents.ts` (`listMine`, `addStudent`). **RLS:** `20260406_profiles_instructor_roster_read.sql`
- [x] Yönetici okul ataması: `school_instructor_assignments` + `instructorSchoolAssignments.ts` + `InstructorSchoolTab`. **Migration:** `20260408_school_instructor_assignments.sql`
- [ ] (İsteğe bağlı) Eğitmenin kendi seçtiği okul bağlantıları (`instructor_school_links`) ürün kararına göre.
- [ ] Hata ve yetki senaryoları (401, RLS reddi) için kullanıcı mesajları (tutarlı geri bildirim).

---

## Faz 3 — Navigasyon ve UI

- [x] `MainStackParamList` + yeni ekran route’ları. **`InstructorOnboarding`**
- [x] Ayarlar: “Eğitmen ol” CTA; zaten eğitmense “Eğitmen profilim” + başlık özeti.
- [x] `InstructorOnboarding` sekmeli panel: Profil, Dersler, Program, Öğrenciler, Okul (yakında).
- [ ] `InstructorDashboard` (özet kartlar: dersler, yaklaşan oturumlar, öğrenci sayısı).
- [x] Ders oluşturma / düzenleme / listeleme: `InstructorLessonsTab.tsx`
- [x] Basit haftalık program: `InstructorProgramTab.tsx` (gün + saat + konum tipi, `instructor_schedule_slots`).
- [x] Öğrenci listesi + UUID ile ekleme: `InstructorStudentsTab.tsx` (kullanıcı adı araması sonra).

---

## Faz 4 — Etkinlik ve gelişmiş program

- [ ] `instructor_events` (veya birleşik model): tarih, konum, kapasite, görsel, açıklama.
- [ ] Etkinliğe kayıt / katılımcı tablosu (mevcut `school_event_attendees` deseninden ilham).
- [ ] `instructor_sessions` (kesin tarih-saat oturumları) + `session_attendance` (yoklama).
- [ ] Öğrenci detay: devam özeti, gelişim notları / seviye (tablo + UI).

---

## Faz 5 — Kalite ve operasyon

- [ ] E2E veya manuel test senaryoları dokümante et.
- [ ] Performans: listelerde sayfalama / limit.
- [ ] İsteğe bağlı: eğitmen doğrulama, okul onayı, moderasyon araçları.

---

## Notlar

- Mevcut `school_events` / `school_classes` okul merkezli ve çoğunlukla salt okunur; bireysel eğitmen için paralel şema veya genişletme kararı Faz 0’da netleştirilmeli.
- KVKK: öğrenci ve not verileri için RLS ve veri minimizasyonu şart.

**Son güncelleme:** 2026-04-03

---

## Uygulama notu (migration)

Projede migration’ları uygulamadan ilgili özellikler hata verir. Sıra önerisi: `20260404_instructor_module.sql`, `20260405_profiles_visible_instructors_read.sql`, `20260406_profiles_instructor_roster_read.sql`, `20260407_instructor_lessons_starts_at.sql`, `20260408_school_instructor_assignments.sql` (yönetici okul ataması).

**Admin:** Okul atamak için SQL örneği: `insert into public.school_instructor_assignments (user_id, school_id) values ('<profil-uuid>', '<okul-uuid>');`

'use client'

import { useState } from 'react'
import NavBar from '../NavBar'
import Link from 'next/link'
import { useLocale } from 'next-intl'

type Section = {
  id: string
  icon: string
  title: string
  content: React.ReactNode
}

export default function GuidePage() {
  const locale = useLocale()
  const [activeSection, setActiveSection] = useState('intro')

  const sections: Section[] = [
    {
      id: 'intro',
      icon: '🌿',
      title: 'LexSyriac Nedir?',
      content: (
        <div>
          <p style={{ fontSize: '1rem', lineHeight: 1.8, color: 'var(--color-text)', marginBottom: '1.25rem' }}>
            LexSyriac, Süryanice–Türkçe–İngilizce–Almanca dil çalışmaları için geliştirilmiş çok katmanlı bir sözlük ve dil öğrenme platformudur. Yalnızca bir sözlük değil; kaynak metin analizi, gramer motoru, öğrenme sistemi ve içerik yönetimi araçlarını tek çatı altında birleştiren bütünleşik bir dilbilim ortamıdır.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            {[
              { label: 'Diller', value: 'Türkçe · Süryanice · İngilizce · Almanca' },
              { label: 'Altyapı', value: 'Next.js · Supabase · Claude AI · Vercel' },
              { label: 'Hedef Kitle', value: 'Araştırmacılar, öğrenciler, din adamları' },
              { label: 'Veri', value: '109 kelime · 92 cümle · 187 gramer kuralı' },
            ].map(item => (
              <div key={item.label} style={{ background: '#F0F8FA', borderRadius: 12, padding: '1rem', border: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.35rem' }}>{item.label}</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-primary)' }}>{item.value}</div>
              </div>
            ))}
          </div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--color-text)' }}>Vizyon</h3>
          <p style={{ fontSize: '0.95rem', lineHeight: 1.8, color: 'var(--color-text)', marginBottom: '1rem' }}>
            Süryanice, günümüzde konuşanlarının büyük çoğunluğu tarafından yalnızca dini ritüellerde kullanılan, nesli tükenmekte olan bir dildir. LexSyriac, bu dili dijital ortamda yaşatmak, öğrenilebilir ve erişilebilir kılmak için inşa edilmiştir. Platform, hem bireysel öğrenmeyi hem de akademik araştırmayı destekleyecek şekilde tasarlanmıştır.
          </p>
        </div>
      ),
    },
    {
      id: 'architecture',
      icon: '🏗️',
      title: 'Sistem Mimarisi',
      content: (
        <div>
          <p style={{ fontSize: '0.95rem', lineHeight: 1.8, marginBottom: '1.25rem', color: 'var(--color-text)' }}>
            LexSyriac beş ana modülden oluşur. Bu modüller birbirine bağlı bir veri ekosistemi içinde çalışır — her modülün ürettiği veri, diğer modüllerin kalitesini artırır.
          </p>
          <div style={{ background: '#F8F9FA', borderRadius: 12, padding: '1.5rem', border: '1px solid var(--color-border)', marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '1rem' }}>Veri Akışı</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {[
                { from: 'Kaynak Metinler', arrow: '→', to: 'OCR', desc: 'Ham görüntü → Süryanice metin' },
                { from: 'OCR Çıktısı', arrow: '→', to: 'Eşleştirme', desc: 'Metin → Sözlük kelimeleri' },
                { from: 'Sözlük', arrow: '→', to: 'Öğrenme', desc: 'Kelimeler → Flashcard sorular' },
                { from: 'Gramer Motoru', arrow: '→', to: 'Sözlük', desc: 'Çekim kuralları → Kelime detayları' },
                { from: 'LexScan', arrow: '→', to: 'Pending', desc: 'Toplu import → Onay kuyruğu' },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.88rem' }}>
                  <span style={{ background: 'var(--color-primary)', color: 'white', padding: '0.2rem 0.6rem', borderRadius: 8, fontWeight: 600, whiteSpace: 'nowrap' }}>{item.from}</span>
                  <span style={{ color: 'var(--color-primary)', fontWeight: 700 }}>{item.arrow}</span>
                  <span style={{ background: '#E0F0F4', color: 'var(--color-primary)', padding: '0.2rem 0.6rem', borderRadius: 8, fontWeight: 600, whiteSpace: 'nowrap' }}>{item.to}</span>
                  <span style={{ color: 'var(--color-text-muted)', fontSize: '0.82rem' }}>{item.desc}</span>
                </div>
              ))}
            </div>
          </div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.75rem' }}>Veritabanı Yapısı</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
            {[
              { table: 'words', desc: 'Ana kelime havuzu', fields: 'turkish, syriac, english, root, transliteration' },
              { table: 'sentences', desc: 'Örnek cümleler', fields: 'sentence_syc, sentence_tr, sentence_en' },
              { table: 'grammar_rules', desc: 'Gramer kuralları', fields: 'rule_title, tense, person, example_sy' },
              { table: 'source_documents', desc: 'Kaynak belgeler', fields: 'title, file_type, status' },
              { table: 'source_text_chunks', desc: 'OCR metin parçaları', fields: 'content, translation_tr' },
              { table: 'profiles', desc: 'Kullanıcı profilleri', fields: 'email, role, full_name' },
            ].map(item => (
              <div key={item.table} style={{ background: 'white', border: '1px solid var(--color-border)', borderRadius: 10, padding: '0.75rem' }}>
                <div style={{ fontFamily: 'monospace', fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '0.25rem' }}>{item.table}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: '0.35rem' }}>{item.desc}</div>
                <div style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: '#666' }}>{item.fields}</div>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      id: 'dictionary',
      icon: '📖',
      title: 'Sözlük Modülü',
      content: (
        <div>
          <p style={{ fontSize: '0.95rem', lineHeight: 1.8, marginBottom: '1.25rem', color: 'var(--color-text)' }}>
            Sözlük, platformun temel veri kaynağıdır. Tüm diğer modüller — öğrenme, gramer, kaynak analizi — sözlük tablosundaki verileri kullanır veya bu tabloya katkı sağlar.
          </p>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.75rem' }}>Çalışma Mantığı</h3>
          <div style={{ display: 'grid', gap: '0.75rem', marginBottom: '1.5rem' }}>
            {[
              { step: '1', title: 'Kelime Arama', desc: 'Kullanıcı Türkçe, Süryanice veya İngilizce arama yapar. Sistem tüm dil alanlarında eşzamanlı arama yapar.' },
              { step: '2', title: 'Sonuç Gösterimi', desc: 'Kelime kartı: Süryanice (RTL), transliterasyon, Türkçe/İngilizce karşılık, kelime türü, kategori, görsel.' },
              { step: '3', title: 'Detay Sayfası', desc: 'Örnek cümleler, ses kaydı, kök bilgisi, gramer bağlantıları ve ilgili kelimeler gösterilir.' },
            ].map(item => (
              <div key={item.step} style={{ display: 'flex', gap: '1rem', padding: '0.75rem', background: '#F0F8FA', borderRadius: 10 }}>
                <div style={{ background: 'var(--color-primary)', color: 'white', width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem', flexShrink: 0 }}>{item.step}</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.2rem' }}>{item.title}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', lineHeight: 1.6 }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.75rem' }}>Diğer Modüllerle İlişkisi</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
            {[
              { module: 'Öğrenme', relation: 'Tüm kelimeler flashcard sorusu olarak kullanılır' },
              { module: 'Kaynak Metinler', relation: 'OCR sonucu bulunan kelimeler sözlüğe bağlanır' },
              { module: 'Gramer', relation: 'Kelimenin kök bilgisi çekim kurallarına temel oluşturur' },
              { module: 'LexScan', relation: 'Toplu metin analizi sözlüğe yeni kelime önerir' },
            ].map(item => (
              <div key={item.module} style={{ border: '1px solid var(--color-border)', borderRadius: 10, padding: '0.75rem' }}>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--color-primary)', marginBottom: '0.25rem' }}>→ {item.module}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>{item.relation}</div>
              </div>
            ))}
          </div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.75rem' }}>Potansiyel</h3>
          <ul style={{ paddingLeft: '1.25rem', lineHeight: 2, color: 'var(--color-text)', fontSize: '0.9rem' }}>
            <li>Syriac Unicode entegrasyonu ile gerçek Süryanice script desteği</li>
            <li>SEDRA veritabanı ile otomatik doğrulama</li>
            <li>Ses kayıtları ile telaffuz kütüphanesi</li>
            <li>Kelime köküne dayalı otomatik çekim üretimi</li>
          </ul>
        </div>
      ),
    },
    {
      id: 'learning',
      icon: '🎓',
      title: 'Öğrenme Modülü',
      content: (
        <div>
          <p style={{ fontSize: '0.95rem', lineHeight: 1.8, marginBottom: '1.25rem', color: 'var(--color-text)' }}>
            Öğrenme modülü, sözlükteki kelimeleri interaktif pratik sorularına dönüştürür. Spaced repetition mantığına dayalı bir kuyruk sistemi ile yanlış cevaplanan kelimeler tekrar sıraya girer.
          </p>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.75rem' }}>Çalışma Mantığı</h3>
          <div style={{ background: '#F8F9FA', borderRadius: 12, padding: '1.25rem', marginBottom: '1.25rem', border: '1px solid var(--color-border)' }}>
            <div style={{ fontSize: '0.85rem', lineHeight: 2, color: 'var(--color-text)' }}>
              <strong>Oturum Başlatma:</strong> Kullanıcı mod, soru dili, cevap dili, kategori ve kelime türü seçer.<br />
              <strong>Öğrenme Kartı:</strong> Soru gösterilir → "Cevabı Göster" → Süryanice + transliterasyon + Türkçe/İngilizce görünür.<br />
              <strong>Test Aşaması:</strong> 4 şıklı çoktan seçmeli soru. Doğru şık yeşil, yanlış şık kırmızı olur.<br />
              <strong>Yanlış Cevap:</strong> Kelime kuyruğun sonuna eklenir, maksimum 3 kez tekrar edilir.<br />
              <strong>Tamamlama:</strong> Tüm kelimeler doğru cevaplanınca oturum biter, istatistikler gösterilir.
            </div>
          </div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.75rem' }}>Modlar</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
            {[
              { mod: 'Normal Mod', desc: 'Öğrenme kartı → Test aşaması akışı' },
              { mod: 'Sınav Modu', desc: 'Direkt 4 şıklı test, tekrar yok' },
              { mod: 'Görselden → Süryanice', desc: 'Kelime görseli gösterilir, Süryanice yazılış sorulur' },
              { mod: 'Görselden → İngilizce', desc: 'Kelime görseli gösterilir, İngilizce karşılık sorulur' },
            ].map(item => (
              <div key={item.mod} style={{ background: '#F0F8FA', borderRadius: 10, padding: '0.75rem', border: '1px solid var(--color-border)' }}>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.25rem' }}>{item.mod}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{item.desc}</div>
              </div>
            ))}
          </div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.75rem' }}>Potansiyel</h3>
          <ul style={{ paddingLeft: '1.25rem', lineHeight: 2, color: 'var(--color-text)', fontSize: '0.9rem' }}>
            <li><code>learning_stage</code> alanı ile uzun vadeli ilerleme takibi</li>
            <li>Cümle bazlı pratik — kelimeleri bağlam içinde öğrenme</li>
            <li>Gramer kuralları testleri — çekim sorularıyla dil bilgisi pratiği</li>
            <li>Kullanıcı başarı istatistikleri ve öğrenme grafikleri</li>
          </ul>
        </div>
      ),
    },
    {
      id: 'sources',
      icon: '📜',
      title: 'Kaynak Metinler',
      content: (
        <div>
          <p style={{ fontSize: '0.95rem', lineHeight: 1.8, marginBottom: '1.25rem', color: 'var(--color-text)' }}>
            Kaynak Metinler modülü, dini metinler ve el yazmalarından dijital kelime verisi üretir. OCR, tercüme ve kök analizi pipeline'ı ile bir görüntüden sözlük zenginleştirmesine kadar tam döngü sağlar.
          </p>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.75rem' }}>Pipeline Akışı</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
            {[
              { step: '1', title: 'Dosya Yükleme', desc: 'JPG, PNG veya PDF formatında Süryanice metin içeren belge yüklenir.' },
              { step: '2', title: 'OCR (Claude Vision)', desc: 'Claude AI görüntüyü analiz eder, Süryanice karakterleri tanır ve metin olarak çıkarır.' },
              { step: '3', title: 'Tercüme', desc: 'Çıkarılan Süryanice metin, Claude API ile Türkçeye çevrilir. Chunk\'lar halinde işlenir.' },
              { step: '4', title: 'Eşleştirme', desc: 'Metindeki her kelime sözlükteki words.syriac alanıyla karşılaştırılır. Eşleşenler bağlanır.' },
              { step: '5', title: 'Kök Analizi', desc: 'Eşleşen kelimeler kök bilgisiyle gösterilir. Eşleşmeyenler "+ Ekle" butonu ile sözlüğe eklenebilir.' },
            ].map(item => (
              <div key={item.step} style={{ display: 'flex', gap: '1rem', padding: '0.75rem 1rem', background: i => i % 2 === 0 ? '#F0F8FA' : 'white', borderRadius: 10, border: '1px solid var(--color-border)' }}>
                <div style={{ background: 'var(--color-primary)', color: 'white', width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem', flexShrink: 0 }}>{item.step}</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.2rem' }}>{item.title}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', lineHeight: 1.6 }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.75rem' }}>Potansiyel</h3>
          <ul style={{ paddingLeft: '1.25rem', lineHeight: 2, color: 'var(--color-text)', fontSize: '0.9rem' }}>
            <li>Yüzlerce el yazmasının otomatik dijitalleştirilmesi</li>
            <li>Metinde geçen kelimelerin gramer bağlamına göre analizi</li>
            <li>Kaynak metinler arasında çapraz kelime araması</li>
            <li>Akademik atıf ve kaynak belirtme sistemi</li>
          </ul>
        </div>
      ),
    },
    {
      id: 'grammar',
      icon: '📚',
      title: 'Gramer Modülü',
      content: (
        <div>
          <p style={{ fontSize: '0.95rem', lineHeight: 1.8, marginBottom: '1.25rem', color: 'var(--color-text)' }}>
            Gramer modülü, Süryanice dil kurallarını yapılandırılmış veri olarak depolar ve fiil çekimi gibi işlemleri gerçekleştiren kural motoru içerir.
          </p>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.75rem' }}>Kural Motoru</h3>
          <div style={{ background: '#F8F9FA', borderRadius: 12, padding: '1.25rem', marginBottom: '1.25rem', border: '1px solid var(--color-border)' }}>
            <div style={{ fontSize: '0.85rem', lineHeight: 2, color: 'var(--color-text)' }}>
              <strong>Root-Based Pattern Engine:</strong> Fiil kökünden (örn: ܟܬܒ) tüm çekimleri üretir.<br />
              <strong>Çekim Matrisi:</strong> Zaman × Şahıs × Sayı eksenleri boyunca 187 kural.<br />
              <strong>Öncelik Sırası:</strong> DB kuralı {'>'} Root Engine {'>'} Matrix Fallback {'>'} Default.<br />
              <strong>Kural Tipleri:</strong> prefix (ön ek), suffix (son ek), replace (tam değiştirme).
            </div>
          </div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.75rem' }}>Kural Kategorileri</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
            {['Şahıs Zamirleri', 'Fiil Çekimleri', 'İsim Çekimleri', 'Sıfat Uyumu', 'Zarf Yapıları', 'Bağlaçlar'].map(cat => (
              <div key={cat} style={{ background: '#F0F8FA', borderRadius: 8, padding: '0.6rem 0.75rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-primary)', textAlign: 'center', border: '1px solid var(--color-border)' }}>{cat}</div>
            ))}
          </div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.75rem' }}>Potansiyel</h3>
          <ul style={{ paddingLeft: '1.25rem', lineHeight: 2, color: 'var(--color-text)', fontSize: '0.9rem' }}>
            <li>Cümle Oluşturucu: Gramer kurallarına göre otomatik cümle üretimi</li>
            <li>Kaynak metinlerdeki çekimleri otomatik etiketleme</li>
            <li>Gramer testi modu: Öğrenme modülüne çekim soruları ekleme</li>
            <li>Farklı Süryanice lehçeler için kural setleri</li>
          </ul>
        </div>
      ),
    },
    {
      id: 'admin',
      icon: '⚙️',
      title: 'Admin Paneli',
      content: (
        <div>
          <p style={{ fontSize: '0.95rem', lineHeight: 1.8, marginBottom: '1.25rem', color: 'var(--color-text)' }}>
            Admin paneli, platformun tüm içerik yönetiminin yapıldığı merkezi alandır. Sadece <code>admin</code> rolüne sahip kullanıcılar erişebilir.
          </p>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.75rem' }}>Modüller</h3>
          <div style={{ display: 'grid', gap: '0.75rem', marginBottom: '1.5rem' }}>
            {[
              { title: 'Kelime Yönetimi', path: '/admin/words', desc: 'Kelime ekleme, düzenleme, silme. AI çözümleyici ile Türkçe/İngilizce/Süryanice otomatik doldurma. SEDRA doğrulama. Görsel ve ses ekleme.' },
              { title: 'LexScan', path: '/admin/lexscan', desc: 'TXT, DOCX, XLSX, CSV dosyalarından toplu kelime çıkarma. Claude API ile chunk bazlı analiz. Pending onay kuyruğu.' },
              { title: 'Source Pool', path: '/admin/source-pool', desc: 'Görüntü/PDF yükleme, Claude Vision OCR, Türkçe tercüme, kelime eşleştirme pipeline\'ı.' },
              { title: 'Gramer Kuralları', path: '/admin/grammar', desc: 'Kural ekleme, düzenleme, onaylama. Kategori yönetimi. Çekim motoru testi.' },
              { title: 'Cümle Yönetimi', path: '/admin/sentences', desc: 'Çok dilli örnek cümleler. words tablosuyla ilişkilendirme.' },
              { title: 'Kullanıcı Yönetimi', path: '/admin/users', desc: 'Kullanıcı listeleme, rol atama (admin/member), üye silme.' },
              { title: 'Pending Onay', path: '/admin/pending', desc: 'LexScan\'den gelen kelime önerilerini inceleme, düzenleme ve onaylama/reddetme.' },
            ].map(item => (
              <div key={item.title} style={{ display: 'flex', gap: '1rem', padding: '0.75rem 1rem', background: 'white', borderRadius: 10, border: '1px solid var(--color-border)' }}>
                <div style={{ minWidth: 140 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem', marginBottom: '0.2rem' }}>{item.title}</div>
                  <code style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{item.path}</code>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', lineHeight: 1.6 }}>{item.desc}</div>
              </div>
            ))}
          </div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.75rem' }}>Kelime Ekleme İş Akışı</h3>
          <div style={{ background: '#F0F8FA', borderRadius: 12, padding: '1.25rem', border: '1px solid var(--color-border)' }}>
            <div style={{ fontSize: '0.85rem', lineHeight: 2.2, color: 'var(--color-text)' }}>
              <strong>Yol 1 — Manuel:</strong> Admin paneli → Kelime Yönetimi → Kelime Ekle → Türkçe gir → Çözümle → AI doldurur → Kaydet<br />
              <strong>Yol 2 — LexScan:</strong> Dosya yükle → Claude analiz eder → Pending kuyruğu → Admin inceler → Onayla → Sözlüğe eklenir<br />
              <strong>Yol 3 — Source Pool:</strong> Görüntü yükle → OCR → Eşleştir → Sözlükte olmayan kelime → "+ Ekle" → Admin sayfasında syriac dolu açılır
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'relations',
      icon: '🔗',
      title: 'Modüller Arası İlişkiler',
      content: (
        <div>
          <p style={{ fontSize: '0.95rem', lineHeight: 1.8, marginBottom: '1.25rem', color: 'var(--color-text)' }}>
            LexSyriac'ın gücü, modüllerin birbirini besleyen döngüsel yapısından gelir. Aşağıdaki tablo her modülün hangi modüllere veri sağladığını ve hangilerinden beslendiğini gösterir.
          </p>
          <div style={{ overflowX: 'auto', marginBottom: '1.5rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: 'var(--color-primary)', color: 'white' }}>
                  <th style={{ padding: '0.6rem 0.75rem', textAlign: 'left' }}>Modül</th>
                  <th style={{ padding: '0.6rem 0.75rem', textAlign: 'left' }}>Beslendiği Kaynaklar</th>
                  <th style={{ padding: '0.6rem 0.75rem', textAlign: 'left' }}>Beslediği Modüller</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { module: '📖 Sözlük', from: 'Admin girişi, LexScan, Source Pool', to: 'Öğrenme, Gramer, Kaynak Analizi' },
                  { module: '🎓 Öğrenme', from: 'Sözlük (words tablosu)', to: 'learning_stage verisi → Sözlük' },
                  { module: '📜 Kaynak Metinler', from: 'Yüklenen görüntüler/PDF', to: 'Sözlük (yeni kelimeler), Eşleştirme' },
                  { module: '📚 Gramer', from: 'Admin girişi, LexScan', to: 'Sözlük (kök bilgisi), Öğrenme (gelecek)' },
                  { module: '⚙️ LexScan', from: 'Yüklenen dosyalar (TXT/DOCX/XLSX)', to: 'Pending kuyruğu → Sözlük' },
                ].map((row, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? '#F8F9FA' : 'white', borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '0.6rem 0.75rem', fontWeight: 600 }}>{row.module}</td>
                    <td style={{ padding: '0.6rem 0.75rem', color: 'var(--color-text-muted)' }}>{row.from}</td>
                    <td style={{ padding: '0.6rem 0.75rem', color: 'var(--color-primary)', fontWeight: 500 }}>{row.to}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.75rem' }}>Temel Prensip</h3>
          <div style={{ background: '#F0F8FA', borderRadius: 12, padding: '1.25rem', border: '1px solid var(--color-border)' }}>
            <p style={{ fontSize: '0.9rem', lineHeight: 1.8, margin: 0, color: 'var(--color-text)' }}>
              Sisteme yüklenen her yeni kaynak metin, sözlüğü zenginleştirir. Zenginleşen sözlük, öğrenme modülünü geliştirir. Gelişen öğrenme modülü, kullanıcı verisini artırır. Kullanıcı verisi, hangi kelimelerin daha fazla pratiğe ihtiyaç duyduğunu gösterir. Bu döngü, platformun zaman içinde kendi kendini geliştiren bir yapıya kavuşmasını sağlar.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'potential',
      icon: '🚀',
      title: 'Gelecek Potansiyeli',
      content: (
        <div>
          <p style={{ fontSize: '0.95rem', lineHeight: 1.8, marginBottom: '1.25rem', color: 'var(--color-text)' }}>
            LexSyriac, mevcut altyapısıyla güçlü bir temel sunmaktadır. Aşağıdaki genişleme alanları, platformun uzun vadeli gelişim yol haritasını oluşturmaktadır.
          </p>
          <div style={{ display: 'grid', gap: '1rem' }}>
            {[
              {
                title: 'Syriac Unicode Entegrasyonu',
                status: 'Planlandı',
                desc: '9 aşamalı güvenli entegrasyon planı hazır. Mevcut transliterasyon sisteminden gerçek Süryanice Unicode scriptine geçiş. Tüm mevcut veriler korunacak.',
                color: '#E8F4FD',
                border: '#90CAF9',
              },
              {
                title: 'RehberLog Entegrasyonu',
                status: 'Planlama Aşamasında',
                desc: 'Turist rehberleri için ayrı bir mobil uygulama (React Native + Expo). LexSyriac\'ın dil veritabanını kullanarak tarihi mekan ve eser açıklamalarını çok dilli sunma.',
                color: '#E8F5E9',
                border: '#A5D6A7',
              },
              {
                title: 'Cümle Oluşturucu (Phase 5)',
                status: 'Geliştiriliyor',
                desc: 'Gramer kuralları ve kelime havuzunu kullanarak otomatik Süryanice cümle üretimi. Dil öğrenenler için bağlamlı pratik imkânı.',
                color: '#FFF8E1',
                border: '#FFE082',
              },
              {
                title: 'Kaynak Metin Havuzu Genişlemesi',
                status: 'Aktif',
                desc: 'Daha fazla el yazması ve dini metin yüklenip OCR ile dijitalleştirilerek kelime havuzunu genişletme. Çapraz kaynak arama özelliği.',
                color: '#F3E5F5',
                border: '#CE93D8',
              },
              {
                title: 'API ve Açık Veri',
                status: 'Gelecek',
                desc: 'LexSyriac verilerini üçüncü taraf uygulamalar için açık API olarak sunma. Akademik kullanım için veri seti indirme imkânı.',
                color: '#FCE4EC',
                border: '#F48FB1',
              },
            ].map(item => (
              <div key={item.title} style={{ background: item.color, border: `1px solid ${item.border}`, borderRadius: 12, padding: '1rem 1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{item.title}</div>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, background: 'rgba(0,0,0,0.08)', padding: '0.2rem 0.5rem', borderRadius: 8 }}>{item.status}</span>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--color-text)', lineHeight: 1.7 }}>{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      ),
    },
  ]

  const activeContent = sections.find(s => s.id === activeSection)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      <NavBar />
      <main>
        <div style={{ background: 'linear-gradient(135deg, var(--color-primary) 0%, #0F3D47 100%)', padding: '2.75rem 0' }}>
          <div className="container">
            <p style={{ color: 'rgba(255,255,255,0.72)', fontSize: '0.82rem', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.45rem' }}>Dokümantasyon</p>
            <h1 style={{ color: 'white', fontFamily: 'var(--font-display)', fontSize: '2.1rem', fontWeight: 700, marginBottom: '0.65rem' }}>
              LexSyriac Kullanım Klavuzu
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.86)', fontSize: '0.98rem', lineHeight: 1.7, maxWidth: 760 }}>
              Platform mimarisi, modül ilişkileri, çalışma mantıkları ve gelecek potansiyeli.
            </p>
          </div>
        </div>

        <div className="container" style={{ padding: '2rem 1.5rem 4rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '2rem', alignItems: 'start' }}>

            {/* Sol menü */}
            <div style={{ position: 'sticky', top: '1.5rem' }}>
              <div className="card" style={{ padding: '0.5rem' }}>
                {sections.map(section => (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '0.65rem 0.75rem',
                      borderRadius: 8,
                      border: 'none',
                      background: activeSection === section.id ? 'var(--color-primary)' : 'transparent',
                      color: activeSection === section.id ? 'white' : 'var(--color-text)',
                      fontWeight: activeSection === section.id ? 700 : 500,
                      fontSize: '0.88rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      marginBottom: '0.15rem',
                    }}
                  >
                    <span>{section.icon}</span>
                    <span>{section.title}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Sağ içerik */}
            <div className="card" style={{ padding: '2rem' }}>
              {activeContent && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--color-border)' }}>
                    <span style={{ fontSize: '2rem' }}>{activeContent.icon}</span>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>{activeContent.title}</h2>
                  </div>
                  {activeContent.content}
                </>
              )}
            </div>

          </div>
        </div>
      </main>
    </div>
  )
}
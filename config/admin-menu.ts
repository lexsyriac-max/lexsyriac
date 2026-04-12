/**
 * ADMIN MENU CONFIGURATION
 * Merkezi yönetim paneli menüsü
 */

export interface AdminPage {
  id: string
  label: string
  label_tr: string
  label_en: string
  path: string
  icon: string
  description?: string
  description_tr?: string
  description_en?: string
  section: 'quick-actions' | 'management' | 'system'
  enabled: boolean
  order: number
}

export interface AdminSection {
  id: string
  label: string
  label_tr: string
  label_en: string
  color?: string
}

export const adminSections: AdminSection[] = [
  {
    id: 'quick-actions',
    label: 'Quick Actions',
    label_tr: 'Hızlı İşlemler',
    label_en: 'Quick Actions',
    color: '#f59e0b',
  },
  {
    id: 'management',
    label: 'Management',
    label_tr: 'Yönetim',
    label_en: 'Management',
    color: '#3b82f6',
  },
  {
    id: 'system',
    label: 'System',
    label_tr: 'Sistem',
    label_en: 'System',
    color: '#8b5cf6',
  },
]

export const adminPages: AdminPage[] = [
  // QUICK ACTIONS (1-4)
  {
    id: 'words',
    label: 'Add Word',
    label_tr: 'Kelime Ekle',
    label_en: 'Add Word',
    path: '/admin/words',
    icon: '📝',
    description: 'Manage words pool',
    description_tr: 'Kelime havuzunu düzenle',
    description_en: 'Manage words pool',
    section: 'quick-actions',
    enabled: true,
    order: 1,
  },
  {
    id: 'import',
    label: 'Bulk Import',
    label_tr: 'Toplu Yükle',
    label_en: 'Bulk Import',
    path: '/admin/import',
    icon: '⬆',
    description: 'Excel / CSV / Word import',
    description_tr: 'Excel / CSV / Word içe aktar',
    description_en: 'Excel / CSV / Word import',
    section: 'quick-actions',
    enabled: true,
    order: 2,
  },
  {
    id: 'rules',
    label: 'Grammar Rules',
    label_tr: 'Gramer Kuralları',
    label_en: 'Grammar Rules',
    path: '/admin/rules',
    icon: '📚',
    description: 'Create and manage grammar rules',
    description_tr: 'Gramer kurallarını ekle ve düzenle',
    description_en: 'Create and manage grammar rules',
    section: 'quick-actions',
    enabled: true,
    order: 3,
  },
  {
    id: 'pending',
    label: 'Pending Review',
    label_tr: 'Pending Kontrol',
    label_en: 'Pending Review',
    path: '/admin/pending',
    icon: '⏳',
    description: 'Review pending content',
    description_tr: 'Bekleyen kelime ve kuralları incele',
    description_en: 'Review pending content',
    section: 'quick-actions',
    enabled: true,
    order: 4,
  },

  // MANAGEMENT (5-9)
  {
    id: 'categories',
    label: 'Categories',
    label_tr: 'Kategoriler',
    label_en: 'Categories',
    path: '/admin/categories',
    icon: '🗂️',
    description: 'Manage word categories',
    description_tr: 'Kategorileri yönet',
    description_en: 'Manage word categories',
    section: 'management',
    enabled: true,
    order: 5,
  },
  {
    id: 'grammar-engine',
    label: 'Grammar Engine',
    label_tr: 'Grammar Engine',
    label_en: 'Grammar Engine',
    path: '/admin/grammar-engine',
    icon: '⚙️',
    description: 'Sedra + Claude conjugation engine',
    description_tr: 'Sedra + Claude çekim üretici',
    description_en: 'Sedra + Claude conjugation engine',
    section: 'management',
    enabled: true,
    order: 5,
  },
  {
    id: 'grammar',
    label: 'Grammar',
    label_tr: 'Gramer Editörü',
    label_en: 'Grammar',
    path: '/admin/grammar',
    icon: 'Gramer',
    description: 'Edit grammar content',
    description_tr: 'Gramer içeriğini düzenle',
    description_en: 'Edit grammar content',
    section: 'management',
    enabled: true,
    order: 6,
  },
  {
    id: 'lexscan',
    label: 'LexScan',
    label_tr: 'LexScan',
    label_en: 'LexScan',
    path: '/admin/lexscan',
    icon: '📄',
    description: 'File analysis and extraction',
    description_tr: 'Dosya analiz ederek kelime ve kural çıkar',
    description_en: 'File analysis and extraction',
    section: 'management',
    enabled: true,
    order: 7,
  },
  {
    id: 'sentences',
    label: 'Sentence Builder',
    label_tr: 'Cümle Motoru',
    label_en: 'Sentence Builder',
    path: '/admin/sentences',
    icon: '✍️',
    description: 'Build and manage sentences',
    description_tr: 'Sentence Builder ve geri bildirim alanı',
    description_en: 'Build and manage sentences',
    section: 'management',
    enabled: true,
    order: 8,
  },
  {
    id: 'sentence-manage',
    label: 'Sentence Manage',
    label_tr: 'Cümle Yönetimi',
    label_en: 'Sentence Manage',
    path: '/admin/sentence-manage',
    icon: '📋',
    description: 'List, edit and translate sentences',
    description_tr: 'Cümleleri listele, düzenle ve çevir',
    description_en: 'List, edit and translate sentences',
    section: 'management',
    enabled: true,
    order: 9,
  },

  // SYSTEM (10+)
  {
    id: 'users',
    label: 'Users',
    label_tr: 'Kullanıcılar',
    label_en: 'Users',
    path: '/admin/users',
    icon: '👥',
    description: 'Manage users and roles',
    description_tr: 'Rol ve erişim yönetimi',
    description_en: 'Manage users and roles',
    section: 'system',
    enabled: true,
    order: 10,
  },
]

export function getActivePages(): AdminPage[] {
  return adminPages.filter((p) => p.enabled).sort((a, b) => a.order - b.order)
}

export function getPagesBySection(section: AdminPage['section']): AdminPage[] {
  return adminPages
    .filter((p) => p.section === section && p.enabled)
    .sort((a, b) => a.order - b.order)
}

export function getPageById(id: string): AdminPage | undefined {
  return adminPages.find((p) => p.id === id)
}

export function togglePage(id: string): void {
  const page = getPageById(id)
  if (page) {
    page.enabled = !page.enabled
  }
}

export function reorderPages(ids: string[]): void {
  ids.forEach((id, index) => {
    const page = getPageById(id)
    if (page) {
      page.order = index + 1
    }
  })
}

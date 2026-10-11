import React from 'react';
import { GiftIcon, PlusIcon, TagIcon, EditIcon, TrashIcon } from '@/components/admin/AdminIcons';

export default function ShopTab({
  shopFilterType,
  setShopFilterType,
  shopItems,
  shopLoading,
  openShopCreateModal,
  openShopEditModal,
  toggleShopItemActive,
  deleteShopItem
}) {
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
          <GiftIcon /> Mağaza
        </h2>
        <button className="btn btn-primary btn-sm" onClick={() => openShopCreateModal(shopFilterType)}>
          <PlusIcon /> Yeni Öğe
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {[
          { id: 'badge', label: 'Rozetler' },
          { id: 'frame', label: 'Avatar Çerçeveleri' },
          { id: 'title', label: 'Unvanlar' },
        ].map(t => (
          <button
            key={t.id}
            className={`btn btn-sm ${shopFilterType === t.id ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setShopFilterType(t.id)}
          >
            {t.label} ({shopItems.filter(i => i.type === t.id).length})
          </button>
        ))}
      </div>

      {shopLoading ? (
        <div className="admin-card" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Yükleniyor...</div>
      ) : shopItems.filter(i => i.type === shopFilterType).length === 0 ? (
        <div className="admin-card" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <p style={{ color: 'var(--text-muted)', marginBottom: 12 }}>Bu kategoride henüz öğe yok.</p>
          <button className="btn btn-primary" onClick={() => openShopCreateModal(shopFilterType)}>
            <PlusIcon /> İlk Öğeyi Oluştur
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 12 }}>
          {shopItems.filter(i => i.type === shopFilterType).map(item => (
            <div key={item.id} className="admin-card" style={{ opacity: item.is_active ? 1 : 0.5 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                {item.type === 'title' ? (
                  <div style={{ width: 48, height: 48, borderRadius: 8, background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <TagIcon />
                  </div>
                ) : (
                  <div style={{ width: 48, height: 48, borderRadius: item.type === 'frame' ? '50%' : 8, background: 'var(--bg-tertiary)', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {item.image_url && <img src={item.image_url} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} decoding="async" />}
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: item.type === 'title' ? (item.title_color || undefined) : undefined }}>
                    {item.name}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {item.price.toLocaleString()} puan
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => openShopEditModal(item)}>
                  <EditIcon /> Düzenle
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => toggleShopItemActive(item)}>
                  {item.is_active ? 'Gizle' : 'Göster'}
                </button>
                <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => deleteShopItem(item)}>
                  <TrashIcon />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

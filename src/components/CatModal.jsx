import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useWorld, BUILTIN_CATS } from '../hooks/useWorld';

const PALETTE = ['#7ab8d4','#8fbd7c','#d4956a','#b88fc4','#e8a0a8','#a8d4b8','#d4c07a','#c4a0d4','#7ab8a8','#d4a07a','#a0b4d4','#d4b8a0'];

export default function CatModal({ onClose, showToast }) {
  const { t } = useTranslation();
  const { cats, allCats, addCat, updateCat, deleteCat, upsertBuiltinSubs } = useWorld();

  const [newName,  setNewName]  = useState('');
  const [newIcon,  setNewIcon]  = useState('');
  const [newColor, setNewColor] = useState(PALETTE[0]);
  const [subParent, setSubParent] = useState('');
  const [subName,   setSubName]   = useState('');

  const allCatsEditable = allCats();

  const handleAddCat = async () => {
    if (!newName.trim()) return alert(t('cat.alert_name'));
    await addCat({ name: newName.trim(), icon: newIcon.trim() || '📁', color: newColor, colorDim: newColor + '33', subs: [] });
    setNewName(''); setNewIcon(''); setNewColor(PALETTE[0]);
    showToast(t('cat.toast_created'));
  };

  const handleAddSub = async () => {
    if (!subParent) return alert(t('cat.alert_parent'));
    if (!subName.trim()) return alert(t('cat.alert_sub_name'));
    const isBuiltin = BUILTIN_CATS.find(c => c.id === subParent);
    if (isBuiltin) {
      await upsertBuiltinSubs(subParent, subName.trim());
    } else {
      const cat = cats.find(c => c.id === subParent);
      if (!cat) return;
      await updateCat(subParent, { subs: [...(cat.subs || []), subName.trim()] });
    }
    setSubName('');
    showToast(t('cat.toast_sub_added'));
  };

  const handleRemoveSub = async (catId, sub) => {
    const cat = cats.find(c => c.id === catId);
    if (!cat) return;
    await updateCat(catId, { subs: cat.subs.filter(s => s !== sub) });
    showToast(t('cat.toast_sub_removed'));
  };

  const handleDeleteCat = async (catId) => {
    if (!window.confirm(t('cat.delete_confirm'))) return;
    await deleteCat(catId);
    showToast(t('cat.toast_deleted'));
  };

  return (
    <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width: 580, maxHeight: '85vh', overflowY: 'auto' }}>
        <div className="modal-title">{t('cat.title')}</div>
        <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 14 }}>
          {t('cat.builtin_note')}
        </p>

        <div style={{ marginBottom: 20 }}>
          {allCatsEditable.map(cat => (
            <div key={cat.id} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '10px 14px', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 18 }}>{cat.icon}</span>
                <span style={{ color: cat.color, fontWeight: 600, fontSize: 14 }}>{cat.name}</span>
                <span style={{ marginLeft: 'auto', display: 'flex', gap: 5 }}>
                  {!cat.builtin && (
                    <button className="btn-d" style={{ fontSize: 11, padding: '2px 8px' }} onClick={() => handleDeleteCat(cat.id)}>
                      {t('cat.delete')}
                    </button>
                  )}
                  {cat.builtin && <span style={{ fontSize: 10, color: 'var(--text-muted)', fontStyle: 'italic' }}>{t('cat.builtin')}</span>}
                </span>
              </div>
              {(cat.subs || []).length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 8 }}>
                  {cat.subs.map(sub => (
                    <span key={sub} style={{ background: 'var(--surface3)', border: '1px solid var(--border)', borderRadius: 20, padding: '2px 10px', fontSize: 12, color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: 5 }}>
                      {sub}
                      <span style={{ cursor: 'pointer', opacity: .5, fontSize: 13 }} onClick={() => handleRemoveSub(cat.id, sub)}>×</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Nuova categoria */}
        <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: 14, marginBottom: 14 }}>
          <div className="dp-lbl" style={{ marginBottom: 10 }}>{t('cat.new_section')}</div>
          <div className="frow">
            <div className="fg" style={{ margin: 0 }}>
              <label className="fl">{t('common.name_lbl')}</label>
              <input className="fi" style={{ marginBottom: 0 }} placeholder={t('cat.name_ph')} value={newName} onChange={e => setNewName(e.target.value)} autoComplete="off" />
            </div>
            <div className="fg" style={{ margin: 0 }}>
              <label className="fl">{t('cat.icon_lbl')}</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 2 }}>
                {['👤','📍','📦','⚡','🐉','👁','⚔','🏰','🌿','💀','🔮','📜','💎','🔥','🌊','🌙','🌟','🎭','🧙','🏔','🌋','🗺','🚢','🏛','🌾','🍄','🐴','🦁','🐍','🦋','🌹','🍷','🐺','🦅','🐻','🐗','🌲','🏺','⚗️','🎯'].map(emoji => (
                  <button key={emoji} type="button" onClick={() => setNewIcon(emoji)}
                    style={{ width: 32, height: 32, background: newIcon === emoji ? 'var(--surface3)' : 'var(--surface2)', border: `1px solid ${newIcon === emoji ? 'var(--gold-dim)' : 'var(--border)'}`, borderRadius: 6, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .15s' }}>
                    {emoji}
                  </button>
                ))}
              </div>
              {newIcon && (
                <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text-muted)' }}>
                  {t('cat.icon_selected')} <span style={{ fontSize: 16 }}>{newIcon}</span>
                  <button onClick={() => setNewIcon('')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 11, marginLeft: 6 }}>{t('cat.icon_remove')}</button>
                </div>
              )}
            </div>
          </div>
          <div style={{ marginTop: 10, marginBottom: 12 }}>
            <label className="fl">{t('cat.color_lbl')}</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
              {PALETTE.map(c => (
                <div key={c} onClick={() => setNewColor(c)} style={{ width: 22, height: 22, borderRadius: '50%', background: c, cursor: 'pointer', border: newColor === c ? '2px solid var(--text)' : '2px solid transparent', transition: 'transform .15s', transform: newColor === c ? 'scale(1.2)' : 'scale(1)' }} />
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn-p" onClick={handleAddCat}>{t('cat.create_btn')}</button>
          </div>
        </div>

        {/* Aggiungi sottocategoria */}
        <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: 14 }}>
          <div className="dp-lbl" style={{ marginBottom: 10 }}>{t('cat.sub_section')}</div>
          <div className="frow">
            <div className="fg" style={{ margin: 0 }}>
              <label className="fl">{t('cat.parent_lbl')}</label>
              <select className="fs" style={{ marginBottom: 0 }} value={subParent} onChange={e => setSubParent(e.target.value)}>
                <option value="">{t('common.select')}</option>
                {allCatsEditable.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
            </div>
            <div className="fg" style={{ margin: 0 }}>
              <label className="fl">{t('cat.sub_name_lbl')}</label>
              <input className="fi" style={{ marginBottom: 0 }} placeholder={t('cat.sub_name_ph')} value={subName} onChange={e => setSubName(e.target.value)} autoComplete="off"
                onKeyDown={e => e.key === 'Enter' && handleAddSub()} />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
            <button className="btn-p" onClick={handleAddSub}>{t('cat.add_btn')}</button>
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn-g" onClick={onClose}>{t('common.close')}</button>
        </div>
      </div>
    </div>
  );
}

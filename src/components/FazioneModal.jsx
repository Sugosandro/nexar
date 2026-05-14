import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useWorld } from '../hooks/useWorld';
import ElementPicker from './ElementPicker';

export default function FazioneModal({ initialData = null, onSave, onClose }) {
  const { t } = useTranslation();
  const { fazioni } = useWorld();

  const [name,     setName]     = useState(initialData?.name     || '');
  const [desc,     setDesc]     = useState(initialData?.desc     || '');
  const [motto,    setMotto]    = useState(initialData?.motto    || '');
  const [members,  setMembers]  = useState(initialData?.members  || []);
  const [parentId, setParentId] = useState(initialData?.parentId || null);

  const handleSave = () => {
    if (!name.trim()) { alert(t('common.name_required')); return; }
    const ancestors = [];
    let current = parentId;
    while (current) {
      const faz = fazioni.find(f => f.id === current);
      if (!faz || ancestors.includes(faz.id)) break;
      ancestors.push(faz.id);
      current = faz.parentId;
    }
    onSave({
      name: name.trim(), desc, motto, members,
      parentId: parentId || null,
      rels: initialData?.rels || [],
      notes: initialData?.notes || '',
      _ancestors: ancestors,
    });
  };

  return (
    <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">{initialData ? t('faction.title_edit') : t('faction.title_new')}</div>
        <div className="fg"><label className="fl">{t('common.name_lbl')}</label>
          <input className="fi" placeholder={t('faction.name_ph')} value={name} onChange={e => setName(e.target.value)} autoFocus autoComplete="off" />
        </div>
        <div className="fg"><label className="fl">{t('common.desc_lbl')}</label>
          <textarea className="ft" placeholder={t('faction.desc_ph')} value={desc} onChange={e => setDesc(e.target.value)} />
        </div>
        <div className="fg"><label className="fl">{t('faction.motto_lbl')}</label>
          <input className="fi" placeholder={t('faction.motto_ph')} value={motto} onChange={e => setMotto(e.target.value)} autoComplete="off" />
        </div>
        <div className="fg"><label className="fl">{t('faction.parent_lbl')}</label>
          <select className="fs" value={parentId || ''} onChange={e => setParentId(e.target.value || null)}>
            <option value="">{t('common.none_f')}</option>
            {fazioni.filter(f => f.id !== initialData?.id).map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </div>
        <div className="fg"><label className="fl">{t('faction.members_lbl')}</label>
          <ElementPicker selected={members} onChange={setMembers} inputId="fmemInput" />
        </div>
        <div className="modal-actions">
          <button className="btn-g" onClick={onClose}>{t('common.cancel')}</button>
          <button className="btn-p" onClick={handleSave}>{initialData ? t('common.save_changes') : t('faction.create_btn')}</button>
        </div>
      </div>
    </div>
  );
}

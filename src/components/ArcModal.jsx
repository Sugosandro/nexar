import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import ElementPicker from './ElementPicker';

export default function ArcModal({ initialData = null, onSave, onClose }) {
  const { t } = useTranslation();
  const [name,     setName]     = useState(initialData?.name         || '');
  const [desc,     setDesc]     = useState(initialData?.desc         || '');
  const [phases,   setPhases]   = useState((initialData?.phases || []).join(', '));
  const [curPhase, setCurPhase] = useState(initialData?.currentPhase || '');
  const [members,  setMembers]  = useState(initialData?.members      || []);

  const handleSave = () => {
    if (!name.trim()) { alert(t('common.name_required')); return; }
    onSave({ name: name.trim(), desc, phases: phases.split(',').map(p => p.trim()).filter(Boolean), currentPhase: curPhase, members, notes: initialData?.notes || '' });
  };

  return (
    <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">{initialData ? t('arc.title_edit') : t('arc.title_new')}</div>
        <div className="fg"><label className="fl">{t('arc.name_lbl')}</label>
          <input className="fi" placeholder={t('arc.name_ph')} value={name} onChange={e => setName(e.target.value)} autoFocus autoComplete="off" />
        </div>
        <div className="fg"><label className="fl">{t('common.desc_lbl')}</label>
          <textarea className="ft" placeholder={t('arc.desc_ph')} value={desc} onChange={e => setDesc(e.target.value)} />
        </div>
        <div className="fg"><label className="fl">{t('arc.phases_lbl')}</label>
          <input className="fi" placeholder={t('arc.phases_ph')} value={phases} onChange={e => setPhases(e.target.value)} autoComplete="off" />
        </div>
        <div className="fg"><label className="fl">{t('arc.cur_ph_lbl')}</label>
          <input className="fi" placeholder={t('arc.cur_ph_ph')} value={curPhase} onChange={e => setCurPhase(e.target.value)} autoComplete="off" />
        </div>
        <div className="fg"><label className="fl">{t('arc.members_lbl')}</label>
          <ElementPicker selected={members} onChange={setMembers} inputId="aMemIn" />
        </div>
        <div className="modal-actions">
          <button className="btn-g" onClick={onClose}>{t('common.cancel')}</button>
          <button className="btn-p" onClick={handleSave}>{initialData ? t('common.save_changes') : t('arc.create_btn')}</button>
        </div>
      </div>
    </div>
  );
}

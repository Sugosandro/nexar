import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import ElementPicker from './ElementPicker';

export default function MagiaModal({ initialData = null, onSave, onClose }) {
  const { t } = useTranslation();
  const [name,  setName]  = useState(initialData?.name  || '');
  const [desc,  setDesc]  = useState(initialData?.desc  || '');
  const [rules, setRules] = useState((initialData?.rules || []).join('\n'));
  const [users, setUsers] = useState(initialData?.users || []);

  const handleSave = () => {
    if (!name.trim()) { alert(t('common.name_required')); return; }
    onSave({ name: name.trim(), desc, rules: rules.split('\n').map(r => r.trim()).filter(Boolean), users, notes: initialData?.notes || '' });
  };

  return (
    <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">{initialData ? t('magic.title_edit') : t('magic.title_new')}</div>
        <div className="fg"><label className="fl">{t('common.name_lbl')}</label>
          <input className="fi" placeholder={t('magic.name_ph')} value={name} onChange={e => setName(e.target.value)} autoFocus autoComplete="off" />
        </div>
        <div className="fg"><label className="fl">{t('common.desc_lbl')}</label>
          <textarea className="ft" placeholder={t('magic.desc_ph')} value={desc} onChange={e => setDesc(e.target.value)} />
        </div>
        <div className="fg"><label className="fl">{t('magic.rules_lbl')}</label>
          <textarea className="ft" placeholder={t('magic.rules_ph')} value={rules} onChange={e => setRules(e.target.value)} style={{ minHeight: 80 }} />
        </div>
        <div className="fg"><label className="fl">{t('magic.users_lbl')}</label>
          <ElementPicker selected={users} onChange={setUsers} inputId="mUserIn" placeholder={t('magic.users_ph')} />
        </div>
        <div className="modal-actions">
          <button className="btn-g" onClick={onClose}>{t('common.cancel')}</button>
          <button className="btn-p" onClick={handleSave}>{initialData ? t('common.save_changes') : t('magic.create_btn')}</button>
        </div>
      </div>
    </div>
  );
}

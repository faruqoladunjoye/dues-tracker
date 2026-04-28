import { useState, FormEvent, useEffect, useRef } from 'react';
import type { Player } from '../types';
import type { PlayerInput } from '../api/client';
import { api, getMediaUrl } from '../api/client';
import CustomSelect from './CustomSelect';

const POSITIONS = ['Goalkeeper', 'Defender', 'Midfielder', 'Winger', 'Striker'].map(
  (p) => ({ label: p, value: p })
);

const NG_PHONE_REGEX = /^(\+234|234|0)[7-9][0-1]\d{8}$/;

interface AdminPanelProps {
  activeYear: number;
  editTarget: Player | null;
  onClose: () => void;
  onSave: (data: PlayerInput, photoFile?: File) => Promise<void>;
  onChangeYear: (year: number) => Promise<void>;
  onToast: (message: string, type: 'success' | 'error') => void;
}

function emptyForm(): PlayerInput {
  return { name: '', nickname: '', date_of_birth: '', phone_number: '', jersey_number: undefined, position: '' };
}

function playerToForm(p: Player): PlayerInput {
  return {
    name: p.name,
    nickname: p.nickname ?? '',
    date_of_birth: p.date_of_birth ?? '',
    phone_number: p.phone_number ?? '',
    jersey_number: p.jersey_number ?? undefined,
    position: p.position ?? '',
  };
}

export default function AdminPanel({
  activeYear,
  editTarget,
  onClose,
  onSave,
  onChangeYear,
  onToast,
}: AdminPanelProps) {
  const [form, setForm]           = useState<PlayerInput>(editTarget ? playerToForm(editTarget) : emptyForm());
  const [errors, setErrors]       = useState<Record<string, string>>({});
  const [saving, setSaving]       = useState(false);
  const [yearInput, setYearInput] = useState(activeYear.toString());
  const [yearError, setYearError] = useState('');
  const [yearSaving, setYearSaving] = useState(false);

  // Photo state — for edit: shows current photo; for add: shows local preview before upload
  const [photoPreview, setPhotoPreview] = useState<string | null>(
    editTarget ? getMediaUrl(editTarget.photo_url) : null
  );
  const [photoUploading, setPhotoUploading] = useState(false);
  const [pendingPhotoFile, setPendingPhotoFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setForm(editTarget ? playerToForm(editTarget) : emptyForm());
    setErrors({});
    setPhotoPreview(editTarget ? getMediaUrl(editTarget.photo_url) : null);
    setPendingPhotoFile(null);
  }, [editTarget]);

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (form.phone_number && !NG_PHONE_REGEX.test(form.phone_number)) {
      e.phone_number = 'Enter a valid Nigerian phone number (e.g. 08012345678)';
    }
    if (form.date_of_birth && !/^\d{4}-\d{2}-\d{2}$/.test(form.date_of_birth)) {
      e.date_of_birth = 'Use YYYY-MM-DD format';
    }
    if (form.jersey_number !== undefined && form.jersey_number !== null) {
      const n = Number(form.jersey_number);
      if (!Number.isInteger(n) || n < 1 || n > 99) e.jersey_number = 'Jersey number must be 1–99';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      await onSave(
        {
          name: form.name.trim(),
          nickname: form.nickname?.trim() || null,
          date_of_birth: form.date_of_birth?.trim() || null,
          phone_number: form.phone_number?.trim() || null,
          jersey_number: form.jersey_number ? Number(form.jersey_number) : null,
          position: form.position?.trim() || null,
        },
        pendingPhotoFile ?? undefined
      );
      onClose();
    } catch (err) {
      setErrors({ _global: err instanceof Error ? err.message : 'Save failed' });
    } finally {
      setSaving(false);
    }
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (editTarget) {
      // Edit mode: upload immediately
      const fd = new FormData();
      fd.append('photo', file);
      setPhotoUploading(true);
      try {
        const result = await api.uploadPhoto(editTarget.id, fd);
        setPhotoPreview(getMediaUrl(result.photo_url));
        onToast('Photo updated', 'success');
      } catch (err) {
        onToast(err instanceof Error ? err.message : 'Photo upload failed', 'error');
      } finally {
        setPhotoUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    } else {
      // Add mode: show local preview, upload after player is created
      setPendingPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleYearChange() {
    const y = parseInt(yearInput, 10);
    if (isNaN(y) || y < 2024 || y > 2100) { setYearError('Enter a valid year (2024–2100)'); return; }
    if (y === activeYear) { setYearError('That is already the active year'); return; }
    setYearError('');
    setYearSaving(true);
    try {
      await onChangeYear(y);
    } catch (err) {
      setYearError(err instanceof Error ? err.message : 'Failed to change year');
    } finally {
      setYearSaving(false);
    }
  }

  function field(key: keyof PlayerInput, label: string, type = 'text', placeholder = '') {
    return (
      <label className="form-label">
        {label}
        <input
          type={type}
          value={(form[key] as string | number | undefined) ?? ''}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              [key]: type === 'number'
                ? (e.target.value === '' ? undefined : Number(e.target.value))
                : e.target.value,
            }))
          }
          placeholder={placeholder}
        />
        {errors[key] && <span className="field-error">{errors[key]}</span>}
      </label>
    );
  }

  return (
    <div className="panel-overlay" onClick={onClose}>
      <aside className="admin-panel" onClick={(e) => e.stopPropagation()}>
        <div className="panel-header">
          <h2>{editTarget ? 'Edit Player' : 'Add Player'}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {/* Photo upload — available for both add and edit */}
        <div className="photo-upload-section">
          <div className="photo-upload-preview">
            {photoPreview ? (
              <img src={photoPreview} alt="Player" className="photo-thumb" />
            ) : (
              <div className="photo-placeholder">No photo</div>
            )}
          </div>
          <div className="photo-upload-actions">
            <button
              type="button"
              className="btn-upload"
              onClick={() => fileInputRef.current?.click()}
              disabled={photoUploading}
            >
              {photoUploading
                ? 'Uploading…'
                : photoPreview
                  ? '↺ Change Photo'
                  : '+ Upload Photo'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handlePhotoChange}
            />
            <span className="photo-hint">
              {editTarget
                ? 'JPG, PNG, WEBP · max 3 MB'
                : pendingPhotoFile
                  ? `${pendingPhotoFile.name} · saved on add`
                  : 'Optional · JPG, PNG, WEBP · max 3 MB'}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="panel-form">
          {field('name', 'Full Name *', 'text', 'e.g. Emeka Okafor')}
          {field('nickname', 'Nickname', 'text', 'e.g. Bullet')}
          {field('date_of_birth', 'Date of Birth', 'date')}
          {field('phone_number', 'Phone Number', 'tel', '08012345678')}
          {field('jersey_number', 'Jersey Number', 'number', '10')}
          <label className="form-label">
            Position
            <CustomSelect
              value={form.position ?? ''}
              onChange={(v) => setForm((f) => ({ ...f, position: v }))}
              options={POSITIONS}
              placeholder="— Select position —"
            />
          </label>

          {errors._global && <p className="form-error">{errors._global}</p>}

          <div className="panel-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving…' : editTarget ? 'Save Changes' : 'Add Player'}
            </button>
          </div>
        </form>

        <hr className="panel-divider" />

        <div className="year-section">
          <h3>Active Year</h3>
          <p className="year-hint">
            Currently showing <strong>{activeYear}</strong>. Changing the year creates new
            due rows for all players — old data is preserved.
          </p>
          <div className="year-row">
            <input
              type="number"
              value={yearInput}
              onChange={(e) => setYearInput(e.target.value)}
              min={2024}
              max={2100}
              className="year-input"
            />
            <button className="btn-primary" onClick={handleYearChange} disabled={yearSaving}>
              {yearSaving ? 'Updating…' : 'Change Year'}
            </button>
          </div>
          {yearError && <p className="form-error">{yearError}</p>}
        </div>
      </aside>
    </div>
  );
}

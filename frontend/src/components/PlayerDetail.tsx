import type { Player } from '../types';
import { getMediaUrl } from '../api/client';

interface PlayerDetailProps {
  player: Player;
  onClose: () => void;
}

/** Formats "1995-06-12" → "June 12"  (no year, per requirement) */
function formatDobNoYear(dob: string | null): string {
  if (!dob) return '—';
  const [, month, day] = dob.split('-');
  return new Date(2000, parseInt(month, 10) - 1, parseInt(day, 10))
    .toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();
}

export default function PlayerDetail({ player, onClose }: PlayerDetailProps) {
  const photoSrc = getMediaUrl(player.photo_url);
  const paidCount = player.dues.filter((d) => d.paid).length;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="player-detail-card" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close detail-close" onClick={onClose}>×</button>

        {/* Photo / avatar */}
        <div className="detail-photo-wrap">
          {photoSrc ? (
            <img src={photoSrc} alt={player.name} className="detail-photo" />
          ) : (
            <div className="detail-avatar">{getInitials(player.name)}</div>
          )}
        </div>

        {/* Info */}
        <div className="detail-body">
          <h2 className="detail-name">{player.name}</h2>

          {player.nickname && (
            <p className="detail-nickname">{player.nickname}</p>
          )}

          {player.position && (
            <span className="position-badge detail-position">{player.position}</span>
          )}

          <div className="detail-grid">
            <div className="detail-field">
              <span className="detail-label">Jersey Number</span>
              <span className="detail-value">{player.jersey_number ?? '—'}</span>
            </div>
            <div className="detail-field">
              <span className="detail-label">Birthday</span>
              <span className="detail-value">{formatDobNoYear(player.date_of_birth)}</span>
            </div>
            <div className="detail-field">
              <span className="detail-label">Contact</span>
              <span className="detail-value">{player.phone_number ?? '—'}</span>
            </div>
            <div className="detail-field">
              <span className="detail-label">Dues paid</span>
              <span className={`detail-value ${paidCount === 12 ? 'count-full' : paidCount === 0 ? 'count-zero' : ''}`}>
                {paidCount} / 12
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import type { Player, Due } from '../types';
import MonthBox from './MonthBox';
import { Pencil, Trash2 } from 'lucide-react';

const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

interface PlayerRowProps {
  player: Player;
  isAdmin: boolean;
  onToggleDue: (playerId: number, month: number) => void;
  onEdit: (player: Player) => void;
  onDelete: (player: Player) => void;
  onViewDetail: (player: Player) => void;
}

function getDue(dues: Due[], month: number): Due | undefined {
  return dues.find((d) => d.month === month);
}

export default function PlayerRow({
  player,
  isAdmin,
  onToggleDue,
  onEdit,
  onDelete,
  onViewDetail,
}: PlayerRowProps) {
  const paidCount = player.dues.filter((d) => d.paid).length;

  return (
    <tr className="player-row">
      <td className="player-info">
        <span className="jersey">{player.jersey_number ?? '—'}</span>
        <div className="player-names">
          <button
            className="player-name-btn"
            onClick={() => onViewDetail(player)}
            title="View player details"
          >
            {player.name}
          </button>
          {player.nickname && (
            <span className="player-nickname">{player.nickname}</span>
          )}
        </div>
        <span className="position-badge">{player.position ?? ''}</span>
      </td>

      {MONTHS.map((month) => {
        const due = getDue(player.dues, month);
        return (
          <td key={month} className="due-cell">
            <MonthBox
              paid={due?.paid ?? false}
              clickable={isAdmin}
              onClick={() => onToggleDue(player.id, month)}
            />
          </td>
        );
      })}

      <td className="paid-count">
        <span className={paidCount === 12 ? 'count-full' : paidCount === 0 ? 'count-zero' : ''}>
          {paidCount}/12
        </span>
      </td>

      {isAdmin && (
        <td className="actions-cell">
          <button className="btn-icon" onClick={() => onEdit(player)} title="Edit player">
            <Pencil size={18} />
          </button>
          <button className="btn-icon btn-danger" onClick={() => onDelete(player)} title="Delete player">
            <Trash2 size={18} color="#ff4d4f" />
          </button>
        </td>
      )}
    </tr>
  );
}

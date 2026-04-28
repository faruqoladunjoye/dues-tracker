import type { Player } from '../types';
import PlayerRow from './PlayerRow';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface PlayerTableProps {
  players: Player[];
  activeYear: number;
  isAdmin: boolean;
  total: number;
  page: number;
  totalPages: number;
  search: string;
  onSearchChange: (q: string) => void;
  onToggleDue: (playerId: number, month: number) => void;
  onEdit: (player: Player) => void;
  onDelete: (player: Player) => void;
  onViewDetail: (player: Player) => void;
  onPageChange: (page: number) => void;
}

export default function PlayerTable({
  players,
  activeYear,
  isAdmin,
  total,
  page,
  totalPages,
  search,
  onSearchChange,
  onToggleDue,
  onEdit,
  onDelete,
  onViewDetail,
  onPageChange,
}: PlayerTableProps) {
  function pageNumbers(): (number | '…')[] {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: (number | '…')[] = [1];
    if (page > 3) pages.push('…');
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
      pages.push(i);
    }
    if (page < totalPages - 2) pages.push('…');
    pages.push(totalPages);
    return pages;
  }

  return (
    <div>
      {/* Search + meta row */}
      <div className="table-toolbar">
        <div className="search-wrap">
          <span className="search-icon">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </span>
          <input
            className="search-input"
            type="search"
            placeholder="Search by name or nickname…"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          {search && (
            <button className="search-clear" onClick={() => onSearchChange('')} aria-label="Clear search">×</button>
          )}
        </div>
        <span className="table-meta-count">
          {search
            ? `${total} result${total !== 1 ? 's' : ''}`
            : `${total} player${total !== 1 ? 's' : ''}`}
          {totalPages > 1 && <span className="meta-page"> · page {page}/{totalPages}</span>}
        </span>
      </div>

      {players.length === 0 ? (
        <div className="empty-state">
          {search
            ? <p>No players match "<strong>{search}</strong>".</p>
            : <p>No players yet.{isAdmin ? ' Add your first player using the Admin Panel.' : ''}</p>}
        </div>
      ) : (
        <>
          <div className="table-wrapper">
            <table className="dues-table">
              <thead>
                <tr>
                  <th className="th-player">Player</th>
                  {MONTH_LABELS.map((label, i) => (
                    <th key={i + 1} className="th-month">
                      {label}<br /><span className="th-year">{activeYear}</span>
                    </th>
                  ))}
                  <th className="th-total">Paid</th>
                  {isAdmin && <th className="th-actions">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {players.map((player) => (
                  <PlayerRow
                    key={player.id}
                    player={player}
                    isAdmin={isAdmin}
                    onToggleDue={onToggleDue}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onViewDetail={onViewDetail}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button
                className="page-btn"
                onClick={() => onPageChange(page - 1)}
                disabled={page === 1}
              >
                ‹ Prev
              </button>

              {pageNumbers().map((n, i) =>
                n === '…' ? (
                  <span key={`ellipsis-${i}`} className="page-ellipsis">…</span>
                ) : (
                  <button
                    key={n}
                    className={`page-btn ${n === page ? 'page-active' : ''}`}
                    onClick={() => onPageChange(n as number)}
                  >
                    {n}
                  </button>
                )
              )}

              <button
                className="page-btn"
                onClick={() => onPageChange(page + 1)}
                disabled={page === totalPages}
              >
                Next ›
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

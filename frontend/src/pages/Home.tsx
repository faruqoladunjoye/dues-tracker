import { useEffect, useRef, useState } from 'react';
import type { Player } from '../types';
import { api } from '../api/client';
import type { PlayerInput } from '../api/client';
import { useAuth } from '../context/AuthContext';
import PlayerTable from '../components/PlayerTable';
import LoginModal from '../components/LoginModal';
import AdminPanel from '../components/AdminPanel';
import PlayerDetail from '../components/PlayerDetail';
import ConfirmModal from '../components/ConfirmModal';
import ToastContainer, { type ToastItem } from '../components/Toast';

export default function Home() {
  const { isAdmin, logout, autoLoggedOut, clearAutoLogout } = useAuth();

  const [players, setPlayers]       = useState<Player[]>([]);
  const [activeYear, setActiveYear] = useState<number>(2026);
  const [page, setPage]             = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal]           = useState(0);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');

  const [toasts, setToasts]           = useState<ToastItem[]>([]);
  const [showLogin, setShowLogin]     = useState(false);
  const [showPanel, setShowPanel]     = useState(false);
  const [editTarget, setEditTarget]   = useState<Player | null>(null);
  const [viewPlayer, setViewPlayer]   = useState<Player | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Player | null>(null);

  // Track whether the panel was opened in add mode so we reload after close
  const panelIsAddRef = useRef(false);

  function addToast(message: string, type: ToastItem['type'] = 'success') {
    setToasts((prev) => [...prev, { id: Date.now(), message, type }]);
  }

  function dismissToast(id: number) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  async function loadPage(p: number, q = search) {
    setLoading(true);
    try {
      const data = await api.getPlayers(p, 10, q);
      setPlayers(data.players);
      setActiveYear(data.activeYear);
      setPage(data.page);
      setTotalPages(data.totalPages);
      setTotal(data.total);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to load players', 'error');
    } finally {
      setLoading(false);
    }
  }

  // Initial load
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadPage(1, ''); }, []);

  // Show toast when idle timeout logs the admin out
  useEffect(() => {
    if (!autoLoggedOut) return;
    addToast('Session expired — you have been logged out for security', 'error');
    clearAutoLogout();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoLoggedOut]);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => loadPage(1, search), 300);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  async function handleToggleDue(playerId: number, month: number) {
    try {
      const updated = await api.toggleDue(playerId, month);
      setPlayers((prev) =>
        prev.map((p) => {
          if (p.id !== playerId) return p;
          const exists = p.dues.some((d) => d.month === month);
          const newDues = exists
            ? p.dues.map((d) => (d.month === month ? updated : d))
            : [...p.dues, updated];
          return { ...p, dues: newDues };
        })
      );
      addToast(updated.paid ? 'Marked as paid' : 'Marked as unpaid');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to update due', 'error');
    }
  }

  async function handleSavePlayer(data: PlayerInput, photoFile?: File): Promise<void> {
    if (editTarget) {
      const updated = await api.updatePlayer(editTarget.id, data);
      setPlayers((prev) =>
        prev.map((p) => (p.id === updated.id ? { ...updated, dues: p.dues } : p))
      );
      addToast(`${updated.name} updated`);
    } else {
      const created = await api.addPlayer(data);
      if (photoFile) {
        try {
          const fd = new FormData();
          fd.append('photo', photoFile);
          await api.uploadPhoto(created.id, fd);
        } catch {
          addToast('Player added but photo upload failed', 'error');
        }
      }
      addToast('Player added successfully');
      panelIsAddRef.current = true;
    }
  }

  function handlePanelClose() {
    setShowPanel(false);
    if (panelIsAddRef.current) {
      panelIsAddRef.current = false;
      loadPage(1, search);
    }
  }

  async function handleDelete(player: Player) {
    setConfirmDelete(player);
  }

  async function executeDelete() {
    if (!confirmDelete) return;
    const player = confirmDelete;
    setConfirmDelete(null);
    try {
      await api.deletePlayer(player.id);
      addToast(`${player.name} removed`);
      const remaining = players.length - 1;
      await loadPage(remaining === 0 && page > 1 ? page - 1 : page);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to delete player', 'error');
    }
  }

  function openAddPanel()           { panelIsAddRef.current = false; setEditTarget(null); setShowPanel(true); }
  function openEditPanel(p: Player) { panelIsAddRef.current = false; setEditTarget(p);    setShowPanel(true); }

  async function handleChangeYear(year: number) {
    await api.changeYear(year);
    setActiveYear(year);
    addToast(`Active year changed to ${year}`);
    await loadPage(1, search);
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <img src="/logo.jpg" alt="Akoka FC" className="club-crest" />
          <div>
            <h1 className="club-name">AKOKA FC</h1>
            <p className="club-sub">Monthly Dues Tracker — {activeYear}</p>
          </div>
        </div>
        <div className="header-right">
          {isAdmin ? (
            <>
              <button className="btn-secondary" onClick={openAddPanel}>+ Add Player</button>
              <button className="btn-outline" onClick={logout}>Logout</button>
            </>
          ) : (
            <button className="btn-outline" onClick={() => setShowLogin(true)}>Admin Login</button>
          )}
        </div>
      </header>

      <main className="app-main">
        {loading && !players.length && <p className="status-msg">Loading players…</p>}
        <PlayerTable
          players={players}
          activeYear={activeYear}
          isAdmin={isAdmin}
          total={total}
          page={page}
          totalPages={totalPages}
          search={search}
          onSearchChange={setSearch}
          onToggleDue={handleToggleDue}
          onEdit={openEditPanel}
          onDelete={handleDelete}
          onViewDetail={(p) => setViewPlayer(p)}
          onPageChange={(p) => loadPage(p)}
        />
      </main>

      <footer className="app-footer">
        <p>
          <span className="legend-box paid" /> Paid &nbsp;&nbsp;
          <span className="legend-box unpaid" /> Unpaid
          {isAdmin && (
            <span className="admin-hint"> — Click any box to toggle · Click a name to view details</span>
          )}
        </p>
      </footer>

      {showLogin && (
        <LoginModal
          onClose={() => setShowLogin(false)}
          onSuccess={() => addToast('Logged in as admin')}
        />
      )}

      {showPanel && (
        <AdminPanel
          activeYear={activeYear}
          editTarget={editTarget}
          onClose={handlePanelClose}
          onSave={handleSavePlayer}
          onChangeYear={handleChangeYear}
          onToast={addToast}
        />
      )}

      {viewPlayer && (
        <PlayerDetail
          player={viewPlayer}
          onClose={() => setViewPlayer(null)}
        />
      )}

      {confirmDelete && (
        <ConfirmModal
          title="Delete Player"
          message={<>Remove <strong>{confirmDelete.name}</strong> from the team? This cannot be undone.</>}
          confirmLabel="Delete"
          onConfirm={executeDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

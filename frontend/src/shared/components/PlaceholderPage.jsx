import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api/client';
import { ROLE_LABEL } from '../../app/routes';

// Shown for every page that has not been built yet. A member's real page replaces it
// once registered in src/app/pageRegistry.js.
export default function PlaceholderPage({ route }) {
  const params = useParams();
  const [result, setResult] = useState('');

  async function checkBackend() {
    setResult('Checking…');
    try {
      const res = await api.get('/admin/me');
      setResult(JSON.stringify(res, null, 2));
    } catch (e) {
      setResult(`${e.code}: ${e.message}`);
    }
  }

  return (
    <div className="card placeholder">
      <h1>{route.title}</h1>
      <p>Page {route.id} is not built yet. This placeholder will be replaced by its owner.</p>
      <div className="placeholder__meta">
        <span className="chip">Route: {route.path}</span>
        {Object.keys(params).length > 0 && <span className="chip">Params: {JSON.stringify(params)}</span>}
        {route.roles && <span className="chip">Roles: {route.roles.map((r) => ROLE_LABEL[r]).join(', ')}</span>}
      </div>
      <button className="btn btn--primary" onClick={checkBackend}>Check backend connection (GET /admin/me)</button>
      {result && <pre className="api-result">{result}</pre>}
    </div>
  );
}

/*import { useState } from 'react';
import { DataTable, StatusChip, Drawer, ConfirmDialog } from './index';

const ROWS = [
  { id: 'USR-1001', name: 'Nimal Perera', status: 'active' },
  { id: 'USR-1002', name: 'Kasun Silva', status: 'suspended' },
  { id: 'USR-1003', name: 'Amali Fernando', status: 'active' },
];

export default function KitDemo() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selected, setSelected] = useState([]);
  const [sort, setSort] = useState(null);

  const rows = [...ROWS].sort((a, b) => {
    if (!sort) return 0;
    const cmp = String(a[sort.key]).localeCompare(String(b[sort.key]));
    return sort.dir === 'asc' ? cmp : -cmp;
  });

  const columns = [
    { key: 'id', header: 'ID', sortable: true },
    { key: 'name', header: 'Name', sortable: true },
    { key: 'status', header: 'Status', sortable: true,
      render: (r) => <StatusChip entity="user" status={r.status} /> },
  ];

  return (
    <>
      <DataTable
        columns={columns}
        rows={rows}
        total={rows.length}
        sort={sort}
        onSortChange={setSort}
        selectable
        selected={selected}
        onSelectedChange={setSelected}
        onRowClick={(row) => { setSelectedUser(row); setDrawerOpen(true); }}
        updatedLabel="Updated just now"
        onRefresh={() => console.log('refresh')}
      />

      <Drawer
        open={drawerOpen}
        title={selectedUser ? `User ${selectedUser.id}` : 'User detail'}
        onClose={() => setDrawerOpen(false)}
        footer={
          <button type="button" className="btn btn--danger" onClick={() => setConfirmOpen(true)}>
            Suspend
          </button>
        }
      >
        <p>{selectedUser?.name}</p>
        <StatusChip entity="user" status={selectedUser?.status || 'active'} />
      </Drawer>

      <ConfirmDialog
        open={confirmOpen}
        title="Suspend user"
        message={`Suspend ${selectedUser?.name || 'this user'}?`}
        danger
        confirmLabel="Suspend"
        requireReason
        reasonOptions={['Abuse', 'Repeated no-shows', 'Other']}
        onConfirm={(reason) => {
          console.log('Suspended with reason:', reason);
          setConfirmOpen(false);
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}*/
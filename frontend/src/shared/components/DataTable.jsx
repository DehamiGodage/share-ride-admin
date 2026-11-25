import './kit.css';

// columns: [{ key, header, sortable, render?: (row) => node, width? }]
export default function DataTable({
  columns, rows = [], rowKey = 'id',
  loading = false, error = null, onRetry,
  emptyTitle = 'Nothing here yet', emptyHint, emptyAction,
  sort, onSortChange,
  page = 1, pageSize = 25, total = 0, onPageChange, onPageSizeChange,
  onRowClick, selectable = false, selected = [], onSelectedChange,
  updatedLabel, onRefresh,
}) {
  const colCount = columns.length + (selectable ? 1 : 0);
  const allIds = rows.map((r) => r[rowKey]);
  const allChecked = allIds.length > 0 && allIds.every((id) => selected.includes(id));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  const toggleAll = () => onSelectedChange?.(allChecked ? [] : allIds);
  const toggleOne = (id) =>
    onSelectedChange?.(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);

  const clickSort = (key) => {
    const dir = sort?.key === key && sort.dir === 'asc' ? 'desc' : 'asc';
    onSortChange?.({ key, dir });
  };

  return (
    <div className="dt">
      <div className="dt__scroll">
        <table>
          <thead>
            <tr>
              {selectable && (
                <th style={{ width: 36 }}>
                  <input type="checkbox" aria-label="Select all rows" checked={allChecked} onChange={toggleAll} />
                </th>
              )}
              {columns.map((c) => {
                const active = sort?.key === c.key;
                return (
                  <th key={c.key} style={{ width: c.width }}
                    aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}>
                    {c.sortable ? (
                      <button type="button" onClick={() => clickSort(c.key)}>
                        {c.header}{active ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : ''}
                      </button>
                    ) : c.header}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {loading && Array.from({ length: 6 }).map((_, i) => (
              <tr key={`sk-${i}`}>
                {Array.from({ length: colCount }).map((__, j) => (
                  <td key={j}><div className="dt__skeleton" /></td>
                ))}
              </tr>
            ))}

            {!loading && error && (
              <tr><td colSpan={colCount}>
                <div className="dt__state">
                  <p>Could not load data. {typeof error === 'string' ? error : ''}</p>
                  {onRetry && <button type="button" className="btn btn--primary" onClick={onRetry}>Retry</button>}
                </div>
              </td></tr>
            )}

            {!loading && !error && rows.length === 0 && (
              <tr><td colSpan={colCount}>
                <div className="dt__state">
                  <strong>{emptyTitle}</strong>
                  {emptyHint && <p>{emptyHint}</p>}
                  {emptyAction && (
                    <button type="button" className="btn" onClick={emptyAction.onClick}>{emptyAction.label}</button>
                  )}
                </div>
              </td></tr>
            )}

            {!loading && !error && rows.map((row) => {
              const id = row[rowKey];
              return (
                <tr key={id} data-clickable={Boolean(onRowClick)}
                  tabIndex={onRowClick ? 0 : undefined}
                  onClick={() => onRowClick?.(row)}
                  onKeyDown={(e) => { if (e.key === 'Enter') onRowClick?.(row); }}>
                  {selectable && (
                    <td onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" aria-label={`Select row ${id}`}
                        checked={selected.includes(id)} onChange={() => toggleOne(id)} />
                    </td>
                  )}
                  {columns.map((c) => <td key={c.key}>{c.render ? c.render(row) : row[c.key]}</td>)}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="dt__foot">
        <span className="dt__fresh">
          {updatedLabel}{onRefresh && <> <button type="button" className="btn" onClick={onRefresh}>Refresh</button></>}
        </span>
        <span>
          {from}–{to} of {total}{' '}
          <select aria-label="Rows per page" value={pageSize} onChange={(e) => onPageSizeChange?.(Number(e.target.value))}>
            {[25, 50, 100].map((n) => <option key={n} value={n}>{n} / page</option>)}
          </select>{' '}
          <button type="button" className="btn" disabled={page <= 1} onClick={() => onPageChange?.(page - 1)}>Prev</button>{' '}
          <button type="button" className="btn" disabled={to >= total} onClick={() => onPageChange?.(page + 1)}>Next</button>
        </span>
      </div>
    </div>
  );
}
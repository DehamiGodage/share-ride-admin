import { useEffect, useRef, useState } from 'react';
import './kit.css';

// <ConfirmDialog open title="Suspend user" message="..." confirmLabel="Suspend" danger
//    requireReason reasonOptions={['Abuse','No-shows']} onConfirm={(reason)=>...} onCancel={()=>...} />
export default function ConfirmDialog({
  open, title, message, confirmLabel = 'Confirm', danger = false,
  requireReason = false, reasonLabel = 'Reason', reasonOptions, onConfirm, onCancel,
}) {
  const ref = useRef(null);
  const [option, setOption] = useState('');
  const [text, setText] = useState('');

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) { setOption(''); setText(''); d.showModal(); }
    if (!open && d.open) d.close();
  }, [open]);

  const reason = [option, text.trim()].filter(Boolean).join(': ');
  const reasonOk = !requireReason || (reasonOptions ? Boolean(option) : text.trim().length > 0);

  return (
    <dialog ref={ref} className="kit-dialog" aria-labelledby="kit-dlg-title"
      onCancel={(e) => { e.preventDefault(); onCancel?.(); }}>
      <div className="kit-dialog__body">
        <h2 id="kit-dlg-title">{title}</h2>
        {message && <p>{message}</p>}
        {requireReason && (
          <>
            {reasonOptions && (
              <>
                <label htmlFor="kit-reason-opt">{reasonLabel} (required)</label>
                <select id="kit-reason-opt" value={option} onChange={(e) => setOption(e.target.value)}>
                  <option value="">Choose a reason</option>
                  {reasonOptions.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </>
            )}
            <label htmlFor="kit-reason-text">
              {reasonOptions ? 'Details (optional)' : `${reasonLabel} (required)`}
            </label>
            <textarea id="kit-reason-text" rows={3} value={text} onChange={(e) => setText(e.target.value)} />
          </>
        )}
      </div>
      <div className="kit-dialog__actions">
        <button type="button" className="btn" onClick={onCancel}>Cancel</button>
        <button type="button" className={`btn ${danger ? 'btn--danger' : 'btn--primary'}`}
          disabled={!reasonOk} onClick={() => onConfirm?.(reason)}>{confirmLabel}</button>
      </div>
    </dialog>
  );
}
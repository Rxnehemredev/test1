import React from 'react';

export const insertFormat = (tag, stateSetter, stateValue, textareaId) => {
  const textarea = document.getElementById(textareaId);
  if (!textarea) return;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const sel = (stateValue || '').substring(start, end);
  let replacement = '';
  if (tag === 'bold') replacement = `<b>${sel || 'Kalın Metin'}</b>`;
  else if (tag === 'italic') replacement = `<i>${sel || 'Eğik Metin'}</i>`;
  else if (tag === 'h2') replacement = `<h2>${sel || 'Başlık'}</h2>`;
  else if (tag === 'h3') replacement = `<h3>${sel || 'Alt Başlık'}</h3>`;
  else if (tag === 'quote') replacement = `<blockquote>${sel || 'Alıntı'}</blockquote>`;
  else if (tag === 'br') replacement = `${sel}<br />`;

  const newText = (stateValue || '').substring(0, start) + replacement + (stateValue || '').substring(end);
  stateSetter(newText);
  setTimeout(() => {
    textarea.focus();
    textarea.setSelectionRange(start + replacement.length, start + replacement.length);
  }, 0);
};

export default function FormatToolbar({ stateSetter, stateValue, textareaId }) {
  return (
    <div style={{ display: 'flex', gap: '5px', marginBottom: '8px', background: 'var(--bg-tertiary)', padding: '5px', borderRadius: '4px', flexWrap: 'wrap' }}>
      <button type="button" className="btn btn-sm btn-ghost" style={{ padding: '4px 8px' }} onClick={() => insertFormat('bold', stateSetter, stateValue, textareaId)}><b>B</b></button>
      <button type="button" className="btn btn-sm btn-ghost" style={{ padding: '4px 8px' }} onClick={() => insertFormat('italic', stateSetter, stateValue, textareaId)}><i>I</i></button>
      <button type="button" className="btn btn-sm btn-ghost" style={{ padding: '4px 8px' }} onClick={() => insertFormat('h2', stateSetter, stateValue, textareaId)}><b>H2</b></button>
      <button type="button" className="btn btn-sm btn-ghost" style={{ padding: '4px 8px' }} onClick={() => insertFormat('h3', stateSetter, stateValue, textareaId)}><b>H3</b></button>
      <button type="button" className="btn btn-sm btn-ghost" style={{ padding: '4px 8px' }} onClick={() => insertFormat('quote', stateSetter, stateValue, textareaId)}>" "</button>
      <button type="button" className="btn btn-sm btn-ghost" style={{ padding: '4px 8px' }} onClick={() => insertFormat('br', stateSetter, stateValue, textareaId)}>Satır</button>
    </div>
  );
}

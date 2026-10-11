import React from 'react';
import { createPortal } from 'react-dom';

const REPORT_REASONS = [
    'Spam veya yanıltıcı',
    'Taciz veya zorbalık',
    'Nefret söylemi',
    'Uygunsuz içerik',
    'Uyarısız spoiler',
    'Diğer'
];

export default function CommentReportModal({
    isOpen,
    onClose,
    reportReason,
    setReportReason,
    reportDetails,
    setReportDetails,
    onSubmit,
}) {
    if (!isOpen) return null;

    return createPortal(
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <h3>Yorumu Bildir</h3>
                <p>Bu yorumu neden bildiriyorsunuz?</p>
                <div className="form-group">
                    <select
                        className="form-input"
                        value={reportReason}
                        onChange={e => setReportReason(e.target.value)}
                    >
                        <option value="">Bir neden seçin...</option>
                        {REPORT_REASONS.map(r => (
                            <option key={r} value={r}>{r}</option>
                        ))}
                    </select>
                </div>
                <div className="form-group">
                    <label>Detaylar (isteğe bağlı)</label>
                    <textarea
                        className="form-input"
                        rows={2}
                        placeholder="Daha fazla detay..."
                        value={reportDetails}
                        onChange={e => setReportDetails(e.target.value)}
                        style={{ resize: 'vertical' }}
                    />
                </div>
                <div className="modal-actions">
                    <button className="btn btn-ghost btn-sm" onClick={onClose}>İptal</button>
                    <button className="btn btn-danger btn-sm" onClick={onSubmit} disabled={!reportReason}>Gönder</button>
                </div>
            </div>
        </div>,
        document.body
    );
}

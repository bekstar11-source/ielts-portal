/**
 * `window.confirm` o'rniga — sahifa dizayniga mos tasdiqlash oynasi.
 */

import React from 'react';
import Modal from './Modal';
import { Button } from './primitives';

export default function ConfirmDialog({
    open,
    onClose,
    onConfirm,
    title,
    description,
    confirmLabel = 'Tasdiqlash',
    loading = false,
}) {
    return (
        <Modal open={open} onClose={onClose} title={title} description={description}>
            <div className="flex justify-end gap-2 mt-2">
                <Button onClick={onClose} disabled={loading}>
                    Bekor qilish
                </Button>
                <Button variant="danger" onClick={onConfirm} disabled={loading}>
                    {loading ? 'Bajarilmoqda...' : confirmLabel}
                </Button>
            </div>
        </Modal>
    );
}

/**
 * `window.confirm` o'rniga — sahifa dizayniga mos tasdiqlash oynasi.
 */

import React from 'react';
import Modal from './Modal';
import { Button } from './primitives';
import { useTranslation } from '../../../context/LanguageContext';

export default function ConfirmDialog({
    open,
    onClose,
    onConfirm,
    title,
    description,
    confirmLabel,
    cancelLabel,
    loading = false,
}) {
    const { t } = useTranslation();

    return (
        <Modal open={open} onClose={onClose} title={title} description={description}>
            <div className="flex justify-end gap-2 mt-2">
                <Button onClick={onClose} disabled={loading}>
                    {cancelLabel || t('common.cancel')}
                </Button>
                <Button variant="danger" onClick={onConfirm} disabled={loading}>
                    {loading ? t('common.loading') : (confirmLabel || t('common.confirm'))}
                </Button>
            </div>
        </Modal>
    );
}

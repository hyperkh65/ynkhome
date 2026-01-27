'use client';

import { useState } from 'react';
import styles from './CatalogModal.module.css';

export default function CatalogModal({ catalog, onClose }) {
    const [password, setPassword] = useState('');
    const [isUnlocked, setIsUnlocked] = useState(false);
    const [error, setError] = useState('');

    const handleUnlock = (e) => {
        if (e) e.preventDefault();
        if (password === '000') {
            setIsUnlocked(true);
            setError('');
        } else {
            setError('비밀번호가 일치하지 않습니다.');
        }
    };

    if (!catalog) return null;

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <div className={styles.header}>
                    <h2>{catalog.name}</h2>
                    <button className={styles.closeBtn} onClick={onClose}>×</button>
                </div>

                <div className={styles.content}>
                    {!isUnlocked ? (
                        <div className={styles.lockScreen}>
                            <div className={styles.lockIcon}>🔐</div>
                            <h3>이 문서는 보호되어 있습니다</h3>
                            <p>비밀번호를 입력하여 내용을 확인하세요.</p>
                            <form onSubmit={handleUnlock} className={styles.inputGroup}>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="PW"
                                    autoFocus
                                />
                                <button type="submit">확인</button>
                            </form>
                            {error && <div className={styles.error}>{error}</div>}
                        </div>
                    ) : (
                        <div className={styles.viewer}>
                            {catalog.file_url ? (
                                <iframe
                                    src={`${catalog.file_url}#toolbar=0&navpanes=0`}
                                    className={styles.iframe}
                                    title="Catalog Viewer"
                                />
                            ) : (
                                <div className={styles.noFile}>파일 엔드포인트를 찾을 수 없습니다.</div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

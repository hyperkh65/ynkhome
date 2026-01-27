'use client';

import { useState } from 'react';
import styles from './CatalogModal.module.css';

export default function CatalogModal({ catalog, onClose }) {
    const [password, setPassword] = useState('');
    const [isUnlocked, setIsUnlocked] = useState(false);
    const [error, setError] = useState('');

    const handleUnlock = () => {
        if (password === '000') {
            setIsUnlocked(true);
            setError('');
        } else {
            setError('비밀번호가 틀렸습니다. (힌트: 000)');
        }
    };

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <div className={styles.header}>
                    <h2>{catalog.name}</h2>
                    <button onClick={onClose} className={styles.closeBtn}>×</button>
                </div>

                <div className={styles.content}>
                    {!isUnlocked ? (
                        <div className={styles.lockScreen}>
                            <div className={styles.lockIcon}>🔐</div>
                            <h3>이 문서는 보호되어 있습니다</h3>
                            <p>비밀번호 3자리를 입력하세요.</p>
                            <div className={styles.inputGroup}>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleUnlock()}
                                    placeholder="Password"
                                    maxLength={3}
                                    autoFocus
                                />
                                <button onClick={handleUnlock}>확인</button>
                            </div>
                            {error && <div className={styles.error}>{error}</div>}
                        </div>
                    ) : (
                        <div className={styles.viewer}>
                            {/* PDF나 이미지를 보여주는 영역 */}
                            {catalog.file_url ? (
                                <iframe
                                    src={`${catalog.file_url}#toolbar=0`}
                                    className={styles.iframe}
                                    title="Catalog Viewer"
                                />
                            ) : (
                                <div className={styles.noFile}>
                                    등록된 파일이 없습니다. 관리자에게 문의하세요.
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

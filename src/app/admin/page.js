'use client';

import { useState } from 'react';
import styles from './admin.module.css';

export default function AdminPage() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleLogin = (e) => {
        e.preventDefault();
        if (password === 'ynk2024') {
            setIsAuthenticated(true);
        } else {
            setError('Invalid Access Code');
        }
    };

    if (!isAuthenticated) {
        return (
            <div className={styles.adminContainer}>
                <div className={styles.loginBox}>
                    <div style={{ marginBottom: '24px' }}>
                        <h2 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>System Authorization</h2>
                        <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Please enter your secure access code</p>
                    </div>
                    <form onSubmit={handleLogin}>
                        <input
                            type="password"
                            className={styles.input}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                        />
                        {error && <div className={styles.error}>{error}</div>}
                        <button type="submit" className={styles.submitBtn}>
                            Authorize Session
                        </button>
                    </form>
                    <div style={{ marginTop: '20px' }}>
                        <a href="/" style={{ fontSize: '0.8rem', color: '#94a3b8', textDecoration: 'none' }}>← Back to Terminal</a>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.adminContainer}>
            <div className={styles.adminDashboard}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
                    <div>
                        <h1 className={styles.title}>YNK Inventory Management</h1>
                        <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Add new lighting products and manage global specifications</p>
                    </div>
                    <button
                        onClick={() => setIsAuthenticated(false)}
                        className={styles.logoutBtn}
                    >
                        Sign Out
                    </button>
                </div>

                <form className={styles.formCard}>
                    <div className={styles.formGrid}>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Product Display Name</label>
                            <input type="text" className={styles.input} placeholder="e.g. YNK-LED-MAX-9000" />
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Category Selection</label>
                            <select className={styles.input}>
                                <option>Industrial Lighting</option>
                                <option>Commercial LED</option>
                                <option>Outdoor Systems</option>
                                <option>Other Imports</option>
                            </select>
                        </div>
                        <div className={styles.formGroup} style={{ gridColumn: 'span 2' }}>
                            <label className={styles.label}>Technical Specifications (Detailed)</label>
                            <textarea className={styles.input} style={{ height: '120px' }} placeholder='Explain the key features, voltage, and durability...' />
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Product Image Asset</label>
                            <div className={styles.fileLabel}>
                                <span>Click to Upload Image</span>
                                <input type="file" className={styles.fileInput} />
                            </div>
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Compliance Certificates (PDF)</label>
                            <div className={styles.fileLabel}>
                                <span>Select Certification Files</span>
                                <input type="file" className={styles.fileInput} />
                            </div>
                        </div>
                        <button type="button" className={styles.submitBtn} style={{ gridColumn: 'span 2', marginTop: '20px' }}>
                            Publish Product to Catalog
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

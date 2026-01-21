'use client';

import { useState, useEffect } from 'react';
import { getProducts, saveProduct, deleteProduct, resetProducts } from '@/utils/storage';
import styles from './admin.module.css';

export default function AdminPage() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    // Data State
    const [products, setProducts] = useState([]);
    const [editingId, setEditingId] = useState(null);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        image: '',
        material: '',
        weight: '',
        cert: '',
        origin: '',
        certificate: '',
        specSheet: ''
    });

    useEffect(() => {
        if (isAuthenticated) {
            loadProducts();
        }
    }, [isAuthenticated]);

    const loadProducts = () => {
        setProducts(getProducts());
    };

    const handleLogin = (e) => {
        e.preventDefault();
        if (password === 'ynk2024') {
            setIsAuthenticated(true);
        } else {
            setError('Invalid Access Code');
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleClearImage = () => {
        setFormData(prev => ({ ...prev, image: '' }));
    };

    const resetForm = () => {
        setEditingId(null);
        setFormData({
            name: '',
            description: '',
            image: '',
            material: '',
            weight: '',
            cert: '',
            origin: '',
            certificate: '',
            specSheet: ''
        });
    };

    const handleResetData = () => {
        if (confirm('WARNING: This will reset all local data to the original defaults. Are you sure?')) {
            resetProducts();
            window.location.reload();
        }
    };

    const handleEdit = (product) => {
        setEditingId(product.id);
        setFormData({
            name: product.name,
            description: product.description,
            image: product.image,
            material: product.specs?.material || '',
            weight: product.specs?.weight || '',
            cert: product.specs?.cert || '',
            origin: product.specs?.origin || '',
            certificate: product.specs?.certificate || '',
            specSheet: product.specs?.specSheet || ''
        });
        // Scroll to top of dashboard if needed, but now buttons are sticky so it's fine
        // window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = (id) => {
        if (!confirm('Are you sure you want to delete this product?')) return;
        deleteProduct(id);

        // Force refresh state
        const updated = getProducts();
        setProducts(updated);

        if (editingId === id) resetForm();
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        const payload = {
            id: editingId, // if null, storage handles it
            name: formData.name,
            description: formData.description,
            image: formData.image,
            specs: {
                material: formData.material,
                weight: formData.weight,
                cert: formData.cert,
                origin: formData.origin,
                certificate: formData.certificate,
                specSheet: formData.specSheet
            }
        };

        saveProduct(payload);
        alert(editingId ? 'Product Updated' : 'Product Created');
        loadProducts();
        resetForm();
    };

    if (!isAuthenticated) {
        return (
            <div className={styles.adminContainer} style={{ overflowY: 'auto' }}>
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
        <div className={styles.adminContainer} style={{ alignItems: 'flex-start', overflowY: 'auto', height: '100vh', display: 'block', padding: '20px' }}>
            <div className={styles.adminDashboard} style={{ margin: '0 auto', maxWidth: '1200px', paddingBottom: '100px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', marginTop: '20px' }}>
                    <div>
                        <h1 className={styles.title}>YNK Inventory Management</h1>
                        <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
                            {editingId ? `Editing Product #${editingId}` : 'Create New Product'}
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button onClick={handleResetData} style={{ background: '#fee2e2', color: '#991b1b', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem' }}>
                            Reset All Data
                        </button>
                        <a href="/" className={styles.logoutBtn} style={{ background: 'white', color: '#1a1a1a', border: '1px solid #e2e8f0', textDecoration: 'none' }}>View Site</a>
                        <button onClick={() => setIsAuthenticated(false)} className={styles.logoutBtn}>Sign Out</button>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) minmax(300px, 1fr)', gap: '32px', alignItems: 'start' }}>

                    {/* Form Section - Left */}
                    <div className={styles.formCard} style={{ position: 'sticky', top: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '15px' }}>
                            <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>Form Action</div>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                {editingId && (
                                    <button type="button" onClick={resetForm} style={{ background: '#f1f5f9', border: 'none', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', color: '#64748b', fontWeight: 600 }}>
                                        Cancel
                                    </button>
                                )}
                                <button onClick={handleSubmit} className={styles.submitBtn} style={{ width: 'auto', padding: '10px 24px', background: editingId ? '#3b82f6' : '#10b981' }}>
                                    {editingId ? 'Update Changes' : 'Register Product'}
                                </button>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className={styles.formGrid}>
                                <div className={styles.formGroup} style={{ gridColumn: 'span 2' }}>
                                    <label className={styles.label}>Product Name *</label>
                                    <input type="text" name="name" className={styles.input} value={formData.name} onChange={handleInputChange} required placeholder="e.g. YNK-Series V9" />
                                </div>
                                <div className={styles.formGroup} style={{ gridColumn: 'span 2' }}>
                                    <label className={styles.label}>Description</label>
                                    <input type="text" name="description" className={styles.input} value={formData.description} onChange={handleInputChange} placeholder="Short subtitle" />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Material</label>
                                    <input type="text" name="material" className={styles.input} value={formData.material} onChange={handleInputChange} />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Weight</label>
                                    <input type="text" name="weight" className={styles.input} value={formData.weight} onChange={handleInputChange} />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Certifications</label>
                                    <input type="text" name="cert" className={styles.input} value={formData.cert} onChange={handleInputChange} />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Origin</label>
                                    <input type="text" name="origin" className={styles.input} value={formData.origin} onChange={handleInputChange} />
                                </div>
                                <div className={styles.formGroup} style={{ gridColumn: 'span 2' }}>
                                    <label className={styles.label}>Image URL</label>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <input type="text" name="image" className={styles.input} value={formData.image} onChange={handleInputChange} placeholder="https://..." style={{ flex: 1, marginBottom: 0 }} />
                                        <button type="button" onClick={handleClearImage} style={{ padding: '0 12px', border: '1px solid #e2e8f0', background: 'white', borderRadius: '8px', cursor: 'pointer' }}>Clear</button>
                                    </div>
                                    {formData.image && <div style={{ marginTop: '10px', height: '150px', background: '#f8fafc', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                                        <img src={formData.image} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => e.target.style.display = 'none'} />
                                    </div>}
                                </div>

                                <div className={styles.formGroup} style={{ gridColumn: 'span 2' }}>
                                    <label className={styles.label}>Compliance Certificates (Cloud Link)</label>
                                    <input type="text" name="certificate" className={styles.input} value={formData.certificate} onChange={handleInputChange} placeholder="Paste link (Google Drive / Dropbox etc)" />
                                </div>
                                <div className={styles.formGroup} style={{ gridColumn: 'span 2' }}>
                                    <label className={styles.label}>Spec Sheet (PDF Cloud Link)</label>
                                    <input type="text" name="specSheet" className={styles.input} value={formData.specSheet} onChange={handleInputChange} placeholder="Paste link (Google Drive / Dropbox etc)" />
                                </div>
                            </div>
                        </form>
                    </div>

                    {/* List Section - Right */}
                    <div className={styles.card} style={{ height: 'calc(100vh - 120px)', overflowY: 'auto', position: 'sticky', top: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', position: 'sticky', top: 0, background: 'white', zIndex: 10, paddingBottom: '10px', borderBottom: '1px solid #f1f5f9' }}>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>Inventory ({products.length})</h3>
                            <button onClick={resetForm} style={{ fontSize: '0.8rem', color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>+ New Item</button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: '20px' }}>
                            {products.length === 0 && <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>No products found.</div>}
                            {products.map(product => (
                                <div key={product.id} style={{ display: 'flex', gap: '12px', padding: '12px', background: 'white', border: editingId === product.id ? '2px solid #3b82f6' : '1px solid #e2e8f0', borderRadius: '12px', alignItems: 'center', transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                                    <div style={{ width: '60px', height: '60px', borderRadius: '8px', background: '#f1f5f9', overflow: 'hidden', flexShrink: 0 }}>
                                        <img src={product.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => e.target.src = 'https://picsum.photos/400/300?blur=5'} />
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: 600, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{product.name}</div>
                                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{product.description}</div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                                        <button
                                            onClick={() => handleEdit(product)}
                                            style={{ padding: '6px 12px', border: '1px solid #e2e8f0', background: 'white', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => handleDelete(product.id)}
                                            style={{ padding: '6px 12px', border: 'none', background: '#fee2e2', color: '#991b1b', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}
                                        >
                                            Del
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

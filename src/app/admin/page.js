'use client';

import { useState, useEffect } from 'react';
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
        certificate: ''
    });

    useEffect(() => {
        if (isAuthenticated) {
            fetchProducts();
        }
    }, [isAuthenticated]);

    const fetchProducts = async () => {
        try {
            const res = await fetch('/api/products');
            const data = await res.json();
            if (data.success) {
                setProducts(data.data);
            }
        } catch (err) {
            console.error('Failed to fetch products', err);
        }
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

    const handleFileChange = (e) => {
        // Simulation of file upload - storing just the name
        const file = e.target.files[0];
        if (file) {
            setFormData(prev => ({ ...prev, certificate: file.name }));
        }
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
            certificate: ''
        });
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
            certificate: product.specs?.certificate || ''
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this product?')) return;

        try {
            const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
                fetchProducts();
                if (editingId === id) resetForm();
            } else {
                alert('Failed to delete product');
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Construct payload
        const payload = {
            name: formData.name,
            description: formData.description,
            image: formData.image,
            specs: {
                material: formData.material,
                weight: formData.weight,
                cert: formData.cert,
                origin: formData.origin,
                certificate: formData.certificate
            }
        };

        try {
            const url = editingId ? `/api/products/${editingId}` : '/api/products';
            const method = editingId ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (data.success) {
                alert(editingId ? 'Product Updated' : 'Product Created');
                fetchProducts();
                resetForm();
            } else {
                alert('Operation failed: ' + data.error);
            }
        } catch (err) {
            console.error(err);
            alert('An error occurred');
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
                        <p style={{ color: '#64748b', fontSize: '0.9rem' }}>{editingId ? 'Editing Product ID: ' + editingId : 'Add new items to the global catalog'}</p>
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <a href="/" className={styles.logoutBtn} style={{ background: 'white', color: '#1a1a1a', border: '1px solid #e2e8f0' }}>View Site</a>
                        <button onClick={() => setIsAuthenticated(false)} className={styles.logoutBtn}>Sign Out</button>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
                    {/* Form Section */}
                    <form className={styles.formCard} onSubmit={handleSubmit}>
                        <div className={styles.formGrid}>
                            <div className={styles.formGroup} style={{ gridColumn: 'span 2' }}>
                                <label className={styles.label}>Product Name</label>
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
                                <input type="text" name="image" className={styles.input} value={formData.image} onChange={handleInputChange} placeholder="https://..." />
                            </div>
                            <div className={styles.formGroup} style={{ gridColumn: 'span 2' }}>
                                <label className={styles.label}>Compliance Certificates (ZIP)</label>
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                    <input type="file" className={styles.fileInput} onChange={handleFileChange} accept=".zip,.rar,.7z" />
                                    {formData.certificate && <span style={{ fontSize: '0.8rem', color: '#10b981' }}>Current: {formData.certificate}</span>}
                                </div>
                            </div>

                            <div style={{ gridColumn: 'span 2', display: 'flex', gap: '12px', marginTop: '12px' }}>
                                {editingId && (
                                    <button type="button" onClick={resetForm} className={styles.submitBtn} style={{ background: '#94a3b8' }}>Cancel</button>
                                )}
                                <button type="submit" className={styles.submitBtn}>
                                    {editingId ? 'Update Product' : 'Add to Catalog'}
                                </button>
                            </div>
                        </div>
                    </form>

                    {/* List Section */}
                    <div className={styles.card} style={{ maxHeight: '600px', overflowY: 'auto' }}>
                        <h3 style={{ marginBottom: '16px', fontSize: '1.1rem', fontWeight: 600 }}>Current Inventory ({products.length})</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {products.map(product => (
                                <div key={product.id} style={{ display: 'flex', gap: '12px', padding: '12px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', alignItems: 'center' }}>
                                    <div style={{ width: '60px', height: '60px', borderRadius: '8px', background: '#f1f5f9', overflow: 'hidden', flexShrink: 0 }}>
                                        <img src={product.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{product.name}</div>
                                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{product.description}</div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px' }}>
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

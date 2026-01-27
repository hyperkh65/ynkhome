'use client';

import { useState, useEffect } from 'react';
import { getProducts, saveProduct, deleteProduct, getNotices, saveNotice, deleteNotice } from '@/utils/storage';
import styles from './admin.module.css';

export default function AdminPage() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    // Data State
    const [products, setProducts] = useState([]);
    const [notices, setNotices] = useState([]);
    const [editingId, setEditingId] = useState(null);
    const [newNotice, setNewNotice] = useState('');

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        image: '',
        // Specs from image
        partNo: '',
        modelName: '',
        colorTemp: '',
        powerConsumption: '',
        inputVoltage: '',
        powerFactor: '',
        luminousFlux: '',
        criRa: '',
        dimensions: '',
        weight: '',
        cert: '',
        remarks: '',
        // Links
        certificate: '',
        specSheet: ''
    });

    useEffect(() => {
        if (isAuthenticated) {
            loadData();
        }
    }, [isAuthenticated]);

    const loadData = async () => {
        const prodData = await getProducts();
        setProducts(prodData);
        const noticeData = await getNotices();
        setNotices(noticeData);
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
            partNo: '',
            modelName: '',
            colorTemp: '',
            powerConsumption: '',
            inputVoltage: '',
            powerFactor: '',
            luminousFlux: '',
            criRa: '',
            dimensions: '',
            weight: '',
            cert: '',
            remarks: '',
            certificate: '',
            specSheet: ''
        });
    };

    const handleEdit = (product) => {
        setEditingId(product.id);
        setFormData({
            name: product.name,
            description: product.description,
            image: product.image,
            partNo: product.specs?.partNo || '',
            modelName: product.specs?.modelName || '',
            colorTemp: product.specs?.colorTemp || '',
            powerConsumption: product.specs?.powerConsumption || '',
            inputVoltage: product.specs?.inputVoltage || '',
            powerFactor: product.specs?.powerFactor || '',
            luminousFlux: product.specs?.luminousFlux || '',
            criRa: product.specs?.criRa || '',
            dimensions: product.specs?.dimensions || '',
            weight: product.specs?.weight || '',
            cert: product.specs?.cert || '',
            remarks: product.specs?.remarks || '',
            certificate: product.specs?.certificate || '',
            specSheet: product.specs?.specSheet || ''
        });
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this product?')) return;
        try {
            await deleteProduct(id);
            await loadData();
            if (editingId === id) resetForm();
        } catch (error) {
            console.error(error);
            alert('Delete failed: ' + (error.message || JSON.stringify(error)));
        }
    };

    const handleNoticeSubmit = async (e) => {
        e.preventDefault();
        try {
            await saveNotice({ content: newNotice });
            alert('Notice Posted');
            await loadData();
            setNewNotice('');
        } catch (error) {
            alert('Failed to post notice: ' + error.message);
        }
    };

    const handleNoticeDelete = async (id) => {
        if (!window.confirm('Delete this notice?')) return;
        try {
            await deleteNotice(id);
            await loadData();
        } catch (error) {
            alert('Delete failed');
        }
    };

    const handleMarketSave = async () => {
        try {
            const res = await fetch('/api/history');
            const data = await res.json();
            if (data.success) {
                alert('Today\'s Market Closing Prices Saved Successfully');
            } else {
                alert('Save failed: ' + data.error);
            }
        } catch (err) {
            alert('Error calling history API');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const payload = {
            id: editingId, // if null, storage handles it
            name: formData.name,
            description: formData.description,
            image: formData.image,
            specs: {
                partNo: formData.partNo,
                modelName: formData.modelName,
                colorTemp: formData.colorTemp,
                powerConsumption: formData.powerConsumption,
                inputVoltage: formData.inputVoltage,
                powerFactor: formData.powerFactor,
                luminousFlux: formData.luminousFlux,
                criRa: formData.criRa,
                dimensions: formData.dimensions,
                weight: formData.weight,
                cert: formData.cert,
                remarks: formData.remarks,
                certificate: formData.certificate,
                specSheet: formData.specSheet
            }
        };

        try {
            await saveProduct(payload);
            alert(editingId ? 'Product Updated' : 'Product Created');
            await loadData();
            resetForm();
        } catch (error) {
            alert('Operation failed');
        }
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
                        <h1 className={styles.title}>YNK Inventory Management <span style={{ fontSize: '0.8rem', color: '#10b981', background: '#dcfce7', padding: '2px 8px', borderRadius: '12px', verticalAlign: 'middle' }}>DB Connected</span></h1>
                        <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
                            {editingId ? `Editing Product #${editingId}` : 'Create New Product'}
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <a href="/" className={styles.logoutBtn} style={{ background: 'white', color: '#1a1a1a', border: '1px solid #e2e8f0', textDecoration: 'none' }}>View Site</a>
                        <a href="/admin/library" className={styles.logoutBtn} style={{ background: '#3b82f6', color: 'white', border: 'none', textDecoration: 'none' }}>Manage Library</a>
                        <button onClick={() => setIsAuthenticated(false)} className={styles.logoutBtn}>Sign Out</button>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) minmax(300px, 1fr) 300px', gap: '32px', alignItems: 'start' }}>

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
                                    <label className={styles.label}>품번 (Part No)</label>
                                    <input type="text" name="partNo" className={styles.input} value={formData.partNo} onChange={handleInputChange} />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>모델명 (Model Name)</label>
                                    <input type="text" name="modelName" className={styles.input} value={formData.modelName} onChange={handleInputChange} />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>색온도 (K)</label>
                                    <input type="text" name="colorTemp" className={styles.input} value={formData.colorTemp} onChange={handleInputChange} />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>소비전력 (W)</label>
                                    <input type="text" name="powerConsumption" className={styles.input} value={formData.powerConsumption} onChange={handleInputChange} />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>입력전압 (V)</label>
                                    <input type="text" name="inputVoltage" className={styles.input} value={formData.inputVoltage} onChange={handleInputChange} />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>역률 (Power Factor)</label>
                                    <input type="text" name="powerFactor" className={styles.input} value={formData.powerFactor} onChange={handleInputChange} />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>총광속 (lm)</label>
                                    <input type="text" name="luminousFlux" className={styles.input} value={formData.luminousFlux} onChange={handleInputChange} />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>연색성 (Ra)</label>
                                    <input type="text" name="criRa" className={styles.input} value={formData.criRa} onChange={handleInputChange} />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>외형치수 (Dimensions)</label>
                                    <input type="text" name="dimensions" className={styles.input} value={formData.dimensions} onChange={handleInputChange} />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>무게 (Weight)</label>
                                    <input type="text" name="weight" className={styles.input} value={formData.weight} onChange={handleInputChange} />
                                </div>
                                <div className={styles.formGroup} style={{ gridColumn: 'span 2' }}>
                                    <label className={styles.label}>인증 (Certifications)</label>
                                    <input type="text" name="cert" className={styles.input} value={formData.cert} onChange={handleInputChange} />
                                </div>
                                <div className={styles.formGroup} style={{ gridColumn: 'span 2' }}>
                                    <label className={styles.label}>비고 (Remarks)</label>
                                    <textarea name="remarks" className={styles.input} style={{ height: '80px', padding: '10px' }} value={formData.remarks} onChange={handleInputChange} placeholder="Additional information or notes" />
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

                    {/* List Section - Center */}
                    <div className={styles.card} style={{ height: 'calc(100vh - 120px)', overflowY: 'auto', position: 'sticky', top: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', position: 'sticky', top: 0, background: 'white', zIndex: 10, paddingBottom: '10px', borderBottom: '1px solid #f1f5f9' }}>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>Inventory ({products.length})</h3>
                            <button type="button" onClick={resetForm} style={{ fontSize: '0.8rem', color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>+ New Item</button>
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
                                            type="button"
                                            onClick={() => handleEdit(product)}
                                            style={{ padding: '6px 12px', border: '1px solid #e2e8f0', background: 'white', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}
                                        >
                                            Edit
                                        </button>
                                        <button
                                            type="button"
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

                    {/* Notice Section - Right */}
                    <div className={styles.card} style={{ height: 'calc(100vh - 120px)', position: 'sticky', top: '20px', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '10px', marginBottom: '20px' }}>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>System Management</h3>
                        </div>

                        {/* Market Data Trigger */}
                        <div style={{ marginBottom: '30px', padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                            <div style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '8px', color: '#1a1a1a' }}>Market History Sync</div>
                            <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '12px' }}>Save current market rates as today's official closing prices.</p>
                            <button
                                onClick={handleMarketSave}
                                style={{ width: '100%', padding: '10px', background: '#1a1a1a', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v13a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                                Save Today's Closing Prices
                            </button>
                        </div>

                        <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '10px', marginBottom: '10px' }}>
                            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, margin: 0 }}>Active Notices</h3>
                        </div>
                        <form onSubmit={handleNoticeSubmit} style={{ marginBottom: '20px' }}>
                            <textarea
                                value={newNotice}
                                onChange={(e) => setNewNotice(e.target.value)}
                                placeholder="Write a new notice..."
                                style={{ width: '100%', height: '80px', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', resize: 'none', marginBottom: '8px' }}
                                required
                            />
                            <button type="submit" className={styles.catBtn} style={{ width: '100%', justifyContent: 'center', background: '#3b82f6', color: 'white', border: 'none' }}>
                                Post Notice
                            </button>
                        </form>
                        <div style={{ flex: 1, overflowY: 'auto' }}>
                            {notices.map(notice => (
                                <div key={notice.id} style={{ padding: '10px', borderRadius: '8px', background: 'white', marginBottom: '8px', border: '1px solid #e2e8f0' }}>
                                    <div style={{ fontSize: '0.9rem', marginBottom: '6px' }}>{notice.content}</div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{new Date(notice.created_at).toLocaleDateString()}</span>
                                        <button onClick={() => handleNoticeDelete(notice.id)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem' }}>Delete</button>
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

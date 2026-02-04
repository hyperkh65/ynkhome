'use client';

import { useState, useEffect } from 'react';
import {
    getProducts, saveProduct, deleteProduct,
    getNotices, saveNotice, deleteNotice,
    getCatalogs, saveCatalog, deleteCatalog,
    uploadFile
} from '@/utils/storage';
import styles from './admin.module.css';

export default function AdminPage() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isUploading, setIsUploading] = useState(false);

    // Data State
    const [products, setProducts] = useState([]);
    const [notices, setNotices] = useState([]);
    const [catalogs, setCatalogs] = useState([]);
    const [editingId, setEditingId] = useState(null);
    const [editingCatalogId, setEditingCatalogId] = useState(null);
    const [newNotice, setNewNotice] = useState('');

    // Catalog Form State
    const [catalogForm, setCatalogForm] = useState({ name: '', file_url: '' });

    // Product Form State (Full Restore)
    const [formData, setFormData] = useState({
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

    useEffect(() => {
        if (isAuthenticated) loadData();
    }, [isAuthenticated]);

    const loadData = async () => {
        const prodData = await getProducts();
        setProducts(prodData);
        const noticeData = await getNotices();
        setNotices(noticeData);
        const catData = await getCatalogs();
        setCatalogs(catData);
    };

    const handleFileUpload = async (e, field) => {
        const file = e.target.files[0];
        if (!file) return;
        setIsUploading(true);
        try {
            const bucket = (field === 'catalog' || field === 'certificate' || field === 'specSheet') ? 'library' : 'products';
            const url = await uploadFile(file, bucket);
            if (field === 'catalog') setCatalogForm(prev => ({ ...prev, file_url: url }));
            else if (field === 'image') setFormData(prev => ({ ...prev, image: url }));
            else setFormData(prev => ({ ...prev, [field]: url }));
            alert('파일이 성공적으로 업로드되었습니다.');
        } catch (err) {
            alert('업로드 실패: ' + err.message);
        } finally {
            setIsUploading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const resetForm = () => {
        setEditingId(null);
        setFormData({
            name: '', description: '', image: '',
            partNo: '', modelName: '', colorTemp: '', powerConsumption: '',
            inputVoltage: '', powerFactor: '', luminousFlux: '', criRa: '',
            dimensions: '', weight: '', cert: '', remarks: '',
            certificate: '', specSheet: ''
        });
    };

    const handleEdit = (product) => {
        setEditingId(product.id);
        setFormData({
            name: product.name || '',
            description: product.description || '',
            image: product.image || '',
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

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validation
        if (!formData.name.trim()) {
            return alert('제품 명칭(Product Name)을 입력해주세요.');
        }

        const payload = {
            id: editingId,
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
            alert(editingId ? '성공적으로 수정되었습니다.' : '성공적으로 등록되었습니다.');
            await loadData();
            resetForm();
        } catch (error) {
            console.error('Product Save Error:', error);
            alert('상품 저장 실패: ' + (error.message || 'Unknown error'));
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('정말 삭제하시겠습니까?')) return;
        await deleteProduct(id);
        await loadData();
    };

    const handleNoticeSubmit = async (e) => {
        e.preventDefault();
        await saveNotice({ content: newNotice });
        setNewNotice('');
        await loadData();
    };

    const handleMarketSave = async () => {
        const res = await fetch('/api/market/history', { method: 'POST' });
        const data = await res.json();
        alert(data.success ? '오늘의 시세가 저장되었습니다.' : '저장 실패');
    };

    const handleCatalogSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = { ...catalogForm };
            if (editingCatalogId) payload.id = editingCatalogId;

            await saveCatalog(payload);
            alert(editingCatalogId ? '카탈로그가 수정되었습니다.' : '카탈로그가 등록되었습니다.');
            resetCatalogForm();
            await loadData();
        } catch (err) {
            console.error('Catalog Save Error:', err);
            alert('카탈로그 등록 실패: ' + (err.message || 'Unknown error'));
        }
    };

    const handleCatalogEdit = (cat) => {
        setEditingCatalogId(cat.id);
        setCatalogForm({ name: cat.name, file_url: cat.file_url });
    };

    const resetCatalogForm = () => {
        setEditingCatalogId(null);
        setCatalogForm({ name: '', file_url: '' });
    };

    if (!isAuthenticated) {
        return (
            <div className={styles.adminContainer}>
                <div className={styles.loginBox}>
                    <h2>YNK Secure Admin</h2>
                    <form onSubmit={(e) => { e.preventDefault(); if (password === 'ynk2024') setIsAuthenticated(true); else alert('Invalid'); }}>
                        <input type="password" className={styles.input} onChange={(e) => setPassword(e.target.value)} placeholder="Access Code" />
                        <button type="submit" className={styles.submitBtn}>Login</button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.adminContainer} style={{ display: 'block', padding: '20px', overflowY: 'auto' }}>
            <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                    <h1 className={styles.title}>YNK Intelligent Control Panel</h1>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <a href="/" className={styles.logoutBtn} style={{ background: '#f5f5f7', color: '#1d1d1f', textDecoration: 'none' }}>Site View</a>
                        <button onClick={() => setIsAuthenticated(false)} className={styles.logoutBtn}>Logout</button>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(400px, 450px) 1fr 350px', gap: '24px', alignItems: 'start' }}>

                    {/* 1. Product Form (Full Specifications) */}
                    <div className={styles.formCard} style={{ background: 'white', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                        <h3 style={{ marginBottom: '20px', fontWeight: 700 }}>{editingId ? 'Edit Product' : 'Register New Item'}</h3>
                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Product Name</label>
                                <input name="name" className={styles.input} value={formData.name} onChange={handleInputChange} required />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                <div className={styles.formGroup}><label className={styles.label}>Part No</label><input name="partNo" className={styles.input} value={formData.partNo} onChange={handleInputChange} /></div>
                                <div className={styles.formGroup}><label className={styles.label}>Model</label><input name="modelName" className={styles.input} value={formData.modelName} onChange={handleInputChange} /></div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                                <div className={styles.formGroup}><label className={styles.label}>Color(K)</label><input name="colorTemp" className={styles.input} value={formData.colorTemp} onChange={handleInputChange} /></div>
                                <div className={styles.formGroup}><label className={styles.label}>Power(W)</label><input name="powerConsumption" className={styles.input} value={formData.powerConsumption} onChange={handleInputChange} /></div>
                                <div className={styles.formGroup}><label className={styles.label}>Voltage(V)</label><input name="inputVoltage" className={styles.input} value={formData.inputVoltage} onChange={handleInputChange} /></div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                <div className={styles.formGroup}><label className={styles.label}>Luminous(lm)</label><input name="luminousFlux" className={styles.input} value={formData.luminousFlux} onChange={handleInputChange} /></div>
                                <div className={styles.formGroup}><label className={styles.label}>CRI(Ra)</label><input name="criRa" className={styles.input} value={formData.criRa} onChange={handleInputChange} /></div>
                            </div>

                            <div className={styles.formGroup}><label className={styles.label}>Certification</label><input name="cert" className={styles.input} value={formData.cert} onChange={handleInputChange} /></div>

                            <div className={styles.formGroup}>
                                <label className={styles.label}>Product Image</label>
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                    <input type="file" onChange={(e) => handleFileUpload(e, 'image')} disabled={isUploading} />
                                    {formData.image && <img src={formData.image} style={{ width: '40px', height: '40px', borderRadius: '4px', objectFit: 'cover' }} />}
                                </div>
                            </div>

                            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '15px' }}>
                                <div className={styles.formGroup}><label className={styles.label}>Spec Sheet (PDF)</label><input type="file" onChange={(e) => handleFileUpload(e, 'specSheet')} /></div>
                                <div className={styles.formGroup}><label className={styles.label}>Certificate</label><input type="file" onChange={(e) => handleFileUpload(e, 'certificate')} /></div>
                            </div>

                            <button type="submit" className={styles.submitBtn} disabled={isUploading} style={{ background: editingId ? '#3b82f6' : '#10b981', marginTop: '10px' }}>
                                {isUploading ? 'Uploading...' : editingId ? 'Update Product' : 'Register Product'}
                            </button>
                            {editingId && <button type="button" onClick={resetForm} className={styles.input} style={{ background: '#f5f5f7', border: 'none', cursor: 'pointer' }}>Cancel Edit</button>}
                        </form>
                    </div>

                    {/* 2. Product List */}
                    <div className={styles.card} style={{ height: '80vh', overflowY: 'auto' }}>
                        <h3 style={{ marginBottom: '16px', fontWeight: 700 }}>Product Inventory ({products.length})</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
                            {products.map(p => (
                                <div key={p.id} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px' }}>
                                    <img src={p.image} style={{ width: '100%', height: '120px', objectFit: 'cover', borderRadius: '8px', marginBottom: '8px' }} onError={(e) => e.target.src = 'https://picsum.photos/400/300?blur=5'} />
                                    <div style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '4px' }}>{p.name}</div>
                                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '10px' }}>{p.specs?.modelName || 'No Model'}</div>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button onClick={() => handleEdit(p)} style={{ flex: 1, padding: '6px', fontSize: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '6px', background: 'white', cursor: 'pointer' }}>Edit</button>
                                        <button onClick={() => handleDelete(p.id)} style={{ padding: '6px 10px', fontSize: '0.75rem', border: 'none', borderRadius: '6px', background: '#fee2e2', color: '#b91c1c', cursor: 'pointer' }}>Delete</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 3. System (Market, Notice, Catalog) */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                        {/* Market History */}
                        <div className={styles.card}>
                            <h3 style={{ fontSize: '1rem', marginBottom: '12px' }}>Market Management</h3>
                            <button onClick={handleMarketSave} style={{ width: '100%', padding: '12px', background: '#1a1a1a', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 600, cursor: 'pointer' }}>
                                Sync Daily Market Closing
                            </button>
                        </div>

                        {/* Notice Board */}
                        <div className={styles.card}>
                            <h3 style={{ fontSize: '1rem', marginBottom: '12px' }}>Notice Board</h3>
                            <form onSubmit={handleNoticeSubmit} style={{ marginBottom: '16px' }}>
                                <textarea className={styles.input} style={{ height: '70px', marginBottom: '8px' }} value={newNotice} onChange={(e) => setNewNotice(e.target.value)} placeholder="Type new notice..." required />
                                <button type="submit" style={{ width: '100%', padding: '10px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Post Board</button>
                            </form>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                                {notices.map(n => (
                                    <div key={n.id} style={{ fontSize: '0.8rem', padding: '10px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                        <div style={{ marginBottom: '4px' }}>{n.content}</div>
                                        <div style={{ textAlign: 'right' }}><button onClick={async () => { await deleteNotice(n.id); loadData(); }} style={{ fontSize: '0.7rem', color: '#ef4444', border: 'none', background: 'none' }}>Remove</button></div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Electronic Catalogs */}
                        <div className={styles.card}>
                            <h3 style={{ fontSize: '1rem', marginBottom: '12px' }}>Electronic Catalogs</h3>
                            <form onSubmit={handleCatalogSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <input className={styles.input} placeholder="Catalog Title" value={catalogForm.name} onChange={(e) => setCatalogForm({ ...catalogForm, name: e.target.value })} required />
                                <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                                    <input type="file" onChange={(e) => handleFileUpload(e, 'catalog')} style={{ fontSize: '0.75rem' }} />
                                    {catalogForm.file_url && <div style={{ fontSize: '0.7rem', color: '#10b981', marginTop: '4px' }}>✓ PDF Ready</div>}
                                </div>
                                <button type="submit" style={{ padding: '10px', background: editingCatalogId ? '#3b82f6' : '#10b981', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }} disabled={!catalogForm.file_url}>
                                    {editingCatalogId ? 'Update Catalog' : 'Add Catalog'}
                                </button>
                                {editingCatalogId && <button type="button" onClick={resetCatalogForm} style={{ fontSize: '0.75rem', border: 'none', background: 'none', color: '#64748b', cursor: 'pointer' }}>Cancel</button>}
                            </form>
                            <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {catalogs.map(c => (
                                    <div key={c.id} style={{ display: 'flex', flexDirection: 'column', padding: '10px', background: '#f1f5f9', borderRadius: '8px', gap: '6px' }}>
                                        <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{c.name}</div>
                                        <div style={{ display: 'flex', gap: '10px' }}>
                                            <button onClick={() => handleCatalogEdit(c)} style={{ fontSize: '0.75rem', color: '#3b82f6', border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}>Edit</button>
                                            <button onClick={async () => { if (window.confirm('삭제하시겠습니까?')) { await deleteCatalog(c.id); loadData(); } }} style={{ fontSize: '0.75rem', color: '#ef4444', border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}>Delete</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

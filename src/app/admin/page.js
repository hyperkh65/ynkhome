'use client';

import { useState, useEffect } from 'react';
import {
    getProducts, saveProduct, deleteProduct,
    getNotices, saveNotice, deleteNotice,
    getCatalogs, saveCatalog, deleteCatalog,
    uploadFile // 추가
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
    const [newNotice, setNewNotice] = useState('');

    // Catalog Form State
    const [catalogForm, setCatalogForm] = useState({
        name: '',
        file_url: ''
    });

    // Form State
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
        if (isAuthenticated) {
            loadData();
        }
    }, [isAuthenticated]);

    const loadData = async () => {
        const prodData = await getProducts();
        setProducts(prodData);
        const noticeData = await getNotices();
        setNotices(noticeData);
        const catData = await getCatalogs();
        setCatalogs(catData);
    };

    // Generic Upload Handler
    const handleFileUpload = async (e, field) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const bucket = field === 'file_url' ? 'library' : 'products';
            const url = await uploadFile(file, bucket);

            if (field === 'catalog') {
                setCatalogForm(prev => ({ ...prev, file_url: url }));
            } else if (field === 'image') {
                setFormData(prev => ({ ...prev, image: url }));
            } else {
                setFormData(prev => ({ ...prev, [field]: url }));
            }
            alert('File uploaded successfully');
        } catch (err) {
            console.error(err);
            alert('Upload failed: ' + err.message);
        } finally {
            setIsUploading(false);
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

    const handleCatalogSubmit = async (e) => {
        e.preventDefault();
        try {
            await saveCatalog(catalogForm);
            alert('Catalog Registered');
            setCatalogForm({ name: '', file_url: '' });
            await loadData();
        } catch (err) {
            alert('Failed to save catalog');
        }
    };

    const handleCatalogDelete = async (id) => {
        if (!window.confirm('Delete this catalog?')) return;
        try {
            await deleteCatalog(id);
            await loadData();
        } catch (err) {
            alert('Delete failed');
        }
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
            alert('Delete failed');
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
            alert('Failed to post notice');
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

    const handleSubmit = async (e) => {
        e.preventDefault();
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
            alert(editingId ? 'Updated' : 'Created');
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
                    <h2 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>Security Login</h2>
                    <form onSubmit={handleLogin}>
                        <input type="password" className={styles.input} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Access Code" />
                        <button type="submit" className={styles.submitBtn}>Authorize</button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.adminContainer} style={{ alignItems: 'flex-start', overflowY: 'auto', height: '100vh', display: 'block', padding: '20px' }}>
            <div className={styles.adminDashboard} style={{ margin: '0 auto', maxWidth: '1200px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                    <h1 className={styles.title}>YNK Admin Panel</h1>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <a href="/" className={styles.logoutBtn} style={{ background: '#f5f5f7', color: '#1d1d1f', textDecoration: 'none' }}>View Site</a>
                        <button onClick={() => setIsAuthenticated(false)} className={styles.logoutBtn}>Sign Out</button>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 320px', gap: '24px' }}>

                    {/* Left: Product Form */}
                    <div className={styles.formCard}>
                        <h3 style={{ marginBottom: '20px', fontSize: '1.1rem', fontWeight: 700 }}>{editingId ? 'Edit Product' : 'Add New Product'}</h3>
                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <input name="name" className={styles.input} value={formData.name} onChange={handleInputChange} placeholder="Product Name" required />

                            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '8px' }}>Product Image</label>
                                <input type="file" onChange={(e) => handleFileUpload(e, 'image')} style={{ fontSize: '0.8rem' }} disabled={isUploading} />
                                {formData.image && <div style={{ marginTop: '10px', height: '100px', width: '100px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                                    <img src={formData.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                </div>}
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                <input name="modelName" className={styles.input} value={formData.modelName} onChange={handleInputChange} placeholder="Model Name" />
                                <input name="powerConsumption" className={styles.input} value={formData.powerConsumption} onChange={handleInputChange} placeholder="Power (W)" />
                            </div>

                            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '8px' }}>Spec Sheet (PDF)</label>
                                <input type="file" onChange={(e) => handleFileUpload(e, 'specSheet')} style={{ fontSize: '0.8rem' }} disabled={isUploading} />
                                {formData.specSheet && <div style={{ fontSize: '0.7rem', color: '#10b981', marginTop: '4px' }}>✓ File Uploaded</div>}
                            </div>

                            <button type="submit" className={styles.submitBtn} disabled={isUploading}>
                                {isUploading ? 'Uploading...' : editingId ? 'Update Product' : 'Register Product'}
                            </button>
                        </form>
                    </div>

                    {/* Middle: Product List */}
                    <div className={styles.card} style={{ maxHeight: '80vh', overflowY: 'auto' }}>
                        <h3 style={{ marginBottom: '16px' }}>Inventory</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {products.map(p => (
                                <div key={p.id} style={{ display: 'flex', gap: '10px', padding: '10px', border: '1px solid #e5e7eb', borderRadius: '10px', alignItems: 'center' }}>
                                    <img src={p.image} style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '6px' }} />
                                    <div style={{ flex: 1, fontSize: '0.85rem', fontWeight: 600 }}>{p.name}</div>
                                    <button onClick={() => handleEdit(p)} style={{ fontSize: '0.75rem', color: '#3b82f6', border: 'none', background: 'none', cursor: 'pointer' }}>Edit</button>
                                    <button onClick={() => handleDelete(p.id)} style={{ fontSize: '0.75rem', color: '#ef4444', border: 'none', background: 'none', cursor: 'pointer' }}>Del</button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right: Catalog & Notices */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div className={styles.card}>
                            <h3 style={{ fontSize: '0.95rem', marginBottom: '12px' }}>Upload Catalog</h3>
                            <form onSubmit={handleCatalogSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <input placeholder="Catalog Name" className={styles.input} value={catalogForm.name} onChange={(e) => setCatalogForm({ ...catalogForm, name: e.target.value })} required />
                                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                                    <input type="file" onChange={(e) => handleFileUpload(e, 'catalog')} style={{ fontSize: '0.7rem' }} disabled={isUploading} />
                                </div>
                                <button type="submit" style={{ padding: '10px', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem' }} disabled={isUploading || !catalogForm.file_url}>Register PDF</button>
                            </form>
                            <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {catalogs.map(c => (
                                    <div key={c.id} style={{ fontSize: '0.75rem', display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: '#f9fafb', borderRadius: '6px' }}>
                                        <span>{c.name}</span>
                                        <button onClick={() => handleCatalogDelete(c.id)} style={{ color: '#ef4444', border: 'none', background: 'none', cursor: 'pointer' }}>×</button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className={styles.card}>
                            <h3 style={{ fontSize: '0.95rem', marginBottom: '12px' }}>Notices</h3>
                            <form onSubmit={handleNoticeSubmit}>
                                <textarea value={newNotice} onChange={(e) => setNewNotice(e.target.value)} placeholder="Content" style={{ width: '100%', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '10px', fontSize: '0.8rem' }} />
                                <button type="submit" style={{ width: '100%', padding: '8px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', marginTop: '8px', cursor: 'pointer' }}>Post</button>
                            </form>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}

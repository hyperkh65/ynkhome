'use client';

import { useState, useEffect } from 'react';
import styles from './page.module.css';
import MarketChart from '@/components/MarketChart';

export default function Home() {
  const [isMounted, setIsMounted] = useState(false);
  const [activeTab, setActiveTab] = useState('Overview');
  const [times, setTimes] = useState({ korea: '--:--:--', china: '--:--:--', vietnam: '--:--:--' });
  const [trackingNo, setTrackingNo] = useState('');
  const [isTracking, setIsTracking] = useState(false);
  const [trackResult, setTrackResult] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [selectedMetal, setSelectedMetal] = useState('aluminum');
  const [selectedCurrency, setSelectedCurrency] = useState('usd');
  const [activeTool, setActiveTool] = useState('cbm'); // default tool

  const [marketData, setMarketData] = useState({
    usd: 1476.80,
    cny: 212.24,
    metals: {
      alum: 0,
      copper: 0,
      steel: 0,
      nickel: 0,
      zinc: 0
    },
    trends: { usd: 'up', cny: 'up', alum: 'up', copper: 'down', steel: 'up', nickel: 'up', zinc: 'up' }
  });

  // CBM Calculator State
  const [products, setProducts] = useState([
    { id: 1, name: 'Product 1', length: '', width: '', height: '', qty: '' }
  ]);

  const [hubs, setHubs] = useState([
    { id: 'it1', name: 'E1컨테이너터미널', status: 'Checking...', color: '#f1f5f9', textColor: '#64748b' },
    { id: 'it2', name: '인천컨테이너터미널', status: 'Checking...', color: '#f1f5f9', textColor: '#64748b' },
    { id: 'it3', name: '한진인천컨테이너터미널', status: 'Checking...', color: '#f1f5f9', textColor: '#64748b' },
    { id: 'it4', name: '선광신컨테이너터미널', status: 'Checking...', color: '#f1f5f9', textColor: '#64748b' }
  ]);
  const [incheonPort, setIncheonPort] = useState([]);

  // Handlers
  const addProduct = () => {
    const newId = Math.max(...products.map(p => p.id), 0) + 1;
    setProducts([...products, { id: newId, name: `Product ${newId}`, length: '', width: '', height: '', qty: '' }]);
  };
  const removeProduct = (id) => {
    if (products.length > 1) {
      setProducts(products.filter(p => p.id !== id));
    }
  };
  const updateProduct = (id, field, value) => {
    setProducts(products.map(p => p.id === id ? { ...p, [field]: value } : p));
  };
  const calculateTotalCBM = () => {
    return products.reduce((sum, p) => {
      const vol = (parseFloat(p.length) * parseFloat(p.width) * parseFloat(p.height) * parseFloat(p.qty)) / 1000000;
      return sum + (vol || 0);
    }, 0);
  };

  useEffect(() => {
    setIsMounted(true);
    const formatTime = (offset) => {
      const d = new Date(new Date().getTime() + (offset * 60 * 60 * 1000));
      return d.getUTCHours().toString().padStart(2, '0') + ':' + d.getUTCMinutes().toString().padStart(2, '0') + ':' + d.getUTCSeconds().toString().padStart(2, '0');
    };
    const timeTimer = setInterval(() => setTimes({ korea: formatTime(9), china: formatTime(8), vietnam: formatTime(7) }), 1000);

    const fetchData = async () => {
      try {
        const res = await fetch('/api/market');
        const data = await res.json();
        if (data.success) {
          setMarketData(prev => ({
            ...prev,
            usd: data.rates.usd,
            cny: data.rates.cny,
            metals: {
              alum: data.metals.aluminum?.last || 0,
              copper: data.metals.copper?.last || 0,
              steel: data.metals.steel?.last || 0,
              nickel: data.metals.nickel?.last || 0,
              zinc: data.metals.zinc?.last || 0
            }
          }));
        }
        const hRes = await fetch('/api/market/history');
        const hData = await hRes.json();
        if (Array.isArray(hData)) setHistoryData(hData.reverse());

        // Fetch Incheon Port Data (XML-parsed JSON)
        const iRes = await fetch('/api/incheon/congestion');
        const iData = await iRes.json();
        if (iData.success && iData.data && iData.data.length > 0) {
          // Additional sanitization: ensure item has termName
          const validItems = iData.data.filter(item => item.termName);
          if (validItems.length > 0) {
            setIncheonPort(validItems);
          }
        }
      } catch (err) { console.error(err); }
    };

    fetchData();
    return () => clearInterval(timeTimer);
  }, []);

  const handleTrack = async () => {
    if (!trackingNo) return;
    setIsTracking(true);
    setTrackResult(null);
    try {
      const res = await fetch(`/api/incheon/tracking?termCd=${trackingNo}`);
      const data = await res.json();
      if (data.success && data.data && data.data.length > 0) {
        setTrackResult(data.data[0]); // Show the most recent activity
      } else {
        setTrackResult({ error: 'No active container work found for this code.' });
      }
    } catch (err) {
      console.error(err);
      setTrackResult({ error: 'Satellite link failed. Please retry.' });
    } finally {
      setIsTracking(false);
    }
  };

  if (!isMounted) return null;

  return (
    <div className={styles.layout}>
      {/* Sidebar - Slim Icons */}
      <aside className={styles.sidebar}>
        <div className={styles.logoIcon}>Y</div>
        <nav style={{ marginTop: '20px' }}>
          <div className={`${styles.navItem} ${activeTab === 'Overview' ? styles.navItemActive : ''}`} onClick={() => setActiveTab('Overview')} title="Home">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
          </div>
          <div className={`${styles.navItem} ${activeTab === 'Tracking' ? styles.navItemActive : ''}`} onClick={() => setActiveTab('Tracking')} title="Logistics">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13" /><polyline points="16 8 20 8 23 11 23 16 16 16 16 8" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" /></svg>
          </div>
          <div className={`${styles.navItem} ${activeTab === 'Analysis' ? styles.navItemActive : ''}`} onClick={() => setActiveTab('Analysis')} title="Market">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="20" x2="12" y2="10" /><line x1="18" y1="20" x2="18" y2="4" /><line x1="6" y1="20" x2="6" y2="16" /></svg>
          </div>
          <div className={`${styles.navItem} ${activeTab === 'Catalog' ? styles.navItemActive : ''}`} onClick={() => setActiveTab('Catalog')} title="Products">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M7 8h10" /><path d="M7 12h10" /><path d="M7 16h10" /></svg>
          </div>
        </nav>
        <div className={styles.sidebarBottom}>
          <div className={styles.navItem} title="Settings">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
          </div>
          <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" className={styles.userAvatar} alt="User" />
        </div>
      </aside>

      {/* Main Content */}
      <div className={styles.contentWrapper}>
        <header className={styles.header}>
          <div className={styles.tabs}>
            <button className={`${styles.tab} ${activeTab === 'Overview' ? styles.tabActive : ''}`} onClick={() => setActiveTab('Overview')}>Overview</button>
            <button className={`${styles.tab} ${activeTab === 'Tracking' ? styles.tabActive : ''}`} onClick={() => setActiveTab('Tracking')}>Logistics</button>
            <button className={`${styles.tab} ${activeTab === 'Analysis' ? styles.tabActive : ''}`} onClick={() => setActiveTab('Analysis')}>Market</button>
            <button className={`${styles.tab} ${activeTab === 'Catalog' ? styles.tabActive : ''}`} onClick={() => setActiveTab('Catalog')}>Portfolio</button>
          </div>
          <div className={styles.headerActions}>
            <div className={styles.circleBtn}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg></div>
            <div className={styles.circleBtn}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg></div>
          </div>
        </header>

        <main>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
            <h1 className={styles.sectionTitle}>{activeTab}</h1>
          </div>

          {activeTab === 'Overview' && (
            <div className={styles.dashboardGrid}>
              <div className={styles.mainCol}>
                {/* Market Trends Summary */}
                <div className={styles.marketGrid}>
                  <div className={styles.marketCard}>
                    <div className={styles.marketLabel}><span style={{ color: '#3b82f6' }}>●</span> USD/KRW</div>
                    <div className={styles.marketVal}>{marketData.usd.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ₩</div>
                    <div className={`${styles.trendTag} ${marketData.trends.usd === 'up' ? styles.trendUp : styles.trendDown}`}>
                      {marketData.trends.usd === 'up' ? '▲' : '▼'} {marketData.trends.usd === 'up' ? '+' : ''}0.2%
                    </div>
                  </div>
                  <div className={styles.marketCard}>
                    <div className={styles.marketLabel}><span style={{ color: '#ef4444' }}>●</span> CNY/KRW</div>
                    <div className={styles.marketVal}>{marketData.cny.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ₩</div>
                    <div className={`${styles.trendTag} ${marketData.trends.cny === 'up' ? styles.trendUp : styles.trendDown}`}>
                      {marketData.trends.cny === 'up' ? '▲' : '▼'} {marketData.trends.cny === 'up' ? '+' : ''}0.1%
                    </div>
                  </div>
                  <div className={styles.marketCard}>
                    <div className={styles.marketLabel}><span style={{ color: '#f97316' }}>●</span> Aluminum</div>
                    <div className={styles.marketVal}>{Math.round(marketData.metals.alum).toLocaleString()} ¥</div>
                    <div className={`${styles.trendTag} ${marketData.trends.alum === 'up' ? styles.trendUp : styles.trendDown}`}>
                      {marketData.trends.alum === 'up' ? '▲' : '▼'} 1.4%
                    </div>
                  </div>
                  <div className={styles.marketCard}>
                    <div className={styles.marketLabel}><span style={{ color: '#ea580c' }}>●</span> Copper</div>
                    <div className={styles.marketVal}>{Math.round(marketData.metals.copper).toLocaleString()} ¥</div>
                    <div className={`${styles.trendTag} ${marketData.trends.copper === 'up' ? styles.trendUp : styles.trendDown}`}>
                      {marketData.trends.copper === 'up' ? '▲' : '▼'} 0.5%
                    </div>
                  </div>
                  <div className={styles.marketCard}>
                    <div className={styles.marketLabel}><span style={{ color: '#10b981' }}>●</span> Steel Rebar</div>
                    <div className={styles.marketVal}>{Math.round(marketData.metals.steel).toLocaleString()} ¥</div>
                    <div className={`${styles.trendTag} ${marketData.trends.steel === 'up' ? styles.trendUp : styles.trendDown}`}>
                      {marketData.trends.steel === 'up' ? '▲' : '▼'} 0.8%
                    </div>
                  </div>
                  <div className={styles.marketCard}>
                    <div className={styles.marketLabel}><span style={{ color: '#8b5cf6' }}>●</span> Nickel</div>
                    <div className={styles.marketVal}>{Math.round(marketData.metals.nickel).toLocaleString()} ¥</div>
                    <div className={`${styles.trendTag} ${marketData.trends.nickel === 'up' ? styles.trendUp : styles.trendDown}`}>
                      {marketData.trends.nickel === 'up' ? '▲' : '▼'} 1.1%
                    </div>
                  </div>
                  <div className={styles.marketCard}>
                    <div className={styles.marketLabel}><span style={{ color: '#3b82f6' }}>●</span> Zinc</div>
                    <div className={styles.marketVal}>{Math.round(marketData.metals.zinc).toLocaleString()} ¥</div>
                    <div className={`${styles.trendTag} ${marketData.trends.zinc === 'up' ? styles.trendUp : styles.trendDown}`}>
                      {marketData.trends.zinc === 'up' ? '▲' : '▼'} 0.3%
                    </div>
                  </div>
                </div>

                {/* Main Visual Card */}
                <div className={styles.card} style={{ marginBottom: '24px' }}>
                  <div className={styles.cardHeader}>
                    <div>
                      <h3 className={styles.cardTitle}>Global Market Intelligence</h3>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Real-time price index for industrial commodities</p>
                    </div>
                    <div className={styles.circleBtn}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3" /></svg></div>
                  </div>
                  <div style={{ height: '300px' }}>
                    <MarketChart
                      data={historyData.map(d => ({ date: d.date, value: d.cny }))}
                      todayValue={marketData.cny}
                      title="CNY/KRW Index"
                      color="#ef4444"
                      unit=" ₩"
                    />
                  </div>
                </div>

                {/* Recent Shipments / Activity (Image 2 style) */}
                <div className={styles.card}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 className={styles.cardTitle}>Incheon Port Congestion</h3>
                    {incheonPort.length > 0 && (
                      <span style={{ background: '#dcfce7', color: '#166534', padding: '4px 8px', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 700 }}>● LIVE API CONNECTED</span>
                    )}
                  </div>
                  <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Terminal</th>
                          <th>Status</th>
                          <th>Efficiency</th>
                          <th>Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(incheonPort.length > 0 ? incheonPort : hubs).map((item, idx) => {
                          const isReal = !!item.termName;
                          const name = isReal ? item.termName : item.name;
                          const status = isReal ? (
                            item.trafficStatus === 'A' ? 'Smooth' :
                              item.trafficStatus === 'B' ? 'Normal' : 'Congested'
                          ) : item.status;

                          const color = status === 'Smooth' || status === 'Stable' ? '#dcfce7' :
                            status === 'Normal' || status === 'Moderate' ? '#fef3c7' : '#fee2e2';
                          const textColor = status === 'Smooth' || status === 'Stable' ? '#166534' :
                            status === 'Normal' || status === 'Moderate' ? '#92400e' : '#991b1b';
                          const fillWidth = status === 'Smooth' || status === 'Stable' ? '90%' :
                            status === 'Normal' || status === 'Moderate' ? '60%' : '30%';

                          return (
                            <tr key={isReal ? item.termCd + idx : item.id}>
                              <td style={{ fontWeight: 600 }}>{name}</td>
                              <td><span className={styles.trendTag} style={{ background: color, color: textColor }}>{status}</span></td>
                              <td>
                                <div style={{ width: '100px', height: '6px', background: '#e2e8f0', borderRadius: '3px', position: 'relative' }}>
                                  <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: fillWidth, background: textColor, borderRadius: '3px', transition: 'width 0.5s' }}></div>
                                </div>
                              </td>
                              <td style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{isReal ? item.trafficTime.split(' ')[1] : times.korea}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className={styles.rightSidebar}>
                {/* World Clock Cards */}
                <div className={styles.statCard}>
                  <h4 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '16px', textTransform: 'uppercase' }}>Command Center Clocks</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 500 }}>Seoul (HQ)</span>
                      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>{times.korea}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 500 }}>Shanghai</span>
                      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>{times.china}</span>
                    </div>
                  </div>
                </div>

                {/* Quick Tools (Image 4 style) */}
                <div className={styles.statCard}>
                  <h4 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '16px', textTransform: 'uppercase' }}>Operations Toolkit</h4>
                  <div className={styles.categoryGrid}>
                    <div className={styles.catBtn} onClick={() => setActiveTab('Tracking')}>
                      <div className={styles.catIcon} style={{ background: '#f5f3ff', color: '#7c3aed' }}>
                        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
                      </div>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Tracking</span>
                    </div>
                    <div className={styles.catBtn} onClick={() => setActiveTab('Analysis')}>
                      <div className={styles.catIcon} style={{ background: '#fff7ed', color: '#f97316' }}>
                        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
                      </div>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Cost</span>
                    </div>
                  </div>

                  <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>CBM Estimator</span>
                      <span style={{ color: '#7c3aed', fontWeight: 700 }}>{calculateTotalCBM().toFixed(3)} m³</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px', maxHeight: '300px', overflowY: 'auto', paddingRight: '4px' }}>
                      {products.map((product) => (
                        <div key={product.id} style={{ background: 'white', padding: '12px', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <input
                              style={{ border: 'none', fontWeight: 600, fontSize: '0.8rem', width: '100px' }}
                              value={product.name}
                              onChange={(e) => updateProduct(product.id, 'name', e.target.value)}
                            />
                            {products.length > 1 && (
                              <button onClick={() => removeProduct(product.id)} style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1rem' }}>&times;</button>
                            )}
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                            <input type="number" placeholder="L" style={{ width: '100%', padding: '4px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.7rem' }} value={product.length} onChange={(e) => updateProduct(product.id, 'length', e.target.value)} />
                            <input type="number" placeholder="W" style={{ width: '100%', padding: '4px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.7rem' }} value={product.width} onChange={(e) => updateProduct(product.id, 'width', e.target.value)} />
                            <input type="number" placeholder="H" style={{ width: '100%', padding: '4px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.7rem' }} value={product.height} onChange={(e) => updateProduct(product.id, 'height', e.target.value)} />
                            <input type="number" placeholder="Qty" style={{ width: '100%', padding: '4px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.7rem' }} value={product.qty} onChange={(e) => updateProduct(product.id, 'qty', e.target.value)} />
                          </div>
                        </div>
                      ))}
                    </div>

                    <button onClick={addProduct} style={{ width: '100%', padding: '8px', borderRadius: '12px', border: '1px dashed #7c3aed', background: '#f5f3ff', color: '#7c3aed', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', marginBottom: '16px' }}>
                      + Add Product
                    </button>

                    <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.min((calculateTotalCBM() / 28) * 100, 100)}%`, background: '#7c3aed', transition: 'width 0.3s ease' }}></div>
                    </div>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '8px', display: 'flex', justifyContent: 'space-between' }}>
                      <span>20ft Container Fill Rate</span>
                      <span>{((calculateTotalCBM() / 28) * 100).toFixed(1)}%</span>
                    </p>
                  </div>
                </div>

                <div className={styles.statCard} style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', color: 'white' }}>
                  <h4 style={{ marginBottom: '8px' }}>YNK Intelligence</h4>
                  <p style={{ fontSize: '0.85rem', opacity: 0.9, lineHeight: 1.5 }}>Our AI model predicts a 2.4% decrease in Shanghai steel prices next week. Consider postponing orders.</p>
                  <button style={{ marginTop: '16px', background: 'white', border: 'none', padding: '8px 16px', borderRadius: '12px', fontWeight: 600, color: '#7c3aed', cursor: 'pointer' }}>View Report</button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Tracking' && (
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>Live Vessel Tracking</h3>
              </div>
              <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
                <input
                  type="text"
                  className={styles.catBtn}
                  placeholder="Enter Terminal Code (e.g., IT003)..."
                  style={{ flex: 1, padding: '12px', border: '2px solid #e2e8f0', borderRadius: '16px' }}
                  value={trackingNo}
                  onChange={(e) => setTrackingNo(e.target.value)}
                />
                <button className={styles.catBtn} style={{ background: '#1a1a1a', color: 'white', border: 'none' }} onClick={handleTrack}>Track</button>
              </div>

              <div style={{ height: '500px', background: '#eef2f6', borderRadius: '24px', display: 'flex', alignItems: 'center', justifycontent: 'center', color: '#94a3b8', border: '2px dashed #cbd5e1' }}>
                {isTracking ? (
                  <div style={{ textAlign: 'center' }}>
                    <div className={styles.loadingPulse} style={{ width: '40px', height: '40px', margin: '0 auto 20px', background: 'var(--accent-purple)', borderRadius: '50%' }}></div>
                    <p>SCANNING TERMINAL DATA...</p>
                  </div>
                ) : trackResult ? (
                  trackResult.error ? (
                    <p style={{ color: '#ef4444' }}>{trackResult.error}</p>
                  ) : (
                    <div style={{ textAlign: 'center', color: '#1a1a1a', padding: '40px', width: '100%' }}>
                      <h2 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '1.5rem' }}>⚡</span> Terminal Operations Detected
                      </h2>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <div className={styles.marketCard} style={{ background: 'white', border: 'none', boxShadow: 'var(--shadow-soft)' }}>
                          <strong>Terminal</strong>
                          <span style={{ color: 'var(--accent-purple)', fontWeight: 700 }}>{trackResult.termNm}</span>
                        </div>
                        <div className={styles.marketCard} style={{ background: 'white', border: 'none', boxShadow: 'var(--shadow-soft)' }}>
                          <strong>Vessel Code</strong>
                          <span style={{ fontWeight: 600 }}>{trackResult.shipCd || 'N/A'}</span>
                        </div>
                        <div className={styles.marketCard} style={{ background: 'white', border: 'none', boxShadow: 'var(--shadow-soft)' }}>
                          <strong>Work Start</strong>
                          <span style={{ fontSize: '0.85rem' }}>{trackResult.stvBeginDt}</span>
                        </div>
                        <div className={styles.marketCard} style={{ background: 'white', border: 'none', boxShadow: 'var(--shadow-soft)' }}>
                          <strong>Work End</strong>
                          <span style={{ fontSize: '0.85rem' }}>{trackResult.stvEndDt || 'IN PROGRESS'}</span>
                        </div>
                        <div className={styles.marketCard} style={{ background: 'white', border: 'none', boxShadow: 'var(--shadow-soft)', gridColumn: 'span 2' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-around', width: '100%' }}>
                            <div><strong>Discharge</strong> <span style={{ color: '#ef4444' }}>{trackResult.disActTeu} TEU</span></div>
                            <div style={{ width: '1px', background: '#e2e8f0' }}></div>
                            <div><strong>Loading</strong> <span style={{ color: '#10b981' }}>{trackResult.lodActTeu} TEU</span></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                ) : (
                  <p>ENTER TERMINAL CODE (e.g., IT003) TO START TRACKING</p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'Analysis' && (
            <div className={styles.dashboardGrid}>
              <div className={styles.mainCol}>
                <div className={styles.card}>
                  <h3 className={styles.cardTitle}>Historical Data Analysis</h3>
                  <div style={{ display: 'flex', gap: '8px', margin: '20px 0' }}>
                    {['aluminum', 'copper', 'steel', 'nickel', 'zinc'].map(m => (
                      <button
                        key={m}
                        className={`${styles.tab} ${selectedMetal === m ? styles.tabActive : ''}`}
                        onClick={() => setSelectedMetal(m)}
                        style={{ border: '1px solid #e2e8f0' }}
                      >
                        {m.toUpperCase()}
                      </button>
                    ))}
                  </div>
                  <div style={{ height: '400px' }}>
                    <MarketChart
                      data={historyData.map(d => ({ date: d.date, value: d.metals?.[selectedMetal]?.last }))}
                      todayValue={marketData.metals?.[selectedMetal]}
                      title={`Shanghai ${selectedMetal.toUpperCase()} History`}
                      color="#f97316"
                      unit=" ¥"
                    />
                  </div>
                </div>
              </div>
              <div className={styles.rightSidebar}>
                <div className={styles.card}>
                  <h3 className={styles.cardTitle}>Cost Calculator</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '20px' }}>
                    <input type="number" className={styles.catBtn} placeholder="Unit Price ($)" style={{ width: '100%' }} />
                    <input type="number" className={styles.catBtn} placeholder="Quantity" style={{ width: '100%' }} />
                    <div style={{ padding: '20px', background: '#f8fafc', borderRadius: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Est. Total</span>
                        <span style={{ fontWeight: 700 }}>$0.00</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Catalog' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className={styles.card} style={{ padding: '20px' }}>
                  <div style={{ height: '180px', background: '#f1f5f9', borderRadius: '16px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    <img src={`https://picsum.photos/seed/${i + 40}/400/300`} alt="Product" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <h4 style={{ fontSize: '1.1rem', marginBottom: '4px' }}>YNK-Series V{i} Lite</h4>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '16px' }}>Industrial Hardware / Gen 4</p>
                  <button className={styles.catBtn} style={{ width: '100%', justifyContent: 'center', fontWeight: 700 }} onClick={() => setSelectedProduct({ name: `V${i} Lite` })}>View Specs</button>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Modal for Product Details */}
      {selectedProduct && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setSelectedProduct(null)}>
          <div className={styles.card} style={{ maxWidth: '600px', width: '90%' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ marginBottom: '20px' }}>{selectedProduct.name} Specifications</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div className={styles.marketCard}><strong>Material</strong> High-Grade Alum</div>
              <div className={styles.marketCard}><strong>Weight</strong> 2.4kg</div>
              <div className={styles.marketCard}><strong>Cert</strong> CE / RoHS / KC</div>
              <div className={styles.marketCard}><strong>Origin</strong> Shanghai Hub</div>
            </div>
            <button className={styles.catBtn} style={{ width: '100%', marginTop: '30px', background: '#1a1a1a', color: 'white', justifyContent: 'center' }} onClick={() => setSelectedProduct(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

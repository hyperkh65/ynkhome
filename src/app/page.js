'use client';

import { useState, useEffect } from 'react';
import styles from './page.module.css';
import MarketChart from '@/components/MarketChart';

export default function Home() {
  const [isMounted, setIsMounted] = useState(false);
  const [times, setTimes] = useState({ korea: '--:--:--', china: '--:--:--', vietnam: '--:--:--' });
  const [trackingNo, setTrackingNo] = useState('');
  const [isTracking, setIsTracking] = useState(false);
  const [trackResult, setTrackResult] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [selectedMetal, setSelectedMetal] = useState('aluminum');
  const [selectedCurrency, setSelectedCurrency] = useState('usd');
  const [expandedWidget, setExpandedWidget] = useState(null); // 'market', 'metals'
  const [modalSelection, setModalSelection] = useState('usd'); // Local selection inside modal
  const [activeTool, setActiveTool] = useState(null); // 'cbm', 'cost'

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

  // CBM Calculator State - Multiple Products
  const [products, setProducts] = useState([
    { id: 1, name: 'Product 1', length: '', width: '', height: '', qty: '' }
  ]);
  const [isPanelExpanded, setIsPanelExpanded] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const [hubs, setHubs] = useState([
    { id: 'busan', name: 'Busan (KR)', status: 'Stable', color: '#d1fae5', textColor: '#065f46' },
    { id: 'shanghai', name: 'Shang. (CN)', status: 'Moderate', color: '#fef3c7', textColor: '#92400e' },
    { id: 'hcm', name: 'HCM (VN)', status: 'Delay', color: '#fee2e2', textColor: '#991b1b' }
  ]);

  // Add new product
  const addProduct = () => {
    const newId = Math.max(...products.map(p => p.id), 0) + 1;
    setProducts([...products, {
      id: newId,
      name: `Product ${newId}`,
      length: '',
      width: '',
      height: '',
      qty: ''
    }]);
  };

  // Remove product
  const removeProduct = (id) => {
    if (products.length > 1) {
      setProducts(products.filter(p => p.id !== id));
    }
  };

  // Update product field
  const updateProduct = (id, field, value) => {
    setProducts(products.map(p =>
      p.id === id ? { ...p, [field]: value } : p
    ));
  };

  // Calculate CBM for a single product
  const calculateProductCBM = (product) => {
    const l = parseFloat(product.length) || 0;
    const w = parseFloat(product.width) || 0;
    const h = parseFloat(product.height) || 0;
    const q = parseFloat(product.qty) || 0;

    if (l > 0 && w > 0 && h > 0 && q > 0) {
      return (l * w * h * q) / 1000000;
    }
    return 0;
  };

  // Calculate total CBM from all products
  const calculateTotalCBM = () => {
    return products.reduce((sum, product) => sum + calculateProductCBM(product), 0);
  };

  useEffect(() => {
    // Fix hydration mismatch - only run on client
    setIsMounted(true);

    const formatTime = (offset) => {
      const d = new Date(new Date().getTime() + (offset * 60 * 60 * 1000));
      return d.getUTCHours().toString().padStart(2, '0') + ':' +
        d.getUTCMinutes().toString().padStart(2, '0') + ':' +
        d.getUTCSeconds().toString().padStart(2, '0');
    };

    // Set initial time immediately
    setTimes({ korea: formatTime(9), china: formatTime(8), vietnam: formatTime(7) });

    const timeTimer = setInterval(() => {
      setTimes({ korea: formatTime(9), china: formatTime(8), vietnam: formatTime(7) });
    }, 1000);

    const fetchMarketData = async () => {
      try {
        const res = await fetch('/api/market');
        const data = await res.json();

        if (data.success) {
          const { rates, metals } = data;

          setMarketData(prev => ({
            usd: rates.usd,
            cny: rates.cny,
            metals: {
              alum: metals.aluminum?.last || 0,
              copper: metals.copper?.last || 0,
              steel: metals.steel?.last || 0,
              nickel: metals.nickel?.last || 0,
              zinc: metals.zinc?.last || 0
            },
            trends: {
              usd: rates.usd > prev.usd ? 'up' : 'down',
              cny: rates.cny > prev.cny ? 'up' : 'down',
              alum: (metals.aluminum?.last || 0) > (metals.aluminum?.prevClose || 0) ? 'up' : 'down',
              copper: (metals.copper?.last || 0) > (metals.copper?.prevClose || 0) ? 'up' : 'down',
              steel: (metals.steel?.last || 0) > (metals.steel?.prevClose || 0) ? 'up' : 'down',
              nickel: (metals.nickel?.last || 0) > (metals.nickel?.prevClose || 0) ? 'up' : 'down',
              zinc: (metals.zinc?.last || 0) > (metals.zinc?.prevClose || 0) ? 'up' : 'down',
            }
          }));
        }
      } catch (err) {
        console.error("Failed to fetch market data:", err);
      }
    };

    const fetchHistory = async () => {
      try {
        const res = await fetch('/api/market/history');
        const data = await res.json();
        if (Array.isArray(data)) setHistoryData(data.reverse());
      } catch (err) {
        console.error("Failed to fetch history:", err);
      }
    };

    fetchMarketData();
    fetchHistory();
    const marketTimer = setInterval(fetchMarketData, 300000);

    const hubTimer = setInterval(() => {
      if (Math.random() > 0.8) {
        setHubs(prev => prev.map(hub => {
          if (Math.random() > 0.7) {
            const statuses = [
              { status: 'Stable', color: '#d1fae5', textColor: '#065f46' },
              { status: 'Moderate', color: '#fef3c7', textColor: '#92400e' },
              { status: 'Busy', color: '#fff7ed', textColor: '#9a3412' }
            ];
            return { ...hub, ...statuses[Math.floor(Math.random() * statuses.length)] };
          }
          return hub;
        }));
      }
    }, 5000);

    return () => {
      clearInterval(timeTimer);
      clearInterval(marketTimer);
      clearInterval(hubTimer);
    };
  }, []);

  const handleTrack = () => {
    if (!trackingNo) return;
    setIsTracking(true);
    setTrackResult(null);
    setTimeout(() => {
      setIsTracking(false);
      setTrackResult({
        vessel: 'OCEAN VOYAGER V.12',
        position: '1.2852° N, 103.8510° E (Singapore Strait)',
        status: 'IN TRANSIT',
        eta: '2024-02-15',
        speed: '18.5 knots'
      });
    }, 1500);
  };

  return (
    <div className={styles.layout}>
      {/* Toggle Button - Fixed position for small screens */}
      {isSidebarCollapsed && (
        <button
          className={styles.sidebarToggle}
          onClick={() => setIsSidebarCollapsed(false)}
          style={{
            position: 'fixed',
            left: '16px',
            top: '16px',
            zIndex: 150,
            background: 'var(--accent-primary)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '12px',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
      )}

      {/* Sidebar - Left Fixed Widgets */}
      <aside className={styles.sidebar} style={{
        transform: isSidebarCollapsed ? 'translateX(-100%)' : 'translateX(0)',
        transition: 'transform 0.3s ease'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className={styles.logoArea}>
            <div className={styles.logoText}>YNK GLOBAL</div>
            <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '4px' }}>Command Center v4.0</div>
          </div>
          <button
            onClick={() => setIsSidebarCollapsed(true)}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              color: '#94a3b8',
              borderRadius: '6px',
              padding: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Collapse Sidebar"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>
        </div>

        <div className={styles.widgetGroup}>
          <h4 className={styles.widgetTitle}>World Clock</h4>
          <div className={styles.sidebarWidget}>
            <div className={styles.clockItem}>
              <span className={styles.clockCity}>Seoul</span>
              <span className={styles.clockTime}>{times.korea}</span>
            </div>
            <div className={styles.clockItem}>
              <span className={styles.clockCity}>Shanghai</span>
              <span className={styles.clockTime}>{times.china}</span>
            </div>
            <div className={styles.clockItem}>
              <span className={styles.clockCity}>Ho Chi Minh</span>
              <span className={styles.clockTime}>{times.vietnam}</span>
            </div>
          </div>
        </div>

        <div className={styles.widgetGroup}>
          <div className={styles.widgetHeader}>
            <h4 className={styles.widgetTitle}>Market Trends</h4>
            <button className={styles.expandBtn} onClick={() => { setExpandedWidget('market'); setModalSelection('usd'); }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>
            </button>
          </div>
          <div className={styles.sidebarWidget}>
            <div className={styles.marketRow}>
              <span className={styles.clockCity}>USD/KRW</span>
              <span className={`${styles.marketValue} ${marketData.trends.usd === 'up' ? styles.trendUp : styles.trendDown}`}>
                {marketData.usd.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} {marketData.trends.usd === 'up' ? '▲' : '▼'}
              </span>
            </div>
            <div className={styles.marketRow}>
              <span className={styles.clockCity}>CNY/KRW</span>
              <span className={`${styles.marketValue} ${marketData.trends.cny === 'up' ? styles.trendUp : styles.trendDown}`}>
                {marketData.cny.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} {marketData.trends.cny === 'up' ? '▲' : '▼'}
              </span>
            </div>
          </div>
        </div>
        <div className={styles.widgetGroup}>
          <div className={styles.widgetHeader}>
            <h4 className={styles.widgetTitle}>Shanghai Metals (SHFE Closing)</h4>
            <button className={styles.expandBtn} onClick={() => { setExpandedWidget('metals'); setModalSelection('aluminum'); }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>
            </button>
          </div>
          <div className={styles.sidebarWidget}>
            <div className={styles.marketRow}>
              <span className={styles.clockCity}>Aluminum</span>
              <span className={`${styles.marketValue} ${marketData.trends.alum === 'up' ? styles.trendUp : styles.trendDown}`}>
                {Math.round(marketData.metals.alum).toLocaleString()} ¥ {marketData.trends.alum === 'up' ? '▲' : '▼'}
              </span>
            </div>
            <div className={styles.marketRow}>
              <span className={styles.clockCity}>Copper</span>
              <span className={`${styles.marketValue} ${marketData.trends.copper === 'up' ? styles.trendUp : styles.trendDown}`}>
                {Math.round(marketData.metals.copper).toLocaleString()} ¥ {marketData.trends.copper === 'up' ? '▲' : '▼'}
              </span>
            </div>
            <div className={styles.marketRow}>
              <span className={styles.clockCity}>Steel Rebar</span>
              <span className={`${styles.marketValue} ${marketData.trends.steel === 'up' ? styles.trendUp : styles.trendDown}`}>
                {Math.round(marketData.metals.steel).toLocaleString()} ¥ {marketData.trends.steel === 'up' ? '▲' : '▼'}
              </span>
            </div>
            <div className={styles.marketRow}>
              <span className={styles.clockCity}>Nickel</span>
              <span className={`${styles.marketValue} ${marketData.trends.nickel === 'up' ? styles.trendUp : styles.trendDown}`}>
                {Math.round(marketData.metals.nickel).toLocaleString()} ¥ {marketData.trends.nickel === 'up' ? '▲' : '▼'}
              </span>
            </div>
            <div className={styles.marketRow}>
              <span className={styles.clockCity}>Zinc</span>
              <span className={`${styles.marketValue} ${marketData.trends.zinc === 'up' ? styles.trendUp : styles.trendDown}`}>
                {Math.round(marketData.metals.zinc).toLocaleString()} ¥ {marketData.trends.zinc === 'up' ? '▲' : '▼'}
              </span>
            </div>
          </div>
        </div>

        <div className={styles.widgetGroup}>
          <h4 className={styles.widgetTitle}>Hub Status</h4>
          <div className={styles.sidebarWidget}>
            {hubs.map(hub => (
              <div key={hub.id} className={styles.marketRow}>
                <span className={styles.clockCity}>{hub.name}</span>
                <span className={styles.statusTag} style={{ background: hub.color, color: hub.textColor }}>{hub.status}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 'auto' }}>
          <a href="/admin" className={styles.viewBtn} style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>ADMIN ACCESS</a>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className={styles.mainContent}>
        <header className={styles.header}>
          <h1 className={styles.pageTitle}>Dashboard Overview</h1>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Welcome back, Administrator</div>
        </header>

        {/* Vessel Tracker Section */}
        <section className={styles.vesselSection}>
          <div className={styles.trackingCard}>
            <h3 style={{ marginBottom: '8px' }}>Logistics Intelligence</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Enter B/L number to fetch real-time satellite position and shipping status.</p>
            <div className={styles.searchBar}>
              <input
                type="text"
                className={styles.inputField}
                placeholder="Ex: YNK-2024-SH-9928"
                value={trackingNo}
                onChange={(e) => setTrackingNo(e.target.value)}
              />
              <button className={styles.primaryBtn} onClick={handleTrack}>Search Tracking</button>
            </div>

            {isTracking && (
              <div style={{ marginTop: '24px', padding: '20px', textAlign: 'center', background: '#f8fafc', borderRadius: '12px' }}>
                Connecting to Marine Satellite...
              </div>
            )}

            {trackResult && (
              <div style={{ marginTop: '24px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', padding: '24px', background: '#f8fafc', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
                <div>
                  <div className={styles.clockCity} style={{ marginBottom: '4px' }}>Current Vessel</div>
                  <div style={{ fontWeight: '700' }}>{trackResult.vessel}</div>
                </div>
                <div>
                  <div className={styles.clockCity} style={{ marginBottom: '4px' }}>Last Coordinates</div>
                  <div style={{ fontWeight: '700' }}>{trackResult.position}</div>
                </div>
                <div>
                  <div className={styles.clockCity} style={{ marginBottom: '4px' }}>Status</div>
                  <div className={styles.statusTag} style={{ display: 'inline-block', background: '#dbeafe', color: '#1e40af' }}>{trackResult.status}</div>
                </div>
                <div>
                  <div className={styles.clockCity} style={{ marginBottom: '4px' }}>Estimated Arrival</div>
                  <div style={{ fontWeight: '700' }}>{trackResult.eta}</div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Market Analysis Charts */}
        <section style={{ marginBottom: '40px' }}>
          <div className={styles.chartHeader}>
            <h2 style={{ fontSize: '1.4rem' }}>Market Intelligence Trends</h2>
            <div className={styles.chartControls}>
              <select
                className={styles.selectInput}
                value={selectedCurrency}
                onChange={(e) => setSelectedCurrency(e.target.value)}
              >
                <option value="usd">USD/KRW</option>
                <option value="cny">CNY/KRW</option>
              </select>
              <select
                className={styles.selectInput}
                value={selectedMetal}
                onChange={(e) => setSelectedMetal(e.target.value)}
              >
                <option value="aluminum">Aluminum</option>
                <option value="copper">Copper</option>
                <option value="steel">Steel</option>
                <option value="nickel">Nickel</option>
                <option value="zinc">Zinc</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div className={styles.trackingCard} style={{ height: '350px' }}>
              <MarketChart
                data={historyData.map(d => ({ date: d.date, value: d[selectedCurrency] }))}
                todayValue={marketData[selectedCurrency]}
                title={selectedCurrency.toUpperCase() + '/KRW'}
                color="#3b82f6"
                unit=" ₩"
              />
            </div>
            <div className={styles.trackingCard} style={{ height: '350px' }}>
              <MarketChart
                data={historyData.map(d => ({ date: d.date, value: d.metals?.[selectedMetal]?.last }))}
                todayValue={marketData.metals?.[selectedMetal]}
                title={'SHFE ' + selectedMetal.toUpperCase()}
                color="#6366f1"
                unit=" ¥"
              />
            </div>
          </div>
        </section>

        {/* Product Grid Section */}
        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '1.4rem' }}>Latest Imports</h2>
            <button className={styles.viewBtn} style={{ width: 'auto', padding: '8px 16px' }}>View Catalog</button>
          </div>
          <div className={styles.productGrid}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className={styles.productCard}>
                <div className={styles.imagePlaceholder}>
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
                </div>
                <div className={styles.productInfo}>
                  <div className={styles.productName}>YNK-PRO-LIT-V{i}</div>
                  <div className={styles.productCat}>Industrial Lighting / Case A</div>
                  <button
                    className={styles.viewBtn}
                    onClick={() => setSelectedProduct({ name: `YNK-PRO-LIT-V${i}`, model: `V${i}-G1` })}
                  >
                    View Specifications
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Utilities Dock - Right Side */}
      <aside className={styles.utilitiesSidebar} style={{ width: activeTool ? (isPanelExpanded ? '700px' : '420px') : '60px' }}>
        {/* Fixed Icon Strip */}
        <div className={styles.utilityDock}>
          <button
            className={`${styles.dockIcon} ${activeTool === 'cbm' ? styles.dockIconActive : ''}`}
            onClick={() => setActiveTool(activeTool === 'cbm' ? null : 'cbm')}
            title="CBM Calculator"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
          </button>
          <button
            className={`${styles.dockIcon} ${activeTool === 'cost' ? styles.dockIconActive : ''}`}
            onClick={() => setActiveTool(activeTool === 'cost' ? null : 'cost')}
            title="Cost Calculator"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
          </button>
        </div>

        {/* Expanding Content Panel */}
        {activeTool && (
          <div className={styles.dockPanel}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ textTransform: 'uppercase', fontSize: '0.9rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                {activeTool === 'cbm' ? 'CBM Calculator' : 'Cost Analysis'}
                {activeTool === 'cbm' && (
                  <button
                    onClick={() => setIsPanelExpanded(!isPanelExpanded)}
                    style={{
                      background: 'none',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      padding: '4px 8px',
                      cursor: 'pointer',
                      color: '#64748b',
                      fontSize: '0.7rem',
                      fontWeight: 600
                    }}
                  >
                    {isPanelExpanded ? 'Compact' : 'Expand'}
                  </button>
                )}
              </h3>
              <button onClick={() => setActiveTool(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '1.5rem' }}>&times;</button>
            </div>

            {activeTool === 'cbm' && (
              <div className={styles.calcGroup}>
                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', fontSize: '0.75rem', color: '#64748b', marginBottom: '16px' }}>
                  Add multiple products to calculate mixed cargo CBM and container requirements.
                </div>

                {/* Product List */}
                <div style={{ maxHeight: '400px', overflowY: 'auto', marginBottom: '16px' }}>
                  {products.map((product, index) => (
                    <div key={product.id} style={{
                      marginBottom: '16px',
                      padding: '12px',
                      background: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <input
                          type="text"
                          value={product.name}
                          onChange={(e) => updateProduct(product.id, 'name', e.target.value)}
                          style={{
                            border: 'none',
                            background: 'transparent',
                            fontWeight: '600',
                            fontSize: '0.85rem',
                            color: '#1e293b',
                            padding: 0,
                            width: '60%'
                          }}
                        />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '0.75rem', color: '#3b82f6', fontWeight: '700' }}>
                            {calculateProductCBM(product).toFixed(3)} CBM
                          </span>
                          {products.length > 1 && (
                            <button
                              onClick={() => removeProduct(product.id)}
                              style={{
                                background: '#fee2e2',
                                border: 'none',
                                borderRadius: '4px',
                                padding: '2px 6px',
                                cursor: 'pointer',
                                color: '#991b1b',
                                fontSize: '0.8rem',
                                fontWeight: '600'
                              }}
                            >
                              ×
                            </button>
                          )}
                        </div>
                      </div>

                      <div className={styles.calcRow}>
                        <div>
                          <label className={styles.calcLabel}>Length (cm)</label>
                          <input
                            type="number"
                            className={styles.calcInput}
                            value={product.length}
                            onChange={(e) => updateProduct(product.id, 'length', e.target.value)}
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className={styles.calcLabel}>Width (cm)</label>
                          <input
                            type="number"
                            className={styles.calcInput}
                            value={product.width}
                            onChange={(e) => updateProduct(product.id, 'width', e.target.value)}
                            placeholder="0"
                          />
                        </div>
                      </div>
                      <div className={styles.calcRow}>
                        <div>
                          <label className={styles.calcLabel}>Height (cm)</label>
                          <input
                            type="number"
                            className={styles.calcInput}
                            value={product.height}
                            onChange={(e) => updateProduct(product.id, 'height', e.target.value)}
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className={styles.calcLabel}>Qty (box)</label>
                          <input
                            type="number"
                            className={styles.calcInput}
                            value={product.qty}
                            onChange={(e) => updateProduct(product.id, 'qty', e.target.value)}
                            placeholder="0"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add Product Button */}
                <button
                  onClick={addProduct}
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: '#f8fafc',
                    border: '1px dashed #cbd5e1',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    color: '#64748b',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    marginBottom: '16px'
                  }}
                >
                  + Add Product
                </button>

                {/* Total Results */}
                <div className={styles.calcResultCard}>
                  <div className={styles.resultRow}>
                    <span className={styles.resultLabel}>Total Volume</span>
                    <span className={styles.resultValue} style={{ color: 'var(--accent-primary)' }}>
                      {calculateTotalCBM().toFixed(3)} <span style={{ fontSize: '0.8em', fontWeight: 400 }}>CBM</span>
                    </span>
                  </div>
                  <div className={styles.resultRow}>
                    <span className={styles.resultLabel}>Revenue Ton (R/T)</span>
                    <span className={styles.resultValue}>
                      {calculateTotalCBM().toFixed(3)} <span style={{ fontSize: '0.8em', fontWeight: 400 }}>RT</span>
                    </span>
                  </div>

                  <div className={styles.containerVisual}>
                    <div style={{ marginBottom: '12px' }}>
                      <div className={styles.containerInfo} style={{ marginBottom: '2px' }}>
                        <span>20ft Container (Avg. 28 CBM)</span>
                        <span>{(calculateTotalCBM() / 28).toFixed(1)} Unit(s)</span>
                      </div>
                      <div className={styles.containerBar}>
                        <div
                          className={styles.containerFill}
                          style={{ width: `${Math.min((calculateTotalCBM() / 28) * 100, 100)}%` }}
                        ></div>
                      </div>
                    </div>

                    <div style={{ marginBottom: '12px' }}>
                      <div className={styles.containerInfo} style={{ marginBottom: '2px' }}>
                        <span>40ft Container (Avg. 58 CBM)</span>
                        <span>{(calculateTotalCBM() / 58).toFixed(1)} Unit(s)</span>
                      </div>
                      <div className={styles.containerBar}>
                        <div
                          className={styles.containerFill}
                          style={{ width: `${Math.min((calculateTotalCBM() / 58) * 100, 100)}%`, background: '#8b5cf6' }}
                        ></div>
                      </div>
                    </div>

                    <div>
                      <div className={styles.containerInfo} style={{ marginBottom: '2px' }}>
                        <span>40HQ Container (Avg. 68 CBM)</span>
                        <span>{(calculateTotalCBM() / 68).toFixed(1)} Unit(s)</span>
                      </div>
                      <div className={styles.containerBar}>
                        <div
                          className={styles.containerFill}
                          style={{ width: `${Math.min((calculateTotalCBM() / 68) * 100, 100)}%`, background: '#10b981' }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTool === 'cost' && (
              <div className={styles.calcGroup}>
                <div>
                  <label className={styles.calcLabel}>Unit Price ($)</label>
                  <input type="number" className={styles.calcInput} placeholder="0.00" />
                </div>
                <div>
                  <label className={styles.calcLabel}>Logistics / Fees ($)</label>
                  <input type="number" className={styles.calcInput} placeholder="0" />
                </div>
                <div style={{ marginTop: '20px', padding: '16px', background: '#f8fafc', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Estimated Cost</span>
                    <span style={{ fontWeight: '700', color: 'var(--accent-primary)' }}>0 ₩</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </aside>

      {/* Modern Product Modal */}
      {selectedProduct && (
        <div className={styles.modalOverlay} onClick={() => setSelectedProduct(null)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '30px' }}>
              <div>
                <span className={styles.statusTag} style={{ background: '#f1f5f9', color: '#64748b', marginRight: '8px' }}>ID: {selectedProduct.model}</span>
                <h1 style={{ marginTop: '8px' }}>{selectedProduct.name} Details</h1>
              </div>
              <button
                onClick={() => setSelectedProduct(null)}
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#94a3b8' }}
              >
                &times;
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
              <div className={styles.imagePlaceholder} style={{ borderRadius: '16px', aspectratio: '1' }}>
                <span style={{ fontSize: '0.8rem' }}>HIGH RESOLUTION PREVIEW</span>
              </div>
              <div>
                <h4 style={{ marginBottom: '16px', color: '#1e293b' }}>Technical Specifications</h4>
                <div className={styles.marketRow} style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                  <span className={styles.clockCity}>Luminous Flux</span>
                  <span style={{ fontWeight: '600' }}>12,500 lm</span>
                </div>
                <div className={styles.marketRow} style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '12px', paddingTop: '12px' }}>
                  <span className={styles.clockCity}>Input Voltage</span>
                  <span style={{ fontWeight: '600' }}>AC 100-240V</span>
                </div>
                <div className={styles.marketRow} style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '12px', paddingTop: '12px' }}>
                  <span className={styles.clockCity}>Protection Rating</span>
                  <span style={{ fontWeight: '600' }}>IP67 Waterproof</span>
                </div>
                <div className={styles.marketRow} style={{ paddingTop: '12px' }}>
                  <span className={styles.clockCity}>Certification</span>
                  <span style={{ fontWeight: '600' }}>CE, RoHS, KC</span>
                </div>

                <div style={{ marginTop: '40px', display: 'flex', gap: '12px' }}>
                  <button className={styles.primaryBtn} style={{ flex: 1, padding: '12px' }}>Download PDF</button>
                  <button className={styles.viewBtn} style={{ flex: 1, padding: '12px' }}>Certificates</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Expanded Widget Modal */}
      {expandedWidget && (
        <div className={styles.modalOverlay} onClick={() => setExpandedWidget(null)}>
          <div className={styles.modalContent} style={{ maxWidth: '900px', width: '90%' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <h2 style={{ textTransform: 'uppercase', margin: 0 }}>{expandedWidget === 'market' ? 'Currency' : 'Metals'} Analysis</h2>
                <select
                  className={styles.selectInput}
                  value={modalSelection}
                  onChange={(e) => setModalSelection(e.target.value)}
                  style={{ minWidth: '150px' }}
                >
                  {expandedWidget === 'market' ? (
                    <>
                      <option value="usd">USD/KRW</option>
                      <option value="cny">CNY/KRW</option>
                    </>
                  ) : (
                    <>
                      <option value="aluminum">Aluminum</option>
                      <option value="copper">Copper</option>
                      <option value="steel">Steel</option>
                      <option value="nickel">Nickel</option>
                      <option value="zinc">Zinc</option>
                    </>
                  )}
                </select>
              </div>
              <button
                onClick={() => setExpandedWidget(null)}
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#94a3b8' }}
              >
                &times;
              </button>
            </div>

            <div style={{ height: '500px' }}>
              {expandedWidget === 'market' ? (
                <MarketChart
                  data={historyData.map(d => ({ date: d.date, value: d[modalSelection] }))}
                  todayValue={marketData[modalSelection]}
                  title={modalSelection.toUpperCase() + '/KRW'}
                  color="#3b82f6"
                  unit=" ₩"
                />
              ) : (
                <MarketChart
                  data={historyData.map(d => ({ date: d.date, value: d.metals?.[modalSelection]?.last }))}
                  todayValue={marketData.metals?.[modalSelection]}
                  title={'SHFE ' + modalSelection.toUpperCase()}
                  color="#6366f1"
                  unit=" ¥"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

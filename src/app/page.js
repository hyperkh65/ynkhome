'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import styles from './page.module.css';
import MarketChart from '@/components/MarketChart';

import { getProducts, getNotices } from '@/utils/storage';

export default function Home() {
  const router = useRouter();
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
  const [showSettings, setShowSettings] = useState(false);
  const [showMarketModal, setShowMarketModal] = useState(false);
  const [showTrackingModal, setShowTrackingModal] = useState(false);

  // News & Notices State
  const [notices, setNotices] = useState([]);
  const [news, setNews] = useState([]);

  // Settings State
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(true);

  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [darkMode]);

  const [marketData, setMarketData] = useState({
    usd: 1476.80,
    cny: 212.24,
    metals: {
      aluminum: 2350.50,
      copper: 9500.20,
      steel: 680.00,
      nickel: 16200.00,
      zinc: 2800.00
    },
    trends: { usd: 'up', cny: 'up', aluminum: 'up', copper: 'down', steel: 'up', nickel: 'up', zinc: 'up' }
  });
  const [catalogData, setCatalogData] = useState([]);

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
  const [portLastUpdated, setPortLastUpdated] = useState('');
  const [incheonPort, setIncheonPort] = useState([]);

  // World Clock & Auto Refresh
  useEffect(() => {
    setIsMounted(true);

    // Initial fetch
    fetchData();

    const worldTimer = setInterval(() => {
      const now = new Date();
      setTimes({
        korea: now.toLocaleTimeString('en-US', { timeZone: 'Asia/Seoul', hour12: false }),
        china: now.toLocaleTimeString('en-US', { timeZone: 'Asia/Shanghai', hour12: false }),
        vietnam: now.toLocaleTimeString('en-US', { timeZone: 'Asia/Ho_Chi_Minh', hour12: false })
      });
    }, 1000);

    // Auto refresh all data every 1 minute
    const refreshTimer = setInterval(() => {
      fetchData();
    }, 60000);

    return () => {
      clearInterval(worldTimer);
      clearInterval(refreshTimer);
    };
  }, []);

  const fetchData = async () => {
    // 1. Fetch Real Market Data
    try {
      const mRes = await fetch('/api/market', { cache: 'no-store' });
      const mData = await mRes.json();
      if (mData.success) {
        setMarketData(prev => {
          const newTrends = { ...prev.trends };
          if (mData.rates?.usd) newTrends.usd = mData.rates.usd >= prev.usd ? 'up' : 'down';
          if (mData.rates?.cny) newTrends.cny = mData.rates.cny >= prev.cny ? 'up' : 'down';

          // Metal trends based on prevClose from API
          if (mData.metals) {
            Object.entries(mData.metals).forEach(([key, val]) => {
              if (val && val.last && val.prevClose) {
                newTrends[key] = val.last >= val.prevClose ? 'up' : 'down';
              }
            });
          }

          return {
            ...prev,
            usd: mData.rates?.usd || prev.usd,
            cny: mData.rates?.cny || prev.cny,
            metals: mData.metals || prev.metals,
            trends: newTrends
          };
        });
      }
    } catch (err) {
      console.error("Market data fetch failed", err);
    }

    // 3. Real Incheon Port Status Fetch
    try {
      const res = await fetch('/api/incheon/congestion');
      const json = await res.json();

      if (json.success && Array.isArray(json.data) && json.data.length > 0) {
        // Use the time from the first record as overall update time
        const updateTime = json.data[0].trafficTime || json.data[0].regdate || '';
        if (updateTime) setPortLastUpdated(updateTime.split(' ')[1] || updateTime);

        setHubs(prev => prev.map((hub) => {
          // Find matching data in API response
          const match = json.data.find(d => {
            const apiNm = (d.termName || d.trmnlNm || '').toUpperCase();
            const hubNm = hub.name.toUpperCase();
            return hubNm.includes(apiNm) || apiNm.includes(hubNm.substr(0, 2)) ||
              (hubNm.includes('인천') && apiNm.includes('ICT')) ||
              (hubNm.includes('한진') && apiNm.includes('HJIT')) ||
              (hubNm.includes('선광') && apiNm.includes('SNCT'));
          });

          if (match) {
            const level = (match.trafficStatus || match.cgstLevel || '').toUpperCase();
            let status = 'Smooth';
            let color = '#ecfdf5'; // Green bg
            let textColor = '#059669'; // Green text

            if (level === 'R' || level.includes('혼잡') || level.includes('포화')) {
              status = 'Congested';
              color = '#fee2e2'; // Red bg
              textColor = '#dc2626'; // Red text
            } else if (level === 'Y' || level === 'M' || level.includes('보통')) {
              status = 'Moderate';
              color = '#fffbeb'; // Yellow bg
              textColor = '#d97706'; // Yellow text
            } else if (level === 'B' || level === 'G' || level.includes('원활')) {
              status = 'Smooth';
              color = '#ecfdf5';
              textColor = '#059669';
            }

            return { ...hub, status, color, textColor };
          }
          return hub;
        }));
      }
    } catch (err) {
      console.error("Port status fetch failed", err);
    }

    // 2. Fetch Catalog Products form Supabase
    try {
      const products = await getProducts();
      setCatalogData(products);

      const noticeList = await getNotices();
      setNotices(noticeList);

      // 3. Fetch Market History
      const hRes = await fetch('/api/market/history');
      const hData = await hRes.json();
      if (Array.isArray(hData)) {
        setHistoryData(hData);
      }

      fetch('/api/news')
        .then(res => res.json())
        .then(data => setNews(data.news || []))
        .catch(err => console.error("News fetch error", err));

    } catch (e) {
      console.error("Failed to load data", e);
    }
  };

  const handleTrack = async () => {
    if (!trackingNo) return;
    setIsTracking(true);
    setTrackResult(null);
    try {
      const res = await fetch(`/api/incheon/tracking?blNo=${trackingNo}`);
      const data = await res.json();
      if (data.success) {
        setTrackResult(data); // Stores { success, type, data, details }
      } else {
        setTrackResult({ error: data.error || 'No shipment found in UNIPASS for this B/L number.' });
      }
    } catch (err) {
      console.error(err);
      setTrackResult({ error: 'Satellite link failed. Please retry.' });
    } finally {
      setIsTracking(false);
    }
  };

  const addProduct = () => {
    setProducts([...products, { id: products.length + 1, name: `Product ${products.length + 1}`, length: '', width: '', height: '', qty: '' }]);
  };

  const handleInputChange = (id, field, value) => {
    setProducts(products.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const calculateCBM = () => {
    let totalCBM = 0;
    products.forEach(p => {
      const l = parseFloat(p.length) || 0;
      const w = parseFloat(p.width) || 0;
      const h = parseFloat(p.height) || 0;
      const q = parseFloat(p.qty) || 0;
      totalCBM += (l * w * h * q) / 1000000; // cm to m3
    });
    return totalCBM.toFixed(3);
  };

  if (!isMounted) return null;

  return (
    <div className={styles.layout}>
      {/* Sidebar */}
      <nav className={styles.sidebar}>
        <div className={styles.logoIcon}>Y</div>
        <div className={`${styles.navItem} ${activeTab === 'Overview' && styles.navItemActive}`} onClick={() => setActiveTab('Overview')} title="Overview">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
        </div>
        <div className={`${styles.navItem} ${activeTab === 'Analytics' && styles.navItemActive}`} onClick={() => setActiveTab('Analytics')} title="Analytics">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
        </div>
        <div className={`${styles.navItem} ${activeTab === 'Library' && styles.navItemActive}`} onClick={() => router.push('/library')} title="Library">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
        </div>
        <div className={styles.navItem} onClick={() => setShowTrackingModal(true)} title="Global Tracking">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>
        </div>

        {/* YNK ERP Link */}
        <a href="/erp" target="_blank" rel="noopener noreferrer" className={styles.navItem} title="Go to ERP" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div style={{ fontWeight: 700, fontSize: '0.7rem', border: '2px solid currentColor', borderRadius: '4px', padding: '2px 4px' }}>ERP</div>
        </a>

        <div className={styles.sidebarBottom}>
          <div className={styles.navItem} onClick={() => setShowSettings(true)} title="Settings">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
          </div>
          <a href="/admin" className={styles.userAvatar} style={{ display: 'block' }}>
            <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="User" style={{ width: '100%', height: '100%', borderRadius: '50%' }} />
          </a>
        </div>
      </nav>

      {/* Main Content */}
      <main className={styles.contentWrapper}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.sectionTitle} style={{ margin: 0 }}>YNK Global Intelligence</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Real-time Logistics & Market Terminal</p>
          </div>

          <div className={styles.headerActions}>
            <div className={styles.circleBtn} title="Notifications">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
            </div>
          </div>
        </header>

        <div className={styles.dashboardGrid}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

            {/* 0. Notices & News Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
              {/* Notices */}
              <div className={styles.card} style={{ padding: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <div style={{ padding: '6px', background: '#ecfdf5', borderRadius: '8px', color: '#10b981' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                  </div>
                  <h2 className={styles.cardTitle} style={{ fontSize: '1.1rem', margin: 0 }}>Notice Board</h2>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {notices.length === 0 ? (
                    <div style={{ color: '#94a3b8', fontSize: '0.9rem' }}>No active notices.</div>
                  ) : (
                    notices.map((notice, i) => (
                      <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', paddingBottom: '12px', borderBottom: i === notices.length - 1 ? 'none' : '1px solid #f1f5f9' }}>
                        <div style={{ minWidth: '4px', height: '4px', background: '#ef4444', borderRadius: '50%', marginTop: '8px' }}></div>
                        <div>
                          <div style={{ fontSize: '0.9rem', lineHeight: '1.5' }}>{notice.content}</div>
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>{new Date(notice.created_at).toLocaleDateString()}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* News (ETNews) */}
              <div className={styles.card} style={{ padding: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <div style={{ padding: '6px', background: '#eff6ff', borderRadius: '8px', color: '#3b82f6' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
                  </div>
                  <h2 className={styles.cardTitle} style={{ fontSize: '1.1rem', margin: 0 }}>Electronic Times (ETNews)</h2>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {news.length === 0 ? (
                    <div style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Loading news...</div>
                  ) : (
                    news.map((item, i) => (
                      <a key={i} href={item.link} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', gap: '12px', alignItems: 'flex-start', paddingBottom: '12px', borderBottom: i === news.length - 1 ? 'none' : '1px solid #f1f5f9', cursor: 'pointer' }}>
                        <div style={{ minWidth: '60px', fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px', textAlign: 'right' }}>{item.date && item.date.substring(5)}</div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 500, lineHeight: '1.4' }} className={styles.newsTitle}>{item.title}</div>
                      </a>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* 1. World Clock Banner */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
              <div className={styles.card} style={{ padding: '20px', background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white' }}>
                <div style={{ fontSize: '0.8rem', opacity: 0.9, marginBottom: '8px' }}>SEOUL (HQ)</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{times.korea}</div>
              </div>
              <div className={styles.card} style={{ padding: '20px', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: 'white' }}>
                <div style={{ fontSize: '0.8rem', opacity: 0.9, marginBottom: '8px' }}>SHANGHAI</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{times.china}</div>
              </div>
              <div className={styles.card} style={{ padding: '20px', background: 'linear-gradient(135deg, #f97316, #ea580c)', color: 'white' }}>
                <div style={{ fontSize: '0.8rem', opacity: 0.9, marginBottom: '8px' }}>HO CHI MINH</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{times.vietnam}</div>
              </div>
            </div>

            {/* 2. Market Overview */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>Global Market Trends</h2>
                <button
                  onClick={() => setShowMarketModal(true)}
                  style={{ fontSize: '0.8rem', color: 'var(--accent-primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Detailed View →</button>
              </div>

              <div className={styles.marketGrid}>
                {/* Exchange Rates */}
                <div className={styles.marketCard}>
                  <div className={styles.marketLabel}><span style={{ fontSize: '1.2rem' }}>🇺🇸</span> USD/KRW</div>
                  <div className={styles.marketVal}>{marketData.usd.toFixed(2)}</div>
                  <div className={`${styles.trendTag} ${marketData.trends.usd === 'up' ? styles.trendUp : styles.trendDown}`}>
                    {marketData.trends.usd === 'up' ? '▲' : '▼'} 0.4%
                  </div>
                </div>
                <div className={styles.marketCard}>
                  <div className={styles.marketLabel}><span style={{ fontSize: '1.2rem' }}>🇨🇳</span> CNY/KRW</div>
                  <div className={styles.marketVal}>{marketData.cny.toFixed(2)}</div>
                  <div className={`${styles.trendTag} ${marketData.trends.cny === 'up' ? styles.trendUp : styles.trendDown}`}>
                    {marketData.trends.cny === 'up' ? '▲' : '▼'} 0.1%
                  </div>
                </div>

                {/* Raw Materials - Now Interactive */}
                <div className={styles.marketCard} style={{ gridColumn: 'span 2' }}>
                  <div className={styles.marketLabel}><span style={{ fontSize: '1.2rem' }}>🏗️</span> Raw Materials (LME)</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px', marginTop: '8px' }}>
                    {marketData.metals && Object.entries(marketData.metals).map(([key, val]) => (
                      <div key={key} style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'capitalize' }}>{key}</div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>
                          ${(typeof val === 'object' ? val?.last : val)?.toLocaleString() || '---'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Interactive Chart Section */}
              <div style={{ marginTop: '20px', borderTop: '1px solid #f1f5f9', paddingTop: '20px' }}>
                <MarketChart
                  marketData={marketData}
                  historyData={historyData}
                  selectedMetal={selectedMetal}
                  setSelectedMetal={setSelectedMetal}
                  selectedCurrency={selectedCurrency}
                  setSelectedCurrency={setSelectedCurrency}
                />
              </div>
            </div>

            {/* 3. Product Catalog (Portfolio) */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>YNK Product Portfolio</h2>
                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{catalogData.length} Items Indexed</span>
              </div>
              <div className={styles.categoryGrid}>
                {catalogData.length === 0 ? (
                  <div style={{ gridColumn: 'span 2', textAlign: 'center', padding: '40px', color: '#cbd5e1' }}>
                    No products registered yet. Check Admin Panel.
                  </div>
                ) : (
                  catalogData.map(product => (
                    <div key={product.id} className={styles.catBtn} onClick={() => setSelectedProduct(product)}>
                      <div className={styles.catIcon} style={{ background: '#f1f5f9', overflow: 'hidden' }}>
                        <img src={product.image} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => e.target.src = 'https://picsum.photos/400/300?blur=5'} />
                      </div>
                      <div>
                        <div style={{ fontSize: '0.95rem', fontWeight: 600 }}>{product.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{product.description}</div>
                      </div>
                      <div style={{ marginLeft: 'auto', color: '#cbd5e1' }}>→</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className={styles.rightSidebar} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

            {/* CBM Calculator Widget */}
            <div className={styles.statCard} style={{ border: '2px solid var(--accent-primary)' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', color: 'var(--accent-primary)' }}>📦 CBM Calculator</h3>
              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {products.map(p => (
                  <div key={p.id} style={{ marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>{p.name}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' }}>
                      <input type="number" placeholder="L (cm)" className={styles.input} style={{ width: '100%', padding: '4px', border: '1px solid #e2e8f0', borderRadius: '4px' }} value={p.length} onChange={(e) => handleInputChange(p.id, 'length', e.target.value)} />
                      <input type="number" placeholder="W (cm)" className={styles.input} style={{ width: '100%', padding: '4px', border: '1px solid #e2e8f0', borderRadius: '4px' }} value={p.width} onChange={(e) => handleInputChange(p.id, 'width', e.target.value)} />
                      <input type="number" placeholder="H (cm)" className={styles.input} style={{ width: '100%', padding: '4px', border: '1px solid #e2e8f0', borderRadius: '4px' }} value={p.height} onChange={(e) => handleInputChange(p.id, 'height', e.target.value)} />
                      <input type="number" placeholder="Qty" className={styles.input} style={{ width: '100%', padding: '4px', border: '1px solid #e2e8f0', borderRadius: '4px' }} value={p.qty} onChange={(e) => handleInputChange(p.id, 'qty', e.target.value)} />
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={addProduct} style={{ width: '100%', padding: '8px', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '8px', color: '#64748b', cursor: 'pointer', marginBottom: '16px' }}>+ Add Item</button>

              <div style={{ background: '#f5f3ff', padding: '16px', borderRadius: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.8rem', color: '#7c3aed' }}>Total Volume</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#7c3aed' }}>{calculateCBM()} <span style={{ fontSize: '0.9rem' }}>m³</span></div>
                <div style={{ fontSize: '0.7rem', color: '#8b5cf6', marginTop: '4px' }}>
                  Est. 20ft Container: {((calculateCBM() / 28) * 100).toFixed(1)}%
                </div>
              </div>
            </div>

            {/* Incheon Port Status Widget */}
            <div className={styles.statCard} style={{ border: '2px solid var(--accent-blue)' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', color: 'var(--accent-blue)' }}>🚢 Incheon Port Status</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {hubs.map(hub => (
                  <div key={hub.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: hub.color, borderRadius: '8px' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{hub.name}</span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: hub.textColor }}>{hub.status}</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: '16px', fontSize: '0.75rem', color: '#94a3b8', textAlign: 'center' }}>
                {portLastUpdated && <div style={{ marginBottom: '4px' }}>Last Update: {portLastUpdated}</div>}
                Real-time congestion data powered by OPUS
              </div>
            </div>

            {/* Tracking Widget */}
            <div className={styles.statCard}>
              <h3 style={{ fontSize: '1rem', marginBottom: '16px' }}>Quick Tracking</h3>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                <input
                  type="text"
                  placeholder="BL / Container No."
                  value={trackingNo}
                  onChange={(e) => setTrackingNo(e.target.value)}
                  style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc' }}
                />
                <button
                  onClick={handleTrack}
                  disabled={isTracking}
                  style={{ padding: '0 16px', background: '#1a1a1a', color: 'white', borderRadius: '8px', border: 'none', cursor: 'pointer' }}
                >
                  {isTracking ? '...' : 'Go'}
                </button>
              </div>
              {trackResult && (
                <div style={{ padding: '12px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                  <div style={{ color: '#166534', fontWeight: 600, fontSize: '0.9rem' }}>{trackResult.status}</div>
                  <div style={{ fontSize: '0.8rem', color: '#15803d', marginTop: '4px' }}>Currently at {trackResult.location}</div>
                  <div style={{ fontSize: '0.8rem', color: '#15803d' }}>ETA: {trackResult.eta}</div>
                </div>
              )}
            </div>

          </div>
        </div>
      </main>

      {/* Modal for Product Details */}
      {selectedProduct && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setSelectedProduct(null)}>
          <div className={styles.card} style={{ maxWidth: '600px', width: '90%', maxHeight: '90vh', overflowY: 'auto', animation: 'fadeIn 0.2s ease-out' }} onClick={e => e.stopPropagation()}>
            <div style={{ position: 'sticky', top: 0, background: 'white', zIndex: 1, paddingBottom: '16px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 className={styles.cardTitle} style={{ fontSize: '1.5rem', margin: 0 }}>{selectedProduct.name}</h2>
              <button onClick={() => setSelectedProduct(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>

            <div style={{ width: '100%', height: '300px', background: '#f8fafc', borderRadius: '16px', marginBottom: '24px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
              <img src={selectedProduct.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} onError={(e) => e.target.src = 'https://picsum.photos/600/400?blur=5'} />
            </div>

            <div style={{ marginBottom: '32px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '16px', color: '#1e293b', borderLeft: '4px solid var(--accent-purple)', paddingLeft: '12px' }}>제품 스펙 (Product Specs)</h3>
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                  <tbody>
                    {[
                      { label: '품번 (Part No)', key: 'partNo' },
                      { label: '모델명 (Model Name)', key: 'modelName' },
                      { label: '색온도 (Color Temp)', key: 'colorTemp', unit: 'K' },
                      { label: '소비전력 (Power)', key: 'powerConsumption', unit: 'W' },
                      { label: '입력전압 (Input Voltage)', key: 'inputVoltage', unit: 'V' },
                      { label: '역률 (Power Factor)', key: 'powerFactor' },
                      { label: '총광속 (Luminous Flux)', key: 'luminousFlux', unit: 'lm' },
                      { label: '연색성 (CRI)', key: 'criRa', unit: 'Ra' },
                      { label: '외형치수 (Dimensions)', key: 'dimensions', unit: 'mm' },
                      { label: '무게 (Weight)', key: 'weight', unit: 'g' },
                      { label: '인증 (Certifications)', key: 'cert' }
                    ].map((row, i) => (
                      <tr key={row.key} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 600, color: '#64748b', width: '40%', background: '#f1f5f9' }}>{row.label}</td>
                        <td style={{ padding: '12px 16px', color: '#1e293b' }}>
                          {selectedProduct.specs?.[row.key] ? (
                            `${selectedProduct.specs[row.key]}${row.unit ? ` ${row.unit}` : ''}`
                          ) : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {selectedProduct.specs?.remarks && (
                <div style={{ marginTop: '20px', padding: '16px', background: '#fffbeb', borderRadius: '12px', border: '1px solid #fef3c7' }}>
                  <div style={{ fontWeight: 700, color: '#d97706', fontSize: '0.85rem', marginBottom: '4px' }}>비고 (Remarks)</div>
                  <div style={{ fontSize: '0.9rem', color: '#92400e', whiteSpace: 'pre-wrap' }}>{selectedProduct.specs.remarks}</div>
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {(selectedProduct.specs?.certificate || selectedProduct.specs?.certLink) && (
                <a
                  href={selectedProduct.specs.certificate || selectedProduct.specs.certLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.catBtn}
                  style={{ background: '#f0fdf4', color: '#15803d', justifyContent: 'center', border: '1px solid #bbf7d0', textDecoration: 'none', padding: '14px', borderRadius: '12px', fontWeight: 600 }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                  Certificates
                </a>
              )}
              {selectedProduct.specs?.specSheet && (
                <a
                  href={selectedProduct.specs.specSheet}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.catBtn}
                  style={{ background: '#eff6ff', color: '#1d4ed8', justifyContent: 'center', border: '1px solid #bfdbfe', textDecoration: 'none', padding: '14px', borderRadius: '12px', fontWeight: 600 }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                  Spec Sheet
                </a>
              )}
            </div>

            <button className={styles.catBtn} style={{ width: '100%', marginTop: '32px', background: '#1a1a1a', color: 'white', justifyContent: 'center', height: '50px', borderRadius: '12px', fontSize: '1rem' }} onClick={() => setSelectedProduct(null)}>Close Terminal View</button>
          </div>
        </div>
      )}
      {/* Modal for Settings */}
      {showSettings && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowSettings(false)}>
          <div className={styles.card} style={{ maxWidth: '500px', width: '90%', animation: 'fadeIn 0.2s ease-out' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 className={styles.cardTitle} style={{ fontSize: '1.5rem', margin: 0 }}>System Options</h2>
              <button
                onClick={() => setShowSettings(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', color: 'var(--text-muted)' }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Profile Section */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', paddingBottom: '24px', borderBottom: '1px solid #e2e8f0' }}>
                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#e4e4e7' }} alt="User" />
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>Administrator</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: '4px 0 0 0' }}>admin@ynk-global.com</p>
                </div>
                <button style={{ marginLeft: 'auto', padding: '8px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', background: 'white', fontWeight: 600, fontSize: '0.85rem' }}>Edit Profile</button>
              </div>

              {/* Preferences */}
              <div>
                <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '16px', textTransform: 'uppercase' }}>Preferences</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#f5f3ff', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
                      </div>
                      <span style={{ fontWeight: 500 }}>Dark Mode</span>
                    </div>
                    <div
                      style={{ width: '44px', height: '24px', background: darkMode ? '#3b82f6' : '#e2e8f0', borderRadius: '12px', position: 'relative', cursor: 'pointer', transition: 'background 0.2s' }}
                      onClick={() => setDarkMode(!darkMode)}
                    >
                      <div style={{ width: '20px', height: '20px', background: 'white', borderRadius: '50%', position: 'absolute', top: '2px', left: darkMode ? '22px' : '2px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', transition: 'left 0.2s' }}></div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#ecfdf5', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                      </div>
                      <span style={{ fontWeight: 500 }}>Notifications</span>
                    </div>
                    <div
                      style={{ width: '44px', height: '24px', background: notifications ? '#10b981' : '#e2e8f0', borderRadius: '12px', position: 'relative', cursor: 'pointer', transition: 'background 0.2s' }}
                      onClick={() => setNotifications(!notifications)}
                    >
                      <div style={{ width: '20px', height: '20px', background: 'white', borderRadius: '50%', position: 'absolute', top: '2px', left: notifications ? '22px' : '2px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', transition: 'left 0.2s' }}></div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#fff7ed', color: '#f97316', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10z"></path></svg>
                      </div>
                      <span style={{ fontWeight: 500 }}>Language</span>
                    </div>
                    <select style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '4px 8px', fontSize: '0.85rem', background: 'transparent' }}>
                      <option>English</option>
                      <option>한국어</option>
                      <option>中文</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Data Settings */}
              <div>
                <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '16px', textTransform: 'uppercase' }}>Data Source</h4>
                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Real-time Feed</span>
                    <span style={{ color: '#10b981', fontWeight: 700, fontSize: '0.8rem' }}>CONNECTED</span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Latency: 45ms • Server: Asia-Northeast-2a
                  </div>
                </div>
              </div>
            </div>

            <button
              className={styles.catBtn}
              style={{ width: '100%', marginTop: '30px', background: '#1a1a1a', color: 'white', justifyContent: 'center' }}
              onClick={() => { alert('Settings Saved'); setShowSettings(false); }}
            >
              Save Changes
            </button>
          </div>
        </div>
      )}

      {/* Modal for Large Market Chart */}
      {showMarketModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowMarketModal(false)}>
          <div className={styles.card} style={{ maxWidth: '900px', width: '95%', height: '80vh', display: 'flex', flexDirection: 'column', animation: 'fadeIn 0.3s ease-out' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <h2 className={styles.cardTitle} style={{ fontSize: '1.8rem', margin: 0 }}>Market Intelligence</h2>
                <p style={{ color: 'var(--text-muted)', margin: '4px 0 0 0' }}>Detailed historical data and real-time trends</p>
              </div>
              <button
                onClick={() => setShowMarketModal(false)}
                style={{ background: '#f1f5f9', border: 'none', cursor: 'pointer', padding: '12px', borderRadius: '50%', color: 'var(--text-muted)' }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>

            <div style={{ flex: 1, minHeight: 0 }}>
              <MarketChart
                marketData={marketData}
                historyData={historyData}
                selectedMetal={selectedMetal}
                setSelectedMetal={setSelectedMetal}
                selectedCurrency={selectedCurrency}
                setSelectedCurrency={setSelectedCurrency}
              />
            </div>

            <div style={{ marginTop: '24px', padding: '20px', background: '#f8fafc', borderRadius: '16px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
              <div className={styles.marketCard}>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Volatility (30d)</div>
                <div style={{ fontWeight: 700 }}>Low (±0.4%)</div>
              </div>
              <div className={styles.marketCard}>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Latest Update</div>
                <div style={{ fontWeight: 700 }}>Real-time</div>
              </div>
              <div className={styles.marketCard}>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Source</div>
                <div style={{ fontWeight: 700 }}>LME / KRX</div>
              </div>
              <div className={styles.marketCard}>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Signal</div>
                <div style={{ fontWeight: 700, color: '#10b981' }}>Strong Buy</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal for Global Tracking */}
      {showTrackingModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowTrackingModal(false)}>
          <div className={styles.card} style={{ maxWidth: '800px', width: '95%', maxHeight: '90vh', overflowY: 'auto', animation: 'fadeIn 0.3s ease-out' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 className={styles.cardTitle} style={{ fontSize: '1.8rem', margin: 0 }}>Global Logistics Tracking</h2>
              <button
                onClick={() => setShowTrackingModal(false)}
                style={{ background: '#f1f5f9', border: 'none', cursor: 'pointer', padding: '12px', borderRadius: '50%', color: 'var(--text-muted)' }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
              <input
                type="text"
                placeholder="Enter MBL or HBL Number..."
                value={trackingNo}
                onChange={(e) => setTrackingNo(e.target.value)}
                style={{ flex: 1, padding: '16px', borderRadius: '12px', border: '2px solid #e2e8f0', fontSize: '1rem', outline: 'none' }}
              />
              <button
                onClick={handleTrack}
                disabled={isTracking}
                style={{ padding: '0 32px', background: '#1a1a1a', color: 'white', borderRadius: '12px', fontWeight: 600, border: 'none', cursor: 'pointer' }}
              >
                {isTracking ? 'Searching...' : 'Track'}
              </button>
            </div>

            {trackResult ? (
              trackResult.error ? (
                <div style={{ padding: '24px', background: '#fee2e2', borderRadius: '16px', color: '#b91c1c', textAlign: 'center' }}>
                  {trackResult.error}
                </div>
              ) : (
                <div style={{ background: '#f8fafc', borderRadius: '20px', padding: '32px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '1.2rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '1.5rem' }}>{trackResult.type === 'IMPORT' ? '🇰🇷' : '🚢'}</span>
                      UNIPASS {trackResult.type} Tracking
                    </h3>
                    <span style={{ background: trackResult.type === 'IMPORT' ? 'var(--accent-purple)' : '#10b981', color: 'white', padding: '6px 16px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 700 }}>
                      {trackResult.type === 'IMPORT' ? (trackResult.data.csclPrgsStts || 'Active') : (trackResult.data.shpmcmplYn === 'Y' ? 'SHIPPED' : 'IN PROGRESS')}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '32px' }}>
                    {trackResult.type === 'IMPORT' ? (
                      <>
                        <div className={styles.marketCard}><strong>B/L No.</strong> <span>{trackResult.data.hblNo || trackResult.data.mblNo}</span></div>
                        <div className={styles.marketCard}><strong>Vessel</strong> <span>{trackResult.data.shipNm || 'N/A'}</span></div>
                        <div className={styles.marketCard}><strong>Loading Port</strong> <span>{trackResult.data.ldprNm || 'N/A'}</span></div>
                        <div className={styles.marketCard}><strong>Discharge Port</strong> <span>{trackResult.data.dsprNm || 'N/A'}</span></div>
                        <div className={styles.marketCard}><strong>Weight</strong> <span>{trackResult.data.ttwg} {trackResult.data.wghtUt}</span></div>
                        <div className={styles.marketCard}><strong>Customs</strong> <span>{trackResult.data.etprCstm || 'N/A'}</span></div>
                      </>
                    ) : (
                      <>
                        <div className={styles.marketCard}><strong>B/L No.</strong> <span>{trackingNo}</span></div>
                        <div className={styles.marketCard}><strong>Declaration No</strong> <span>{trackResult.data.expDclrNo}</span></div>
                        <div className={styles.marketCard}><strong>Loading Place</strong> <span>{trackResult.data.shpmAirptPortNm || 'N/A'}</span></div>
                        <div className={styles.marketCard}><strong>Departure Date</strong> <span>{trackResult.data.tkofDt || 'PENDING'}</span></div>
                        <div className={styles.marketCard} style={{ gridColumn: 'span 2' }}><strong>Exporter</strong> <span>{trackResult.data.exppnConm || 'N/A'}</span></div>
                      </>
                    )}
                  </div>

                  {/* Timeline for Import */}
                  {trackResult.type === 'IMPORT' && trackResult.details && (
                    <div style={{ marginTop: '24px' }}>
                      <h4 style={{ fontSize: '1rem', marginBottom: '16px', color: '#64748b' }}>Process Timeline</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {trackResult.details.slice(0, 5).map((detail, i) => (
                          <div key={i} style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '4px' }}>
                              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: i === 0 ? 'var(--accent-purple)' : '#cbd5e1' }}></div>
                              {i < 4 && <div style={{ width: '2px', height: '30px', background: '#f1f5f9' }}></div>}
                            </div>
                            {(() => {
                              const getV = (f) => {
                                const v = (detail[f] || detail[f.toUpperCase()] || detail[f.toLowerCase()]);
                                if (!v) return null;
                                return typeof v === 'object' ? (v['#text'] || v['content'] || JSON.stringify(v)) : String(v);
                              };

                              // Manual (API001) compliant fields:
                              // Status: cargTrcnRelaBsopTpcd (Processing ID Name) or rlbrCn (Content)
                              const status = getV('cargTrcnRelaBsopTpcd') || getV('rlbrCn') || getV('prgsSttsNm') || '진행상태';
                              // Date: prcsDttm (Process Date/Time) or rlbrDttm
                              const rawDt = String(getV('prcsDttm') || getV('rlbrDttm') || getV('prgsDt') || '');
                              // Location: shedNm (Shed/Warehouse Name)
                              const location = getV('shedNm') || getV('prgsLocation') || '관세구역';
                              const dclNo = getV('dclNo') || getV('mblNo');

                              const formattedDt = rawDt.length >= 12
                                ? `${rawDt.substring(0, 4)}-${rawDt.substring(4, 6)}-${rawDt.substring(6, 8)} ${rawDt.substring(8, 10)}:${rawDt.substring(10, 12)}`
                                : rawDt || 'Date N/A';

                              return (
                                <div>
                                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1e293b' }}>
                                    {status}
                                  </div>
                                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                                    {formattedDt} • {location}
                                  </div>
                                  {dclNo && (
                                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '2px' }}>
                                      신고번호/관리번호: {dclNo}
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            ) : (
              <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '16px', opacity: 0.5 }}><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>
                <p>Waiting for shipment tracking number...</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

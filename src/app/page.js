'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import styles from './page.module.css';
import MarketChart from '@/components/MarketChart';
import LibraryModal from '@/components/LibraryModal';

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
  const [showLibraryModal, setShowLibraryModal] = useState(false);

  // Tools expansion state
  const [expandedTool, setExpandedTool] = useState(null);

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
        setTrackResult(data);
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
        <div className={`${styles.navItem} ${activeTab === 'Library' && styles.navItemActive}`} onClick={() => setShowLibraryModal(true)} title="Library">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
        </div>
        <div className={styles.navItem} onClick={() => setShowMarketModal(true)} title="Market Charts">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
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
            <div style={{ display: 'flex', gap: '20px', marginTop: '8px', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#64748b' }}>
                <span style={{ fontSize: '1.1rem' }}>🇰🇷</span>
                <span style={{ fontWeight: 600, color: '#10b981' }}>{times.korea}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#64748b' }}>
                <span style={{ fontSize: '1.1rem' }}>🇨🇳</span>
                <span style={{ fontWeight: 600, color: '#3b82f6' }}>{times.china}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#64748b' }}>
                <span style={{ fontSize: '1.1rem' }}>🇻🇳</span>
                <span style={{ fontWeight: 600, color: '#f97316' }}>{times.vietnam}</span>
              </div>
            </div>
          </div>

          <div className={styles.headerActions}>
            <div className={styles.circleBtn} title="Notifications">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
            </div>
          </div>
        </header>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 32px 32px' }}>

          {/* 🌟 HERO: Global Market Trends */}
          <div className={styles.card} style={{ marginBottom: '24px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', border: 'none' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, marginBottom: '4px' }}>Global Market Trends</h2>
                <p style={{ opacity: 0.9, fontSize: '0.9rem', margin: 0 }}>Real-time Exchange Rates & Raw Material Prices</p>
              </div>
              <button
                onClick={() => setShowMarketModal(true)}
                style={{ fontSize: '0.85rem', color: 'white', background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, backdropFilter: 'blur(10px)' }}>
                Detailed View →
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
              {/* USD/KRW */}
              <div style={{ padding: '16px', background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.2)' }}>
                <div style={{ fontSize: '0.75rem', opacity: 0.8, marginBottom: '4px' }}>🇺🇸 USD/KRW</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 700 }}>{marketData.usd.toFixed(2)}</div>
                <div style={{ fontSize: '0.75rem', marginTop: '4px', opacity: 0.9 }}>{marketData.trends.usd === 'up' ? '▲' : '▼'} 0.4%</div>
              </div>

              {/* CNY/KRW */}
              <div style={{ padding: '16px', background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.2)' }}>
                <div style={{ fontSize: '0.75rem', opacity: 0.8, marginBottom: '4px' }}>🇨🇳 CNY/KRW</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 700 }}>{marketData.cny.toFixed(2)}</div>
                <div style={{ fontSize: '0.75rem', marginTop: '4px', opacity: 0.9 }}>{marketData.trends.cny === 'up' ? '▲' : '▼'} 0.1%</div>
              </div>

              {/* Metals */}
              {marketData.metals && Object.entries(marketData.metals).map(([key, val]) => (
                <div key={key} style={{ padding: '16px', background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.2)' }}>
                  <div style={{ fontSize: '0.75rem', opacity: 0.8, marginBottom: '4px', textTransform: 'capitalize' }}>🏗️ {key}</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 700 }}>${(typeof val === 'object' ? val?.last : val)?.toLocaleString() || '---'}</div>
                  <div style={{ fontSize: '0.75rem', marginTop: '4px', opacity: 0.9 }}>{marketData.trends[key] === 'up' ? '▲' : '▼'}</div>
                </div>
              ))}
            </div>

            {/* Interactive Chart */}
            <div style={{ marginTop: '20px', padding: '20px', background: 'rgba(255,255,255,0.1)', borderRadius: '12px', backdropFilter: 'blur(10px)' }}>
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

          {/* Grid Layout: 2 columns */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>

            {/* Left Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

              {/* Notices */}
              <div className={styles.card}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <div style={{ padding: '6px', background: '#ecfdf5', borderRadius: '8px', color: '#10b981' }}>
                    📢
                  </div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>Notice Board</h3>
                  <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: '#94a3b8' }}>Latest 3</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {notices.length === 0 ? (
                    <div style={{ color: '#94a3b8', fontSize: '0.9rem', textAlign: 'center', padding: '20px' }}>No active notices.</div>
                  ) : (
                    notices.slice(0, 3).map((notice, i) => (
                      <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', paddingBottom: '12px', borderBottom: i === 2 ? 'none' : '1px solid #f1f5f9' }}>
                        <div style={{ minWidth: '4px', height: '4px', background: '#ef4444', borderRadius: '50%', marginTop: '8px' }}></div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '0.9rem', lineHeight: '1.5' }}>{notice.content}</div>
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>{new Date(notice.created_at).toLocaleDateString('ko-KR')}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* News (ETNews) */}
              <div className={styles.card}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <div style={{ padding: '6px', background: '#eff6ff', borderRadius: '8px', color: '#3b82f6' }}>
                    📰
                  </div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>Electronic Times (ETNews)</h3>
                  <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: '#94a3b8' }}>Latest 3</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {news.length === 0 ? (
                    <div style={{ color: '#94a3b8', fontSize: '0.9rem', textAlign: 'center', padding: '20px' }}>Loading news...</div>
                  ) : (
                    news.slice(0, 3).map((item, i) => (
                      <a key={i} href={item.link} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', gap: '12px', alignItems: 'flex-start', paddingBottom: '12px', borderBottom: i === 2 ? 'none' : '1px solid #f1f5f9', cursor: 'pointer' }}>
                        <div style={{ minWidth: '60px', fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px', textAlign: 'right' }}>{item.date && item.date.substring(5)}</div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 500, lineHeight: '1.4', flex: 1 }} className={styles.newsTitle}>{item.title}</div>
                      </a>
                    ))
                  )}
                </div>
              </div>

              {/* Incheon Port Status */}
              <div className={styles.card} style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white', border: 'none' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  🚢 Incheon Port Live Status
                  {portLastUpdated && <span style={{ fontSize: '0.75rem', opacity: 0.8, marginLeft: 'auto' }}>Updated: {portLastUpdated}</span>}
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {hubs.map(hub => (
                    <div key={hub.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.3)' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{hub.name}</span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '4px 12px', borderRadius: '6px', background: hub.color, color: hub.textColor }}>{hub.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

              {/* Product Portfolio */}
              <div className={styles.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>YNK Product Portfolio</h3>
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{catalogData.length} Items</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', maxHeight: '400px', overflowY: 'auto' }}>
                  {catalogData.length === 0 ? (
                    <div style={{ gridColumn: 'span 2', textAlign: 'center', padding: '40px', color: '#cbd5e1' }}>
                      No products registered yet.
                    </div>
                  ) : (
                    catalogData.map(product => (
                      <div key={product.id} className={styles.catBtn} onClick={() => setSelectedProduct(product)} style={{ padding: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s' }}>
                        <div style={{ width: '100%', height: '80px', background: '#f1f5f9', borderRadius: '8px', overflow: 'hidden', marginBottom: '8px' }}>
                          <img src={product.image} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => e.target.src = 'https://picsum.photos/400/300?blur=5'} />
                        </div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '2px' }}>{product.name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{product.description}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Tools Box */}
              <div className={styles.card} style={{ background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', border: 'none' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '16px', color: 'white' }}>🧰 Tool Box</h3>

                {/* Tool: CBM Calculator */}
                <div style={{ marginBottom: '12px', background: 'rgba(255,255,255,0.9)', borderRadius: '12px', overflow: 'hidden' }}>
                  <div
                    onClick={() => setExpandedTool(expandedTool === 'cbm' ? null : 'cbm')}
                    style={{ padding: '16px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 600 }}>
                    <span>📦 CBM Calculator</span>
                    <span>{expandedTool === 'cbm' ? '▲' : '▼'}</span>
                  </div>
                  {expandedTool === 'cbm' && (
                    <div style={{ padding: '16px', borderTop: '1px solid #e2e8f0' }}>
                      <div style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: '12px' }}>
                        {products.map(p => (
                          <div key={p.id} style={{ marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid #f1f5f9' }}>
                            <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px', color: '#64748b' }}>{p.name}</div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' }}>
                              <input type="number" placeholder="L (cm)" style={{ width: '100%', padding: '6px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.85rem' }} value={p.length} onChange={(e) => handleInputChange(p.id, 'length', e.target.value)} />
                              <input type="number" placeholder="W (cm)" style={{ width: '100%', padding: '6px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.85rem' }} value={p.width} onChange={(e) => handleInputChange(p.id, 'width', e.target.value)} />
                              <input type="number" placeholder="H (cm)" style={{ width: '100%', padding: '6px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.85rem' }} value={p.height} onChange={(e) => handleInputChange(p.id, 'height', e.target.value)} />
                              <input type="number" placeholder="Qty" style={{ width: '100%', padding: '6px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.85rem' }} value={p.qty} onChange={(e) => handleInputChange(p.id, 'qty', e.target.value)} />
                            </div>
                          </div>
                        ))}
                      </div>
                      <button onClick={addProduct} style={{ width: '100%', padding: '8px', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '8px', color: '#64748b', cursor: 'pointer', marginBottom: '12px', fontSize: '0.85rem' }}>+ Add Item</button>
                      <div style={{ background: '#f5f3ff', padding: '16px', borderRadius: '12px', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.8rem', color: '#7c3aed' }}>Total Volume</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#7c3aed' }}>{calculateCBM()} <span style={{ fontSize: '0.9rem' }}>m³</span></div>
                        <div style={{ fontSize: '0.7rem', color: '#8b5cf6', marginTop: '4px' }}>
                          Est. 20ft Container: {((calculateCBM() / 28) * 100).toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Tool: Quick Tracking */}
                <div style={{ background: 'rgba(255,255,255,0.9)', borderRadius: '12px', overflow: 'hidden' }}>
                  <div
                    onClick={() => setExpandedTool(expandedTool === 'tracking' ? null : 'tracking')}
                    style={{ padding: '16px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 600 }}>
                    <span>🔍 Quick Tracking</span>
                    <span>{expandedTool === 'tracking' ? '▲' : '▼'}</span>
                  </div>
                  {expandedTool === 'tracking' && (
                    <div style={{ padding: '16px', borderTop: '1px solid #e2e8f0' }}>
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
                  )}
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* Library Modal */}
      {showLibraryModal && <LibraryModal onClose={() => setShowLibraryModal(false)} />}

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
                  style={{ background: '#eff6ff', color: '#1e40af', justifyContent: 'center', border: '1px solid #bfdbfe', textDecoration: 'none', padding: '14px', borderRadius: '12px', fontWeight: 600 }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                  Spec Sheet
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowSettings(false)}>
          <div className={styles.card} style={{ maxWidth: '400px', width: '90%' }} onClick={e => e.stopPropagation()}>
            <h2 className={styles.cardTitle}>Settings</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Dark Mode</span>
                <button onClick={() => setDarkMode(!darkMode)} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', background: darkMode ? '#1a1a1a' : 'white', color: darkMode ? 'white' : '#1a1a1a', cursor: 'pointer' }}>
                  {darkMode ? 'ON' : 'OFF'}
                </button>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Notifications</span>
                <button onClick={() => setNotifications(!notifications)} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', background: notifications ? '#10b981' : 'white', color: notifications ? 'white' : '#1a1a1a', cursor: 'pointer' }}>
                  {notifications ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Market Modal */}
      {showMarketModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowMarketModal(false)}>
          <div className={styles.card} style={{ maxWidth: '800px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 className={styles.cardTitle}>Market Data Analysis</h2>
              <button onClick={() => setShowMarketModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
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
      )}

      {/* Tracking Modal */}
      {showTrackingModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowTrackingModal(false)}>
          <div className={styles.card} style={{ maxWidth: '600px', width: '90%' }} onClick={e => e.stopPropagation()}>
            <h2 className={styles.cardTitle}>Global Logistics Tracking</h2>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
              <input
                type="text"
                placeholder="Enter MBL or HBL Number..."
                value={trackingNo}
                onChange={(e) => setTrackingNo(e.target.value)}
                style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc' }}
              />
              <button
                onClick={handleTrack}
                disabled={isTracking}
                style={{ padding: '0 24px', background: '#1a1a1a', color: 'white', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600 }}
              >
                {isTracking ? 'Tracking...' : 'Track'}
              </button>
            </div>
            {trackResult && (
              <div style={{ padding: '20px', background: '#f0fdf4', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
                <div style={{ color: '#166534', fontWeight: 600, fontSize: '1.1rem', marginBottom: '8px' }}>{trackResult.status}</div>
                <div style={{ fontSize: '0.9rem', color: '#15803d', marginBottom: '4px' }}>Currently at {trackResult.location}</div>
                <div style={{ fontSize: '0.9rem', color: '#15803d' }}>ETA: {trackResult.eta}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

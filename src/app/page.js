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
        const updateTime = json.data[0].trafficTime || json.data[0].regdate || '';
        if (updateTime) setPortLastUpdated(updateTime.split(' ')[1] || updateTime);

        setHubs(prev => prev.map((hub) => {
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
            let color = '#f0fdf4';
            let textColor = '#16a34a';

            if (level === 'R' || level.includes('혼잡') || level.includes('포화')) {
              status = 'Congested';
              color = '#fef2f2';
              textColor = '#dc2626';
            } else if (level === 'Y' || level === 'M' || level.includes('보통')) {
              status = 'Moderate';
              color = '#fefce8';
              textColor = '#ca8a04';
            } else if (level === 'B' || level === 'G' || level.includes('원활')) {
              status = 'Smooth';
              color = '#f0fdf4';
              textColor = '#16a34a';
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
      totalCBM += (l * w * h * q) / 1000000;
    });
    return totalCBM.toFixed(3);
  };

  if (!isMounted) return null;

  return (
    <div className={styles.layout} style={{ background: '#fafafa' }}>
      {/* Sidebar */}
      <nav className={styles.sidebar} style={{ background: 'white', borderRight: '1px solid #e5e7eb' }}>
        <div className={styles.logoIcon} style={{ background: '#1a1a1a', color: 'white' }}>Y</div>
        <div className={`${styles.navItem} ${activeTab === 'Overview' && styles.navItemActive}`} onClick={() => setActiveTab('Overview')} title="Overview">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
        </div>
        <div className={`${styles.navItem} ${activeTab === 'Analytics' && styles.navItemActive}`} onClick={() => setActiveTab('Analytics')} title="Analytics">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
        </div>
        <div className={`${styles.navItem} ${activeTab === 'Library' && styles.navItemActive}`} onClick={() => setShowLibraryModal(true)} title="Library">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
        </div>
        <div className={styles.navItem} onClick={() => setShowMarketModal(true)} title="Market Charts">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
        </div>
        <div className={styles.navItem} onClick={() => setShowTrackingModal(true)} title="Global Tracking">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>
        </div>

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
      <main className={styles.contentWrapper} style={{ background: '#fafafa' }}>
        <header style={{ padding: '20px 32px', background: 'white', borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 600, margin: 0, color: '#1a1a1a', letterSpacing: '-0.02em' }}>YNK Global Intelligence</h1>
              <div style={{ display: 'flex', gap: '24px', marginTop: '8px' }}>
                <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                  Seoul <span style={{ fontWeight: 600, color: '#1a1a1a', marginLeft: '8px' }}>{times.korea}</span>
                </div>
                <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                  Shanghai <span style={{ fontWeight: 600, color: '#1a1a1a', marginLeft: '8px' }}>{times.china}</span>
                </div>
                <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                  Ho Chi Minh <span style={{ fontWeight: 600, color: '#1a1a1a', marginLeft: '8px' }}>{times.vietnam}</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>

          {/* Global Market Trends - Hero */}
          <div style={{ background: 'white', borderRadius: '16px', padding: '32px', marginBottom: '24px', border: '1px solid #e5e7eb', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 600, margin: 0, color: '#1a1a1a', letterSpacing: '-0.01em' }}>Global Market Trends</h2>
                <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: '4px 0 0' }}>Real-time Exchange Rates & Raw Material Prices</p>
              </div>
              <button
                onClick={() => setShowMarketModal(true)}
                style={{ fontSize: '0.875rem', color: '#0071e3', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>
                View All →
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px', marginBottom: '24px' }}>
              {/* USD/KRW */}
              <div style={{ padding: '20px', background: '#f9fafb', borderRadius: '12px', border: '1px solid #f3f4f6' }}>
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '8px', fontWeight: 500 }}>USD/KRW</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 600, color: '#1a1a1a' }}>{marketData.usd.toFixed(2)}</div>
                <div style={{ fontSize: '0.75rem', marginTop: '8px', color: marketData.trends.usd === 'up' ? '#16a34a' : '#dc2626', fontWeight: 500 }}>
                  {marketData.trends.usd === 'up' ? '↑' : '↓'} 0.4%
                </div>
              </div>

              {/* CNY/KRW */}
              <div style={{ padding: '20px', background: '#f9fafb', borderRadius: '12px', border: '1px solid #f3f4f6' }}>
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '8px', fontWeight: 500 }}>CNY/KRW</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 600, color: '#1a1a1a' }}>{marketData.cny.toFixed(2)}</div>
                <div style={{ fontSize: '0.75rem', marginTop: '8px', color: marketData.trends.cny === 'up' ? '#16a34a' : '#dc2626', fontWeight: 500 }}>
                  {marketData.trends.cny === 'up' ? '↑' : '↓'} 0.1%
                </div>
              </div>

              {/* Metals */}
              {marketData.metals && Object.entries(marketData.metals).map(([key, val]) => (
                <div key={key} style={{ padding: '20px', background: '#f9fafb', borderRadius: '12px', border: '1px solid #f3f4f6' }}>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '8px', textTransform: 'capitalize', fontWeight: 500 }}>{key}</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 600, color: '#1a1a1a' }}>${(typeof val === 'object' ? val?.last : val)?.toLocaleString() || '---'}</div>
                  <div style={{ fontSize: '0.75rem', marginTop: '8px', color: marketData.trends[key] === 'up' ? '#16a34a' : '#dc2626', fontWeight: 500 }}>
                    {marketData.trends[key] === 'up' ? '↑' : '↓'}
                  </div>
                </div>
              ))}
            </div>

            {/* Chart */}
            <div style={{ padding: '24px', background: '#f9fafb', borderRadius: '12px' }}>
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

          {/* 2 Column Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>

            {/* Left Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

              {/* Notices */}
              <div style={{ background: 'white', borderRadius: '16px', padding: '24px', border: '1px solid #e5e7eb', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0, color: '#1a1a1a' }}>Notice Board</h3>
                  <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Latest 3</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {notices.length === 0 ? (
                    <div style={{ color: '#9ca3af', fontSize: '0.875rem', textAlign: 'center', padding: '20px' }}>No active notices</div>
                  ) : (
                    notices.slice(0, 3).map((notice, i) => (
                      <div key={i} style={{ paddingBottom: '12px', borderBottom: i === 2 ? 'none' : '1px solid #f3f4f6' }}>
                        <div style={{ fontSize: '0.875rem', lineHeight: '1.5', color: '#374151' }}>{notice.content}</div>
                        <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '4px' }}>{new Date(notice.created_at).toLocaleDateString('ko-KR')}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* News */}
              <div style={{ background: 'white', borderRadius: '16px', padding: '24px', border: '1px solid #e5e7eb', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0, color: '#1a1a1a' }}>Industry News</h3>
                  <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>ETNews</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {news.length === 0 ? (
                    <div style={{ color: '#9ca3af', fontSize: '0.875rem', textAlign: 'center', padding: '20px' }}>Loading...</div>
                  ) : (
                    news.slice(0, 3).map((item, i) => (
                      <a key={i} href={item.link} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: 'inherit', paddingBottom: '12px', borderBottom: i === 2 ? 'none' : '1px solid #f3f4f6', display: 'block' }}>
                        <div style={{ fontSize: '0.875rem', fontWeight: 500, lineHeight: '1.5', color: '#374151', marginBottom: '4px' }}>{item.title}</div>
                        <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{item.date && item.date.substring(5)}</div>
                      </a>
                    ))
                  )}
                </div>
              </div>

              {/* Incheon Port */}
              <div style={{ background: 'white', borderRadius: '16px', padding: '24px', border: '1px solid #e5e7eb', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0, color: '#1a1a1a' }}>Incheon Port Status</h3>
                  {portLastUpdated && <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{portLastUpdated}</span>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {hubs.map(hub => (
                    <div key={hub.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: '#f9fafb', borderRadius: '8px' }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#374151' }}>{hub.name}</span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '4px 12px', borderRadius: '6px', background: hub.color, color: hub.textColor }}>{hub.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

              {/* Products */}
              <div style={{ background: 'white', borderRadius: '16px', padding: '24px', border: '1px solid #e5e7eb', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0, color: '#1a1a1a' }}>Product Portfolio</h3>
                  <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{catalogData.length} items</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', maxHeight: '400px', overflowY: 'auto' }}>
                  {catalogData.length === 0 ? (
                    <div style={{ gridColumn: 'span 2', textAlign: 'center', padding: '40px', color: '#d1d5db' }}>No products</div>
                  ) : (
                    catalogData.map(product => (
                      <div key={product.id} onClick={() => setSelectedProduct(product)} style={{ cursor: 'pointer', border: '1px solid #f3f4f6', borderRadius: '12px', overflow: 'hidden', transition: 'border-color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.borderColor = '#d1d5db'} onMouseLeave={(e) => e.currentTarget.style.borderColor = '#f3f4f6'}>
                        <div style={{ width: '100%', height: '120px', background: '#f9fafb' }}>
                          <img src={product.image} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => e.target.src = 'https://picsum.photos/400/300?blur=5'} />
                        </div>
                        <div style={{ padding: '12px' }}>
                          <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1a1a1a', marginBottom: '2px' }}>{product.name}</div>
                          <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{product.description}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Tools */}
              <div style={{ background: 'white', borderRadius: '16px', padding: '24px', border: '1px solid #e5e7eb', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600, margin: '0 0 16px', color: '#1a1a1a' }}>Tools</h3>

                {/* CBM Calculator */}
                <div style={{ marginBottom: '12px', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden' }}>
                  <div
                    onClick={() => setExpandedTool(expandedTool === 'cbm' ? null : 'cbm')}
                    style={{ padding: '16px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fafafa', fontWeight: 500, fontSize: '0.875rem' }}>
                    <span>CBM Calculator</span>
                    <span style={{ color: '#9ca3af' }}>{expandedTool === 'cbm' ? '−' : '+'}</span>
                  </div>
                  {expandedTool === 'cbm' && (
                    <div style={{ padding: '16px', borderTop: '1px solid #e5e7eb', background: 'white' }}>
                      <div style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: '12px' }}>
                        {products.map(p => (
                          <div key={p.id} style={{ marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid #f3f4f6' }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 500, marginBottom: '6px', color: '#6b7280' }}>{p.name}</div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                              <input type="number" placeholder="L" style={{ padding: '8px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '0.875rem' }} value={p.length} onChange={(e) => handleInputChange(p.id, 'length', e.target.value)} />
                              <input type="number" placeholder="W" style={{ padding: '8px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '0.875rem' }} value={p.width} onChange={(e) => handleInputChange(p.id, 'width', e.target.value)} />
                              <input type="number" placeholder="H" style={{ padding: '8px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '0.875rem' }} value={p.height} onChange={(e) => handleInputChange(p.id, 'height', e.target.value)} />
                              <input type="number" placeholder="Qty" style={{ padding: '8px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '0.875rem' }} value={p.qty} onChange={(e) => handleInputChange(p.id, 'qty', e.target.value)} />
                            </div>
                          </div>
                        ))}
                      </div>
                      <button onClick={addProduct} style={{ width: '100%', padding: '10px', background: '#fafafa', border: '1px solid #e5e7eb', borderRadius: '8px', color: '#6b7280', cursor: 'pointer', marginBottom: '12px', fontSize: '0.875rem', fontWeight: 500 }}>Add Item</button>
                      <div style={{ padding: '16px', background: '#f9fafb', borderRadius: '12px', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '4px' }}>Total Volume</div>
                        <div style={{ fontSize: '1.75rem', fontWeight: 600, color: '#1a1a1a' }}>{calculateCBM()} m³</div>
                        <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '4px' }}>
                          20ft Container: {((calculateCBM() / 28) * 100).toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Quick Tracking */}
                <div style={{ border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden' }}>
                  <div
                    onClick={() => setExpandedTool(expandedTool === 'tracking' ? null : 'tracking')}
                    style={{ padding: '16px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fafafa', fontWeight: 500, fontSize: '0.875rem' }}>
                    <span>Shipment Tracking</span>
                    <span style={{ color: '#9ca3af' }}>{expandedTool === 'tracking' ? '−' : '+'}</span>
                  </div>
                  {expandedTool === 'tracking' && (
                    <div style={{ padding: '16px', borderTop: '1px solid #e5e7eb', background: 'white' }}>
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                        <input
                          type="text"
                          placeholder="B/L or Container Number"
                          value={trackingNo}
                          onChange={(e) => setTrackingNo(e.target.value)}
                          style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '0.875rem' }}
                        />
                        <button
                          onClick={handleTrack}
                          disabled={isTracking}
                          style={{ padding: '0 20px', background: '#1a1a1a', color: 'white', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500 }}
                        >
                          {isTracking ? '...' : 'Track'}
                        </button>
                      </div>
                      {trackResult && (
                        <div style={{ padding: '12px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #d1fae5' }}>
                          <div style={{ color: '#065f46', fontWeight: 500, fontSize: '0.875rem' }}>{trackResult.status}</div>
                          <div style={{ fontSize: '0.75rem', color: '#047857', marginTop: '4px' }}>Currently at {trackResult.location}</div>
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

      {/* Modals remain the same structure but with minimal styling */}
      {showLibraryModal && <LibraryModal onClose={() => setShowLibraryModal(false)} />}

      {selectedProduct && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setSelectedProduct(null)}>
          <div style={{ background: 'white', maxWidth: '600px', width: '90%', maxHeight: '90vh', overflowY: 'auto', borderRadius: '20px', border: '1px solid #e5e7eb' }} onClick={e => e.stopPropagation()}>
            <div style={{ position: 'sticky', top: 0, background: 'white', zIndex: 1, padding: '24px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 600, margin: 0, color: '#1a1a1a' }}>{selectedProduct.name}</h2>
              <button onClick={() => setSelectedProduct(null)} style={{ background: '#f3f4f6', border: 'none', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>

            <div style={{ padding: '24px' }}>
              <div style={{ width: '100%', height: '300px', background: '#f9fafb', borderRadius: '12px', marginBottom: '24px', overflow: 'hidden' }}>
                <img src={selectedProduct.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>

              <div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '16px', color: '#1a1a1a' }}>Specifications</h3>
                <div style={{ border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                    <tbody>
                      {[
                        { label: 'Part No', key: 'partNo' },
                        { label: 'Model', key: 'modelName' },
                        { label: 'Color Temp', key: 'colorTemp', unit: 'K' },
                        { label: 'Power', key: 'powerConsumption', unit: 'W' },
                        { label: 'Voltage', key: 'inputVoltage', unit: 'V' },
                        { label: 'Power Factor', key: 'powerFactor' },
                        { label: 'Luminous Flux', key: 'luminousFlux', unit: 'lm' },
                        { label: 'CRI', key: 'criRa', unit: 'Ra' },
                        { label: 'Dimensions', key: 'dimensions', unit: 'mm' },
                        { label: 'Weight', key: 'weight', unit: 'g' },
                        { label: 'Certifications', key: 'cert' }
                      ].map((row, i) => (
                        <tr key={row.key} style={{ borderBottom: '1px solid #f3f4f6' }}>
                          <td style={{ padding: '12px 16px', fontWeight: 500, color: '#6b7280', width: '40%', background: '#fafafa' }}>{row.label}</td>
                          <td style={{ padding: '12px 16px', color: '#1a1a1a' }}>
                            {selectedProduct.specs?.[row.key] ? `${selectedProduct.specs[row.key]}${row.unit ? ` ${row.unit}` : ''}` : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showSettings && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowSettings(false)}>
          <div style={{ background: 'white', maxWidth: '400px', width: '90%', borderRadius: '20px', padding: '24px', border: '1px solid #e5e7eb' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '20px', color: '#1a1a1a' }}>Settings</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.875rem', color: '#374151' }}>Dark Mode</span>
                <button onClick={() => setDarkMode(!darkMode)} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #e5e7eb', background: darkMode ? '#1a1a1a' : 'white', color: darkMode ? 'white' : '#1a1a1a', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500 }}>
                  {darkMode ? 'ON' : 'OFF'}
                </button>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.875rem', color: '#374151' }}>Notifications</span>
                <button onClick={() => setNotifications(!notifications)} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #e5e7eb', background: notifications ? '#1a1a1a' : 'white', color: notifications ? 'white' : '#1a1a1a', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500 }}>
                  {notifications ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showMarketModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowMarketModal(false)}>
          <div style={{ background: 'white', maxWidth: '900px', width: '90%', maxHeight: '90vh', overflowY: 'auto', borderRadius: '20px', padding: '32px', border: '1px solid #e5e7eb' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 600, margin: 0, color: '#1a1a1a' }}>Market Data Analysis</h2>
              <button onClick={() => setShowMarketModal(false)} style={{ background: '#f3f4f6', border: 'none', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
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

      {showTrackingModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowTrackingModal(false)}>
          <div style={{ background: 'white', maxWidth: '600px', width: '90%', borderRadius: '20px', padding: '32px', border: '1px solid #e5e7eb' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '20px', color: '#1a1a1a' }}>Global Logistics Tracking</h2>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
              <input
                type="text"
                placeholder="Enter B/L or Container Number"
                value={trackingNo}
                onChange={(e) => setTrackingNo(e.target.value)}
                style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid #e5e7eb', fontSize: '0.875rem' }}
              />
              <button
                onClick={handleTrack}
                disabled={isTracking}
                style={{ padding: '0 24px', background: '#1a1a1a', color: 'white', borderRadius: '12px', border: 'none', cursor: 'pointer', fontWeight: 500 }}
              >
                {isTracking ? 'Tracking...' : 'Track'}
              </button>
            </div>
            {trackResult && (
              <div style={{ padding: '20px', background: '#f0fdf4', borderRadius: '12px', border: '1px solid #d1fae5' }}>
                <div style={{ color: '#065f46', fontWeight: 500, fontSize: '1rem', marginBottom: '8px' }}>{trackResult.status}</div>
                <div style={{ fontSize: '0.875rem', color: '#047857', marginBottom: '4px' }}>Currently at {trackResult.location}</div>
                <div style={{ fontSize: '0.875rem', color: '#047857' }}>ETA: {trackResult.eta}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

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
  const [expandedTool, setExpandedTool] = useState(null);

  const [notices, setNotices] = useState([]);
  const [news, setNews] = useState([]);
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

  useEffect(() => {
    setIsMounted(true);
    fetchData();

    const worldTimer = setInterval(() => {
      const now = new Date();
      setTimes({
        korea: now.toLocaleTimeString('en-US', { timeZone: 'Asia/Seoul', hour12: false }),
        china: now.toLocaleTimeString('en-US', { timeZone: 'Asia/Shanghai', hour12: false }),
        vietnam: now.toLocaleTimeString('en-US', { timeZone: 'Asia/Ho_Chi_Minh', hour12: false })
      });
    }, 1000);

    const refreshTimer = setInterval(() => {
      fetchData();
    }, 60000);

    return () => {
      clearInterval(worldTimer);
      clearInterval(refreshTimer);
    };
  }, []);

  const fetchData = async () => {
    try {
      const mRes = await fetch('/api/market', { cache: 'no-store' });
      const mData = await mRes.json();
      if (mData.success) {
        setMarketData(prev => {
          const newTrends = { ...prev.trends };
          if (mData.rates?.usd) newTrends.usd = mData.rates.usd >= prev.usd ? 'up' : 'down';
          if (mData.rates?.cny) newTrends.cny = mData.rates.cny >= prev.cny ? 'up' : 'down';

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
        setTrackResult({ error: data.error || 'No shipment found' });
      }
    } catch (err) {
      console.error(err);
      setTrackResult({ error: 'Tracking failed' });
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
    <div className={styles.layout} style={{ background: '#f5f5f7' }}>
      {/* Sidebar */}
      <nav className={styles.sidebar} style={{ background: '#1d1d1f', borderRight: 'none' }}>
        <div className={styles.logoIcon} style={{ background: 'white', color: '#1d1d1f', fontWeight: 700 }}>Y</div>
        <div className={`${styles.navItem} ${activeTab === 'Overview' && styles.navItemActive}`} onClick={() => setActiveTab('Overview')} title="Overview" style={{ color: activeTab === 'Overview' ? 'white' : '#86868b' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
        </div>
        <div className={`${styles.navItem} ${activeTab === 'Analytics' && styles.navItemActive}`} onClick={() => setActiveTab('Analytics')} title="Analytics" style={{ color: activeTab === 'Analytics' ? 'white' : '#86868b' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
        </div>
        <div className={styles.navItem} onClick={() => setShowLibraryModal(true)} title="Library" style={{ color: '#86868b' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
        </div>
        <div className={styles.navItem} onClick={() => setShowMarketModal(true)} title="Charts" style={{ color: '#86868b' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
        </div>
        <div className={styles.navItem} onClick={() => setShowTrackingModal(true)} title="Tracking" style={{ color: '#86868b' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>
        </div>
        <a href="/erp" target="_blank" rel="noopener noreferrer" className={styles.navItem} title="ERP" style={{ textDecoration: 'none', color: '#86868b' }}>
          <div style={{ fontWeight: 700, fontSize: '0.65rem', border: '2px solid currentColor', borderRadius: '4px', padding: '2px 4px' }}>ERP</div>
        </a>
        <div className={styles.sidebarBottom}>
          <div className={styles.navItem} onClick={() => setShowSettings(true)} title="Settings" style={{ color: '#86868b' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
          </div>
          <a href="/admin" className={styles.userAvatar} style={{ display: 'block' }}>
            <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="User" style={{ width: '100%', height: '100%', borderRadius: '50%' }} />
          </a>
        </div>
      </nav>

      {/* Main Dashboard - Single View */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#f5f5f7', overflow: 'hidden' }}>

        {/* Top Bar */}
        <div style={{ padding: '16px 24px', background: 'white', borderBottom: '1px solid #d2d2d7', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 600, margin: 0, color: '#1d1d1f', letterSpacing: '-0.02em' }}>YNK Intelligence</h1>
          </div>
          <div style={{ display: 'flex', gap: '32px', fontSize: '0.8rem', color: '#86868b' }}>
            <div>🇰🇷 <span style={{ fontWeight: 600, color: '#1d1d1f' }}>{times.korea}</span></div>
            <div>🇨🇳 <span style={{ fontWeight: 600, color: '#1d1d1f' }}>{times.china}</span></div>
            <div>🇻🇳 <span style={{ fontWeight: 600, color: '#1d1d1f' }}>{times.vietnam}</span></div>
          </div>
        </div>

        {/* Single Page Dashboard */}
        <div style={{ flex: 1, padding: '20px', display: 'grid', gridTemplateRows: 'auto 1fr', gap: '16px', overflow: 'hidden' }}>

          {/* Row 1: Market Overview - 7 Cards in One Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '12px' }}>
            {/* USD */}
            <div style={{ background: 'white', borderRadius: '12px', padding: '16px', border: '1px solid #d2d2d7' }}>
              <div style={{ fontSize: '0.7rem', color: '#86868b', marginBottom: '4px', fontWeight: 500 }}>🇺🇸 USD/KRW</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1d1d1f' }}>{marketData.usd.toFixed(2)}</div>
              <div style={{ fontSize: '0.7rem', marginTop: '4px', color: marketData.trends.usd === 'up' ? '#34c759' : '#ff3b30', fontWeight: 600 }}>
                {marketData.trends.usd === 'up' ? '↑' : '↓'} 0.4%
              </div>
            </div>

            {/* CNY */}
            <div style={{ background: 'white', borderRadius: '12px', padding: '16px', border: '1px solid #d2d2d7' }}>
              <div style={{ fontSize: '0.7rem', color: '#86868b', marginBottom: '4px', fontWeight: 500 }}>🇨🇳 CNY/KRW</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1d1d1f' }}>{marketData.cny.toFixed(2)}</div>
              <div style={{ fontSize: '0.7rem', marginTop: '4px', color: marketData.trends.cny === 'up' ? '#34c759' : '#ff3b30', fontWeight: 600 }}>
                {marketData.trends.cny === 'up' ? '↑' : '↓'} 0.1%
              </div>
            </div>

            {/* Metals - 5 cards */}
            {marketData.metals && Object.entries(marketData.metals).map(([key, val]) => (
              <div key={key} style={{ background: 'white', borderRadius: '12px', padding: '16px', border: '1px solid #d2d2d7' }}>
                <div style={{ fontSize: '0.7rem', color: '#86868b', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 500 }}>{key}</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1d1d1f' }}>${(typeof val === 'object' ? val?.last : val)?.toLocaleString() || '—'}</div>
                <div style={{ fontSize: '0.7rem', marginTop: '4px', color: marketData.trends[key] === 'up' ? '#34c759' : '#ff3b30', fontWeight: 600 }}>
                  {marketData.trends[key] === 'up' ? '↑' : '↓'}
                </div>
              </div>
            ))}
          </div>

          {/* Row 2: Main Grid - 3 Columns */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', overflow: 'hidden' }}>

            {/* Column 1: Notice + News + Products */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%' }}>

              {/* Notice */}
              <div style={{ background: 'white', borderRadius: '16px', padding: '20px', border: '1px solid #d2d2d7', flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0, color: '#1d1d1f' }}>📢 Notices</h3>
                  <span style={{ fontSize: '0.7rem', color: '#86868b' }}>3</span>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {notices.slice(0, 3).map((n, i) => (
                    <div key={i} style={{ paddingBottom: '8px', borderBottom: i === 2 ? 'none' : '1px solid #f5f5f7' }}>
                      <div style={{ fontSize: '0.8rem', lineHeight: '1.4', color: '#1d1d1f' }}>{n.content}</div>
                      <div style={{ fontSize: '0.65rem', color: '#86868b', marginTop: '4px' }}>{new Date(n.created_at).toLocaleDateString('ko-KR')}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* News */}
              <div style={{ background: 'white', borderRadius: '16px', padding: '20px', border: '1px solid #d2d2d7', flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0, color: '#1d1d1f' }}>📰 ETNews</h3>
                  <span style={{ fontSize: '0.7rem', color: '#86868b' }}>3</span>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {news.slice(0, 3).map((item, i) => (
                    <a key={i} href={item.link} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: 'inherit', paddingBottom: '8px', borderBottom: i === 2 ? 'none' : '1px solid #f5f5f7', display: 'block' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 500, lineHeight: '1.4', color: '#1d1d1f', marginBottom: '2px' }}>{item.title}</div>
                      <div style={{ fontSize: '0.65rem', color: '#86868b' }}>{item.date?.substring(5)}</div>
                    </a>
                  ))}
                </div>
              </div>
            </div>

            {/* Column 2: Port + Products */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%' }}>

              {/* Port */}
              <div style={{ background: 'white', borderRadius: '16px', padding: '20px', border: '1px solid #d2d2d7', flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0, color: '#1d1d1f' }}>🚢 Incheon Port</h3>
                  {portLastUpdated && <span style={{ fontSize: '0.7rem', color: '#86868b' }}>{portLastUpdated}</span>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {hubs.map(hub => (
                    <div key={hub.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#f5f5f7', borderRadius: '8px' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#1d1d1f' }}>{hub.name}</span>
                      <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '3px 10px', borderRadius: '4px', background: hub.color, color: hub.textColor }}>{hub.status}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Products Grid */}
              <div style={{ background: 'white', borderRadius: '16px', padding: '20px', border: '1px solid #d2d2d7', flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0, color: '#1d1d1f' }}>📦 Products</h3>
                  <span style={{ fontSize: '0.7rem', color: '#86868b' }}>{catalogData.length}</span>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                  {catalogData.slice(0, 6).map(p => (
                    <div key={p.id} onClick={() => setSelectedProduct(p)} style={{ cursor: 'pointer', border: '1px solid #e5e5ea', borderRadius: '8px', overflow: 'hidden' }}>
                      <div style={{ width: '100%', height: '80px', background: '#f5f5f7' }}>
                        <img src={p.image} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => e.target.src = 'https://picsum.photos/400/300?blur=5'} />
                      </div>
                      <div style={{ padding: '8px' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#1d1d1f' }}>{p.name}</div>
                        <div style={{ fontSize: '0.65rem', color: '#86868b' }}>{p.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Column 3: Tools */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%' }}>

              {/* CBM Tool */}
              <div style={{ background: 'white', borderRadius: '16px', padding: '20px', border: '1px solid #d2d2d7', flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div onClick={() => setExpandedTool(expandedTool === 'cbm' ? null : 'cbm')} style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0, color: '#1d1d1f' }}>📐 CBM Calculator</h3>
                  <span style={{ fontSize: '1.2rem', color: '#86868b' }}>{expandedTool === 'cbm' ? '−' : '+'}</span>
                </div>
                {expandedTool === 'cbm' && (
                  <div style={{ flex: 1, overflowY: 'auto' }}>
                    {products.map(p => (
                      <div key={p.id} style={{ marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px solid #f5f5f7' }}>
                        <div style={{ fontSize: '0.7rem', fontWeight: 500, marginBottom: '4px', color: '#86868b' }}>{p.name}</div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' }}>
                          <input type="number" placeholder="L" style={{ padding: '6px', border: '1px solid #d2d2d7', borderRadius: '6px', fontSize: '0.75rem' }} value={p.length} onChange={(e) => handleInputChange(p.id, 'length', e.target.value)} />
                          <input type="number" placeholder="W" style={{ padding: '6px', border: '1px solid #d2d2d7', borderRadius: '6px', fontSize: '0.75rem' }} value={p.width} onChange={(e) => handleInputChange(p.id, 'width', e.target.value)} />
                          <input type="number" placeholder="H" style={{ padding: '6px', border: '1px solid #d2d2d7', borderRadius: '6px', fontSize: '0.75rem' }} value={p.height} onChange={(e) => handleInputChange(p.id, 'height', e.target.value)} />
                          <input type="number" placeholder="Q" style={{ padding: '6px', border: '1px solid #d2d2d7', borderRadius: '6px', fontSize: '0.75rem' }} value={p.qty} onChange={(e) => handleInputChange(p.id, 'qty', e.target.value)} />
                        </div>
                      </div>
                    ))}
                    <button onClick={addProduct} style={{ width: '100%', padding: '8px', background: '#f5f5f7', border: 'none', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 500, color: '#86868b', cursor: 'pointer', marginBottom: '8px' }}>Add</button>
                    <div style={{ padding: '12px', background: '#f5f5f7', borderRadius: '8px', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.7rem', color: '#86868b' }}>Total</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1d1d1f' }}>{calculateCBM()} m³</div>
                      <div style={{ fontSize: '0.65rem', color: '#86868b', marginTop: '2px' }}>20ft: {((calculateCBM() / 28) * 100).toFixed(1)}%</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Tracking Tool */}
              <div style={{ background: 'white', borderRadius: '16px', padding: '20px', border: '1px solid #d2d2d7', flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div onClick={() => setExpandedTool(expandedTool === 'track' ? null : 'track')} style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0, color: '#1d1d1f' }}>🔍 Tracking</h3>
                  <span style={{ fontSize: '1.2rem', color: '#86868b' }}>{expandedTool === 'track' ? '−' : '+'}</span>
                </div>
                {expandedTool === 'track' && (
                  <div>
                    <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
                      <input type="text" placeholder="B/L or Container No." value={trackingNo} onChange={(e) => setTrackingNo(e.target.value)} style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #d2d2d7', fontSize: '0.75rem' }} />
                      <button onClick={handleTrack} disabled={isTracking} style={{ padding: '0 16px', background: '#1d1d1f', color: 'white', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 500 }}>
                        {isTracking ? '...' : 'Track'}
                      </button>
                    </div>
                    {trackResult && (
                      <div style={{ padding: '10px', background: '#f0fdf4', borderRadius: '6px', border: '1px solid #d1fae5' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 500, color: '#065f46' }}>{trackResult.status || 'No data'}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Modals */}
      {showLibraryModal && <LibraryModal onClose={() => setShowLibraryModal(false)} />}

      {selectedProduct && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setSelectedProduct(null)}>
          <div style={{ background: 'white', maxWidth: '600px', width: '90%', maxHeight: '90vh', overflowY: 'auto', borderRadius: '20px', border: '1px solid #d2d2d7' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '24px', borderBottom: '1px solid #f5f5f7', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 600, margin: 0, color: '#1d1d1f' }}>{selectedProduct.name}</h2>
              <button onClick={() => setSelectedProduct(null)} style={{ background: '#f5f5f7', border: 'none', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer' }}>×</button>
            </div>
            <div style={{ padding: '24px' }}>
              <div style={{ width: '100%', height: '300px', background: '#f5f5f7', borderRadius: '12px', marginBottom: '24px', overflow: 'hidden' }}>
                <img src={selectedProduct.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '16px', color: '#1d1d1f' }}>Specifications</h3>
              <div style={{ border: '1px solid #d2d2d7', borderRadius: '12px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <tbody>
                    {[
                      { label: 'Part No', key: 'partNo' },
                      { label: 'Model', key: 'modelName' },
                      { label: 'Color Temp', key: 'colorTemp', unit: 'K' },
                      { label: 'Power', key: 'powerConsumption', unit: 'W' },
                      { label: 'Voltage', key: 'inputVoltage', unit: 'V' },
                      { label: 'CRI', key: 'criRa', unit: 'Ra' }
                    ].map((row, i) => (
                      <tr key={row.key} style={{ borderBottom: '1px solid #f5f5f7' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 500, color: '#86868b', width: '40%', background: '#fafafa' }}>{row.label}</td>
                        <td style={{ padding: '12px 16px', color: '#1d1d1f' }}>
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
      )}

      {showSettings && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowSettings(false)}>
          <div style={{ background: 'white', maxWidth: '400px', width: '90%', borderRadius: '20px', padding: '24px', border: '1px solid #d2d2d7' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '20px', color: '#1d1d1f' }}>Settings</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Dark Mode</span>
                <button onClick={() => setDarkMode(!darkMode)} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #d2d2d7', background: darkMode ? '#1d1d1f' : 'white', color: darkMode ? 'white' : '#1d1d1f', cursor: 'pointer' }}>{darkMode ? 'ON' : 'OFF'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showMarketModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowMarketModal(false)}>
          <div style={{ background: 'white', maxWidth: '900px', width: '90%', maxHeight: '90vh', overflowY: 'auto', borderRadius: '20px', padding: '32px', border: '1px solid #d2d2d7' }} onClick={e => e.stopPropagation()}>
            <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 600, margin: 0 }}>Market Analysis</h2>
              <button onClick={() => setShowMarketModal(false)} style={{ background: '#f5f5f7', border: 'none', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer' }}>×</button>
            </div>
            <MarketChart marketData={marketData} historyData={historyData} selectedMetal={selectedMetal} setSelectedMetal={setSelectedMetal} selectedCurrency={selectedCurrency} setSelectedCurrency={setSelectedCurrency} />
          </div>
        </div>
      )}

      {showTrackingModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowTrackingModal(false)}>
          <div style={{ background: 'white', maxWidth: '600px', width: '90%', borderRadius: '20px', padding: '32px', border: '1px solid #d2d2d7' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '20px' }}>Shipment Tracking</h2>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
              <input type="text" placeholder="B/L or Container Number" value={trackingNo} onChange={(e) => setTrackingNo(e.target.value)} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid #d2d2d7' }} />
              <button onClick={handleTrack} disabled={isTracking} style={{ padding: '0 24px', background: '#1d1d1f', color: 'white', borderRadius: '12px', border: 'none', cursor: 'pointer', fontWeight: 500 }}>
                {isTracking ? '...' : 'Track'}
              </button>
            </div>
            {trackResult && (
              <div style={{ padding: '20px', background: '#f0fdf4', borderRadius: '12px' }}>
                <div style={{ fontWeight: 500 }}>{trackResult.status || 'No data'}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

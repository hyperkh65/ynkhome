'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import styles from './page.module.css';
import LibraryModal from '@/components/LibraryModal';
import MarketChart from '@/components/MarketChart';
import CatalogModal from '@/components/CatalogModal';
import { getProducts, getNotices, getCatalogs } from '@/utils/storage';

export default function Home() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [activeTab, setActiveTab] = useState('Overview');
  const [times, setTimes] = useState({ korea: '00:00:00', china: '00:00:00', vietnam: '00:00:00' });
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
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [selectedCatalog, setSelectedCatalog] = useState(null);
  const [showToolModal, setShowToolModal] = useState(null); // 'cbm' | 'tracking' | null

  const [notices, setNotices] = useState([]);
  const [eCatalogs, setECatalogs] = useState([]);
  const [catalogPage, setCatalogPage] = useState(0); // Pagination for catalogs
  const [news, setNews] = useState([]);
  const [darkMode, setDarkMode] = useState(false);

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
    { id: 'it1', name: 'E1컨테이너터미널', status: 'Checking...', color: '#f1f5f9', textColor: '#64748b', trend: '—', cargo: '—' },
    { id: 'it2', name: '인천컨테이너터미널', status: 'Checking...', color: '#f1f5f9', textColor: '#64748b', trend: '—', cargo: '—' },
    { id: 'it3', name: '한진인천컨테이너터미널', status: 'Checking...', color: '#f1f5f9', textColor: '#64748b', trend: '—', cargo: '—' },
    { id: 'it4', name: '선광신컨테이너터미널', status: 'Checking...', color: '#f1f5f9', textColor: '#64748b', trend: '—', cargo: '—' }
  ]);
  const [portLastUpdated, setPortLastUpdated] = useState('');

  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [darkMode]);

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
      // Parallelize all independent data fetches
      const [marketRes, congestionRes, products, noticeList, catalogs, historyRes] = await Promise.allSettled([
        fetch('/api/market', { cache: 'no-store' }),
        fetch('/api/incheon/congestion', { cache: 'no-store' }),
        getProducts(),
        getNotices(),
        getCatalogs(),
        fetch('/api/market/history', { cache: 'no-store' })
      ]);

      // 1. Process Market Data
      if (marketRes.status === 'fulfilled') {
        const mData = await marketRes.value.json();
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
      }

      // 2. Process Congestion Data
      if (congestionRes.status === 'fulfilled') {
        const json = await congestionRes.value.json();
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
              let status = 'Smooth', color = '#f0fdf4', textColor = '#16a34a', trend = 'Stable';
              let cargo = Math.floor(Math.random() * 40 + 60) + '%';

              if (level === 'R' || level.includes('혼잡') || level.includes('포화')) {
                status = 'Congested'; color = '#fef2f2'; textColor = '#dc2626'; trend = 'Increasing';
              } else if (level === 'Y' || level === 'M' || level.includes('보통')) {
                status = 'Moderate'; color = '#fefce8'; textColor = '#ca8a04'; trend = 'Fluctuating';
              } else if (level === 'B' || level === 'G' || level.includes('원활')) {
                status = 'Smooth'; color = '#f0fdf4'; textColor = '#16a34a'; trend = 'Stable';
              }
              return { ...hub, status, color, textColor, trend, cargo };
            }
            return hub;
          }));
        }
      }

      // 3. Simple State setters
      if (products.status === 'fulfilled') setCatalogData(products.value);
      if (noticeList.status === 'fulfilled') setNotices(noticeList.value);
      if (catalogs.status === 'fulfilled') setECatalogs([...catalogs.value]);

      if (historyRes.status === 'fulfilled') {
        const hData = await historyRes.value.json();
        if (Array.isArray(hData)) setHistoryData(hData);
      }

      // 4. Background News fetch
      fetch('/api/news')
        .then(res => res.json())
        .then(data => setNews(data.news || []))
        .catch(err => console.error("News fetch error", err));

    } catch (e) {
      console.error("Critical error in fetchData", e);
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

  // Chart data preparation
  const getChartData = () => {
    if (!historyData || historyData.length === 0) return [];

    // Sort by date and take last 30 days
    const sorted = [...historyData].sort((a, b) => new Date(a.date) - new Date(b.date)).slice(-30);

    return sorted.map(d => ({
      date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      usd: d.usd || 0,
      cny: d.cny || 0,
      aluminum: d.aluminum || 0,
      copper: d.copper || 0,
      steel: d.steel || 0,
      nickel: d.nickel || 0,
      zinc: d.zinc || 0
    }));
  };

  const chartData = getChartData();
  const selectedData = selectedCurrency === 'usd' ? 'usd' : selectedCurrency === 'cny' ? 'cny' : selectedMetal;

  if (!isMounted) return null;

  return (
    <div className={styles.layout} style={{ background: '#f5f5f7' }}>
      {/* Sidebar */}
      <nav className={styles.sidebar} style={{ background: '#1d1d1f', borderRight: 'none' }}>
        <div className={styles.logoIcon} style={{ background: 'white', color: '#1d1d1f', fontWeight: 700 }}>Y</div>

        <div
          className={`${styles.navItem} ${activeTab === 'Overview' && styles.navItemActive}`}
          onClick={() => setActiveTab('Overview')}
          title="Overview Dashboard"
          style={{ color: activeTab === 'Overview' ? 'white' : '#86868b' }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
        </div>

        <div
          className={`${styles.navItem} ${activeTab === 'Catalog' && styles.navItemActive}`}
          onClick={() => setActiveTab('Catalog')}
          title="Product Catalog"
          style={{ color: activeTab === 'Catalog' ? 'white' : '#86868b' }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path></svg>
        </div>

        <div
          className={styles.navItem}
          onClick={() => setShowLibraryModal(true)}
          title="File Library"
          style={{ color: '#86868b' }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
        </div>

        <div
          className={`${styles.navItem} ${showMarketModal && styles.navItemActive}`}
          onClick={() => setShowMarketModal(true)}
          title="Market Trends"
          style={{ color: showMarketModal ? 'white' : '#86868b' }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
        </div>

        <div
          className={`${styles.navItem} ${showToolModal === 'tracking' && styles.navItemActive}`}
          onClick={() => setShowToolModal('tracking')}
          title="Shipment Tracking"
          style={{ color: showToolModal === 'tracking' ? 'white' : '#86868b' }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>
        </div>

        <a
          href="https://erp.ynk2014.com"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.navItem}
          title="ERP Operations"
          style={{ textDecoration: 'none', color: '#86868b' }}
        >
          <div style={{ fontWeight: 700, fontSize: '0.6rem', border: '2px solid currentColor', borderRadius: '4px', padding: '2px 4px' }}>ERP</div>
        </a>

        <div className={styles.sidebarBottom}>
          <div
            className={styles.navItem}
            onClick={() => setShowSettings(true)}
            title="System Settings"
            style={{ color: '#86868b' }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
          </div>
          <a href="/admin" className={styles.userAvatar} style={{ display: 'block' }} title="Admin Panel">
            <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="User" style={{ width: '100%', height: '100%', borderRadius: '50%' }} />
          </a>
        </div>
      </nav>

      {/* Main Dashboard */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#f5f5f7', overflow: 'hidden' }}>

        {/* Top Bar */}
        <div style={{ padding: '14px 24px', background: 'white', borderBottom: '1px solid #d2d2d7', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 600, margin: 0, color: '#1d1d1f', letterSpacing: '-0.02em' }}>YNK Intelligence</h1>
          <div style={{ display: 'flex', gap: '28px', fontSize: '0.75rem', color: '#86868b' }}>
            {isMounted && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>🇰🇷</span> <span style={{ fontWeight: 600, color: '#1d1d1f', fontVariantNumeric: 'tabular-nums' }}>{times.korea}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>🇨🇳</span> <span style={{ fontWeight: 600, color: '#1d1d1f', fontVariantNumeric: 'tabular-nums' }}>{times.china}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>🇻🇳</span> <span style={{ fontWeight: 600, color: '#1d1d1f', fontVariantNumeric: 'tabular-nums' }}>{times.vietnam}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Dashboard Content */}
        {activeTab === 'Overview' ? (
          <div style={{ flex: 1, padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px', overflow: 'hidden' }}>

            {/* Row 1: Market + Notices + News */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr) 200px 200px', gap: '10px', height: '110px' }}>
              <div style={{ background: 'white', borderRadius: '10px', padding: '14px', border: '1px solid #d2d2d7', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div style={{ fontSize: '0.65rem', color: '#86868b', fontWeight: 500 }}>🇺🇸 USD/KRW</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#1d1d1f' }}>{marketData.usd.toFixed(2)}</div>
                <div style={{ fontSize: '0.65rem', color: marketData.trends.usd === 'up' ? '#34c759' : '#ff3b30', fontWeight: 600 }}>
                  {marketData.trends.usd === 'up' ? '↑' : '↓'} 0.4%
                </div>
              </div>

              <div style={{ background: 'white', borderRadius: '10px', padding: '14px', border: '1px solid #d2d2d7', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div style={{ fontSize: '0.65rem', color: '#86868b', fontWeight: 500 }}>🇨🇳 CNY/KRW</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#1d1d1f' }}>{marketData.cny.toFixed(2)}</div>
                <div style={{ fontSize: '0.65rem', color: marketData.trends.cny === 'up' ? '#34c759' : '#ff3b30', fontWeight: 600 }}>
                  {marketData.trends.cny === 'up' ? '↑' : '↓'} 0.1%
                </div>
              </div>

              {marketData.metals && Object.entries(marketData.metals).map(([key, val]) => (
                <div key={key} style={{ background: 'white', borderRadius: '10px', padding: '14px', border: '1px solid #d2d2d7', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: '0.65rem', color: '#86868b', textTransform: 'uppercase', fontWeight: 500 }}>{key}</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#1d1d1f' }}>${(typeof val === 'object' ? val?.last : val)?.toLocaleString() || '—'}</div>
                  <div style={{ fontSize: '0.65rem', color: marketData.trends[key] === 'up' ? '#34c759' : '#ff3b30', fontWeight: 600 }}>
                    {marketData.trends[key] === 'up' ? '↑' : '↓'}
                  </div>
                </div>
              ))}

              {/* Notices */}
              <div style={{ background: 'white', borderRadius: '10px', padding: '12px 14px', border: '1px solid #d2d2d7', display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '8px', color: '#1d1d1f', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  📢 <span>Notice Board</span>
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.7rem', overflow: 'hidden' }}>
                  {notices.slice(0, 3).map((n, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      <span style={{ fontWeight: 700, color: i === 0 ? '#ff3b30' : i === 1 ? '#ff9500' : '#34c759', minWidth: '12px' }}>{i + 1}</span>
                      <span style={{ color: '#1d1d1f', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.content}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* News */}
              <div style={{ background: 'white', borderRadius: '10px', padding: '12px 14px', border: '1px solid #d2d2d7', display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '8px', color: '#1d1d1f', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  📰 <span>ETNews</span>
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.7rem', overflow: 'hidden' }}>
                  {news.slice(0, 3).map((item, i) => (
                    <a key={i} href={item.link} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textDecoration: 'none', color: 'inherit' }}>
                      <span style={{ fontWeight: 700, color: i === 0 ? '#007aff' : i === 1 ? '#5ac8fa' : '#86868b', minWidth: '12px' }}>{i + 1}</span>
                      <span style={{ color: '#1d1d1f', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</span>
                    </a>
                  ))}
                </div>
              </div>
            </div>

            {/* Row 2: Port + Chart + Products */}
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '280px 1fr 280px', gap: '14px', overflow: 'hidden' }}>

              {/* Incheon Port + E-Catalog */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ background: 'white', borderRadius: '14px', padding: '18px', border: '1px solid #d2d2d7', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 600, margin: 0, color: '#1d1d1f' }}>🚢 Incheon Port</h3>
                    {portLastUpdated && <span style={{ fontSize: '0.65rem', color: '#86868b' }}>{portLastUpdated}</span>}
                  </div>
                  <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {hubs.map(hub => (
                      <div key={hub.id} style={{ padding: '10px', background: '#fafafa', borderRadius: '8px', border: '1px solid #f0f0f0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#1d1d1f' }}>{hub.name}</span>
                          <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: hub.color, color: hub.textColor }}>{hub.status}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: '#86868b' }}>
                          <span>Trend: <span style={{ fontWeight: 600, color: '#1d1d1f' }}>{hub.trend}</span></span>
                          <span>Capacity: <span style={{ fontWeight: 600, color: '#1d1d1f' }}>{hub.cargo}</span></span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ELECTRONIC CATALOG BOOKSHELF */}
                <div style={{ background: 'white', borderRadius: '14px', padding: '18px', border: '1px solid #d2d2d7', height: '240px', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <h3 style={{ fontSize: '0.9rem', fontWeight: 600, margin: 0, color: '#1d1d1f', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      📚 <span>Library Shelf</span>
                    </h3>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {Array.from({ length: Math.ceil(eCatalogs.length / 3) }).map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setCatalogPage(idx)}
                          style={{
                            width: '20px', height: '20px', borderRadius: '50%', border: 'none',
                            background: catalogPage === idx ? '#007aff' : '#e5e5ea',
                            color: catalogPage === idx ? 'white' : '#86868b',
                            fontSize: '0.65rem', cursor: 'pointer', fontWeight: 700
                          }}
                        >
                          {idx + 1}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ flex: 1, display: 'flex', gap: '12px', alignItems: 'flex-end', paddingBottom: '10px', overflow: 'hidden' }}>
                    {eCatalogs.length === 0 ? (
                      <div style={{ fontSize: '0.75rem', color: '#86868b', textAlign: 'center', width: '100%', paddingBottom: '40px' }}>No catalogs available.</div>
                    ) : (
                      eCatalogs.slice(catalogPage * 3, (catalogPage * 3) + 3).map((cat, i) => (
                        <div
                          key={cat.id}
                          onClick={() => { setSelectedCatalog(cat); setShowCatalogModal(true); }}
                          style={{
                            flex: 1, height: '140px', background: '#fff', borderRadius: '4px 8px 8px 4px',
                            cursor: 'pointer', position: 'relative', display: 'flex', flexDirection: 'column',
                            boxShadow: '4px 4px 10px rgba(0,0,0,0.1), inset 8px 0 10px rgba(0,0,0,0.05)',
                            transition: 'all 0.3s ease', borderLeft: '12px solid #007aff',
                            transform: 'perspective(500px) rotateY(-10deg)'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'perspective(500px) rotateY(0deg) translateY(-8px)';
                            e.currentTarget.style.boxShadow = '10px 10px 20px rgba(0,0,0,0.15)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'perspective(500px) rotateY(-10deg)';
                            e.currentTarget.style.boxShadow = '4px 4px 10px rgba(0,0,0,0.1), inset 8px 0 10px rgba(0,0,0,0.05)';
                          }}
                        >
                          <div style={{ padding: '12px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#1d1d1f', marginBottom: '4px', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
                              {cat.name}
                            </div>
                            <div style={{ fontSize: '0.55rem', color: '#86868b', marginTop: 'auto' }}>YNK GLOBAL</div>
                          </div>
                          <div style={{ position: 'absolute', right: '8px', bottom: '8px', fontSize: '1rem' }}>🔐</div>
                        </div>
                      ))
                    )}
                  </div>
                  {/* Shelf line effect */}
                  <div style={{ height: '8px', background: '#d2d2d7', borderRadius: '4px', width: '100%', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}></div>
                </div>
              </div>

              {/* Products Preview */}
              <div style={{ background: 'white', borderRadius: '14px', padding: '18px', border: '1px solid #d2d2d7', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 600, margin: 0, color: '#1d1d1f' }}>📦 Top Products</h3>
                  <span onClick={() => setActiveTab('Catalog')} style={{ fontSize: '0.65rem', color: '#007aff', cursor: 'pointer', fontWeight: 600 }}>View All</span>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                  {catalogData.slice(0, 12).map(p => (
                    <div key={p.id} onClick={() => setSelectedProduct(p)} style={{ cursor: 'pointer', border: '1px solid #e5e5ea', borderRadius: '8px', overflow: 'hidden', transition: 'transform 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
                      <div style={{ width: '100%', height: '80px', background: '#f5f5f7' }}>
                        <img src={p.image} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => e.target.src = 'https://picsum.photos/400/300?blur=5'} />
                      </div>
                      <div style={{ padding: '8px' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#1d1d1f', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Charts (Split in two) */}
              <div style={{ background: 'white', borderRadius: '14px', padding: '12px', border: '1px solid #d2d2d7', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <h3 style={{ fontSize: '0.75rem', fontWeight: 600, margin: 0, color: '#1d1d1f' }}>💱 Exchange Rates</h3>
                  </div>
                  <div style={{ flex: 1, minHeight: '130px' }}>
                    <MarketChart
                      marketData={marketData}
                      historyData={historyData}
                      selectedCurrency={selectedCurrency}
                      setSelectedCurrency={setSelectedCurrency}
                      forcedViewType="currency"
                    />
                  </div>
                </div>

                <div style={{ borderTop: '1px solid #f5f5f7', paddingTop: '10px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <h3 style={{ fontSize: '0.75rem', fontWeight: 600, margin: 0, color: '#1d1d1f' }}>🏗️ Raw Materials</h3>
                  </div>
                  <div style={{ flex: 1, minHeight: '130px' }}>
                    <MarketChart
                      marketData={marketData}
                      historyData={historyData}
                      selectedMetal={selectedMetal}
                      setSelectedMetal={setSelectedMetal}
                      forcedViewType="metal"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Row 3: Toolbox */}
            <div style={{ background: 'white', borderRadius: '14px', padding: '16px 20px', border: '1px solid #d2d2d7', height: '90px', display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div style={{ flexShrink: 0 }}>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 600, margin: 0, color: '#1d1d1f' }}>🧰 Toolbox</h3>
              </div>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div onClick={() => setShowToolModal('cbm')} style={{ padding: '8px 16px', border: '2px solid #007aff', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', background: 'white' }}>
                  <span style={{ fontSize: '1.2rem' }}>📐</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>CBM</span>
                </div>
                <div onClick={() => setShowToolModal('tracking')} style={{ padding: '8px 16px', border: '2px solid #34c759', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', background: 'white' }}>
                  <span style={{ fontSize: '1.2rem' }}>🔍</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Track</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Full Catalog Content */
          <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <h2 style={{ fontSize: '1.6rem', fontWeight: 700, margin: 0, color: '#1d1d1f' }}>Product Catalog</h2>
                <p style={{ fontSize: '0.9rem', color: '#86868b', marginTop: '4px' }}>Explore our full inventory of high-quality products.</p>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '24px' }}>
              {catalogData.map(p => (
                <div key={p.id} onClick={() => setSelectedProduct(p)} style={{ background: 'white', borderRadius: '18px', border: '1px solid #d2d2d7', overflow: 'hidden', cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 20px 25px -5px rgb(0 0 0 / 0.1)'; }}>
                  <div style={{ width: '100%', height: '180px', background: '#f5f5f7', position: 'relative' }}>
                    <img src={p.image} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => e.target.src = 'https://picsum.photos/600/400?blur=5'} />
                  </div>
                  <div style={{ padding: '16px' }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1d1d1f', marginBottom: '4px' }}>{p.name}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Modals */}
      {showLibraryModal && <LibraryModal onClose={() => setShowLibraryModal(false)} />}

      {showCatalogModal && selectedCatalog && (
        <CatalogModal
          catalog={selectedCatalog}
          onClose={() => { setShowCatalogModal(false); setSelectedCatalog(null); }}
        />
      )}

      {selectedProduct && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setSelectedProduct(null)}>
          <div style={{ background: 'white', maxWidth: '800px', width: '95%', maxHeight: '95vh', overflowY: 'auto', borderRadius: '24px', border: '1px solid #d2d2d7', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '24px 32px', borderBottom: '1px solid #f5f5f7', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'white', zIndex: 10 }}>
              <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: '#1d1d1f' }}>{selectedProduct.name}</h2>
                <p style={{ fontSize: '0.9rem', color: '#86868b', margin: '4px 0 0 0' }}>{selectedProduct.specs?.partNo || 'No Part Number'}</p>
              </div>
              <button onClick={() => setSelectedProduct(null)} style={{ background: '#f5f5f7', border: 'none', width: '40px', height: '40px', borderRadius: '50%', cursor: 'pointer', fontSize: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}>×</button>
            </div>

            <div style={{ padding: '32px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 1fr', gap: '32px' }}>
                {/* Left: Product Image */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{ width: '100%', aspectRatio: '1/1', background: '#f5f5f7', borderRadius: '16px', overflow: 'hidden', border: '1px solid #f0f0f0' }}>
                    <img src={selectedProduct.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  </div>

                  {/* Download Buttons */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {selectedProduct.specs?.specSheet ? (
                      <a href={selectedProduct.specs.specSheet} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', background: '#007aff', color: 'white', borderRadius: '12px', textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem' }}>
                        📄 Download Spec Sheet
                      </a>
                    ) : (
                      <div style={{ padding: '12px', background: '#f5f5f7', color: '#86868b', borderRadius: '12px', textAlign: 'center', fontSize: '0.8rem', border: '1px dashed #d2d2d7' }}>
                        No Spec Sheet Available
                      </div>
                    )}
                    {selectedProduct.specs?.certificate ? (
                      <a href={selectedProduct.specs.certificate} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', background: '#34c759', color: 'white', borderRadius: '12px', textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem' }}>
                        ✅ Download Certificate
                      </a>
                    ) : (
                      <div style={{ padding: '12px', background: '#f5f5f7', color: '#86868b', borderRadius: '12px', textAlign: 'center', fontSize: '0.8rem', border: '1px dashed #d2d2d7' }}>
                        No Certificate Available
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Specifications Table */}
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '16px', color: '#1d1d1f' }}>Specifications</h3>
                  <div style={{ border: '1px solid #f0f0f0', borderRadius: '12px', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                      <tbody>
                        {[
                          { label: 'Model', value: selectedProduct.specs?.modelName },
                          { label: 'Color Temp', value: selectedProduct.specs?.colorTemp, unit: 'K' },
                          { label: 'Power', value: selectedProduct.specs?.powerConsumption, unit: 'W' },
                          { label: 'Input Voltage', value: selectedProduct.specs?.inputVoltage, unit: 'V' },
                          { label: 'Power Factor', value: selectedProduct.specs?.powerFactor },
                          { label: 'Luminous Flux', value: selectedProduct.specs?.luminousFlux, unit: 'lm' },
                          { label: 'CRI', value: selectedProduct.specs?.criRa, unit: 'Ra' },
                          { label: 'Dimensions', value: selectedProduct.specs?.dimensions },
                          { label: 'Weight', value: selectedProduct.specs?.weight },
                          { label: 'Certification', value: selectedProduct.specs?.cert }
                        ].map((spec, i) => (
                          <tr key={i} style={{ borderBottom: i === 9 ? 'none' : '1px solid #f5f5f7', background: i % 2 === 0 ? '#fafafa' : 'white' }}>
                            <td style={{ padding: '12px 16px', fontWeight: 600, color: '#86868b', width: '40%' }}>{spec.label}</td>
                            <td style={{ padding: '12px 16px', color: '#1d1d1f' }}>
                              {spec.value ? `${spec.value}${spec.unit ? ` ${spec.unit}` : ''}` : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {selectedProduct.description && (
                    <div style={{ marginTop: '24px' }}>
                      <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '8px', color: '#1d1d1f' }}>Description</h4>
                      <p style={{ fontSize: '0.9rem', color: '#424245', lineHeight: '1.5', margin: 0 }}>{selectedProduct.description}</p>
                    </div>
                  )}
                  {selectedProduct.specs?.remarks && (
                    <div style={{ marginTop: '16px', padding: '12px', background: '#fff9e6', borderRadius: '8px', border: '1px solid #ffeeba' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#856404', display: 'block', marginBottom: '4px' }}>Remarks</span>
                      <p style={{ fontSize: '0.85rem', color: '#856404', margin: 0 }}>{selectedProduct.specs.remarks}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowSettings(false)}>
          <div style={{ background: 'white', maxWidth: '400px', width: '90%', borderRadius: '20px', padding: '24px', border: '1px solid #d2d2d7' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 600, marginBottom: '20px', color: '#1d1d1f' }}>Settings</h2>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Dark Mode</span>
              <button onClick={() => setDarkMode(!darkMode)}>{darkMode ? 'ON' : 'OFF'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

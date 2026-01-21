'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import styles from './page.module.css';
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
  const [showToolModal, setShowToolModal] = useState(null); // 'cbm' | 'tracking' | null

  const [notices, setNotices] = useState([]);
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
            let trend = 'Stable';
            let cargo = Math.floor(Math.random() * 40 + 60) + '%'; // Mock data

            if (level === 'R' || level.includes('혼잡') || level.includes('포화')) {
              status = 'Congested';
              color = '#fef2f2';
              textColor = '#dc2626';
              trend = 'Increasing';
            } else if (level === 'Y' || level === 'M' || level.includes('보통')) {
              status = 'Moderate';
              color = '#fefce8';
              textColor = '#ca8a04';
              trend = 'Fluctuating';
            } else if (level === 'B' || level === 'G' || level.includes('원활')) {
              status = 'Smooth';
              color = '#f0fdf4';
              textColor = '#16a34a';
              trend = 'Stable';
            }

            return { ...hub, status, color, textColor, trend, cargo };
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
        <div className={`${styles.navItem} ${activeTab === 'Overview' && styles.navItemActive}`} onClick={() => setActiveTab('Overview')} style={{ color: activeTab === 'Overview' ? 'white' : '#86868b' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
        </div>
        <div className={styles.navItem} onClick={() => setShowLibraryModal(true)} style={{ color: '#86868b' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
        </div>
        <div className={styles.navItem} onClick={() => setShowMarketModal(true)} style={{ color: '#86868b' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
        </div>
        <div className={styles.navItem} onClick={() => setShowTrackingModal(true)} style={{ color: '#86868b' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>
        </div>
        <a href="/erp" target="_blank" rel="noopener noreferrer" className={styles.navItem} style={{ textDecoration: 'none', color: '#86868b' }}>
          <div style={{ fontWeight: 700, fontSize: '0.65rem', border: '2px solid currentColor', borderRadius: '4px', padding: '2px 4px' }}>ERP</div>
        </a>
        <div className={styles.sidebarBottom}>
          <div className={styles.navItem} onClick={() => setShowSettings(true)} style={{ color: '#86868b' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
          </div>
          <a href="/admin" className={styles.userAvatar} style={{ display: 'block' }}>
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
            <div>🇰🇷 <span style={{ fontWeight: 600, color: '#1d1d1f' }}>{times.korea}</span></div>
            <div>🇨🇳 <span style={{ fontWeight: 600, color: '#1d1d1f' }}>{times.china}</span></div>
            <div>🇻🇳 <span style={{ fontWeight: 600, color: '#1d1d1f' }}>{times.vietnam}</span></div>
          </div>
        </div>

        {/* Dashboard Grid */}
        <div style={{ flex: 1, padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px', overflow: 'hidden' }}>

          {/* Row 1: Market + Notices + News */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr) 200px 200px', gap: '10px', height: '110px' }}>
            {/* Market Cards */}
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

            {/* Notices - 네이버 검색어 순위 스타일 */}
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

            {/* News - 네이버 검색어 순위 스타일 */}
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

            {/* Incheon Port */}
            <div style={{ background: 'white', borderRadius: '14px', padding: '18px', border: '1px solid #d2d2d7', display: 'flex', flexDirection: 'column' }}>
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

            {/* Chart */}
            <div style={{ background: 'white', borderRadius: '14px', padding: '18px', border: '1px solid #d2d2d7', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 600, margin: 0, color: '#1d1d1f' }}>📈 Market Trends (30 Days)</h3>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <select value={selectedCurrency === 'usd' || selectedCurrency === 'cny' ? selectedCurrency : 'metal'} onChange={(e) => e.target.value !== 'metal' && setSelectedCurrency(e.target.value)} style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #d2d2d7', fontSize: '0.7rem', background: 'white' }}>
                    <option value="usd">USD/KRW</option>
                    <option value="cny">CNY/KRW</option>
                    <option value="metal">Metals</option>
                  </select>
                  {(selectedCurrency !== 'usd' && selectedCurrency !== 'cny') && (
                    <select value={selectedMetal} onChange={(e) => setSelectedMetal(e.target.value)} style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #d2d2d7', fontSize: '0.7rem', background: 'white' }}>
                      <option value="aluminum">Aluminum</option>
                      <option value="copper">Copper</option>
                      <option value="steel">Steel</option>
                      <option value="nickel">Nickel</option>
                      <option value="zinc">Zinc</option>
                    </select>
                  )}
                </div>
              </div>
              <div style={{ flex: 1, position: 'relative' }}>
                <svg width="100%" height="100%" style={{ overflow: 'visible' }}>
                  {chartData.length > 0 && (() => {
                    const maxVal = Math.max(...chartData.map(d => d[selectedData] || 0));
                    const minVal = Math.min(...chartData.map(d => d[selectedData] || 0).filter(v => v > 0));
                    const range = maxVal - minVal;
                    const padding = 40;
                    const width = 100; // percentage
                    const height = 100; // percentage

                    const points = chartData.map((d, i) => {
                      const x = padding + (i / (chartData.length - 1)) * (width - 2 * padding);
                      const y = height - padding - ((d[selectedData] - minVal) / range) * (height - 2 * padding);
                      return `${x}%,${y}%`;
                    }).join(' ');

                    return (
                      <>
                        <polyline
                          points={points}
                          fill="none"
                          stroke="#007aff"
                          strokeWidth="2"
                          style={{ vectorEffect: 'non-scaling-stroke' }}
                        />
                        {chartData.map((d, i) => {
                          const x = padding + (i / (chartData.length - 1)) * (width - 2 * padding);
                          const y = height - padding - ((d[selectedData] - minVal) / range) * (height - 2 * padding);
                          return (
                            <circle
                              key={i}
                              cx={`${x}%`}
                              cy={`${y}%`}
                              r="3"
                              fill="#007aff"
                            />
                          );
                        })}
                      </>
                    );
                  })()}
                </svg>
                {chartData.length === 0 && (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#86868b', fontSize: '0.8rem' }}>
                    No historical data available
                  </div>
                )}
              </div>
            </div>

            {/* Products */}
            <div style={{ background: 'white', borderRadius: '14px', padding: '18px', border: '1px solid #d2d2d7', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 600, margin: 0, color: '#1d1d1f' }}>📦 Products</h3>
                <span style={{ fontSize: '0.65rem', color: '#86868b' }}>{catalogData.length}</span>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                {catalogData.slice(0, 8).map(p => (
                  <div key={p.id} onClick={() => setSelectedProduct(p)} style={{ cursor: 'pointer', border: '1px solid #e5e5ea', borderRadius: '8px', overflow: 'hidden', transition: 'transform 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
                    <div style={{ width: '100%', height: '70px', background: '#f5f5f7' }}>
                      <img src={p.image} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => e.target.src = 'https://picsum.photos/400/300?blur=5'} />
                    </div>
                    <div style={{ padding: '6px' }}>
                      <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#1d1d1f', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Row 3: Toolbox */}
          <div style={{ background: 'white', borderRadius: '14px', padding: '16px 20px', border: '1px solid #d2d2d7', height: '90px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 600, margin: 0, color: '#1d1d1f' }}>🧰 Toolbox</h3>
              <span style={{ fontSize: '0.65rem', color: '#86868b' }}>Click to expand</span>
            </div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              {/* CBM Tool */}
              <div onClick={() => setShowToolModal('cbm')} style={{ width: '70px', height: '50px', border: '2px solid #007aff', borderRadius: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s', background: 'white' }} onMouseEnter={(e) => e.currentTarget.style.background = '#f0f9ff'} onMouseLeave={(e) => e.currentTarget.style.background = 'white'}>
                <div style={{ fontSize: '1.3rem' }}>📐</div>
                <div style={{ fontSize: '0.65rem', fontWeight: 600, color: '#1d1d1f', marginTop: '2px' }}>CBM</div>
              </div>

              {/* Tracking Tool */}
              <div onClick={() => setShowToolModal('tracking')} style={{ width: '70px', height: '50px', border: '2px solid #34c759', borderRadius: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s', background: 'white' }} onMouseEnter={(e) => e.currentTarget.style.background = '#f0fdf4'} onMouseLeave={(e) => e.currentTarget.style.background = 'white'}>
                <div style={{ fontSize: '1.3rem' }}>🔍</div>
                <div style={{ fontSize: '0.65rem', fontWeight: 600, color: '#1d1d1f', marginTop: '2px' }}>Track</div>
              </div>

              {/* More tools placeholders */}
              {[1, 2, 3, 4].map(i => (
                <div key={i} style={{ width: '70px', height: '50px', border: '2px dashed #d2d2d7', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.3 }}>
                  <div style={{ fontSize: '1.5rem', color: '#86868b' }}>+</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Modals */}
      {showLibraryModal && <LibraryModal onClose={() => setShowLibraryModal(false)} />}

      {/* CBM Tool Modal */}
      {showToolModal === 'cbm' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowToolModal(null)}>
          <div style={{ background: 'white', width: '500px', maxHeight: '80vh', borderRadius: '20px', padding: '24px', border: '1px solid #d2d2d7', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>📐</span> CBM Calculator
              </h2>
              <button onClick={() => setShowToolModal(null)} style={{ background: '#f5f5f7', border: 'none', width: '30px', height: '30px', borderRadius: '50%', cursor: 'pointer', fontSize: '1.2rem' }}>×</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', marginBottom: '16px' }}>
              {products.map(p => (
                <div key={p.id} style={{ marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid #f0f0f0' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 500, marginBottom: '6px', color: '#86868b' }}>{p.name}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                    <input type="number" placeholder="Length" style={{ padding: '8px', border: '1px solid #d2d2d7', borderRadius: '8px', fontSize: '0.8rem' }} value={p.length} onChange={(e) => handleInputChange(p.id, 'length', e.target.value)} />
                    <input type="number" placeholder="Width" style={{ padding: '8px', border: '1px solid #d2d2d7', borderRadius: '8px', fontSize: '0.8rem' }} value={p.width} onChange={(e) => handleInputChange(p.id, 'width', e.target.value)} />
                    <input type="number" placeholder="Height" style={{ padding: '8px', border: '1px solid #d2d2d7', borderRadius: '8px', fontSize: '0.8rem' }} value={p.height} onChange={(e) => handleInputChange(p.id, 'height', e.target.value)} />
                    <input type="number" placeholder="Qty" style={{ padding: '8px', border: '1px solid #d2d2d7', borderRadius: '8px', fontSize: '0.8rem' }} value={p.qty} onChange={(e) => handleInputChange(p.id, 'qty', e.target.value)} />
                  </div>
                </div>
              ))}
            </div>
            <button onClick={addProduct} style={{ width: '100%', padding: '10px', background: '#f5f5f7', border: 'none', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 500, color: '#86868b', cursor: 'pointer', marginBottom: '16px' }}>+ Add Item</button>
            <div style={{ padding: '16px', background: '#f5f5f7', borderRadius: '12px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: '#86868b', marginBottom: '4px' }}>Total Volume</div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: '#1d1d1f' }}>{calculateCBM()} m³</div>
              <div style={{ fontSize: '0.7rem', color: '#86868b', marginTop: '4px' }}>
                20ft Container: {((calculateCBM() / 28) * 100).toFixed(1)}% | 40ft Container: {((calculateCBM() / 56) * 100).toFixed(1)}%
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tracking Tool Modal */}
      {showToolModal === 'tracking' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowToolModal(null)}>
          <div style={{ background: 'white', width: '700px', maxHeight: '85vh', borderRadius: '20px', border: '1px solid #d2d2d7', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>🔍</span> Shipment Tracking
              </h2>
              <button onClick={() => setShowToolModal(null)} style={{ background: '#f5f5f7', border: 'none', width: '30px', height: '30px', borderRadius: '50%', cursor: 'pointer', fontSize: '1.2rem' }}>×</button>
            </div>

            <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                <input
                  type="text"
                  placeholder="Enter B/L or Container Number"
                  value={trackingNo}
                  onChange={(e) => setTrackingNo(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleTrack()}
                  style={{ flex: 1, padding: '10px 12px', borderRadius: '10px', border: '1px solid #d2d2d7', fontSize: '0.85rem' }}
                />
                <button
                  onClick={handleTrack}
                  disabled={isTracking}
                  style={{ padding: '0 20px', background: '#1a1a1a', color: 'white', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: 500, fontSize: '0.85rem' }}
                >
                  {isTracking ? '...' : 'Track'}
                </button>
              </div>

              {trackResult && (
                <div>
                  {trackResult.error ? (
                    <div style={{ padding: '14px', background: '#fef2f2', borderRadius: '10px', border: '1px solid #fecaca' }}>
                      <div style={{ fontWeight: 500, color: '#dc2626', fontSize: '0.85rem' }}>{trackResult.error}</div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {/* Header Status */}
                      <div style={{ padding: '14px', background: '#f0fdf4', borderRadius: '10px', border: '1px solid #d1fae5' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <span style={{ fontSize: '0.7rem', color: '#065f46', fontWeight: 600 }}>
                            {trackResult.type === 'IMPORT' ? '📥 IMPORT' : '📤 EXPORT'}
                          </span>
                          <span style={{ fontSize: '0.7rem', padding: '3px 10px', background: '#d1fae5', color: '#065f46', borderRadius: '6px', fontWeight: 600 }}>
                            {trackResult.data?.prgsStts || trackResult.data?.csclPrgsStts || 'In Progress'}
                          </span>
                        </div>
                        <div style={{ fontSize: '1rem', fontWeight: 700, color: '#065f46' }}>
                          {trackResult.data?.shipNm || trackResult.data?.sanm || 'Vessel/Flight'}
                        </div>
                        {trackResult.data?.vydf && (
                          <div style={{ fontSize: '0.7rem', color: '#047857', marginTop: '2px' }}>Voyage: {trackResult.data.vydf}</div>
                        )}
                      </div>

                      {/* Cargo Info */}
                      <div style={{ background: '#fafafa', borderRadius: '10px', padding: '12px' }}>
                        <h3 style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '10px', color: '#1d1d1f' }}>📦 Cargo Information</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.7rem' }}>
                          {trackResult.data?.mblNo && (<div><span style={{ color: '#86868b' }}>MBL:</span> <span style={{ fontWeight: 600, color: '#1d1d1f' }}>{trackResult.data.mblNo}</span></div>)}
                          {trackResult.data?.hblNo && (<div><span style={{ color: '#86868b' }}>HBL:</span> <span style={{ fontWeight: 600, color: '#1d1d1f' }}>{trackResult.data.hblNo}</span></div>)}
                          {trackResult.data?.blNo && (<div><span style={{ color: '#86868b' }}>B/L:</span> <span style={{ fontWeight: 600, color: '#1d1d1f' }}>{trackResult.data.blNo}</span></div>)}
                          {trackResult.data?.cargMtNo && (<div><span style={{ color: '#86868b' }}>Cargo No:</span> <span style={{ fontWeight: 600, color: '#1d1d1f' }}>{trackResult.data.cargMtNo}</span></div>)}
                          {trackResult.data?.prnm && (<div style={{ gridColumn: 'span 2' }}><span style={{ color: '#86868b' }}>Cargo:</span> <span style={{ fontWeight: 600, color: '#1d1d1f' }}>{trackResult.data.prnm}</span></div>)}
                          {trackResult.data?.pckGcnt && (<div><span style={{ color: '#86868b' }}>Packages:</span> <span style={{ fontWeight: 600, color: '#1d1d1f' }}>{trackResult.data.pckGcnt} {trackResult.data.pckUt || ''}</span></div>)}
                          {trackResult.data?.ttwg && (<div><span style={{ color: '#86868b' }}>Weight:</span> <span style={{ fontWeight: 600, color: '#1d1d1f' }}>{trackResult.data.ttwg} {trackResult.data.wghtUt || 'KG'}</span></div>)}
                        </div>
                      </div>

                      {/* Route Info */}
                      <div style={{ background: '#fafafa', borderRadius: '10px', padding: '12px' }}>
                        <h3 style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '10px', color: '#1d1d1f' }}>🚢 Route</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.7rem' }}>
                          {trackResult.data?.ldprNm && (<div><span style={{ color: '#86868b' }}>From:</span> <span style={{ fontWeight: 600, color: '#1d1d1f' }}>{trackResult.data.ldprNm}</span></div>)}
                          {trackResult.data?.dsprNm && (<div><span style={{ color: '#86868b' }}>To:</span> <span style={{ fontWeight: 600, color: '#1d1d1f' }}>{trackResult.data.dsprNm}</span></div>)}
                          {trackResult.data?.etprDt && (<div><span style={{ color: '#86868b' }}>Arrival:</span> <span style={{ fontWeight: 600, color: '#1d1d1f' }}>{trackResult.data.etprDt}</span></div>)}
                          {trackResult.data?.tkofDt && (<div><span style={{ color: '#86868b' }}>Departure:</span> <span style={{ fontWeight: 600, color: '#1d1d1f' }}>{trackResult.data.tkofDt}</span></div>)}
                          {trackResult.data?.etprCstm && (<div><span style={{ color: '#86868b' }}>Customs:</span> <span style={{ fontWeight: 600, color: '#1d1d1f' }}>{trackResult.data.etprCstm}</span></div>)}
                          {trackResult.data?.shpmAirptPortNm && (<div><span style={{ color: '#86868b' }}>Port:</span> <span style={{ fontWeight: 600, color: '#1d1d1f' }}>{trackResult.data.shpmAirptPortNm}</span></div>)}
                        </div>
                      </div>

                      {/* Customs Progress */}
                      {trackResult.data?.csclPrgsStts && (
                        <div style={{ background: '#fafafa', borderRadius: '10px', padding: '12px' }}>
                          <h3 style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '10px', color: '#1d1d1f' }}>📋 Customs Progress</h3>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #d1fae5' }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#065f46' }}>{trackResult.data.csclPrgsStts}</div>
                            {trackResult.data.prcsDttm && (
                              <div style={{ fontSize: '0.65rem', color: '#047857', marginLeft: 'auto' }}>
                                {trackResult.data.prcsDttm.substring(0, 8)} {trackResult.data.prcsDttm.substring(8, 10)}:{trackResult.data.prcsDttm.substring(10, 12)}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Timeline */}
                      {trackResult.details && trackResult.details.length > 0 && (
                        <div style={{ background: '#fafafa', borderRadius: '10px', padding: '12px' }}>
                          <h3 style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '10px', color: '#1d1d1f' }}>📍 Timeline</h3>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {trackResult.details.map((detail, idx) => (
                              <div key={idx} style={{ padding: '8px', background: 'white', borderRadius: '8px', border: '1px solid #e5e5ea' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                                  <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#1d1d1f' }}>{detail.cargTrcnRelaBsopTpcd || 'Activity'}</span>
                                  {detail.prcsDttm && (
                                    <span style={{ fontSize: '0.65rem', color: '#86868b' }}>
                                      {detail.prcsDttm.substring(0, 8)} {detail.prcsDttm.substring(8, 10)}:{detail.prcsDttm.substring(10, 12)}
                                    </span>
                                  )}
                                </div>
                                {detail.rlbrCn && (<div style={{ fontSize: '0.65rem', color: '#6b7280' }}>{detail.rlbrCn}</div>)}
                                {detail.shedNm && (<div style={{ fontSize: '0.65rem', color: '#86868b', marginTop: '2px' }}>📍 {detail.shedNm}</div>)}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Product Detail Modal */}
      {selectedProduct && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setSelectedProduct(null)}>
          <div style={{ background: 'white', maxWidth: '600px', width: '90%', maxHeight: '90vh', overflowY: 'auto', borderRadius: '20px', border: '1px solid #d2d2d7' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '24px', borderBottom: '1px solid #f5f5f7', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 600, margin: 0, color: '#1d1d1f' }}>{selectedProduct.name}</h2>
              <button onClick={() => setSelectedProduct(null)} style={{ background: '#f5f5f7', border: 'none', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', fontSize: '1.3rem' }}>×</button>
            </div>
            <div style={{ padding: '24px' }}>
              <div style={{ width: '100%', height: '280px', background: '#f5f5f7', borderRadius: '12px', marginBottom: '24px', overflow: 'hidden' }}>
                <img src={selectedProduct.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '12px', color: '#1d1d1f' }}>Specifications</h3>
              <div style={{ border: '1px solid #d2d2d7', borderRadius: '10px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <tbody>
                    {[
                      { label: 'Part No', key: 'partNo' },
                      { label: 'Model', key: 'modelName' },
                      { label: 'Color Temp', key: 'colorTemp', unit: 'K' },
                      { label: 'Power', key: 'powerConsumption', unit: 'W' },
                      { label: 'CRI', key: 'criRa', unit: 'Ra' }
                    ].map((row, i) => (
                      <tr key={row.key} style={{ borderBottom: i === 4 ? 'none' : '1px solid #f5f5f7' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 500, color: '#86868b', width: '35%', background: '#fafafa' }}>{row.label}</td>
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

      {/* Settings Modal */}
      {showSettings && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowSettings(false)}>
          <div style={{ background: 'white', maxWidth: '400px', width: '90%', borderRadius: '20px', padding: '24px', border: '1px solid #d2d2d7' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 600, marginBottom: '20px', color: '#1d1d1f' }}>Settings</h2>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.9rem' }}>Dark Mode</span>
              <button onClick={() => setDarkMode(!darkMode)} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #d2d2d7', background: darkMode ? '#1d1d1f' : 'white', color: darkMode ? 'white' : '#1d1d1f', cursor: 'pointer', fontWeight: 500 }}>{darkMode ? 'ON' : 'OFF'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Market Modal with full chart */}
      {showMarketModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowMarketModal(false)}>
          <div style={{ background: 'white', maxWidth: '900px', width: '90%', maxHeight: '90vh', borderRadius: '20px', padding: '32px', border: '1px solid #d2d2d7' }} onClick={e => e.stopPropagation()}>
            <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 600, margin: 0 }}>Market Analysis</h2>
              <button onClick={() => setShowMarketModal(false)} style={{ background: '#f5f5f7', border: 'none', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', fontSize: '1.3rem' }}>×</button>
            </div>
            <div style={{ fontSize: '0.85rem', color: '#86868b' }}>Detailed market trend analysis coming soon...</div>
          </div>
        </div>
      )}

      {showTrackingModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowTrackingModal(false)}>
          <div style={{ background: 'white', maxWidth: '600px', width: '90%', borderRadius: '20px', padding: '32px', border: '1px solid #d2d2d7' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 600, marginBottom: '20px' }}>Advanced Tracking</h2>
            <div style={{ fontSize: '0.85rem', color: '#86868b' }}>Advanced tracking features coming soon...</div>
          </div>
        </div>
      )}
    </div>
  );
}

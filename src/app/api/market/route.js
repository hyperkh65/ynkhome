import { NextResponse } from 'next/server';

export async function GET() {
    try {
        // 1 & 2. Fetch Exchange Rates and SHFE Metal Prices concurrently
        const [exchangeRes, metalRes] = await Promise.all([
            fetch('https://api.manana.kr/exchange/rate/KRW/USD,CNY.json', { cache: 'no-store' }),
            fetch('http://hq.sinajs.cn/list=nf_AL0,nf_CU0,nf_RB0,nf_NI0,nf_ZN0', {
                headers: { 'Referer': 'http://finance.sina.com.cn' },
                cache: 'no-store'
            })
        ]);

        const [exchangeData, metalRaw] = await Promise.all([
            exchangeRes.json(),
            metalRes.text()
        ]);

        const parseSina = (str, symbol) => {
            const match = str.match(new RegExp(`hq_str_${symbol}="([^"]+)"`));
            if (!match) return null;
            const parts = match[1].split(',');
            // index 5 is Prev Close, index 8 is Latest price
            return {
                prevClose: parseFloat(parts[5]),
                last: parseFloat(parts[8])
            };
        };

        const rates = {
            usd: exchangeData.find(i => i.name.includes('USD'))?.rate || 0,
            cny: exchangeData.find(i => i.name.includes('CNY'))?.rate || 0
        };

        return NextResponse.json({
            success: true,
            timestamp: new Date().toISOString(),
            rates,
            metals: {
                aluminum: parseSina(metalRaw, 'nf_AL0'),
                copper: parseSina(metalRaw, 'nf_CU0'),
                steel: parseSina(metalRaw, 'nf_RB0'),
                nickel: parseSina(metalRaw, 'nf_NI0'),
                zinc: parseSina(metalRaw, 'nf_ZN0')
            }
        });
    } catch (error) {
        console.error('Market API Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

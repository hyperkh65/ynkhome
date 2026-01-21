import { XMLParser } from 'fast-xml-parser';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const blNo = searchParams.get('blNo');
    const currentYear = new Date().getFullYear();
    const searchYears = [currentYear, currentYear - 1, currentYear - 2];

    let finalResult = null;

    if (!blNo) {
        return Response.json({ success: false, error: 'B/L number is required' }, { status: 400 });
    }

    // User's provided Unipass API Key
    const crkyCn = 'r260g286i041p271c040p050q0';

    try {
        const parser = new XMLParser({
            ignoreAttributes: false,
            trimValues: true,
            parseTagValue: true,
        });

        for (const year of searchYears) {
            if (finalResult) break;

            // Try as House B/L (hblNo)
            let url = `https://unipass.customs.go.kr:38010/ext/rest/cargCsclPrgsInfoQry/retrieveCargCsclPrgsInfo?crkyCn=${crkyCn}&hblNo=${blNo}&blYy=${year}`;
            let response = await fetch(url, { method: 'GET', cache: 'no-store' });
            let xmlData = await response.text();
            let jObj = parser.parse(xmlData);
            let result = jObj?.CargoCsclPrgsInfoQryRslt;

            if (result && result.tcnt > 0 && result.prgsStts) {
                finalResult = result;
                break;
            }

            // Try as Master B/L (mblNo)
            url = `https://unipass.customs.go.kr:38010/ext/rest/cargCsclPrgsInfoQry/retrieveCargCsclPrgsInfo?crkyCn=${crkyCn}&mblNo=${blNo}&blYy=${year}`;
            response = await fetch(url, { method: 'GET', cache: 'no-store' });
            xmlData = await response.text();
            jObj = parser.parse(xmlData);
            result = jObj?.CargoCsclPrgsInfoQryRslt;

            if (result && result.tcnt > 0) {
                finalResult = result;
                break;
            }
        }

        if (!finalResult) {
            return Response.json({
                success: false,
                error: 'No shipment found in UNIPASS for this B/L number. (Searched 2024-2026)',
            });
        }

        return Response.json({
            success: true,
            data: finalResult
        });
    } catch (error) {
        return Response.json({ success: false, error: error.message }, { status: 500 });
    }
}

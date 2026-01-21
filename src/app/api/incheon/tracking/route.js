import { XMLParser } from 'fast-xml-parser';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    let blNo = searchParams.get('blNo');

    if (!blNo) {
        return Response.json({ success: false, error: 'B/L number is required' }, { status: 400 });
    }

    // Clean inputs
    blNo = blNo.trim().toUpperCase();

    const currentYear = new Date().getFullYear();
    const searchYears = [currentYear, currentYear - 1, currentYear - 2];
    const crkyCn = 'r260g286i041p271c040p050q0';
    const parser = new XMLParser({
        ignoreAttributes: false,
        trimValues: true,
        parseTagValue: true,
        removeNSPrefix: true, // Handle possible namespace prefixes
    });

    try {
        // 1. Try IMPORT Tracking (API001) - retrieveCargCsclPrgsInfo
        for (const year of searchYears) {
            const types = ['hblNo', 'mblNo'];
            for (const type of types) {
                let url = `https://unipass.customs.go.kr:38010/ext/rest/cargCsclPrgsInfoQry/retrieveCargCsclPrgsInfo?crkyCn=${crkyCn}&${type}=${blNo}&blYy=${year}`;
                let response = await fetch(url, { method: 'GET', cache: 'no-store' });
                let xmlData = await response.text();
                let jObj = parser.parse(xmlData);

                // Path based on manual: cargCsclPrgsInfoQryRtnVo -> cargCsclPrgsInfoQryVo
                const root = jObj?.cargCsclPrgsInfoQryRtnVo;
                const result = root?.cargCsclPrgsInfoQryVo;
                const totalCount = parseInt(root?.tCnt || 0);

                if (totalCount > 0 && result) {
                    return Response.json({
                        success: true,
                        type: 'IMPORT',
                        data: result
                    });
                }
            }
        }

        // 2. Try EXPORT Tracking (API002) - retrieveExpDclrNoPrExpFfmnBrkd
        // Note: Export API002 doesn't always strictly require year, but B/L search is separate.
        const exportUrl = `https://unipass.customs.go.kr:38010/ext/rest/expDclrNoPrExpFfmnBrkdQry/retrieveExpDclrNoPrExpFfmnBrkd?crkyCn=${crkyCn}&blNo=${blNo}`;
        const expRes = await fetch(exportUrl, { method: 'GET', cache: 'no-store' });
        const expXml = await expRes.text();
        const expObj = parser.parse(expXml);

        // Path based on manual: expDclrNoPrExpFfmnBrkdQryRtnVo -> expDclrNoPrExpFfmnBrkdBlNoQryRsltVo
        const expRoot = expObj?.expDclrNoPrExpFfmnBrkdQryRtnVo;
        const expResult = expRoot?.expDclrNoPrExpFfmnBrkdBlNoQryRsltVo;
        const expCount = parseInt(expRoot?.tCnt || 0);

        if (expCount > 0 && expResult) {
            return Response.json({
                success: true,
                type: 'EXPORT',
                data: Array.isArray(expResult) ? expResult[0] : expResult
            });
        }

        return Response.json({
            success: false,
            error: 'No shipment found in UNIPASS (Import/Export). Checked 2024-2026.',
        });

    } catch (error) {
        return Response.json({ success: false, error: 'Customs Link Error: ' + error.message }, { status: 500 });
    }
}

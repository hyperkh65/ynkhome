import { XMLParser } from 'fast-xml-parser';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const blNo = searchParams.get('blNo');
    const currentYear = new Date().getFullYear();
    const searchYears = [currentYear, currentYear - 1, currentYear - 2];

    if (!blNo) {
        return Response.json({ success: false, error: 'B/L number is required' }, { status: 400 });
    }

    const crkyCn = 'r260g286i041p271c040p050q0';
    const parser = new XMLParser({
        ignoreAttributes: false,
        trimValues: true,
        parseTagValue: true,
    });

    try {
        // 1. Try IMPORT Tracking (API001)
        for (const year of searchYears) {
            // Try as House B/L
            let url = `https://unipass.customs.go.kr:38010/ext/rest/cargCsclPrgsInfoQry/retrieveCargCsclPrgsInfo?crkyCn=${crkyCn}&hblNo=${blNo}&blYy=${year}`;
            let response = await fetch(url, { method: 'GET', cache: 'no-store' });
            let xmlData = await response.text();
            let jObj = parser.parse(xmlData);

            let result = jObj?.CargoCsclPrgsInfoQryRslt || jObj?.cargCsclPrgsInfoQryRtnVo?.cargCsclPrgsInfoQryVo;

            if (result && (result.tcnt > 0 || result.cargMtNo)) {
                return Response.json({ success: true, type: 'IMPORT', data: result });
            }

            // Try as Master B/L
            url = `https://unipass.customs.go.kr:38010/ext/rest/cargCsclPrgsInfoQry/retrieveCargCsclPrgsInfo?crkyCn=${crkyCn}&mblNo=${blNo}&blYy=${year}`;
            response = await fetch(url, { method: 'GET', cache: 'no-store' });
            xmlData = await response.text();
            jObj = parser.parse(xmlData);
            result = jObj?.CargoCsclPrgsInfoQryRslt || jObj?.cargCsclPrgsInfoQryRtnVo?.cargCsclPrgsInfoQryVo;

            if (result && (result.tcnt > 0 || result.cargMtNo)) {
                return Response.json({ success: true, type: 'IMPORT', data: result });
            }
        }

        // 2. Try EXPORT Tracking (API002) if import failed
        // The export API uses blNo directly.
        const exportUrl = `https://unipass.customs.go.kr:38010/ext/rest/expDclrNoPrExpFfmnBrkdQry/retrieveExpDclrNoPrExpFfmnBrkd?crkyCn=${crkyCn}&blNo=${blNo}`;
        const expRes = await fetch(exportUrl, { method: 'GET', cache: 'no-store' });
        const expXml = await expRes.text();
        const expObj = parser.parse(expXml);

        // Result VO for Export via B/L search: expDclrNoPrExpFfmnBrkdBlNoQryRsltVo
        const expResult = expObj?.expDclrNoPrExpFfmnBrkdQryRtnVo?.expDclrNoPrExpFfmnBrkdBlNoQryRsltVo;

        if (expResult) {
            return Response.json({ success: true, type: 'EXPORT', data: expResult });
        }

        return Response.json({
            success: false,
            error: 'No shipment found in UNIPASS (Import/Export). Please check B/L number.',
            debug: { searchYears, blNo }
        });

    } catch (error) {
        return Response.json({ success: false, error: 'Network Error: ' + error.message }, { status: 500 });
    }
}

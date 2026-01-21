import { XMLParser } from 'fast-xml-parser';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const blNo = searchParams.get('blNo');
    const blYy = searchParams.get('blYy') || new Date().getFullYear().toString();

    if (!blNo) {
        return Response.json({ success: false, error: 'B/L number is required' }, { status: 400 });
    }

    // User's provided Unipass API Key
    const crkyCn = 'r260g286i041p271c040p050q0';

    // Try as House B/L (hblNo) first
    let url = `https://unipass.customs.go.kr:38010/ext/rest/cargCsclPrgsInfoQry/retrieveCargCsclPrgsInfo?crkyCn=${crkyCn}&hblNo=${blNo}&blYy=${blYy}`;

    try {
        let response = await fetch(url, { method: 'GET', cache: 'no-store' });
        let xmlData = await response.text();

        const parser = new XMLParser({
            ignoreAttributes: false,
            trimValues: true,
            parseTagValue: true,
        });

        let jObj = parser.parse(xmlData);
        let result = jObj?.CargoCsclPrgsInfoQryRslt;

        // If House B/L search yielded no result, try as Master B/L (mblNo)
        if (!result || result.tcnt === 0 || !result.prgsStts) {
            url = `https://unipass.customs.go.kr:38010/ext/rest/cargCsclPrgsInfoQry/retrieveCargCsclPrgsInfo?crkyCn=${crkyCn}&mblNo=${blNo}&blYy=${blYy}`;
            response = await fetch(url, { method: 'GET', cache: 'no-store' });
            xmlData = await response.text();
            jObj = parser.parse(xmlData);
            result = jObj?.CargoCsclPrgsInfoQryRslt;
        }

        if (!result || result.tcnt === 0) {
            return Response.json({
                success: false,
                error: 'No shipment found in UNIPASS for this B/L number.',
                debug: jObj // Include for debugging if needed
            });
        }

        return Response.json({
            success: true,
            data: result
        });
    } catch (error) {
        return Response.json({ success: false, error: error.message }, { status: 500 });
    }
}

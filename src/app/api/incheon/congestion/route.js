import { XMLParser } from 'fast-xml-parser';

export async function GET() {
    const serviceKey = 'fdaB3P7aU1Lg%2FFcn7n6x93VXyImQ6iNeXCeM8V1g61tVZqqwB3pgFlLMlVXrfSlz5t14b8D2tRjVRFiFesN%2Bew%3D%3D';
    const url = `https://opendata.icpa.or.kr/OpenAPI/service/ipaTrmnlCnf/getTrmnlCnf?serviceKey=${serviceKey}&skipRow=1&endRow=10&numOfRows=10`;

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: { 'Accept': 'application/xml' },
            cache: 'no-store'
        });

        const xmlData = await response.text();

        // Detailed Parsing with fast-xml-parser options
        const parser = new XMLParser({
            ignoreAttributes: false,
            trimValues: true,
            parseTagValue: true,
            isArray: (name) => {
                // Force these tags to be arrays even if there's only one
                return ['GetTrmnlCnfVO', 'item'].indexOf(name) !== -1;
            }
        });

        const jObj = parser.parse(xmlData);
        console.log("Parsed JSON:", JSON.stringify(jObj));

        // Try multiple possible paths just in case
        const items = jObj?.GetTrmnlCnfResponse?.body?.item?.[0]?.GetTrmnlCnfVO ||
            jObj?.GetTrmnlCnfResponse?.body?.item?.GetTrmnlCnfVO ||
            [];

        return Response.json({
            success: true,
            data: Array.isArray(items) ? items : [items],
            _debug: {
                url: url.replace(serviceKey, 'HIDDEN'),
                hasData: !!items,
                rawKeys: Object.keys(jObj || {})
            }
        });
    } catch (error) {
        return Response.json({ success: false, error: error.message }, { status: 500 });
    }
}

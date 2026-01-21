import { XMLParser } from 'fast-xml-parser';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const blNo = searchParams.get('blNo');

    if (!blNo) {
        return Response.json({ success: false, error: 'B/L number is required' }, { status: 400 });
    }

    const serviceKey = 'fdaB3P7aU1Lg%2FFcn7n6x93VXyImQ6iNeXCeM8V1g61tVZqqwB3pgFlLMlVXrfSlz5t14b8D2tRjVRFiFesN%2Bew%3D%3D';
    // Endpoint for Shipment Declaration (B/L search)
    const url = `https://opendata.icpa.or.kr/OpenAPI/service/ipaShipDeclInfo/getShipDeclInfo?serviceKey=${serviceKey}&blNo=${blNo}&numOfRows=10&pageNo=1`;

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: { 'Accept': 'application/xml' },
            cache: 'no-store'
        });

        const xmlData = await response.text();
        const parser = new XMLParser({
            ignoreAttributes: false,
            trimValues: true,
            parseTagValue: true,
            isArray: (name) => ['item', 'GetShipDeclInfoVO'].indexOf(name) !== -1
        });

        const jObj = parser.parse(xmlData);

        // Structure for ipaShipDeclInfo: GetShipDeclInfoResponse -> body -> item -> GetShipDeclInfoVO
        const items = jObj?.GetShipDeclInfoResponse?.body?.item?.[0]?.GetShipDeclInfoVO ||
            jObj?.GetShipDeclInfoResponse?.body?.item?.GetShipDeclInfoVO || [];

        return Response.json({
            success: true,
            data: Array.isArray(items) ? items : [items]
        });
    } catch (error) {
        return Response.json({ success: false, error: error.message }, { status: 500 });
    }
}

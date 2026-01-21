import { XMLParser } from 'fast-xml-parser';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const termCd = searchParams.get('termCd') || 'IT003'; // Default to IT003 if not provided
    const searchYear = new Date().getFullYear().toString();

    const serviceKey = 'fdaB3P7aU1Lg%2FFcn7n6x93VXyImQ6iNeXCeM8V1g61tVZqqwB3pgFlLMlVXrfSlz5t14b8D2tRjVRFiFesN%2Bew%3D%3D';
    const url = `https://opendata.icpa.or.kr/OpenAPI/service/ipaTrmnlIntegratInfo/getTrmnlIntegratInfo?serviceKey=${serviceKey}&termCd=${termCd}&searchYear=${searchYear}&numOfRows=10&skipRow=0&endRow=10`;

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
            isArray: (name) => ['item', 'GetTrmnlIntegratInfoVO'].indexOf(name) !== -1
        });

        const jObj = parser.parse(xmlData);

        // Structure: GetTrmnlIntegratInfoResponse -> body -> item -> GetTrmnlIntegratInfoVO
        const items = jObj?.GetTrmnlIntegratInfoResponse?.body?.item?.[0]?.GetTrmnlIntegratInfoVO ||
            jObj?.GetTrmnlIntegratInfoResponse?.body?.item?.GetTrmnlIntegratInfoVO || [];

        return Response.json({
            success: true,
            data: Array.isArray(items) ? items : [items]
        });
    } catch (error) {
        return Response.json({ success: false, error: error.message }, { status: 500 });
    }
}

import { XMLParser } from 'fast-xml-parser';

export async function GET() {
    const serviceKey = 'fdaB3P7aU1Lg%2FFcn7n6x93VXyImQ6iNeXCeM8V1g61tVZqqwB3pgFlLMlVXrfSlz5t14b8D2tRjVRFiFesN%2Bew%3D%3D';
    const url = `https://opendata.icpa.or.kr/OpenAPI/service/ipaTrmnlCnf/getTrmnlCnf?serviceKey=${serviceKey}&skipRow=1&endRow=10&numOfRows=10`;

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: { 'Accept': 'application/xml' },
            next: { revalidate: 30 }
        });

        const xmlData = await response.text();
        const parser = new XMLParser();
        const jObj = parser.parse(xmlData);

        // The structure found via curl: GetTrmnlCnfResponse.body.item.GetTrmnlCnfVO
        const items = jObj?.GetTrmnlCnfResponse?.body?.item?.GetTrmnlCnfVO;

        if (items) {
            return Response.json({
                success: true,
                data: Array.isArray(items) ? items : [items]
            });
        }

        return Response.json({ success: false, raw: jObj, message: "Structure mismatch" });
    } catch (error) {
        return Response.json({ success: false, error: error.message }, { status: 500 });
    }
}

import { XMLParser } from 'fast-xml-parser';

export async function GET() {
    // Pre-encoded Service Key provided by user
    const serviceKey = 'fdaB3P7aU1Lg%2FFcn7n6x93VXyImQ6iNeXCeM8V1g61tVZqqwB3pgFlLMlVXrfSlz5t14b8D2tRjVRFiFesN%2Bew%3D%3D';

    // Terminal Congestion API Endpoint
    const url = `https://opendata.icpa.or.kr/OpenAPI/service/ipaTrmnlCnf/getTrmnlCnf?serviceKey=${serviceKey}&skipRow=1&endRow=10&numOfRows=10`;

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/xml'
            },
            next: { revalidate: 60 } // Cache for 1 minute
        });

        const xmlData = await response.text();

        // Parse XML to JSON
        const parser = new XMLParser();
        const jObj = parser.parse(xmlData);

        // Return the parsed JSON
        return Response.json(jObj);
    } catch (error) {
        console.error("ICPA API XML Parsing Error:", error);
        return Response.json({ success: false, error: error.message }, { status: 500 });
    }
}

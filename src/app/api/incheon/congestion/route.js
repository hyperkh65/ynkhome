export async function GET() {
    // Use the pre-encoded key directly as public data APIs are often sensitive to double encoding
    const serviceKey = 'fdaB3P7aU1Lg%2FFcn7n6x93VXyImQ6iNeXCeM8V1g61tVZqqwB3pgFlLMlVXrfSlz5t14b8D2tRjVRFiFesN%2Bew%3D%3D';
    const url = `https://opendata.icpa.or.kr/OpenAPI/service/ipaTrmnlCnf/getTrmnlCnf?serviceKey=${serviceKey}&numOfRows=10&pageNo=1&skipRow=1&endRow=10&_type=json`;

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });

        const text = await response.text();

        // Some older government APIs return XML even if JSON is requested.
        // If it looks like XML, we might need a parser, but let's try to parse as JSON first.
        try {
            const data = JSON.parse(text);
            return Response.json(data);
        } catch (e) {
            // If it's XML, for now we'll return the raw text or a simple error to debug
            // In a real scenario, we'd use an XML to JSON parser here.
            return Response.json({ success: false, raw: text, message: "Parsed as XML, needs conversion" });
        }
    } catch (error) {
        return Response.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function GET() {
    // Pre-encoded Service Key from user
    const serviceKey = 'fdaB3P7aU1Lg%2FFcn7n6x93VXyImQ6iNeXCeM8V1g61tVZqqwB3pgFlLMlVXrfSlz5t14b8D2tRjVRFiFesN%2Bew%3D%3D';

    // Strict parameter matching from ICPA spec: serviceKey, endRow, skipRow, numOfRows
    const url = `https://opendata.icpa.or.kr/OpenAPI/service/ipaTrmnlCnf/getTrmnlCnf?serviceKey=${serviceKey}&skipRow=1&endRow=10&numOfRows=10&_type=json`;

    try {
        const response = await fetch(url, {
            method: 'GET',
            next: { revalidate: 60 } // Cache for 1 minute
        });

        const data = await response.json();
        return Response.json(data);
    } catch (error) {
        console.error("ICPA API Error:", error);
        return Response.json({ success: false, error: error.message }, { status: 500 });
    }
}

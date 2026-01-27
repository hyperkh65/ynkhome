import { NextResponse } from 'next/server';

export async function GET() {
    try {
        // Basic RSS Feed for ETNews (General/Popular)
        // Using a server-side fetch to avoid CORS
        const response = await fetch('https://rss.etnews.com/Section901.xml', { cache: 'no-store' });
        const textData = await response.text();

        // Simple XML parsing using Regex to avoid heavy dependencies
        // Matches <item> ... <title>...</title> <link>...</link> ... </item>
        const items = [];
        const itemRegex = /<item>([\s\S]*?)<\/item>/g;
        const titleRegex = /<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/;
        const linkRegex = /<link>(.*?)<\/link>/;
        const dateRegex = /<pubDate>(.*?)<\/pubDate>/;

        let match;
        while ((match = itemRegex.exec(textData)) !== null && items.length < 5) {
            const itemContent = match[1];
            const titleMatch = titleRegex.exec(itemContent);
            const linkMatch = linkRegex.exec(itemContent);
            const dateMatch = dateRegex.exec(itemContent);

            if (titleMatch && linkMatch) {
                items.push({
                    title: titleMatch[1] || titleMatch[2], // CDATA or normal
                    link: linkMatch[1],
                    date: dateMatch ? new Date(dateMatch[1]).toLocaleDateString() : ''
                });
            }
        }

        return NextResponse.json({ news: items });
    } catch (error) {
        console.error('RSS Fetch Error:', error);
        return NextResponse.json({ news: [], error: 'Failed to fetch news' }, { status: 500 });
    }
}

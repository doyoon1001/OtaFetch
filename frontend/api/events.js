import { setCors, getRows, appendRow, nextId, SPREADSHEET_ID } from './_lib/sheets.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'GET') {
      const rows = await getRows('events');
      const events = rows
        .filter(r => r[0])
        .map(r => ({ id: parseInt(r[0]), name: r[1], date: r[2] || new Date().toISOString() }));
      return res.json(events);
    }

    if (req.method === 'POST') {
      const { name, date } = req.body;
      const id = nextId();
      const eventDate = date || new Date().toISOString().split('T')[0];
      await appendRow('events', [id, name, eventDate]);
      return res.json({ id, name, date: eventDate });
    }

    res.status(405).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

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
      const rows = await getRows('events');
      const id = nextId(rows);
      const { name } = req.body;
      const date = new Date().toISOString();
      await appendRow('events', [id, name, date]);
      return res.json({ id, name, date });
    }

    res.status(405).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

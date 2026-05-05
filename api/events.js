import { setCors, getRows, appendRow, nextId } from './_lib/sheets.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'GET') {
      const rows = await getRows('events');
      const events = rows
        .filter(r => r[0])
        .map(r => ({ id: parseInt(r[0]), name: r[1], date: r[2] || '', end_date: r[3] || '' }));
      return res.json(events);
    }

    if (req.method === 'POST') {
      const { name, date, end_date } = req.body;
      const id = nextId();
      await appendRow('events', [id, name, date || '', end_date || '']);
      return res.json({ id, name, date: date || '', end_date: end_date || '' });
    }

    res.status(405).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

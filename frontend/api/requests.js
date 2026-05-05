import { setCors, getRows, appendRow, nextId } from './_lib/sheets.js';

const HEADERS = ['id','event_id','event_name','buyer_id','name','circle_name','address','item_name','quantity','status','created_at'];

function rowToRequest(r) {
  r = [...r, ...Array(HEADERS.length).fill('')].slice(0, HEADERS.length);
  return {
    id:          parseInt(r[0]) || 0,
    event_id:    parseInt(r[1]) || 0,
    buyer_id:    parseInt(r[3]) || 0,
    name:        r[4],
    circle_name: r[5],
    address:     r[6],
    item_name:   r[7],
    quantity:    parseInt(r[8]) || 0,
    status:      r[9] || '신청완료',
    created_at:  r[10],
    event: { id: parseInt(r[1]) || 0, name: r[2], date: r[10] },
  };
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'GET') {
      const buyerId = req.query.buyer_id ? parseInt(req.query.buyer_id) : null;
      const rows = await getRows('requests');
      let data = rows.filter(r => r[0]).map(rowToRequest);
      if (buyerId) data = data.filter(r => r.buyer_id === buyerId);
      return res.json(data);
    }

    if (req.method === 'POST') {
      const buyerId = parseInt(req.query.buyer_id);
      const { event_id, event_name, name, circle_name, address, item_name, quantity } = req.body;
      const id = nextId();
      const now = new Date().toLocaleString('ko-KR');
      await appendRow('requests', [id, event_id, event_name || '', buyerId, name, circle_name, address, item_name, quantity, '신청완료', now]);
      return res.json(rowToRequest([String(id), String(event_id), event_name || '', String(buyerId), name, circle_name, address, item_name, String(quantity), '신청완료', now]));
    }

    res.status(405).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

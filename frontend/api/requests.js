import { setCors, getRows, appendRow, nextId } from './_lib/sheets.js';

const COL_COUNT = 21; // A~U

function rowToRequest(r) {
  r = [...r, ...Array(COL_COUNT).fill('')].slice(0, COL_COUNT);
  let items_detail = [];
  try { items_detail = JSON.parse(r[15]) || []; } catch {}
  return {
    id:                   parseInt(r[0]) || 0,
    event_id:             parseInt(r[1]) || 0,
    buyer_id:             r[3],
    name:                 r[4],
    circle_name:          r[5],
    address:              r[6],
    item_name:            r[7],
    quantity:             parseInt(r[8]) || 0,
    status:               r[9] || '신청완료',
    created_at:           r[10],
    event:                { id: parseInt(r[1]) || 0, name: r[2], date: r[10] },
    service_type:         r[11],
    phone:                r[12],
    has_paper_item:       r[13],
    booth_count:          parseInt(r[14]) || 1,
    items_detail,
    courier:              r[16],
    convenience_store:    r[17],
    pickup_address:       r[18],
    privacy_agreed:       r[19] === 'true',
    damage_waiver_agreed: r[20] === 'true',
  };
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'GET') {
      const buyerId = req.query.buyer_id || null;
      const rows = await getRows('requests');
      let data = rows.filter(r => r[0]).map(rowToRequest);
      if (buyerId) data = data.filter(r => r.buyer_id === buyerId);
      return res.json(data);
    }

    if (req.method === 'POST') {
      const buyerId = req.query.buyer_id;
      const {
        event_id, event_name, name, circle_name, address, item_name, quantity,
        service_type, phone, has_paper_item, booth_count, items_detail,
        courier, convenience_store, pickup_address, privacy_agreed, damage_waiver_agreed,
      } = req.body;
      const id = nextId();
      const now = new Date().toLocaleString('ko-KR');
      const itemsJson = typeof items_detail === 'string'
        ? items_detail
        : JSON.stringify(items_detail || []);
      const resolvedAddress = address || pickup_address || '';

      await appendRow('requests', [
        id, event_id, event_name || '', buyerId, name,
        circle_name, resolvedAddress, item_name, quantity, '신청완료', now,
        service_type || '', phone || '', has_paper_item || '없음',
        booth_count || 1, itemsJson,
        courier || '', convenience_store || '', pickup_address || '',
        privacy_agreed ? 'true' : 'false',
        damage_waiver_agreed ? 'true' : 'false',
      ]);

      return res.json(rowToRequest([
        String(id), String(event_id), event_name || '', String(buyerId), name,
        circle_name, resolvedAddress, item_name, String(quantity), '신청완료', now,
        service_type || '', phone || '', has_paper_item || '없음',
        String(booth_count || 1), itemsJson,
        courier || '', convenience_store || '', pickup_address || '',
        privacy_agreed ? 'true' : 'false',
        damage_waiver_agreed ? 'true' : 'false',
      ]));
    }

    res.status(405).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

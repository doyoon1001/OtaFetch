import { setCors, getSheets, updateCell, SPREADSHEET_ID } from '../../_lib/sheets.js';

const STATUS_COL = 10; // J열 (1-based)

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'PATCH') return res.status(405).end();

  try {
    const requestId = parseInt(req.query.id);
    const { status } = req.body;
    const sheets = getSheets();

    const colA = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'requests!A:A',
    });
    const colValues = colA.data.values || [];

    let sheetRow = -1;
    for (let i = 1; i < colValues.length; i++) {
      if (parseInt(colValues[i]?.[0]) === requestId) {
        sheetRow = i + 1;
        break;
      }
    }

    if (sheetRow === -1) return res.status(404).json({ error: 'Request not found' });

    await updateCell('requests', sheetRow, STATUS_COL, status);

    const rowData = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `requests!A${sheetRow}:U${sheetRow}`,
    });
    const r = [...(rowData.data.values?.[0] || []), ...Array(21).fill('')].slice(0, 21);
    r[9] = status;

    let items_detail = [];
    try { items_detail = JSON.parse(r[15]) || []; } catch {}

    return res.json({
      id:                   parseInt(r[0]),
      event_id:             parseInt(r[1]),
      buyer_id:             r[3],
      name:                 r[4],
      circle_name:          r[5],
      address:              r[6],
      item_name:            r[7],
      quantity:             parseInt(r[8]),
      status:               r[9],
      created_at:           r[10],
      event:                { id: parseInt(r[1]), name: r[2], date: r[10] },
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
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

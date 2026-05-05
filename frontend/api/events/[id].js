import { setCors, getSheets, SPREADSHEET_ID } from '../_lib/sheets.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const eventId = parseInt(req.query.id);
  const sheets = getSheets();

  // 이벤트 행 번호 찾기
  async function findRow() {
    const colA = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'events!A:A',
    });
    const vals = colA.data.values || [];
    for (let i = 1; i < vals.length; i++) {
      if (parseInt(vals[i]?.[0]) === eventId) return i + 1;
    }
    return -1;
  }

  try {
    if (req.method === 'PATCH') {
      const { name, date } = req.body;
      const sheetRow = await findRow();
      if (sheetRow === -1) return res.status(404).json({ error: 'Event not found' });

      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `events!B${sheetRow}:C${sheetRow}`,
        valueInputOption: 'RAW',
        requestBody: { values: [[name, date]] },
      });
      return res.json({ id: eventId, name, date });
    }

    if (req.method === 'DELETE') {
      const sheetRow = await findRow();
      if (sheetRow === -1) return res.status(404).json({ error: 'Event not found' });

      const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
      const sheet = meta.data.sheets.find(s => s.properties.title === 'events');

      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
          requests: [{
            deleteDimension: {
              range: {
                sheetId: sheet.properties.sheetId,
                dimension: 'ROWS',
                startIndex: sheetRow - 1,
                endIndex: sheetRow,
              },
            },
          }],
        },
      });
      return res.json({ success: true });
    }

    res.status(405).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

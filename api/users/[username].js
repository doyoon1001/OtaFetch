import { setCors } from '../_lib/sheets.js';

// 유저는 간단히 하드코딩 (소규모 서비스)
const USERS = {
  buyer1: { id: 1, username: 'buyer1', role: 'buyer' },
  admin1: { id: 2, username: 'admin1', role: 'admin' },
};

export default function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { username } = req.query;
  const user = USERS[username];
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
}

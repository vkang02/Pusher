import { authedUser, dropConnection, guard, send } from '../_lib.js';

// Forgets the member's Spotify tokens and stops any sharing.
export default guard(async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'method' });
  const user = await authedUser(req);
  if (!user) return send(res, 401, { error: 'unauthorized', message: 'Sign in again.' });
  await dropConnection(user.id);
  send(res, 200, { ok: true });
});

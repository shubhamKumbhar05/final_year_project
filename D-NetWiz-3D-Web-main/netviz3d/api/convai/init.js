export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Convai getResponse supports sessionID='-1' to start a new session.
  return res.status(200).json({ sessionId: '-1' })
}

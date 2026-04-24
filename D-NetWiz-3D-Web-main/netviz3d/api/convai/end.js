export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // No explicit end endpoint is required for getResponse sessions.
  return res.status(200).json({ success: true })
}

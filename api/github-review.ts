import { createHmac, timingSafeEqual } from 'node:crypto';
import { reviewAgent } from '../agents/review-agent';

export const config = {
  maxDuration: 300, // 5 minutes for background processing
};

export async function POST(request: Request): Promise<Response> {
  const rawBody = await request.text();

  // Verify webhook signature
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  const signature = request.headers.get('x-hub-signature-256');

  if (!(secret && signature)) {
    return Response.json(
      { error: 'Missing webhook secret or signature' },
      { status: 401 }
    );
  }

  const expectedSignature = `sha256=${createHmac('sha256', secret).update(rawBody).digest('hex')}`;

  if (
    !timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))
  ) {
    return Response.json({ error: 'Invalid signature' }, { status: 401 });
  }

  try {
    const payload = JSON.parse(rawBody);

    // Only process new pull requests
    if (payload.action !== 'opened' || !payload.pull_request?.html_url) {
      return Response.json({ message: 'Skipped - not a new pull request' });
    }

    // Trigger review agent in background
    const { response } = await reviewAgent(
      'review the pull request according to your guidelines',
      payload.pull_request.html_url
    );

    return Response.json({ message: response }, { status: 200 });
  } catch (error) {
    console.log('Webhook error:', error);
    return Response.json(
      { error: 'Failed to process webhook' },
      { status: 500 }
    );
  }
}

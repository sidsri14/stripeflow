const formatAmount = (paise: number, currency: string): string => {
  const symbol = currency === 'INR' ? '₹' : currency + ' ';
  return `${symbol}${(paise / 100).toLocaleString('en-IN')}`;
};

// ── Email 1: Immediate (retryCount = 0)
export const sendPaymentFailedEmail = async (
  to: string,
  params: {
    customerName?: string;
    amount: number;
    currency: string;
    paymentLink: string;
    paymentId: string;
  }
): Promise<void> => {
  const name = params.customerName ? params.customerName.split(' ')[0] : null;
  const greeting = name ? `Hi ${name},` : 'Hi,';
  const amt = formatAmount(params.amount, params.currency);

  console.log('══════════════════════════════════════════════════');
  console.log('📧 EMAIL → IMMEDIATE RECOVERY');
  console.log(`To:      ${to}`);
  console.log(`Subject: Your ${amt} payment didn't go through — complete it here`);
  console.log('──────────────────────────────────────────────────');
  console.log(`${greeting}`);
  console.log('');
  console.log(`Your payment of ${amt} couldn't be processed — but your order is still saved.`);
  console.log('');
  console.log(`Complete it now in under 10 seconds:`);
  console.log(`→ ${params.paymentLink}`);
  console.log('');
  console.log('This link is valid for 7 days. If you need help, just reply to this email.');
  console.log(`Ref: ${params.paymentId}`);
  console.log('');
  console.log('──────────────────────────────────────────────────');
  console.log('Powered by PayRecover · Automated payment recovery');
  console.log('══════════════════════════════════════════════════');
};

// ── Email 2: Day 1 follow-up (retryCount = 1)
// ── Email 3: Day 3 final notice (retryCount = 2)
export const sendPaymentReminderEmail = async (
  to: string,
  params: {
    customerName?: string;
    amount: number;
    currency: string;
    paymentLink: string;
    dayOffset: number;
    paymentId: string;
  }
): Promise<void> => {
  const name = params.customerName ? params.customerName.split(' ')[0] : null;
  const greeting = name ? `Hi ${name},` : 'Hi,';
  const amt = formatAmount(params.amount, params.currency);
  const isFinal = params.dayOffset >= 3;

  const subject = isFinal
    ? `Last chance — your ${amt} payment link expires soon`
    : `Quick reminder — your ${amt} payment is still waiting`;

  const body = isFinal
    ? [
        `${greeting}`,
        '',
        `This is your final reminder about your ${amt} payment.`,
        '',
        `Your payment link expires in a few days — after that it's gone.`,
        `Complete it now:`,
        `→ ${params.paymentLink}`,
        '',
        `Takes less than 10 seconds.`,
      ]
    : [
        `${greeting}`,
        '',
        `Just a quick nudge — your ${amt} payment is still pending.`,
        '',
        `Pick up where you left off:`,
        `→ ${params.paymentLink}`,
        '',
        `Your spot is still saved. Takes less than a minute.`,
      ];

  console.log('══════════════════════════════════════════════════');
  console.log(`📧 EMAIL → ${isFinal ? 'FINAL REMINDER' : 'FOLLOW-UP'} (Day ${params.dayOffset})`);
  console.log(`To:      ${to}`);
  console.log(`Subject: ${subject}`);
  console.log('──────────────────────────────────────────────────');
  body.forEach(line => console.log(line));
  console.log(`Ref: ${params.paymentId}`);
  console.log('');
  console.log('──────────────────────────────────────────────────');
  console.log('Powered by PayRecover · Automated payment recovery');
  console.log('══════════════════════════════════════════════════');
};

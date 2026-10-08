'use strict';

const campaignUrl = 'https://johnloringpollard.github.io/brad-to-jacksonville/';
const element = (id) => document.getElementById(id);
const money = (cents) => new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'USD', minimumFractionDigits: cents % 100 ? 2 : 0,
  maximumFractionDigits: 2,
}).format(cents / 100);

function validateCampaign(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)
    || !Number.isSafeInteger(data.collectedCents) || data.collectedCents < 0
    || !(data.goalCents === null || (Number.isSafeInteger(data.goalCents) && data.goalCents > 0))
    || !Array.isArray(data.contributions)) {
    throw new Error('Invalid campaign details');
  }
  let listedCents = 0;
  for (const contribution of data.contributions) {
    if (!contribution || typeof contribution.name !== 'string' || !contribution.name.trim()
      || !Number.isSafeInteger(contribution.amountCents) || contribution.amountCents <= 0
      || !['offline', 'stripe'].includes(contribution.method)) throw new Error('Invalid contribution');
    listedCents += contribution.amountCents;
    if (!Number.isSafeInteger(listedCents) || listedCents > data.collectedCents) throw new Error('Invalid contribution total');
  }
  if (data.paymentUrl !== null) {
    if (typeof data.paymentUrl !== 'string') throw new Error('Invalid payment link');
    const url = new URL(data.paymentUrl);
    if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Invalid payment link');
  }
  if (data.updatedAt !== null && (typeof data.updatedAt !== 'string'
    || !/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2}))?$/.test(data.updatedAt)
    || !Number.isFinite(Date.parse(data.updatedAt)))) {
    throw new Error('Invalid update date');
  }
  return data;
}

function renderCampaign(data) {
  const percentage = data.goalCents === null ? 0 : data.collectedCents / data.goalCents * 100;
  element('collected').textContent = money(data.collectedCents);
  element('collected-label').textContent = 'confirmed contributions';
  element('goal').textContent = data.goalCents === null ? 'Goal being finalized' : `of ${money(data.goalCents)} goal`;
  element('progress-label').textContent = data.goalCents === null ? 'Goal TBD' : `${Math.floor(percentage)}%`;
  element('progress-fill').style.width = `${Math.min(100, percentage)}%`;
  element('progress').setAttribute('aria-valuenow', String(Math.min(100, percentage)));
  element('progress').setAttribute('aria-valuetext', data.goalCents === null
    ? `${money(data.collectedCents)} confirmed; goal being finalized`
    : `${money(data.collectedCents)} confirmed toward a ${money(data.goalCents)} goal`);
  element('fund-message').textContent = data.collectedCents === 0
    ? 'The fund is just getting started. No contributions have been confirmed yet.'
    : 'Every confirmed contribution helps move the trip forward.';
  const contributions = element('contributions');
  contributions.replaceChildren();
  for (const contribution of data.contributions) {
    const item = document.createElement('li');
    const summary = document.createElement('strong');
    const note = document.createElement('span');
    summary.textContent = `${contribution.name} · ${money(contribution.amountCents)}`;
    note.textContent = contribution.method === 'offline' ? 'Received outside Stripe · confirmed by organizer' : 'Received through Stripe';
    item.append(summary, note);
    contributions.append(item);
  }
  contributions.hidden = data.contributions.length === 0;
  if (data.updatedAt !== null) {
    element('updated-at').textContent = `Last updated ${new Intl.DateTimeFormat('en-US', {
      month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
    }).format(new Date(data.updatedAt))}.`;
  }
  if (data.paymentUrl !== null) {
    element('payment-link').href = data.paymentUrl;
    element('payment-link').hidden = false;
    element('payment-unavailable').hidden = true;
    element('payment-note').textContent = 'Opens the payment provider in a new tab.';
  }
}

async function loadCampaign() {
  try {
    const response = await fetch('./campaign.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('Campaign details unavailable');
    renderCampaign(validateCampaign(await response.json()));
  } catch {
    element('collected').textContent = '—';
    element('collected-label').textContent = 'Total unavailable';
    element('goal').textContent = 'Goal unavailable';
    element('progress-label').textContent = '—';
    element('progress').setAttribute('aria-valuetext', 'Trip fund details unavailable');
    element('fund-message').textContent = 'We couldn’t load the confirmed fund details. Please try again later.';
    element('payment-link').hidden = true;
    element('payment-link').removeAttribute('href');
    element('payment-unavailable').hidden = false;
    element('payment-unavailable').textContent = 'Contributions unavailable';
    element('payment-note').textContent = 'Payments are unavailable until the fund details can be loaded.';
  }
}

async function shareCampaign() {
  element('share-status').textContent = '';
  element('share-fallback').hidden = true;
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ title: 'Bring Brad & the kids to Jacksonville',
        text: 'Help bring Brad Nortman and the kids to Jax on October 17, 2026. Here’s the proposed trip fund.',
        url: campaignUrl });
      return;
    } catch (error) {
      if (error.name === 'AbortError') return;
    }
  }
  try {
    if (!navigator.clipboard || !navigator.clipboard.writeText) throw new Error('Clipboard unavailable');
    await navigator.clipboard.writeText(campaignUrl);
    element('share-status').textContent = 'Link copied. Send it to the crew!';
  } catch {
    element('share-fallback').hidden = false;
    element('share-url').focus();
    element('share-url').select();
    element('share-status').textContent = 'Select and copy the link below.';
  }
}

element('share-button').addEventListener('click', shareCampaign);
loadCampaign();

const hdmBridge = require('../config/hdmBridge');

const wrap = (content) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; background-color: #f5f7f5; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
    .header { background-color: #1b5e20; padding: 32px 24px; text-align: center; }
    .header img { width: 48px; height: 48px; margin-bottom: 12px; }
    .header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 600; letter-spacing: -0.3px; }
    .header p { color: #a5d6a7; margin: 6px 0 0; font-size: 14px; }
    .body { padding: 32px 24px; color: #333333; }
    .body h2 { margin: 0 0 16px; font-size: 20px; color: #1b5e20; }
    .body p { margin: 0 0 16px; line-height: 1.6; font-size: 15px; color: #444444; }
    .body ul { margin: 0 0 20px; padding-left: 20px; }
    .body ul li { margin-bottom: 8px; line-height: 1.5; font-size: 14px; }
    .card { background-color: #f9faf9; border-left: 4px solid #1b5e20; padding: 16px; margin-bottom: 16px; border-radius: 4px; }
    .card.critical { border-left-color: #d32f2f; background-color: #fff5f5; }
    .card.high { border-left-color: #f57c00; background-color: #fff8f0; }
    .card.medium { border-left-color: #fbc02d; background-color: #fffef5; }
    .card.info { border-left-color: #1976d2; background-color: #f5f9ff; }
    .btn { display: inline-block; background-color: #1b5e20; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px; margin-top: 8px; }
    .btn:hover { background-color: #2e7d32; }
    .footer { background-color: #f5f7f5; padding: 20px 24px; text-align: center; border-top: 1px solid #e0e0e0; }
    .footer p { margin: 0; font-size: 12px; color: #999999; line-height: 1.5; }
    .footer a { color: #1b5e20; text-decoration: none; }
    .stats { display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
    .stat { flex: 1; min-width: 100px; background-color: #f9faf9; padding: 12px; border-radius: 6px; text-align: center; }
    .stat .value { font-size: 22px; font-weight: 700; color: #1b5e20; }
    .stat .label { font-size: 12px; color: #777777; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
    .weather { display: flex; align-items: center; gap: 12px; background-color: #e8f5e9; padding: 14px 16px; border-radius: 6px; margin-bottom: 20px; }
    .weather .icon { font-size: 28px; }
    .weather .text { font-size: 14px; color: #2e7d32; }
    .divider { border: none; border-top: 1px solid #e0e0e0; margin: 24px 0; }
    .tag { display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
    .tag-critical { background-color: #ffcdd2; color: #c62828; }
    .tag-high { background-color: #ffe0b2; color: #e65100; }
    .tag-medium { background-color: #fff9c4; color: #f57f17; }
    .tag-info { background-color: #bbdefb; color: #0d47a1; }
    @media only screen and (max-width: 480px) {
      .container { border-radius: 0; }
      .header { padding: 24px 16px; }
      .body { padding: 24px 16px; }
      .stats { flex-direction: column; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🌾 FarmWise</h1>
      <p>Farm Smarter, Grow Further</p>
    </div>
    <div class="body">
      ${content}
    </div>
    <div class="footer">
      <p>FarmWise — Your Farm, Guided</p>
      <p>
        <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}">Dashboard</a>
        &nbsp;·&nbsp;
        <a href="mailto:${hdmBridge.fromEmail}">Support</a>
      </p>
      <p style="margin-top:8px;">This is an automated message from your FarmWise account.</p>
    </div>
  </div>
</body>
</html>
`;

const levelClass = (level) => {
  const map = { critical: 'critical', high: 'high', medium: 'medium', info: 'info' };
  return map[level] || 'info';
};

const levelTag = (level) => {
  const map = { critical: 'tag-critical', high: 'tag-high', medium: 'tag-medium', info: 'tag-info' };
  return map[level] || 'tag-info';
};

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-KE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const formatCurrency = (amount) => {
  return `KES ${Number(amount).toLocaleString('en-KE')}`;
};

const templates = {

  welcomeVerify: (data) => ({
    subject: `Welcome to FarmWise, ${data.name}`,
    html: wrap(`
      <h2>Welcome, ${data.name}! 👋</h2>
      <p>Your FarmWise account has been created and your farm <strong>${data.farmName}</strong> is ready.</p>

      <div class="card">
        <p style="margin:0;"><strong>Your Login Details</strong></p>
        <p style="margin:8px 0 0;">Email: <strong>${data.email}</strong></p>
        <p style="margin:4px 0 0;">Password: <strong>${data.password}</strong></p>
      </div>

      <p style="margin-top:16px;">Please change your password after your first login.</p>
      <a href="${data.loginUrl || process.env.CLIENT_URL}" class="btn">Go to Dashboard</a>
      <p style="margin-top:20px; font-size:14px; color:#666;">Download the mobile app for on-the-go access to your farm.</p>
    `),
  }),

  passwordReset: (data) => ({
    subject: 'Reset Your FarmWise Password',
    html: wrap(`
      <h2>Password Reset</h2>
      <p>Hello ${data.name},</p>
      <p>You requested a password reset for your FarmWise account.</p>

      <div class="card">
        <p style="margin:0;"><strong>Your New Password</strong></p>
        <p style="margin:8px 0 0; font-size:18px; font-weight:700; letter-spacing:1px;">${data.password}</p>
      </div>

      <p>Please change this password after logging in.</p>
      <a href="${data.loginUrl || process.env.CLIENT_URL}" class="btn">Log In Now</a>
      <p style="margin-top:16px; font-size:13px; color:#999;">If you did not request this, please contact support immediately.</p>
    `),
  }),

  farmSetupComplete: (data) => ({
    subject: `Your Farm "${data.farmName}" is Ready`,
    html: wrap(`
      <h2>Your Farm is All Set! 🎉</h2>
      <p>Great job, ${data.name}! Your farm <strong>${data.farmName}</strong> has been created.</p>

      <div class="card">
        <p style="margin:0;"><strong>Next Steps</strong></p>
        <ul style="margin:12px 0 0;">
          <li>Add your animals to the registry</li>
          <li>Set up your fields and crops</li>
          <li>Invite your team members</li>
          <li>Check your daily briefing every morning at 7 AM EAT</li>
        </ul>
      </div>

      <a href="${data.loginUrl || process.env.CLIENT_URL}" class="btn">Start Managing Your Farm</a>
    `),
  }),

  dailyBriefing: (data) => {
    const hasActions = data.criticalActions && data.criticalActions.length > 0;
    const hasUpcoming = data.upcoming && data.upcoming.length > 0;

    return {
      subject: `🌾 FarmWise Briefing — ${data.date}`,
      html: wrap(`
        <h2>Daily Farm Briefing</h2>
        <p style="color:#666;">${data.date}</p>

        ${data.weather ? `
        <div class="weather">
          <div class="icon">${data.weather.icon === 'rain' ? '🌧️' : data.weather.icon === 'clear' ? '☀️' : data.weather.icon === 'clouds' ? '⛅' : '🌤️'}</div>
          <div class="text">
            <strong>${data.weather.summary}</strong>
            ${data.weather.high ? ` · ${data.weather.high}°C / ${data.weather.low}°C` : ''}
            ${data.weather.rainfall ? ` · Rain: ${data.weather.rainfall}mm` : ''}
          </div>
        </div>
        ` : ''}

        ${hasActions ? `
        <h3 style="color:#c62828; margin-bottom:12px;">🔴 Needs Action Today</h3>
        ${data.criticalActions.map(a => `
        <div class="card ${levelClass(a.level)}">
          <span class="tag ${levelTag(a.level)}">${a.level}</span>
          <strong style="display:block; margin-top:6px;">${a.title}</strong>
          <p style="margin:4px 0 0; font-size:14px;">${a.description}</p>
        </div>
        `).join('')}
        ` : ''}

        ${hasUpcoming ? `
        <h3 style="color:#f57c00; margin-bottom:12px;">🟡 Upcoming (Next 3 Days)</h3>
        ${data.upcoming.map(a => `
        <div class="card ${levelClass(a.level)}">
          <strong>${a.title}</strong>
          <p style="margin:4px 0 0; font-size:14px;">${a.description} — ${formatDate(a.dueDate)}</p>
        </div>
        `).join('')}
        ` : ''}

        ${data.snapshot ? `
        <hr class="divider">
        <h3 style="margin-bottom:12px;">📊 Farm Snapshot</h3>
        <div class="stats">
          ${data.snapshot.milk ? `<div class="stat"><div class="value">${data.snapshot.milk.today}L</div><div class="label">Milk Today</div></div>` : ''}
          ${data.snapshot.eggs ? `<div class="stat"><div class="value">${data.snapshot.eggs.today}</div><div class="label">Eggs Today</div></div>` : ''}
        </div>
        ` : ''}

        ${!hasActions && !hasUpcoming ? '<div class="card info"><p style="margin:0;">✅ All clear today. No pending actions.</p></div>' : ''}

        <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}/dashboard" class="btn">View Full Dashboard</a>
      `),
    };
  },

  reminderUpcoming: (data) => ({
    subject: `📅 Upcoming: ${data.count} Reminder${data.count > 1 ? 's' : ''} for ${data.farmName}`,
    html: wrap(`
      <h2>Upcoming Reminders</h2>
      <p>You have <strong>${data.count} upcoming action${data.count > 1 ? 's' : ''}</strong> in the next 3 days on ${data.farmName}.</p>

      ${data.reminders.map(r => `
      <div class="card medium">
        <span class="tag tag-medium">DUE IN 3 DAYS</span>
        <strong style="display:block; margin-top:6px;">${r.title}</strong>
        <p style="margin:4px 0 0; font-size:14px;">${r.description}</p>
        <p style="margin:4px 0 0; font-size:13px; color:#888;">Due: ${formatDate(r.dueDate)}</p>
      </div>
      `).join('')}

      <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}/tasks" class="btn">View All Reminders</a>
    `),
  }),

  reminderFinal: (data) => ({
    subject: `🔴 TODAY: ${data.count} Action${data.count > 1 ? 's' : ''} Required on ${data.farmName}`,
    html: wrap(`
      <h2>Action Required Today</h2>
      <p>You have <strong>${data.count} action${data.count > 1 ? 's' : ''}</strong> that need your attention <strong>today</strong>.</p>

      ${data.reminders.map(r => `
      <div class="card critical">
        <span class="tag tag-critical">DUE TODAY</span>
        <strong style="display:block; margin-top:6px;">${r.title}</strong>
        <p style="margin:4px 0 0; font-size:14px;">${r.description}</p>
      </div>
      `).join('')}

      <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}/tasks" class="btn">Take Action Now</a>
    `),
  }),

  productionDrop: (data) => ({
    subject: `⚠️ Production Drop — ${data.animalTag}`,
    html: wrap(`
      <h2>Production Drop Detected</h2>
      <p>A significant drop in production has been detected on <strong>${data.farmName}</strong>.</p>

      <div class="card critical">
        <span class="tag tag-critical">ANOMALY</span>
        <strong style="display:block; margin-top:6px;">${data.animalTag}</strong>
        <p style="margin:8px 0 0;">Production dropped by <strong>${data.dropPercentage}%</strong></p>
        <p style="margin:4px 0 0; font-size:14px;">Current: ${data.currentProduction} | Average: ${data.averageProduction}</p>
      </div>

      <p><strong>Recommended actions:</strong></p>
      <ul>
        <li>Check the animal for signs of illness or injury</li>
        <li>Verify feed and water supply are adequate</li>
        <li>Check for signs of mastitis (if dairy)</li>
        <li>Consult your veterinarian if the drop persists</li>
      </ul>

      <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}/animals" class="btn">View Animal Details</a>
    `),
  }),

  animalHealthEmergency: (data) => ({
    subject: `🔴 HEALTH ALERT — ${data.animalTag} on ${data.farmName}`,
    html: wrap(`
      <h2 style="color:#c62828;">Health Emergency</h2>
      <p>A critical health event has been recorded on <strong>${data.farmName}</strong>.</p>

      <div class="card critical">
        <span class="tag tag-critical">${data.severity || 'CRITICAL'}</span>
        <strong style="display:block; margin-top:6px;">Animal: ${data.animalTag}</strong>
        <p style="margin:8px 0 0;"><strong>Diagnosis:</strong> ${data.diagnosis}</p>
        ${data.recommendedAction ? `<p style="margin:8px 0 0;"><strong>Action:</strong> ${data.recommendedAction}</p>` : ''}
      </div>

      <p style="color:#c62828;"><strong>Immediate veterinary attention is recommended.</strong></p>

      <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}/animals" class="btn">View Health Record</a>
    `),
  }),

  weatherExtreme: (data) => ({
    subject: `⚠️ ${data.weatherType} Alert — ${data.farmName}`,
    html: wrap(`
      <h2 style="color:#d32f2f;">Extreme Weather Alert</h2>
      <p><strong>${data.weatherType}</strong> expected on <strong>${data.farmName}</strong>.</p>

      <div class="card critical">
        <span class="tag tag-critical">TAKE ACTION</span>
        <p style="margin:8px 0 0;"><strong>${data.message}</strong></p>
      </div>

      ${data.precautions ? `
      <p><strong>Recommended precautions:</strong></p>
      <ul>
        ${data.precautions.map(p => `<li>${p}</li>`).join('')}
      </ul>
      ` : ''}

      <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}/weather" class="btn">View Weather Details</a>
    `),
  }),

  stockCritical: (data) => ({
    subject: `📦 Stock Low — ${data.itemName} on ${data.farmName}`,
    html: wrap(`
      <h2>Low Stock Alert</h2>
      <p>An inventory item on <strong>${data.farmName}</strong> is running low.</p>

      <div class="card high">
        <span class="tag tag-high">REORDER NEEDED</span>
        <strong style="display:block; margin-top:6px;">${data.itemName}</strong>
        <p style="margin:8px 0 0;">Current stock: <strong>${data.currentStock} ${data.unit}</strong></p>
        <p style="margin:4px 0 0;">Reorder at: ${data.reorderAt} ${data.unit}</p>
      </div>

      <p>Please reorder soon to avoid running out.</p>

      <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}/inventory" class="btn">Manage Inventory</a>
    `),
  }),

};

module.exports = templates;
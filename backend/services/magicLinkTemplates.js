/**
 * Magic Link Verification HTML Templates
 * Styled pages shown when users click magic links from email
 */

/**
 * Base HTML wrapper with shared styles
 */
function wrapInLayout(content) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Owner Portal – Fuel Finder</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .card {
      background: #ffffff;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.05);
      max-width: 480px;
      width: 100%;
      overflow: hidden;
      animation: slideUp 0.5s ease-out;
    }
    @keyframes slideUp {
      from { opacity: 0; transform: translateY(30px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .header {
      padding: 32px 30px;
      text-align: center;
      color: #ffffff;
    }
    .header h1 {
      font-size: 22px;
      font-weight: 700;
      letter-spacing: -0.3px;
    }
    .body {
      padding: 40px 30px;
      text-align: center;
    }
    .icon {
      font-size: 56px;
      margin-bottom: 20px;
      line-height: 1;
    }
    .body h2 {
      font-size: 22px;
      font-weight: 700;
      margin-bottom: 12px;
      letter-spacing: -0.3px;
    }
    .body p {
      font-size: 15px;
      line-height: 1.6;
      color: #6b7280;
      margin-bottom: 8px;
    }
    .body p.hint {
      font-size: 13px;
      color: #9ca3af;
      margin-top: 16px;
    }
    .footer {
      background: #f9fafb;
      border-top: 1px solid #e5e7eb;
      padding: 20px 30px;
      text-align: center;
    }
    .footer p {
      font-size: 12px;
      color: #9ca3af;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="header" style="${content.headerStyle}">
      <h1>🏪 Owner Portal</h1>
    </div>
    <div class="body">
      <div class="icon">${content.icon}</div>
      <h2 style="color: ${content.titleColor}">${content.title}</h2>
      ${content.body}
    </div>
    <div class="footer">
      <p>Fuel Finder Owner Management System</p>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Success page — shown when magic link is verified successfully
 */
function getSuccessPage(ownerName) {
  return wrapInLayout({
    headerStyle: 'background: linear-gradient(135deg, #059669 0%, #047857 100%);',
    icon: '✅',
    titleColor: '#059669',
    title: 'You Have Been Signed In!',
    body: `
      <p>Welcome back${ownerName ? ', <strong>' + ownerName + '</strong>' : ''}.</p>
      <p>Your login has been verified successfully.</p>
      <p class="hint">You can safely close this page now.<br>If you have the dashboard open on another device, it will update automatically.</p>
    `
  });
}

/**
 * Error page — shown when the magic link is invalid, expired, or already used
 */
function getErrorPage(errorMessage) {
  // Pick icon and color based on error type
  let icon = '❌';
  let title = 'Verification Failed';
  let titleColor = '#dc2626';
  let headerStyle = 'background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);';

  if (errorMessage.includes('already been used')) {
    icon = '🔗';
    title = 'Link Already Used';
    titleColor = '#d97706';
    headerStyle = 'background: linear-gradient(135deg, #d97706 0%, #b45309 100%);';
  } else if (errorMessage.includes('expired')) {
    icon = '⏱️';
    title = 'Link Expired';
    titleColor = '#d97706';
    headerStyle = 'background: linear-gradient(135deg, #d97706 0%, #b45309 100%);';
  } else if (errorMessage.includes('deactivated')) {
    icon = '🚫';
    title = 'Account Deactivated';
  }

  return wrapInLayout({
    headerStyle,
    icon,
    titleColor,
    title,
    body: `
      <p>${errorMessage}</p>
      <p class="hint">Please go back to the login page and request a new link.</p>
    `
  });
}

/**
 * Server error page
 */
function getServerErrorPage() {
  return wrapInLayout({
    headerStyle: 'background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%);',
    icon: '⚙️',
    titleColor: '#6b7280',
    title: 'Something Went Wrong',
    body: `
      <p>We encountered an unexpected error while verifying your link.</p>
      <p class="hint">Please try again later or request a new login link.</p>
    `
  });
}

module.exports = {
  getSuccessPage,
  getErrorPage,
  getServerErrorPage,
};

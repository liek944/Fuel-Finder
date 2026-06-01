/**
 * Email Templates
 * HTML templates for transactional emails
 */

/**
 * Welcome email template for new users
 * @param {string} displayName - User's display name (optional)
 * @returns {Object} Email subject and HTML body
 */
function getWelcomeEmailTemplate(displayName) {
  const greeting = displayName ? `Hi ${displayName}` : 'Welcome';
  
  const subject = 'Welcome to Fuel Finder! ⛽';
  
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Fuel Finder</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 0;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">
                ⛽ Fuel Finder
              </h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="margin: 0 0 20px 0; color: #1f2937; font-size: 24px; font-weight: 600;">
                ${greeting}! 🎉
              </h2>
              
              <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                Thank you for joining Fuel Finder! We're excited to have you on board.
              </p>
              
              <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                With Fuel Finder, you can:
              </p>
              
              <ul style="margin: 0 0 30px 0; padding-left: 20px; color: #4b5563; font-size: 16px; line-height: 1.8;">
                <li>🔍 Find the nearest fuel stations</li>
                <li>⭐ Save your favorite stations</li>
                <li>🗺️ Get directions with one tap</li>
              </ul>
              
              <p style="margin: 0 0 30px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                Start exploring now and never overpay for fuel again!
              </p>
              
              <table role="presentation" style="width: 100%;">
                <tr>
                  <td style="text-align: center;">
                    <a href="#" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px;">
                      Open Fuel Finder
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">
                Questions? Just reply to this email.
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                © ${new Date().getFullYear()} Fuel Finder. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  return { subject, html };
}

/**
 * Magic link email template for owner passwordless login
 * @param {string} ownerName - Owner's company/business name
 * @param {string} loginUrl - The full magic link URL
 * @param {number} expiresInMinutes - Minutes until link expires (default 15)
 * @returns {Object} Email subject and HTML body
 */
function getMagicLinkEmailTemplate(ownerName, loginUrl, expiresInMinutes = 15) {
  const subject = 'Your Login Link - Fuel Finder Owner Portal 🔐';
  
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Login to Owner Portal</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 0;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">
                🏪 Owner Portal
              </h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="margin: 0 0 20px 0; color: #1f2937; font-size: 24px; font-weight: 600;">
                Hi ${ownerName}! 👋
              </h2>
              
              <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                Click the button below to securely sign in to your Owner Portal dashboard.
              </p>
              
              <p style="margin: 0 0 30px 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                ⏱️ This link expires in <strong>${expiresInMinutes} minutes</strong> and can only be used once.
              </p>
              
              <table role="presentation" style="width: 100%;">
                <tr>
                  <td style="text-align: center;">
                    <a href="${loginUrl}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #059669 0%, #047857 100%); color: #ffffff; text-decoration: none; font-size: 18px; font-weight: 600; border-radius: 8px;">
                      🔐 Sign In to Dashboard
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 30px 0 0 0; color: #9ca3af; font-size: 13px; line-height: 1.6;">
                If the button doesn't work, copy and paste this link into your browser:<br>
                <a href="${loginUrl}" style="color: #059669; word-break: break-all;">${loginUrl}</a>
              </p>
            </td>
          </tr>
          
          <!-- Security Notice -->
          <tr>
            <td style="padding: 0 30px 30px 30px;">
              <div style="background-color: #fef3c7; border-radius: 8px; padding: 16px; border-left: 4px solid #f59e0b;">
                <p style="margin: 0; color: #92400e; font-size: 14px;">
                  <strong>⚠️ Security Notice:</strong> If you didn't request this login link, you can safely ignore this email. Someone may have entered your email by mistake.
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">
                Questions? Contact your system administrator.
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                © ${new Date().getFullYear()} Fuel Finder. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  return { subject, html };
}

/**
 * DOE Price Update email template for owners
 * @param {string} ownerName - Owner's display name
 * @param {Object} prices - Parsed DOE prices
 * @returns {Object} Email subject and HTML body
 */
function getDoePriceUpdateEmailTemplate(ownerName, prices) {
  const subject = 'New DOE Fuel Prices Released ⛽';
  
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New DOE Fuel Prices Released</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 0;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #ea580c 0%, #c2410c 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">
                📊 Weekly Price Update
              </h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="margin: 0 0 20px 0; color: #1f2937; font-size: 24px; font-weight: 600;">
                Hi ${ownerName},
              </h2>
              
              <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                The Department of Energy has released the new national average fuel prices for this week.
              </p>
              
              <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
                <h3 style="margin: 0 0 15px 0; color: #374151; font-size: 18px; border-bottom: 1px solid #d1d5db; padding-bottom: 10px;">Current Average Prices</h3>
                
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #4b5563; font-weight: 600;">Gasoline</td>
                    <td style="padding: 8px 0; text-align: right; color: #111827; font-weight: bold;">₱${prices.gasoline_price} <span style="color: ${prices.gasoline_adjustment < 0 ? '#16a34a' : '#dc2626'}; font-size: 12px;">(${prices.gasoline_adjustment > 0 ? '+' : ''}${prices.gasoline_adjustment})</span></td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #4b5563; font-weight: 600;">Diesel</td>
                    <td style="padding: 8px 0; text-align: right; color: #111827; font-weight: bold;">₱${prices.diesel_price} <span style="color: ${prices.diesel_adjustment < 0 ? '#16a34a' : '#dc2626'}; font-size: 12px;">(${prices.diesel_adjustment > 0 ? '+' : ''}${prices.diesel_adjustment})</span></td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #4b5563; font-weight: 600;">Kerosene</td>
                    <td style="padding: 8px 0; text-align: right; color: #111827; font-weight: bold;">₱${prices.kerosene_price} <span style="color: ${prices.kerosene_adjustment < 0 ? '#16a34a' : '#dc2626'}; font-size: 12px;">(${prices.kerosene_adjustment > 0 ? '+' : ''}${prices.kerosene_adjustment})</span></td>
                  </tr>
                </table>
              </div>
              
              <p style="margin: 0 0 30px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                Please log in to your owner dashboard to update your station's fuel prices accordingly to stay competitive.
              </p>
              
              <table role="presentation" style="width: 100%;">
                <tr>
                  <td style="text-align: center;">
                    <a href="https://fuelfinder.duckdns.org/owner" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #ea580c 0%, #c2410c 100%); color: #ffffff; text-decoration: none; font-size: 18px; font-weight: 600; border-radius: 8px;">
                      Update Prices Now
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">
                You received this email because you are a registered station owner on Fuel Finder.
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                © ${new Date().getFullYear()} Fuel Finder. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  return { subject, html };
}

module.exports = {
  getWelcomeEmailTemplate,
  getMagicLinkEmailTemplate,
  getDoePriceUpdateEmailTemplate,
};

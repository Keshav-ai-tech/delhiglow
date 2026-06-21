const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

// Load environment variables for independent imports/testing
require('dotenv').config({ path: path.join(__dirname, '.env') });

// SMTP configuration from environment
const smtpConfig = {
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },
  tls: {
    rejectUnauthorized: false // Avoid self-signed certificate rejections in container environments
  }
};

let transporter = null;
const isSmtpConfigured = smtpConfig.host && 
                         smtpConfig.auth.user && 
                         smtpConfig.auth.pass && 
                         !smtpConfig.auth.user.includes('your-email') && 
                         !smtpConfig.auth.pass.includes('your-google-app-password');

if (isSmtpConfigured) {
  transporter = nodemailer.createTransport(smtpConfig);
  console.log('⚡ Nodemailer SMTP transporter initialized. Verifying connection...');
  transporter.verify((error, success) => {
    if (error) {
      console.error('✕ Nodemailer SMTP verification failed:', error.message);
    } else {
      console.log('⚡ Nodemailer SMTP connection verified and ready.');
    }
  });
} else {
  console.warn('⚠️ SMTP settings not configured or using placeholders. Welcome emails will be logged locally to backend/sent_emails/');
}

// Generate the beautiful luxury-modern welcome email HTML for CUSTOMERS
const getCustomerWelcomeEmailHtml = (name) => {
  const customerName = name || 'Glow Connoisseur';
  
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to DelhiGlow</title>
  <style>
    /* Premium Styling and Reset */
    body {
      margin: 0;
      padding: 0;
      background-color: #F7F4EB;
      font-family: 'Outfit', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #333333;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #F7F4EB;
      padding: 40px 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #FCF9F2;
      border: 1px solid #E8DFD0;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 8px 30px rgba(0,0,0,0.05);
    }
    .header {
      background-color: #4A2040;
      padding: 40px 20px;
      text-align: center;
      border-bottom: 3px solid #C99A4B;
      position: relative;
    }
    .header-logo {
      font-size: 28px;
      font-weight: 700;
      letter-spacing: 1px;
      color: #FFFFFF;
      margin: 0;
    }
    .header-logo span {
      color: #C99A4B;
    }
    .header-subtitle {
      color: #FCF9F2;
      font-size: 14px;
      letter-spacing: 2px;
      text-transform: uppercase;
      margin-top: 8px;
      opacity: 0.9;
    }
    .content {
      padding: 40px 35px;
    }
    h1 {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 26px;
      font-weight: 600;
      color: #4A2040;
      margin-top: 0;
      margin-bottom: 20px;
      text-align: center;
    }
    p {
      font-size: 15px;
      line-height: 1.6;
      color: #444444;
      margin-bottom: 24px;
    }
    .highlight-box {
      background-color: rgba(201, 154, 75, 0.05);
      border-left: 3px solid #C99A4B;
      padding: 20px;
      margin: 30px 0;
      border-radius: 0 8px 8px 0;
    }
    .highlight-box h3 {
      margin-top: 0;
      color: #4A2040;
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 18px;
      margin-bottom: 8px;
    }
    .highlight-box p {
      margin-bottom: 0;
      font-size: 14px;
    }
    .cta-container {
      text-align: center;
      margin: 35px 0;
    }
    .btn {
      display: inline-block;
      background-color: #7A0C2E;
      color: #FFFFFF !important;
      text-decoration: none;
      padding: 15px 35px;
      border-radius: 50px;
      font-weight: 600;
      font-size: 14px;
      letter-spacing: 1px;
      text-transform: uppercase;
      border: 1px solid #C99A4B;
      box-shadow: 0 4px 15px rgba(122, 12, 46, 0.2);
      transition: all 0.3s ease;
    }
    .footer {
      background-color: #F3ECE1;
      padding: 30px 20px;
      text-align: center;
      border-top: 1px solid #E8DFD0;
    }
    .footer p {
      font-size: 12px;
      color: #777777;
      margin-bottom: 8px;
      line-height: 1.5;
    }
    .footer a {
      color: #7A0C2E;
      text-decoration: none;
      font-weight: 500;
    }
    /* Decorative floral element */
    .divider {
      text-align: center;
      margin: 30px 0;
      color: #C99A4B;
      font-size: 20px;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      
      <!-- Heritage-inspired Header -->
      <div class="header">
        <div class="header-logo">❀ Delhi<span>Glow</span></div>
        <div class="header-subtitle">Luxury Beauty Sanctuary</div>
      </div>
      
      <!-- Mail Body -->
      <div class="content">
        <h1>Welcome, ${customerName}!</h1>
        
        <p>A warm welcome to DelhiGlow. We are absolutely thrilled to have you join our exclusive community of wellness and bridal beauty connoisseurs in the capital.</p>
        
        <p>DelhiGlow is not just a marketplace; it is a curated collection of Delhi's most luxurious bridal studios, makeup academies, and serene wellness retreats. Every sanctuary on our platform is hand-selected to ensure they offer unmatched heritage-modern elegance and supreme craftsmanship.</p>
        
        <!-- Ornament divider -->
        <div class="divider">❦ ❀ ❦</div>
        
        <div class="highlight-box">
          <h3>Your Signature Glow Awaits</h3>
          <p>We've created a personalized <strong>"Find Your Delhi Glow"</strong> beauty personality quiz. In just 8 luxurious questions, our AI engine discovers your exact style vibe, treatment preference, and budget, instantly matching you with your perfect Delhi salons.</p>
        </div>
        
        <div class="cta-container">
          <a href="http://localhost:3000/beauty-quiz" class="btn">Discover Your Persona</a>
        </div>
        
        <p>Whether you're prepping for a majestic wedding, searching for an elegant weekend blow-dry, or planning a tranquil spa getaway, DelhiGlow connects you seamlessly. Your reservation slots are locked in instantly with our secured 15% deposit system, leaving you to simply sit back and enjoy the ritual.</p>
        
        <p>Welcome once again, and may your journey to absolute radiance begin today.</p>
        
        <p style="margin-bottom: 0;">Warm regards,<br><strong>Keshav Sharma</strong><br><span style="font-size: 13px; color: #777777;">Founder & Curation Director, DelhiGlow</span></p>
      </div>
      
      <!-- Footer -->
      <div class="footer">
        <p>© 2026 DelhiGlow Marketplace. All rights reserved.</p>
        <p>12, Imperial Courtyard, Chanakyapuri, New Delhi – 110021</p>
        <p><a href="http://localhost:3000/salons">Find Sanctuaries</a> | <a href="http://localhost:3000/profile">My Account</a></p>
      </div>
      
    </div>
  </div>
</body>
</html>`;
};

// Generate the beautiful luxury-modern welcome email HTML for OWNERS (SALON PARTNERS)
const getOwnerWelcomeEmailHtml = (name, salonName) => {
  const ownerName = name || 'Sanctuary Partner';
  const salon = salonName || 'Your Salon Sanctuary';
  
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to DelhiGlow Partner Network</title>
  <style>
    /* Premium Styling and Reset */
    body {
      margin: 0;
      padding: 0;
      background-color: #F7F4EB;
      font-family: 'Outfit', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #333333;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #F7F4EB;
      padding: 40px 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #FCF9F2;
      border: 1px solid #E8DFD0;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 8px 30px rgba(0,0,0,0.05);
    }
    .header {
      background-color: #4A2040;
      padding: 40px 20px;
      text-align: center;
      border-bottom: 3px solid #C99A4B;
      position: relative;
    }
    .header-logo {
      font-size: 28px;
      font-weight: 700;
      letter-spacing: 1px;
      color: #FFFFFF;
      margin: 0;
    }
    .header-logo span {
      color: #C99A4B;
    }
    .header-subtitle {
      color: #FCF9F2;
      font-size: 14px;
      letter-spacing: 2px;
      text-transform: uppercase;
      margin-top: 8px;
      opacity: 0.9;
    }
    .content {
      padding: 40px 35px;
    }
    h1 {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 26px;
      font-weight: 600;
      color: #4A2040;
      margin-top: 0;
      margin-bottom: 20px;
      text-align: center;
    }
    p {
      font-size: 15px;
      line-height: 1.6;
      color: #444444;
      margin-bottom: 24px;
    }
    .highlight-box {
      background-color: rgba(201, 154, 75, 0.05);
      border-left: 3px solid #C99A4B;
      padding: 20px;
      margin: 30px 0;
      border-radius: 0 8px 8px 0;
    }
    .highlight-box h3 {
      margin-top: 0;
      color: #4A2040;
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 18px;
      margin-bottom: 8px;
    }
    .highlight-box p {
      margin-bottom: 0;
      font-size: 14px;
    }
    .cta-container {
      text-align: center;
      margin: 35px 0;
    }
    .btn {
      display: inline-block;
      background-color: #7A0C2E;
      color: #FFFFFF !important;
      text-decoration: none;
      padding: 15px 35px;
      border-radius: 50px;
      font-weight: 600;
      font-size: 14px;
      letter-spacing: 1px;
      text-transform: uppercase;
      border: 1px solid #C99A4B;
      box-shadow: 0 4px 15px rgba(122, 12, 46, 0.2);
      transition: all 0.3s ease;
    }
    .footer {
      background-color: #F3ECE1;
      padding: 30px 20px;
      text-align: center;
      border-top: 1px solid #E8DFD0;
    }
    .footer p {
      font-size: 12px;
      color: #777777;
      margin-bottom: 8px;
      line-height: 1.5;
    }
    .footer a {
      color: #7A0C2E;
      text-decoration: none;
      font-weight: 500;
    }
    /* Decorative floral element */
    .divider {
      text-align: center;
      margin: 30px 0;
      color: #C99A4B;
      font-size: 20px;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      
      <!-- Heritage-inspired Header -->
      <div class="header">
        <div class="header-logo">❀ Delhi<span>Glow</span></div>
        <div class="header-subtitle">Salon Partner Network</div>
      </div>
      
      <!-- Mail Body -->
      <div class="content">
        <h1>Welcome to DelhiGlow!</h1>
        
        <p>Welcome, ${ownerName}. We are absolutely thrilled to welcome you and your salon sanctuary, <strong>${salon}</strong>, to the prestigious DelhiGlow Salon Partner Network.</p>
        
        <p>DelhiGlow connects discerning customers searching for absolute radiance with premium salons and elite makeup artists in the capital. Your sanctuary has been recognized for its supreme dedication to craftsmanship and luxury, and we are excited to showcase your business to our customers.</p>
        
        <div class="divider">❦ 👑 ❦</div>
        
        <div class="highlight-box">
          <h3>Onboard Your Sanctuary Listing</h3>
          <p>To preserve our premium catalog standard, your listing for <strong>${salon}</strong> is currently set to <strong>Draft Mode</strong> and is hidden from public search. To go live, log in to your dashboard and complete your Setup Wizard by configuring your service catalog, business timings, staff roster, and showcase gallery.</p>
        </div>
        
        <div class="cta-container">
          <a href="http://localhost:3000/admin" class="btn">Onboard Your Sanctuary</a>
        </div>
        
        <p>All bookings made through DelhiGlow are backed by our secure 15% reservation deposit, eliminating no-show risks and protecting your slot bookings. You will collect the remaining 85% balance directly from the customer at your studio upon service delivery.</p>
        
        <p>Welcome to the family. We look forward to a majestically successful partnership.</p>
        
        <p style="margin-bottom: 0;">Warmest regards,<br><strong>Keshav Sharma</strong><br><span style="font-size: 13px; color: #777777;">Founder & Curation Director, DelhiGlow</span></p>
      </div>
      
      <!-- Footer -->
      <div class="footer">
        <p>© 2026 DelhiGlow Marketplace. All rights reserved.</p>
        <p>12, Imperial Courtyard, Chanakyapuri, New Delhi – 110021</p>
        <p><a href="http://localhost:3000/admin">Partner Dashboard</a> | <a href="http://localhost:3000/profile">Partner Profile</a></p>
      </div>
      
    </div>
  </div>
</body>
</html>`;
};

const sendWelcomeEmail = async (email, name, role = 'customer', salonName = '') => {
  if (!email) return { success: false, message: 'Email address is required' };
  
  const isOwner = role === 'owner';
  const htmlContent = isOwner 
    ? getOwnerWelcomeEmailHtml(name, salonName) 
    : getCustomerWelcomeEmailHtml(name);
    
  const subject = isOwner 
    ? `Welcome to DelhiGlow Partner Network, ${name || 'Salon Partner'}! 👑` 
    : `Welcome to DelhiGlow, ${name || 'Glow Connoisseur'}! ❀`;

  // Always generate local file copy for testing/dev audit log
  let localPath = '';
  try {
    const dir = path.join(__dirname, 'sent_emails');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const safeEmail = email.replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `welcome-${role}-${safeEmail}-${Date.now()}.html`;
    const filePath = path.join(dir, filename);
    fs.writeFileSync(filePath, htmlContent);
    localPath = filePath;
    console.log(`✉️ Welcome ${role} email saved locally: ${filePath}`);
  } catch (err) {
    console.error(`✕ Failed to save welcome email locally:`, err.message);
  }
  
  if (isSmtpConfigured && transporter) {
    try {
      const mailOptions = {
        from: `"DelhiGlow" <${process.env.SMTP_USER}>`,
        to: email,
        subject: subject,
        html: htmlContent
      };
      
      const info = await transporter.sendMail(mailOptions);
      console.log(`✉️ Welcome ${role} email sent to ${email} (MessageID: ${info.messageId})`);
      return { success: true, messageId: info.messageId, localPath };
    } catch (error) {
      console.error(`✕ Failed to send welcome email via SMTP:`, error.message);
      return { success: true, localPath, error: error.message };
    }
  }
  
  return { success: true, localPath, simulated: true };
};

// Generate password reset email HTML
const getPasswordResetEmailHtml = (name, tempPassword) => {
  const userName = name || 'Glow Connoisseur';
  
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your DelhiGlow Password</title>
  <style>
    /* Premium Styling and Reset */
    body {
      margin: 0;
      padding: 0;
      background-color: #F7F4EB;
      font-family: 'Outfit', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #333333;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #F7F4EB;
      padding: 40px 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #FCF9F2;
      border: 1px solid #E8DFD0;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 8px 30px rgba(0,0,0,0.05);
    }
    .header {
      background-color: #4A2040;
      padding: 40px 20px;
      text-align: center;
      border-bottom: 3px solid #C99A4B;
      position: relative;
    }
    .header-logo {
      font-size: 28px;
      font-weight: 700;
      letter-spacing: 1px;
      color: #FFFFFF;
      margin: 0;
    }
    .header-logo span {
      color: #C99A4B;
    }
    .header-subtitle {
      color: #FCF9F2;
      font-size: 14px;
      letter-spacing: 2px;
      text-transform: uppercase;
      margin-top: 8px;
      opacity: 0.9;
    }
    .content {
      padding: 40px 35px;
    }
    h1 {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 26px;
      font-weight: 600;
      color: #4A2040;
      margin-top: 0;
      margin-bottom: 20px;
      text-align: center;
    }
    p {
      font-size: 15px;
      line-height: 1.6;
      color: #444444;
      margin-bottom: 24px;
    }
    .temp-password-box {
      background-color: rgba(201, 154, 75, 0.08);
      border: 1px dashed #C99A4B;
      padding: 20px;
      margin: 30px 0;
      text-align: center;
      border-radius: 8px;
    }
    .temp-password-box h3 {
      margin-top: 0;
      color: #4A2040;
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 16px;
      margin-bottom: 10px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .temp-password {
      font-family: 'Courier New', Courier, monospace;
      font-size: 24px;
      font-weight: bold;
      color: #7A0C2E;
      letter-spacing: 2px;
      background-color: #FFFFFF;
      padding: 10px 20px;
      border-radius: 4px;
      border: 1px solid #E8DFD0;
      display: inline-block;
    }
    .cta-container {
      text-align: center;
      margin: 35px 0;
    }
    .btn {
      display: inline-block;
      background-color: #7A0C2E;
      color: #FFFFFF !important;
      text-decoration: none;
      padding: 15px 35px;
      border-radius: 50px;
      font-weight: 600;
      font-size: 14px;
      letter-spacing: 1px;
      text-transform: uppercase;
      border: 1px solid #C99A4B;
      box-shadow: 0 4px 15px rgba(122, 12, 46, 0.2);
      transition: all 0.3s ease;
    }
    .footer {
      background-color: #F3ECE1;
      padding: 30px 20px;
      text-align: center;
      border-top: 1px solid #E8DFD0;
    }
    .footer p {
      font-size: 12px;
      color: #777777;
      margin-bottom: 8px;
      line-height: 1.5;
    }
    .footer a {
      color: #7A0C2E;
      text-decoration: none;
      font-weight: 500;
    }
    .divider {
      text-align: center;
      margin: 30px 0;
      color: #C99A4B;
      font-size: 20px;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      
      <!-- Header -->
      <div class="header">
        <div class="header-logo">❀ Delhi<span>Glow</span></div>
        <div class="header-subtitle">Luxury Beauty Sanctuary</div>
      </div>
      
      <!-- Mail Body -->
      <div class="content">
        <h1>Password Reset Request</h1>
        
        <p>Welcome, ${userName}. We received a request to reset the password associated with your DelhiGlow account.</p>
        
        <p>To help you regain access immediately, we have generated a secure, temporary password for your account. Please use the credentials below to log back in:</p>
        
        <div class="temp-password-box">
          <h3>Your Temporary Password</h3>
          <div class="temp-password">${tempPassword}</div>
        </div>
        
        <div class="cta-container">
          <a href="http://localhost:3000/auth" class="btn">Log In to DelhiGlow</a>
        </div>
        
        <p><strong>Security Notice:</strong> For your protection, we highly recommend logging in using this temporary password and immediately updating it to a secure, permanent password of your choice via your profile security settings.</p>
        
        <p>If you did not initiate this request, please contact our support team immediately to protect your account.</p>
        
        <p style="margin-bottom: 0;">Warm regards,<br><strong>Keshav Sharma</strong><br><span style="font-size: 13px; color: #777777;">Founder & Curation Director, DelhiGlow</span></p>
      </div>
      
      <!-- Footer -->
      <div class="footer">
        <p>© 2026 DelhiGlow Marketplace. All rights reserved.</p>
        <p>12, Imperial Courtyard, Chanakyapuri, New Delhi – 110021</p>
        <p><a href="http://localhost:3000/contact">Contact Support</a> | <a href="http://localhost:3000/profile">My Account</a></p>
      </div>
      
    </div>
  </div>
</body>
</html>`;
};

// Send password reset email
const sendPasswordResetEmail = async (email, name, tempPassword) => {
  if (!email) return { success: false, message: 'Email address is required' };
  
  const htmlContent = getPasswordResetEmailHtml(name, tempPassword);
  const subject = `Reset Your DelhiGlow Password ❀`;

  // Always generate local file copy for testing/dev audit log
  let localPath = '';
  try {
    const dir = path.join(__dirname, 'sent_emails');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const safeEmail = email.replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `reset-password-${safeEmail}-${Date.now()}.html`;
    const filePath = path.join(dir, filename);
    fs.writeFileSync(filePath, htmlContent);
    localPath = filePath;
    console.log(`✉️ Password reset email saved locally: ${filePath}`);
  } catch (err) {
    console.error(`✕ Failed to save password reset email locally:`, err.message);
  }
  
  if (isSmtpConfigured && transporter) {
    try {
      const mailOptions = {
        from: `"DelhiGlow" <${process.env.SMTP_USER}>`,
        to: email,
        subject: subject,
        html: htmlContent
      };
      
      const info = await transporter.sendMail(mailOptions);
      console.log(`✉️ Password reset email sent to ${email} (MessageID: ${info.messageId})`);
      return { success: true, messageId: info.messageId, localPath };
    } catch (error) {
      console.error(`✕ Failed to send password reset email via SMTP:`, error.message);
      return { success: true, localPath, error: error.message };
    }
  }
  
  return { success: true, localPath, simulated: true };
};

// Users loading helper from database JSON
const USERS_PATH = path.join(__dirname, 'users.json');
const readUsersFromFile = () => {
  if (fs.existsSync(USERS_PATH)) {
    try {
      return JSON.parse(fs.readFileSync(USERS_PATH, 'utf8'));
    } catch (e) {
      return [];
    }
  }
  return [];
};

// Console log simulators for SMS & WhatsApp
const printSimulatedSms = (toPhone, toName, message) => {
  console.log(`\n📱 [SMS ALERT] To: ${toPhone} (${toName})`);
  console.log(`-------------------------------------------------------------`);
  console.log(`${message}`);
  console.log(`-------------------------------------------------------------\n`);
};

const printSimulatedWhatsApp = (toPhone, toName, message) => {
  console.log(`\n💬 [WHATSAPP ALERT] To: ${toPhone} (${toName})`);
  console.log(`=============================================================`);
  console.log(`❀ DelhiGlow Sanctuary Alert ❀`);
  console.log(`${message}`);
  console.log(`=============================================================\n`);
};

// Standard email sending helper
const sendMailHelper = async (email, subject, htmlContent, filePrefix) => {
  if (!email) return;

  let localPath = '';
  try {
    const dir = path.join(__dirname, 'sent_emails');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const safeEmail = email.replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `${filePrefix}-${safeEmail}-${Date.now()}.html`;
    const filePath = path.join(dir, filename);
    fs.writeFileSync(filePath, htmlContent);
    localPath = filePath;
    console.log(`✉️ Email saved locally: ${filePath}`);
  } catch (err) {
    console.error(`✕ Failed to save email locally:`, err.message);
  }
  
  if (isSmtpConfigured && transporter) {
    try {
      const mailOptions = {
        from: `"DelhiGlow" <${process.env.SMTP_USER}>`,
        to: email,
        subject: subject,
        html: htmlContent
      };
      
      const info = await transporter.sendMail(mailOptions);
      console.log(`✉️ Email sent to ${email} (MessageID: ${info.messageId})`);
      return { success: true, messageId: info.messageId, localPath };
    } catch (error) {
      console.error(`✕ Failed to send email via SMTP:`, error.message);
      return { success: true, localPath, error: error.message };
    }
  }
  
  return { success: true, localPath, simulated: true };
};

// HTML generator for Booking Confirmation
const getBookingConfirmationEmailHtml = (booking, recipientRole) => {
  const isOwner = recipientRole === 'owner';
  const name = isOwner ? 'Salon Partner' : (booking.name || 'Glow Connoisseur');
  const title = isOwner ? 'New Booking Alert' : 'Ritual Confirmed';
  const description = isOwner 
    ? 'A new luxury beauty ritual has been booked at your studio through DelhiGlow.' 
    : `Your upcoming beauty ritual at <strong>${booking.salon_name}</strong> is confirmed.`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #F7F4EB;
      font-family: 'Outfit', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #333333;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #F7F4EB;
      padding: 40px 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #FCF9F2;
      border: 1px solid #E8DFD0;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 8px 30px rgba(0,0,0,0.05);
    }
    .header {
      background-color: #4A2040;
      padding: 40px 20px;
      text-align: center;
      border-bottom: 3px solid #C99A4B;
    }
    .header-logo {
      font-size: 28px;
      font-weight: 700;
      letter-spacing: 1px;
      color: #FFFFFF;
      margin: 0;
    }
    .header-logo span {
      color: #C99A4B;
    }
    .header-subtitle {
      color: #FCF9F2;
      font-size: 14px;
      letter-spacing: 2px;
      text-transform: uppercase;
      margin-top: 8px;
      opacity: 0.9;
    }
    .content {
      padding: 40px 35px;
    }
    h1 {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 24px;
      font-weight: 600;
      color: #4A2040;
      margin-top: 0;
      margin-bottom: 20px;
      text-align: center;
    }
    p {
      font-size: 15px;
      line-height: 1.6;
      color: #444444;
      margin-bottom: 24px;
    }
    .highlight-box {
      background-color: rgba(201, 154, 75, 0.05);
      border-left: 3px solid #C99A4B;
      padding: 20px;
      margin: 30px 0;
      border-radius: 0 8px 8px 0;
    }
    .highlight-box h3 {
      margin-top: 0;
      color: #4A2040;
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 18px;
      margin-bottom: 12px;
      border-bottom: 1px dashed #E8DFD0;
      padding-bottom: 6px;
    }
    .detail-row {
      display: flex;
      margin-bottom: 8px;
      font-size: 14px;
    }
    .detail-label {
      width: 120px;
      font-weight: 600;
      color: #7A0C2E;
    }
    .detail-value {
      flex: 1;
      color: #333333;
    }
    .footer {
      background-color: #F3ECE1;
      padding: 30px 20px;
      text-align: center;
      border-top: 1px solid #E8DFD0;
    }
    .footer p {
      font-size: 12px;
      color: #777777;
      margin-bottom: 8px;
      line-height: 1.5;
    }
    .footer a {
      color: #7A0C2E;
      text-decoration: none;
      font-weight: 500;
    }
    .divider {
      text-align: center;
      margin: 30px 0;
      color: #C99A4B;
      font-size: 20px;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <div class="header-logo">❀ Delhi<span>Glow</span></div>
        <div class="header-subtitle">Luxury Beauty Sanctuary</div>
      </div>
      <div class="content">
        <h1>Namaste, ${name}!</h1>
        <p>${description}</p>
        
        <div class="divider">❦ ❀ ❦</div>
        
        <div class="highlight-box">
          <h3>Ritual Details</h3>
          <div class="detail-row">
            <div class="detail-label">Studio:</div>
            <div class="detail-value">${booking.salon_name}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Ritual:</div>
            <div class="detail-value">${booking.service}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Date & Time:</div>
            <div class="detail-value">${booking.date} at ${booking.time}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Price:</div>
            <div class="detail-value">₹${booking.price}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Client Name:</div>
            <div class="detail-value">${booking.name}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Client Contact:</div>
            <div class="detail-value">${booking.phone} / ${booking.email}</div>
          </div>
        </div>
      </div>
      <div class="footer">
        <p>© 2026 DelhiGlow Marketplace. All rights reserved.</p>
        <p>12, Imperial Courtyard, Chanakyapuri, New Delhi – 110021</p>
        <p><a href="http://localhost:3000/profile">My Account</a></p>
      </div>
    </div>
  </div>
</body>
</html>`;
};

// HTML generator for Booking Status Update
const getBookingStatusUpdateEmailHtml = (booking, newStatus, recipientRole) => {
  const name = booking.name || 'Glow Connoisseur';
  const statusUpper = newStatus.toUpperCase();
  let statusDesc = `The status of your upcoming beauty ritual at <strong>${booking.salon_name}</strong> has been updated to: <strong>${statusUpper}</strong>.`;
  
  if (newStatus === 'completed') {
    statusDesc = `Your beauty ritual at <strong>${booking.salon_name}</strong> is now complete! We hope your experience was absolutely divine. Please take a moment to leave a review and share your glow journey with the community.`;
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ritual Status Update</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #F7F4EB;
      font-family: 'Outfit', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #333333;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #F7F4EB;
      padding: 40px 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #FCF9F2;
      border: 1px solid #E8DFD0;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 8px 30px rgba(0,0,0,0.05);
    }
    .header {
      background-color: #4A2040;
      padding: 40px 20px;
      text-align: center;
      border-bottom: 3px solid #C99A4B;
    }
    .header-logo {
      font-size: 28px;
      font-weight: 700;
      letter-spacing: 1px;
      color: #FFFFFF;
      margin: 0;
    }
    .header-logo span {
      color: #C99A4B;
    }
    .header-subtitle {
      color: #FCF9F2;
      font-size: 14px;
      letter-spacing: 2px;
      text-transform: uppercase;
      margin-top: 8px;
      opacity: 0.9;
    }
    .content {
      padding: 40px 35px;
    }
    h1 {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 24px;
      font-weight: 600;
      color: #4A2040;
      margin-top: 0;
      margin-bottom: 20px;
      text-align: center;
    }
    p {
      font-size: 15px;
      line-height: 1.6;
      color: #444444;
      margin-bottom: 24px;
    }
    .highlight-box {
      background-color: rgba(201, 154, 75, 0.05);
      border-left: 3px solid #C99A4B;
      padding: 20px;
      margin: 30px 0;
      border-radius: 0 8px 8px 0;
    }
    .highlight-box h3 {
      margin-top: 0;
      color: #4A2040;
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 18px;
      margin-bottom: 12px;
      border-bottom: 1px dashed #E8DFD0;
      padding-bottom: 6px;
    }
    .detail-row {
      display: flex;
      margin-bottom: 8px;
      font-size: 14px;
    }
    .detail-label {
      width: 120px;
      font-weight: 600;
      color: #7A0C2E;
    }
    .detail-value {
      flex: 1;
      color: #333333;
    }
    .status-badge {
      display: inline-block;
      padding: 6px 16px;
      background-color: #7A0C2E;
      color: #FFFFFF;
      font-weight: 600;
      border-radius: 20px;
      font-size: 12px;
      letter-spacing: 1px;
      text-transform: uppercase;
      margin-top: 8px;
    }
    .footer {
      background-color: #F3ECE1;
      padding: 30px 20px;
      text-align: center;
      border-top: 1px solid #E8DFD0;
    }
    .footer p {
      font-size: 12px;
      color: #777777;
      margin-bottom: 8px;
      line-height: 1.5;
    }
    .footer a {
      color: #7A0C2E;
      text-decoration: none;
      font-weight: 500;
    }
    .divider {
      text-align: center;
      margin: 30px 0;
      color: #C99A4B;
      font-size: 20px;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <div class="header-logo">❀ Delhi<span>Glow</span></div>
        <div class="header-subtitle">Luxury Beauty Sanctuary</div>
      </div>
      <div class="content">
        <h1>Ritual Update</h1>
        <p>Namaste ${name},</p>
        <p>${statusDesc}</p>
        
        <div class="divider">❦ ❀ ❦</div>
        
        <div class="highlight-box">
          <h3>Ritual Details</h3>
          <div class="detail-row">
            <div class="detail-label">Studio:</div>
            <div class="detail-value">${booking.salon_name}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Ritual:</div>
            <div class="detail-value">${booking.service}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Date & Time:</div>
            <div class="detail-value">${booking.date} at ${booking.time}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Status:</div>
            <div class="detail-value">
              <span class="status-badge">${statusUpper}</span>
            </div>
          </div>
        </div>
      </div>
      <div class="footer">
        <p>© 2026 DelhiGlow Marketplace. All rights reserved.</p>
        <p>12, Imperial Courtyard, Chanakyapuri, New Delhi – 110021</p>
        <p><a href="http://localhost:3000/profile">My Account</a></p>
      </div>
    </div>
  </div>
</body>
</html>`;
};

// HTML generator for Booking Cancellation
const getBookingCancellationEmailHtml = (booking, cancelledByRole, recipientRole) => {
  const isOwner = recipientRole === 'owner';
  const name = isOwner ? 'Salon Partner' : (booking.name || 'Glow Connoisseur');
  const title = 'Ritual Cancelled';
  const description = isOwner
    ? `We regret to inform you that the booking by client <strong>${booking.name}</strong> has been cancelled.`
    : `We confirm that your upcoming beauty ritual at <strong>${booking.salon_name}</strong> has been cancelled.`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #F7F4EB;
      font-family: 'Outfit', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #333333;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #F7F4EB;
      padding: 40px 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #FCF9F2;
      border: 1px solid #E8DFD0;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 8px 30px rgba(0,0,0,0.05);
    }
    .header {
      background-color: #4A2040;
      padding: 40px 20px;
      text-align: center;
      border-bottom: 3px solid #C99A4B;
    }
    .header-logo {
      font-size: 28px;
      font-weight: 700;
      letter-spacing: 1px;
      color: #FFFFFF;
      margin: 0;
    }
    .header-logo span {
      color: #C99A4B;
    }
    .header-subtitle {
      color: #FCF9F2;
      font-size: 14px;
      letter-spacing: 2px;
      text-transform: uppercase;
      margin-top: 8px;
      opacity: 0.9;
    }
    .content {
      padding: 40px 35px;
    }
    h1 {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 24px;
      font-weight: 600;
      color: #4A2040;
      margin-top: 0;
      margin-bottom: 20px;
      text-align: center;
    }
    p {
      font-size: 15px;
      line-height: 1.6;
      color: #444444;
      margin-bottom: 24px;
    }
    .highlight-box {
      background-color: rgba(201, 154, 75, 0.05);
      border-left: 3px solid #C99A4B;
      padding: 20px;
      margin: 30px 0;
      border-radius: 0 8px 8px 0;
    }
    .highlight-box h3 {
      margin-top: 0;
      color: #4A2040;
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 18px;
      margin-bottom: 12px;
      border-bottom: 1px dashed #E8DFD0;
      padding-bottom: 6px;
    }
    .detail-row {
      display: flex;
      margin-bottom: 8px;
      font-size: 14px;
    }
    .detail-label {
      width: 120px;
      font-weight: 600;
      color: #7A0C2E;
    }
    .detail-value {
      flex: 1;
      color: #333333;
    }
    .footer {
      background-color: #F3ECE1;
      padding: 30px 20px;
      text-align: center;
      border-top: 1px solid #E8DFD0;
    }
    .footer p {
      font-size: 12px;
      color: #777777;
      margin-bottom: 8px;
      line-height: 1.5;
    }
    .footer a {
      color: #7A0C2E;
      text-decoration: none;
      font-weight: 500;
    }
    .divider {
      text-align: center;
      margin: 30px 0;
      color: #C99A4B;
      font-size: 20px;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <div class="header-logo">❀ Delhi<span>Glow</span></div>
        <div class="header-subtitle">Luxury Beauty Sanctuary</div>
      </div>
      <div class="content">
        <h1>Ritual Cancelled</h1>
        <p>Namaste ${name},</p>
        <p>${description}</p>
        
        <div class="divider">❦ ❀ ❦</div>
        
        <div class="highlight-box">
          <h3>Ritual Details</h3>
          <div class="detail-row">
            <div class="detail-label">Studio:</div>
            <div class="detail-value">${booking.salon_name}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Ritual:</div>
            <div class="detail-value">${booking.service}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Date & Time:</div>
            <div class="detail-value">${booking.date} at ${booking.time}</div>
          </div>
        </div>
      </div>
      <div class="footer">
        <p>© 2026 DelhiGlow Marketplace. All rights reserved.</p>
        <p>12, Imperial Courtyard, Chanakyapuri, New Delhi – 110021</p>
        <p><a href="http://localhost:3000/profile">My Account</a></p>
      </div>
    </div>
  </div>
</body>
</html>`;
};

// Booking notification coordinator
const sendBookingNotifications = async (booking, eventType, extraData = {}, usersList = null) => {
  const users = usersList || readUsersFromFile();

  // Find customer and their preferences
  const customerUser = users.find(u => u.email && u.email.toLowerCase() === booking.email.toLowerCase());
  const customerPrefs = customerUser?.notifications || { email: true, sms: false, whatsapp: true };
  const customerPhone = booking.phone || customerUser?.phone || '';
  const customerName = booking.name || customerUser?.name || 'Glow Connoisseur';

  // Find salon owner and their preferences
  const ownerUser = users.find(u => u.role === 'owner' && parseInt(u.salon_id) === parseInt(booking.salon_id));
  const ownerPrefs = ownerUser?.notifications || { email: true, sms: false, whatsapp: true };
  const ownerPhone = ownerUser?.phone || '';
  const ownerName = ownerUser?.name || 'Salon Partner';
  const ownerEmail = ownerUser?.email || '';

  console.log(`\n🔔 Resolving notifications for event [${eventType}]`);
  console.log(`   Customer (${customerName}): Email=${customerPrefs.email}, SMS=${customerPrefs.sms}, WhatsApp=${customerPrefs.whatsapp}`);
  if (ownerUser) {
    console.log(`   Owner (${ownerName}): Email=${ownerPrefs.email}, SMS=${ownerPrefs.sms}, WhatsApp=${ownerPrefs.whatsapp}`);
  } else {
    console.log(`   Owner: None registered for salon_id=${booking.salon_id}`);
  }

  const customerPromise = (async () => {
    // --- Dispatch to Customer ---
    if (eventType === 'create') {
      if (customerPrefs.email && booking.email) {
        const html = getBookingConfirmationEmailHtml(booking, 'customer');
        await sendMailHelper(booking.email, `Ritual Confirmed at ${booking.salon_name} ❀`, html, 'booking-confirmation-customer');
      }
      if (customerPrefs.sms && customerPhone) {
        printSimulatedSms(customerPhone, customerName, `DelhiGlow: Your ritual at ${booking.salon_name} is confirmed for ${booking.date} at ${booking.time}. Thank you!`);
      }
      if (customerPrefs.whatsapp && customerPhone) {
        printSimulatedWhatsApp(customerPhone, customerName, `Namaste ${customerName}!\n\nYour luxury beauty ritual has been confirmed.\n\nStudio: ${booking.salon_name}\nRitual: ${booking.service}\nDate: ${booking.date} at ${booking.time}\nPrice: ₹${booking.price}\n\nWe look forward to welcoming you!`);
      }
    } else if (eventType === 'status') {
      const status = extraData.status || 'updated';
      if (customerPrefs.email && booking.email) {
        const html = getBookingStatusUpdateEmailHtml(booking, status, 'customer');
        await sendMailHelper(booking.email, `Ritual Status Updated: ${status.toUpperCase()} ❀`, html, `booking-status-${status}-customer`);
      }
      if (customerPrefs.sms && customerPhone) {
        printSimulatedSms(customerPhone, customerName, `DelhiGlow: The status of your ritual at ${booking.salon_name} has been updated to ${status.toUpperCase()}.`);
      }
      if (customerPrefs.whatsapp && customerPhone) {
        printSimulatedWhatsApp(customerPhone, customerName, `Namaste ${customerName}!\n\nYour ritual status at ${booking.salon_name} has been updated to: *${status.toUpperCase()}*.\n\nRitual: ${booking.service}\nDate: ${booking.date} at ${booking.time}.`);
      }
    } else if (eventType === 'cancel') {
      if (customerPrefs.email && booking.email) {
        const html = getBookingCancellationEmailHtml(booking, 'customer', 'customer');
        await sendMailHelper(booking.email, `Ritual Cancellation Confirmed ❀`, html, 'booking-cancellation-customer');
      }
      if (customerPrefs.sms && customerPhone) {
        printSimulatedSms(customerPhone, customerName, `DelhiGlow: Your ritual at ${booking.salon_name} has been cancelled.`);
      }
      if (customerPrefs.whatsapp && customerPhone) {
        printSimulatedWhatsApp(customerPhone, customerName, `Namaste ${customerName}!\n\nThis is to confirm that your upcoming ritual at ${booking.salon_name} has been cancelled.`);
      }
    }
  })();

  const ownerPromise = (async () => {
    // --- Dispatch to Owner ---
    if (ownerUser) {
      if (eventType === 'create') {
        if (ownerPrefs.email && ownerEmail) {
          const html = getBookingConfirmationEmailHtml(booking, 'owner');
          await sendMailHelper(ownerEmail, `New Ritual Booked at Your Sanctuary! 👑`, html, 'booking-alert-owner');
        }
        if (ownerPrefs.sms && ownerPhone) {
          printSimulatedSms(ownerPhone, ownerName, `DelhiGlow Partner: New ritual booked by ${booking.name} for ${booking.date} at ${booking.time}.`);
        }
        if (ownerPrefs.whatsapp && ownerPhone) {
          printSimulatedWhatsApp(ownerPhone, ownerName, `Hello Partner!\n\nA new ritual has been booked at DelhiGlow Elite Studio.\n\nClient: ${booking.name}\nRitual: ${booking.service}\nDate: ${booking.date} at ${booking.time}\nClient Contact: ${booking.phone}\n\nPlease prepare for the appointment.`);
        }
      } else if (eventType === 'cancel') {
        if (ownerPrefs.email && ownerEmail) {
          const html = getBookingCancellationEmailHtml(booking, 'customer', 'owner');
          await sendMailHelper(ownerEmail, `Ritual Cancelled by Client ❀`, html, 'booking-cancellation-owner');
        }
        if (ownerPrefs.sms && ownerPhone) {
          printSimulatedSms(ownerPhone, ownerName, `DelhiGlow Partner: The ritual booked by ${booking.name} for ${booking.date} at ${booking.time} has been cancelled.`);
        }
        if (ownerPrefs.whatsapp && ownerPhone) {
          printSimulatedWhatsApp(ownerPhone, ownerName, `Hello Partner!\n\nWe regret to inform you that the ritual booked by ${booking.name} for ${booking.date} at ${booking.time} has been cancelled.`);
        }
      }
    }
  })();

  await Promise.all([customerPromise, ownerPromise]);
};

module.exports = {
  sendWelcomeEmail,
  getCustomerWelcomeEmailHtml,
  getOwnerWelcomeEmailHtml,
  sendPasswordResetEmail,
  getPasswordResetEmailHtml,
  sendBookingNotifications,
  getBookingConfirmationEmailHtml,
  getBookingStatusUpdateEmailHtml,
  getBookingCancellationEmailHtml
};

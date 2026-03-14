const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail', // เปิดใช้ App Password ใน Gmail ของคุณก่อน
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const sendVerificationEmail = async (toEmail, verificationToken) => {
  const verifyLink = `${process.env.CORS_ORIGIN || 'http://localhost:3000'}/api/auth/verify-email/${verificationToken}`;
  
  const mailOptions = {
    from: `"Smart Student Life Manager" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: '📚 ยืนยันที่อยู่อีเมลของคุณ - Smart Student Life Manager',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; text-align: center; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #3b82f6;">ยินดีต้อนรับสู่ Smart Student!</h2>
        <p style="color: #4b5563; font-size: 16px;">กรุณาคลิกปุ่มด้านล่างเพื่อยืนยันที่อยู่อีเมลของคุณ และเริ่มต้นใช้งานแอปพลิเคชัน</p>
        <a href="${verifyLink}" style="display: inline-block; padding: 12px 24px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; margin: 20px 0;">
          ยืนยันที่อยู่อีเมล
        </a>
        <p style="color: #9ca3af; font-size: 14px;">หรือคัดลอกลิงก์ด้านล่างไปวางในเบราว์เซอร์ของคุณ:</p>
        <p style="color: #3b82f6; font-size: 14px; word-break: break-all;">${verifyLink}</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="color: #9ca3af; font-size: 12px;">หากคุณไม่ได้สมัครใช้งาน กรุณาละเว้นอีเมลฉบับนี้</p>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent: ' + info.response);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
};

module.exports = {
  sendVerificationEmail
};
